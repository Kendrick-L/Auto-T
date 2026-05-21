import { syncActionStateFromSettings } from '@/src/action/action-state';
import { translateSegments } from '@/src/translation/translate-service';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';

export default defineBackground(() => {
  void syncActionStateFromSettings();

  chrome.runtime.onInstalled.addListener(() => {
    void syncActionStateFromSettings();
  });
  chrome.runtime.onStartup.addListener(() => {
    void syncActionStateFromSettings();
  });
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === 'local') {
      void syncActionStateFromSettings();
    }
  });

  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse: (response: ExtensionResponse) => void) => {
      if (message.type !== 'TRANSLATE_SEGMENTS') {
        return false;
      }

      translateSegments(
        message.payload,
        (progress) => {
          chrome.runtime.sendMessage({ type: 'TRANSLATION_PROGRESS', payload: progress } satisfies ExtensionMessage, () => {
            void chrome.runtime.lastError;
          });
        },
        (segments) => {
          if (!sender.tab?.id || segments.length === 0) return;
          chrome.tabs.sendMessage(
            sender.tab.id,
            { type: 'TRANSLATION_BATCH_RESULT', payload: { segments } } satisfies ExtensionMessage,
            () => {
              void chrome.runtime.lastError;
            },
          );
        },
      )
        .then((segments) => sendResponse({ ok: true, data: { segments } }))
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown translation error',
          });
        });

      return true;
    },
  );
});
