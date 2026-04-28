import { getCachedTranslation, saveCachedTranslations } from '@/src/storage/cache-store';
import { getGlossaryItems, getGlossaryVersion } from '@/src/storage/glossary-store';
import { getSettings } from '@/src/storage/settings-store';
import { translateWithDeepSeek } from '@/src/translation/deepseek-provider';
import type { TranslatedSegment } from '@/src/translation/types';
import type { ExtensionMessage, TranslationProgress } from '@/src/messaging/messages';

type TranslatePayload = Extract<ExtensionMessage, { type: 'TRANSLATE_SEGMENTS' }>['payload'];

const BATCH_SIZE = 12;

export async function translateSegments(
  payload: TranslatePayload,
  onProgress?: (progress: TranslationProgress) => void,
): Promise<TranslatedSegment[]> {
  const settings = await getSettings();
  const glossary = await getGlossaryItems();
  const glossaryVersion = getGlossaryVersion(glossary);

  const results: TranslatedSegment[] = [];
  const uncached = [];
  let cached = 0;
  let translatedCount = 0;

  for (const segment of payload.segments) {
    const cachedItem =
      !payload.force && settings.enableCache ? await getCachedTranslation(segment, settings, glossaryVersion) : null;
    if (cachedItem) {
      cached += 1;
      results.push(cachedItem);
    } else {
      uncached.push(segment);
    }
  }

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
    const translated = await translateWithDeepSeek({
      segments: batch,
      pageTitle: payload.pageTitle,
      pageUrl: payload.pageUrl,
      settings,
      glossary,
    });

    results.push(...translated);
    translatedCount += translated.length;
    if (settings.enableCache) {
      await saveCachedTranslations(translated, settings, glossaryVersion);
    }

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
