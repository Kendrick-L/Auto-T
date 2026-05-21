import { getCachedTranslation, saveCachedTranslations } from '@/src/storage/cache-store';
import { getGlossaryItems, getGlossaryVersion } from '@/src/storage/glossary-store';
import { getSettings } from '@/src/storage/settings-store';
import { translateWithDeepSeek } from '@/src/translation/deepseek-provider';
import { debugError, debugGroup, debugSegments } from '@/src/utils/debug-log';
import type { TranslatedSegment, TranslationContextSegment } from '@/src/translation/types';
import type { ExtensionMessage, TranslationProgress } from '@/src/messaging/messages';

type TranslatePayload = Extract<ExtensionMessage, { type: 'TRANSLATE_SEGMENTS' }>['payload'];

const BATCH_SIZE = 12;
const CONTEXT_RADIUS = 2;
const CONTEXT_SEGMENT_LIMIT = 8;
const CONTEXT_TEXT_LIMIT = 260;

export async function translateSegments(
  payload: TranslatePayload,
  onProgress?: (progress: TranslationProgress) => void,
  onBatchTranslated?: (segments: TranslatedSegment[]) => void,
): Promise<TranslatedSegment[]> {
  const settings = await getSettings();
  if (!settings.extensionEnabled) {
    throw new Error('Auto-T is paused. Resume it from the popup to translate.');
  }

  const glossary = await getGlossaryItems();
  const glossaryVersion = getGlossaryVersion(glossary);
  const debugLogging = Boolean(payload.debugLogging || settings.debugLogging);

  const results: TranslatedSegment[] = [];
  const uncached = [];
  const contextVersions = buildContextVersions(payload.segments, payload.pageTitle, payload.pageUrl);
  let cached = 0;
  let translatedCount = 0;

  for (const segment of payload.segments) {
    const cachedItem =
      !payload.force && settings.enableCache
        ? await getCachedTranslation(segment, settings, glossaryVersion, contextVersions.get(segment.id) ?? '')
        : null;
    if (cachedItem) {
      cached += 1;
      results.push(cachedItem);
    } else {
      uncached.push(segment);
    }
  }

  debugSegments(debugLogging, 'background received segments', payload.segments);
  debugGroup(debugLogging, 'translation cache split', {
    total: payload.segments.length,
    cached,
    uncached: uncached.length,
    force: Boolean(payload.force),
    cacheEnabled: settings.enableCache,
    pageTitle: payload.pageTitle,
    pageUrl: payload.pageUrl,
  });

  onProgress?.({
    total: payload.segments.length,
    completed: results.length,
    cached,
    translated: translatedCount,
    totalBatches: Math.ceil(uncached.length / BATCH_SIZE),
  });

  for (let index = 0; index < uncached.length; index += BATCH_SIZE) {
    const batch = uncached.slice(index, index + BATCH_SIZE);
    const currentBatch = Math.floor(index / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uncached.length / BATCH_SIZE);
    debugSegments(debugLogging, `DeepSeek batch ${currentBatch}/${totalBatches} source`, batch);
    const contextSegments = buildBatchContext(payload.segments, batch);
    debugSegments(debugLogging, `DeepSeek batch ${currentBatch}/${totalBatches} context`, contextSegments);
    const translated = await translateBatchWithFallback({
      batch,
      contextSegments,
      currentBatch,
      debugLogging,
      glossary,
      pageTitle: payload.pageTitle,
      pageUrl: payload.pageUrl,
      settings,
      totalBatches,
    });

    debugSegments(debugLogging, `DeepSeek batch ${currentBatch}/${totalBatches} parsed translations`, translated);
    results.push(...translated);
    translatedCount += translated.length;
    if (settings.enableCache) {
      await saveCachedTranslations(translated, settings, glossaryVersion, contextVersions, payload.pageUrl);
    }
    onBatchTranslated?.(translated);

    onProgress?.({
      total: payload.segments.length,
      completed: results.length,
      cached,
      translated: translatedCount,
      currentBatch,
      totalBatches,
    });
  }

  const order = new Map(payload.segments.map((segment, index) => [segment.id, index]));
  return results.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

type TranslateBatchOptions = {
  batch: TranslatePayload['segments'];
  contextSegments: TranslationContextSegment[];
  currentBatch: number;
  debugLogging: boolean;
  glossary: Awaited<ReturnType<typeof getGlossaryItems>>;
  pageTitle: string;
  pageUrl: string;
  settings: Awaited<ReturnType<typeof getSettings>>;
  totalBatches: number;
};

async function translateBatchWithFallback(options: TranslateBatchOptions): Promise<TranslatedSegment[]> {
  try {
    return await translateWithDeepSeek({
      segments: options.batch,
      contextSegments: options.contextSegments,
      pageTitle: options.pageTitle,
      pageUrl: options.pageUrl,
      settings: options.settings,
      glossary: options.glossary,
      debugLogging: options.debugLogging,
    });
  } catch (error) {
    if (isRequestLevelError(error)) {
      throw error;
    }

    debugError(
      options.debugLogging,
      `DeepSeek batch ${options.currentBatch}/${options.totalBatches} failed; retrying individually`,
      error,
    );

    if (options.batch.length <= 1) {
      return [];
    }

    const recovered: TranslatedSegment[] = [];
    for (const segment of options.batch) {
      try {
        const translated = await translateWithDeepSeek({
          segments: [segment],
          contextSegments: buildSingleSegmentContext(options.contextSegments, segment.id),
          pageTitle: options.pageTitle,
          pageUrl: options.pageUrl,
          settings: options.settings,
          glossary: options.glossary,
          debugLogging: options.debugLogging,
        });
        recovered.push(...translated);
      } catch (singleError) {
        if (isRequestLevelError(singleError)) {
          throw singleError;
        }

        debugError(options.debugLogging, `DeepSeek single segment failed and was skipped: ${segment.id}`, singleError);
      }
    }

    debugGroup(options.debugLogging, `DeepSeek batch ${options.currentBatch}/${options.totalBatches} fallback summary`, {
      requested: options.batch.length,
      recovered: recovered.length,
      skipped: options.batch.length - recovered.length,
    });

    return recovered;
  }
}

function isRequestLevelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('DeepSeek API key') ||
    message.includes('DeepSeek API authentication') ||
    message.includes('DeepSeek API rate limit') ||
    message.includes('DeepSeek request timed out') ||
    message.includes('DeepSeek API error:')
  );
}

function buildBatchContext(allSegments: TranslatePayload['segments'], batch: TranslatePayload['segments']) {
  const batchIds = new Set(batch.map((segment) => segment.id));
  const batchIndexes = batch
    .map((segment) => allSegments.findIndex((candidate) => candidate.id === segment.id))
    .filter((index) => index >= 0);
  if (batchIndexes.length === 0) return [];

  const start = Math.max(0, Math.min(...batchIndexes) - CONTEXT_RADIUS);
  const end = Math.min(allSegments.length, Math.max(...batchIndexes) + CONTEXT_RADIUS + 1);

  return allSegments
    .slice(start, end)
    .filter((segment) => !batchIds.has(segment.id))
    .slice(0, CONTEXT_SEGMENT_LIMIT)
    .map(toContextSegment);
}

function buildSingleSegmentContext(contextSegments: TranslationContextSegment[], segmentId: string) {
  return contextSegments.filter((segment) => segment.id !== segmentId).slice(0, CONTEXT_SEGMENT_LIMIT);
}

function buildContextVersions(segments: TranslatePayload['segments'], pageTitle: string, pageUrl: string) {
  const versions = new Map<string, string>();

  for (const segment of segments) {
    const context = buildBatchContext(segments, [segment]);
    versions.set(
      segment.id,
      [
        pageTitle,
        safeHostname(pageUrl),
        ...context.map((contextSegment) => `${contextSegment.id}:${contextSegment.text}`),
      ].join('\n'),
    );
  }

  return versions;
}

function toContextSegment(segment: TranslatePayload['segments'][number]): TranslationContextSegment {
  return {
    id: segment.id,
    text: truncateContextText(segment.text),
  };
}

function truncateContextText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > CONTEXT_TEXT_LIMIT ? `${normalized.slice(0, CONTEXT_TEXT_LIMIT)}...` : normalized;
}

function safeHostname(pageUrl: string) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}
