import { scanPageSegments } from '@/src/core/dom-scanner';
import { renderTranslations } from '@/src/core/renderer';
import { restorePage } from '@/src/core/restore';
import { getEffectiveDeepSeekApiKey, getSettings } from '@/src/storage/settings-store';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';
import type { PageSegment } from '@/src/core/dom-scanner';
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
          translatePage(message.payload?.scope ?? 'visible', message.payload?.force ?? false).then(sendResponse);
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
  scheduleAutoTranslate();
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
  const segments =
    scope === 'visible'
      ? getVisibleSegments()
      : scanPageSegments({
          limit: PAGE_LIMIT,
          viewportOnly: false,
        });

  return translateAndRender(segments, force);
}

async function translateAndRender(segments: PageSegment[], force: boolean): Promise<ExtensionResponse> {
  if (segments.length === 0) {
    return { ok: true, data: { segments: [] } };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_SEGMENTS',
        payload: {
          segments,
          pageTitle: document.title,
          pageUrl: location.href,
          force,
        },
      } satisfies ExtensionMessage,
      async (response: ExtensionResponse) => {
        if (response.ok && response.data.segments) {
          await renderWithCurrentSettings(response.data.segments);
        }
        resolve(response);
      },
    );
  });
}

async function renderWithCurrentSettings(segments: TranslatedSegment[]) {
  const settings = await getSettings();
  renderTranslations(segments, settings.displayMode);
}

function scheduleAutoTranslate() {
  if (autoTranslateTimer) window.clearTimeout(autoTranslateTimer);
  autoTranslateTimer = window.setTimeout(() => {
    void autoTranslateVisibleSegments();
  }, SCROLL_IDLE_MS);
}

async function autoTranslateVisibleSegments() {
  if (autoTranslateInFlight) return;

  const settings = await getSettings();
  if (!settings.autoTranslate || !getEffectiveDeepSeekApiKey(settings)) return;

  const untranslatedSegments = getVisibleSegments().filter((segment) => !hasRenderedTranslation(segment.id));
  if (untranslatedSegments.length === 0) return;

  const signature = untranslatedSegments.map((segment) => segment.id).join('|');
  if (signature === lastAutoTranslateSignature) return;

  lastAutoTranslateSignature = signature;
  autoTranslateInFlight = true;

  try {
    await translateAndRender(untranslatedSegments, false);
  } finally {
    autoTranslateInFlight = false;
  }
}

function hasRenderedTranslation(segmentId: string) {
  return Boolean(document.querySelector(`[data-auto-t-for="${CSS.escape(segmentId)}"]`));
}
