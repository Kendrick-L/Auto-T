import { scanPageSegments } from '@/src/core/dom-scanner';
import { renderTranslations } from '@/src/core/renderer';
import { restorePage } from '@/src/core/restore';
import { getEffectiveDeepSeekApiKey, getSettings } from '@/src/storage/settings-store';
import { debugError, debugGroup, debugSegments, isLocalDebugEnabled } from '@/src/utils/debug-log';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';
import type { PageSegment } from '@/src/core/dom-scanner';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment } from '@/src/translation/types';

const VISIBLE_LIMIT = 24;
const PAGE_LIMIT = 80;
const PRESCAN_TTL_MS = 1800;
const SCROLL_IDLE_MS = 650;

let visibleSegmentsCache: PageSegment[] = [];
let visibleSegmentsCachedAt = 0;
let prescanTimer: number | undefined;
let autoTranslateTimer: number | undefined;
let autoTranslateInFlight = false;
let lastAutoTranslateSignature = '';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    schedulePrescan(150);
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });

    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
        if (message.type === 'TRANSLATE_PAGE') {
          translatePage(message.payload?.scope ?? 'visible', message.payload?.force ?? false)
            .then(sendResponse)
            .catch((error: unknown) => {
              sendResponse({
                ok: false,
                error: formatContentError(error),
              });
            });
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

function handleViewportChange() {
  schedulePrescan(120);
  if (isExtensionContextActive()) {
    scheduleAutoTranslate();
  }
}

function schedulePrescan(delayMs: number) {
  if (prescanTimer) window.clearTimeout(prescanTimer);
  prescanTimer = window.setTimeout(() => {
    prescanVisibleSegments();
  }, delayMs);
}

function prescanVisibleSegments() {
  visibleSegmentsCache = scanPageSegments({
    limit: VISIBLE_LIMIT,
    viewportOnly: true,
  });
  visibleSegmentsCachedAt = Date.now();
}

function getVisibleSegments() {
  if (!visibleSegmentsCache.length || Date.now() - visibleSegmentsCachedAt > PRESCAN_TTL_MS) {
    prescanVisibleSegments();
  }
  return visibleSegmentsCache;
}

async function translatePage(scope: 'visible' | 'page', force: boolean): Promise<ExtensionResponse> {
  const settings = await getContentSettings();
  if (!settings) return extensionInvalidatedResponse();

  const debugLogging = settings.debugLogging || isLocalDebugEnabled();
  const segments =
    scope === 'visible'
      ? getVisibleSegments()
      : scanPageSegments({
          limit: PAGE_LIMIT,
          viewportOnly: false,
        });

  debugSegments(debugLogging, `scan ${scope} segments`, segments);
  debugGroup(debugLogging, 'scan summary', {
    scope,
    force,
    total: segments.length,
    pageUrl: location.href,
    pageTitle: document.title,
  });

  return translateAndRender(segments, force, debugLogging);
}

async function translateAndRender(
  segments: PageSegment[],
  force: boolean,
  debugLogging?: boolean,
): Promise<ExtensionResponse> {
  if (segments.length === 0) {
    return { ok: true, data: { segments: [] } };
  }

  debugSegments(debugLogging, 'sending segments to background', segments);

  return new Promise((resolve) => {
    if (!isExtensionContextActive()) {
      resolve(extensionInvalidatedResponse());
      return;
    }

    const payload: Extract<ExtensionMessage, { type: 'TRANSLATE_SEGMENTS' }>['payload'] = {
      segments,
      pageTitle: document.title,
      pageUrl: location.href,
      force,
      ...(debugLogging === undefined ? {} : { debugLogging }),
    };

    try {
      chrome.runtime.sendMessage(
        {
          type: 'TRANSLATE_SEGMENTS',
          payload,
        } satisfies ExtensionMessage,
        async (response: ExtensionResponse | undefined) => {
          const lastError = getRuntimeLastError();
          if (lastError) {
            resolve({ ok: false, error: lastError });
            return;
          }

          if (!response) {
            resolve({ ok: false, error: 'No response from Auto-T background service worker.' });
            return;
          }

          if (response.ok && response.data.segments) {
            debugSegments(debugLogging, 'received translated segments from background', response.data.segments);
            await renderWithCurrentSettings(response.data.segments, debugLogging);
          } else if (!response.ok) {
            debugError(debugLogging, 'background translation failed', response.error);
          }
          resolve(response);
        },
      );
    } catch (error) {
      resolve({
        ok: false,
        error: formatContentError(error),
      });
    }
  });
}

async function renderWithCurrentSettings(segments: TranslatedSegment[], debugLogging?: boolean) {
  const settings = await getContentSettings();
  const renderResults = renderTranslations(segments, settings?.displayMode ?? 'bilingual');
  debugGroup(debugLogging ?? settings?.debugLogging, 'render result', renderResults);
}

function scheduleAutoTranslate() {
  if (autoTranslateTimer) window.clearTimeout(autoTranslateTimer);
  autoTranslateTimer = window.setTimeout(() => {
    void autoTranslateVisibleSegments();
  }, SCROLL_IDLE_MS);
}

async function autoTranslateVisibleSegments() {
  if (autoTranslateInFlight) return;

  const settings = await getContentSettings();
  if (!settings) return;

  const debugLogging = settings.debugLogging || isLocalDebugEnabled();
  if (!settings.autoTranslate || !getEffectiveDeepSeekApiKey(settings)) return;

  const untranslatedSegments = getVisibleSegments().filter((segment) => !hasRenderedTranslation(segment.id));
  if (untranslatedSegments.length === 0) return;

  const signature = untranslatedSegments.map((segment) => segment.id).join('|');
  if (signature === lastAutoTranslateSignature) return;

  lastAutoTranslateSignature = signature;
  autoTranslateInFlight = true;

  try {
    debugSegments(debugLogging, 'auto visible untranslated segments', untranslatedSegments);
    await translateAndRender(untranslatedSegments, false, debugLogging);
  } finally {
    autoTranslateInFlight = false;
  }
}

function hasRenderedTranslation(segmentId: string) {
  return Boolean(document.querySelector(`[data-auto-t-for="${CSS.escape(segmentId)}"]`));
}

async function getContentSettings(): Promise<UserSettings | null> {
  if (!isExtensionContextActive()) return null;

  try {
    return await getSettings();
  } catch (error) {
    if (isExtensionContextError(error)) {
      return null;
    }
    throw error;
  }
}

function isExtensionContextActive() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function getRuntimeLastError() {
  try {
    return chrome.runtime.lastError?.message;
  } catch (error) {
    return isExtensionContextError(error) ? formatContentError(error) : undefined;
  }
}

function extensionInvalidatedResponse(): ExtensionResponse {
  return {
    ok: false,
    error: 'Auto-T extension context was reloaded. Refresh this page and try again.',
  };
}

function formatContentError(error: unknown) {
  if (isExtensionContextError(error)) {
    return 'Auto-T extension context was reloaded. Refresh this page and try again.';
  }
  return error instanceof Error ? error.message : 'Auto-T content script failed.';
}

function isExtensionContextError(error: unknown) {
  return error instanceof Error && error.message.includes('Extension context invalidated');
}
