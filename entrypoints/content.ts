import { scanPageSegments } from '@/src/core/dom-scanner';
import { renderTranslations } from '@/src/core/renderer';
import { restorePage } from '@/src/core/restore';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
        if (message.type === 'TRANSLATE_PAGE') {
          const segments = scanPageSegments();

          chrome.runtime.sendMessage(
            {
              type: 'TRANSLATE_SEGMENTS',
              payload: {
                segments,
                pageTitle: document.title,
                pageUrl: location.href,
                force: message.payload?.force ?? false,
              },
            } satisfies ExtensionMessage,
            (response: ExtensionResponse) => {
              if (response.ok && response.data.segments) {
                renderTranslations(response.data.segments);
              }
              sendResponse(response);
            },
          );

          return true;
        }

        if (message.type === 'RESTORE_PAGE') {
          restorePage();
          sendResponse({ ok: true, data: { restored: true } });
          return false;
        }

        return false;
      },
    );
  },
});
