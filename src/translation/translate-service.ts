import { getCachedTranslation, saveCachedTranslations } from '@/src/storage/cache-store';
import { getGlossaryItems } from '@/src/storage/glossary-store';
import { getSettings } from '@/src/storage/settings-store';
import { translateWithDeepSeek } from '@/src/translation/deepseek-provider';
import type { TranslatedSegment } from '@/src/translation/types';
import type { ExtensionMessage } from '@/src/messaging/messages';

type TranslatePayload = Extract<ExtensionMessage, { type: 'TRANSLATE_SEGMENTS' }>['payload'];

const BATCH_SIZE = 12;

export async function translateSegments(payload: TranslatePayload): Promise<TranslatedSegment[]> {
  const settings = await getSettings();
  const glossary = await getGlossaryItems();

  const results: TranslatedSegment[] = [];
  const uncached = [];

  for (const segment of payload.segments) {
    const cached = !payload.force && settings.enableCache ? await getCachedTranslation(segment, settings) : null;
    if (cached) {
      results.push(cached);
    } else {
      uncached.push(segment);
    }
  }

  for (let index = 0; index < uncached.length; index += BATCH_SIZE) {
    const batch = uncached.slice(index, index + BATCH_SIZE);
    const translated = await translateWithDeepSeek({
      segments: batch,
      pageTitle: payload.pageTitle,
      pageUrl: payload.pageUrl,
      settings,
      glossary,
    });

    results.push(...translated);
    if (settings.enableCache) {
      await saveCachedTranslations(translated, settings);
    }
  }

  const order = new Map(payload.segments.map((segment, index) => [segment.id, index]));
  return results.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}
