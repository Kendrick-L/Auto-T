import { scanPageSegments } from '@/src/core/dom-scanner';
import {
  type ContextTranslationTarget,
  type PointerPosition,
  resolveContextTranslationTarget,
} from '@/src/core/context-translation';
import {
  clearInteractionTranslations,
  clearInteractionLoading,
  hasInteractionTranslation,
  renderInteractionLoading,
  removeInteractionTranslation,
  renderInteractionTranslation,
} from '@/src/core/interaction-renderer';
import { shouldSkipChineseSourceTranslation } from '@/src/core/language-detect';
import { clearTranslationLoading, renderTranslationLoading, renderTranslations } from '@/src/core/renderer';
import { restorePage } from '@/src/core/restore';
import { getEffectiveDeepSeekApiKey, getSettings } from '@/src/storage/settings-store';
import { debugError, debugGroup, debugSegments, isLocalDebugEnabled } from '@/src/utils/debug-log';
import { EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';
import type { PageSegment } from '@/src/core/dom-scanner';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment, TranslationContextSegment, TranslationKind } from '@/src/translation/types';

const VISIBLE_LIMIT = 24;
const PAGE_LIMIT = 80;
const PRESCAN_TTL_MS = 1800;
const SCROLL_IDLE_MS = 650;
const MUTATION_PRESCAN_DELAY_MS = 180;
const MUTATION_AUTO_TRANSLATE_DELAY_MS = 850;

let visibleSegmentsCache: PageSegment[] = [];
let visibleSegmentsCachedAt = 0;
let prescanTimer: number | undefined;
let autoTranslateTimer: number | undefined;
let mutationObserver: MutationObserver | undefined;
let autoTranslateInFlight = false;
let lastAutoTranslateSignature = '';
let lastPointerPosition: PointerPosition | null = null;
const interactionTargets = new Map<string, ContextTranslationTarget>();

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    schedulePrescan(150);
    startMutationObserver();
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

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

        if (message.type === 'COMMAND_TRANSLATE_VISIBLE') {
          translatePage('visible', false, { clearInteractionTranslationsFirst: true })
            .then(sendResponse)
            .catch((error: unknown) => {
              sendResponse({
                ok: false,
                error: formatContentError(error),
              });
            });
          return true;
        }

        if (message.type === 'COMMAND_TRANSLATE_CONTEXT') {
          translateContext()
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
          interactionTargets.clear();
          sendResponse({ ok: true, data: { restored: true } });
          return false;
        }

        if (message.type === 'TRANSLATION_BATCH_RESULT') {
          void renderTranslatedSegmentsWithCurrentSettings(message.payload.segments);
          sendResponse({ ok: true, data: { rendered: message.payload.segments.length } });
          return false;
        }

        return false;
      },
    );
  },
});

function handlePointerMove(event: MouseEvent) {
  lastPointerPosition = {
    x: event.clientX,
    y: event.clientY,
  };
}

function handleViewportChange() {
  schedulePrescan(120);
  if (isExtensionContextActive()) {
    scheduleAutoTranslate();
  }
}

function startMutationObserver() {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', startMutationObserver, { once: true });
    return;
  }
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    if (!mutations.some(isRelevantPageMutation)) return;

    schedulePrescan(MUTATION_PRESCAN_DELAY_MS);
    if (isExtensionContextActive()) {
      scheduleAutoTranslate(MUTATION_AUTO_TRANSLATE_DELAY_MS);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
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

type TranslatePageOptions = {
  clearInteractionTranslationsFirst?: boolean;
};

async function translatePage(
  scope: 'visible' | 'page',
  force: boolean,
  options: TranslatePageOptions = {},
): Promise<ExtensionResponse> {
  const settings = await getContentSettings();
  if (!settings) return extensionInvalidatedResponse();
  if (!settings.extensionEnabled) {
    return {
      ok: false,
      error: 'Auto-T is paused. Resume it from the popup to translate.',
    };
  }

  const debugLogging = settings.debugLogging || isLocalDebugEnabled();
  if (options.clearInteractionTranslationsFirst) {
    clearInteractionTranslations();
    interactionTargets.clear();
  }

  const segments =
    scope === 'visible'
      ? getVisibleSegments()
      : scanPageSegments({
          limit: PAGE_LIMIT,
          viewportOnly: false,
        });

  if (shouldSkipChineseSourceTranslation(settings, segments)) {
    debugGroup(debugLogging, 'skip translation', {
      reason: 'source appears to be Chinese and target language is Chinese',
      scope,
      pageUrl: location.href,
      pageTitle: document.title,
    });
    return { ok: true, data: { segments: [], skipped: 'chinese-source' } };
  }

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

async function translateContext(): Promise<ExtensionResponse> {
  const settings = await getContentSettings();
  if (!settings) return extensionInvalidatedResponse();
  if (!settings.extensionEnabled) {
    return {
      ok: false,
      error: 'Auto-T is paused. Resume it from the popup to translate.',
    };
  }

  const target = resolveContextTranslationTarget(lastPointerPosition);
  if (!target) {
    return {
      ok: false,
      error: 'No selected text or hovered paragraph was found for context translation.',
    };
  }

  const debugLogging = settings.debugLogging || isLocalDebugEnabled();
  if (shouldSkipChineseSourceTranslation(settings, [target.segment])) {
    debugGroup(debugLogging, 'skip context translation', {
      reason: 'source appears to be Chinese and target language is Chinese',
      translationKind: target.translationKind,
      pageUrl: location.href,
      pageTitle: document.title,
    });
    return { ok: true, data: { segments: [], skipped: 'chinese-source' } };
  }

  if (hasInteractionTranslation(target.segment.id)) {
    removeInteractionTranslation(target.segment.id);
    interactionTargets.delete(target.segment.id);
    return { ok: true, data: { segments: [], toggled: 'interaction-off' } };
  }

  interactionTargets.set(target.segment.id, target);
  debugSegments(debugLogging, `context ${target.translationKind} segment`, [target.segment]);
  debugGroup(debugLogging, 'context translation target', {
    translationKind: target.translationKind,
    contextSegments: target.contextSegments,
    pageUrl: location.href,
    pageTitle: document.title,
  });

  renderInteractionLoading(target);
  const response = await translateAndRender([target.segment], false, debugLogging, {
    contextSegments: target.contextSegments,
    renderLoading: false,
    translationKind: target.translationKind,
  });
  if (!response.ok) {
    clearInteractionLoading(target);
  }
  return response;
}

type TranslateAndRenderOptions = {
  contextSegments?: TranslationContextSegment[];
  renderLoading?: boolean;
  translationKind?: TranslationKind;
};

async function translateAndRender(
  segments: PageSegment[],
  force: boolean,
  debugLogging?: boolean,
  options: TranslateAndRenderOptions = {},
): Promise<ExtensionResponse> {
  if (segments.length === 0) {
    return { ok: true, data: { segments: [] } };
  }

  debugSegments(debugLogging, 'sending segments to background', segments);
  if (options.renderLoading !== false) {
    await renderLoadingWithCurrentSettings(segments, debugLogging);
  }

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
      ...(options.contextSegments?.length ? { contextSegments: options.contextSegments } : {}),
      ...(debugLogging === undefined ? {} : { debugLogging }),
      ...(options.translationKind ? { translationKind: options.translationKind } : {}),
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
            clearTranslationLoading(segments);
            resolve({ ok: false, error: lastError });
            return;
          }

          if (!response) {
            clearTranslationLoading(segments);
            resolve({ ok: false, error: 'No response from Auto-T background service worker.' });
            return;
          }

          if (response.ok && response.data.segments) {
            debugSegments(debugLogging, 'received translated segments from background', response.data.segments);
            await renderTranslatedSegmentsWithCurrentSettings(response.data.segments, debugLogging);
          } else if (!response.ok) {
            clearTranslationLoading(segments);
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

async function renderTranslatedSegmentsWithCurrentSettings(segments: TranslatedSegment[], debugLogging?: boolean) {
  const settings = await getContentSettings();
  const normalSegments: TranslatedSegment[] = [];
  const interactionResults = [];

  for (const segment of segments) {
    const target = interactionTargets.get(segment.id);
    if (target) {
      interactionResults.push(renderInteractionTranslation(target, segment));
    } else {
      normalSegments.push(segment);
    }
  }

  const renderResults = normalSegments.length
    ? renderTranslations(normalSegments, settings?.displayMode ?? 'bilingual')
    : [];
  debugGroup(debugLogging ?? settings?.debugLogging, 'render result', {
    normal: renderResults,
    interaction: interactionResults,
  });
}

async function renderLoadingWithCurrentSettings(segments: PageSegment[], debugLogging?: boolean) {
  const settings = await getContentSettings();
  const renderResults = renderTranslationLoading(segments, settings?.displayMode ?? 'bilingual');
  debugGroup(debugLogging ?? settings?.debugLogging, 'loading render result', renderResults);
}

function scheduleAutoTranslate(delayMs = SCROLL_IDLE_MS) {
  if (autoTranslateTimer) window.clearTimeout(autoTranslateTimer);
  autoTranslateTimer = window.setTimeout(() => {
    void autoTranslateVisibleSegments();
  }, delayMs);
}

async function autoTranslateVisibleSegments() {
  if (autoTranslateInFlight) return;

  const settings = await getContentSettings();
  if (!settings) return;

  const debugLogging = settings.debugLogging || isLocalDebugEnabled();
  if (!settings.extensionEnabled || !settings.autoTranslate || !getEffectiveDeepSeekApiKey(settings)) return;

  const untranslatedSegments = getVisibleSegments().filter((segment) => !hasRenderedTranslation(segment.id));
  if (untranslatedSegments.length === 0) return;
  if (shouldSkipChineseSourceTranslation(settings, untranslatedSegments)) return;

  const signature = untranslatedSegments.map((segment) => segment.id).join('|');
  if (signature === lastAutoTranslateSignature) return;

  lastAutoTranslateSignature = signature;
  autoTranslateInFlight = true;

  try {
    debugSegments(debugLogging, 'auto visible untranslated segments', untranslatedSegments);
    const response = await translateAndRender(untranslatedSegments, false, debugLogging);
    if (!response.ok) {
      lastAutoTranslateSignature = '';
    }
  } finally {
    autoTranslateInFlight = false;
  }
}

function hasRenderedTranslation(segmentId: string) {
  const translation = document.querySelector<HTMLElement>(`[data-auto-t-for="${CSS.escape(segmentId)}"]`);
  return Boolean(translation && !translation.classList.contains('auto-t-translation-loading'));
}

function isRelevantPageMutation(mutation: MutationRecord) {
  if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) return false;
  if (isAutoTNode(mutation.target)) return false;

  return Array.from(mutation.addedNodes).some((node) => !isAutoTNode(node) && nodeMightContainText(node));
}

function isAutoTNode(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const element = node as Element;
  return Boolean(
    element.closest(`.${EXTENSION_TRANSLATION_CLASS}`) ||
      element.closest('#auto-t-translation-layer') ||
      element.closest('#auto-t-style'),
  );
}

function nodeMightContainText(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return Boolean(node.textContent?.trim());
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const element = node as Element;
  return Boolean(element.textContent?.trim());
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
