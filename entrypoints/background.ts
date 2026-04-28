import { translateSegments } from '@/src/translation/translate-service';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
      if (message.type !== 'TRANSLATE_SEGMENTS') {
        return false;
      }

      translateSegments(message.payload)
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
