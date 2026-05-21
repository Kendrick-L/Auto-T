import type { PageSegment } from '@/src/core/dom-scanner';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment } from '@/src/translation/types';
import { stableTextHash } from '@/src/utils/hash';

type CacheItem = TranslatedSegment & {
  key: string;
  createdAt: number;
};

const CACHE_KEY = 'autoTTranslationCache';
const MAX_CACHE_ITEMS = 800;

export async function getCachedTranslation(
  segment: PageSegment,
  settings: UserSettings,
  glossaryVersion: string,
  contextVersion = '',
): Promise<TranslatedSegment | null> {
  const cache = await getCache();
  const item = cache[getCacheKey(segment, settings, glossaryVersion, contextVersion)];
  if (!item) return null;

  return {
    id: segment.id,
    source: item.source,
    translation: item.translation,
  };
}

export async function saveCachedTranslations(
  segments: TranslatedSegment[],
  settings: UserSettings,
  glossaryVersion: string,
  contextVersions?: Map<string, string>,
) {
  const cache = await getCache();
  const now = Date.now();

  for (const segment of segments) {
    const key = getCacheKey({ text: segment.source }, settings, glossaryVersion, contextVersions?.get(segment.id) ?? '');
    cache[key] = {
      ...segment,
      key,
      createdAt: now,
    };
  }

  const compacted = Object.fromEntries(
    Object.entries(cache)
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, MAX_CACHE_ITEMS),
  );

  await chrome.storage.local.set({ [CACHE_KEY]: compacted });
}

async function getCache(): Promise<Record<string, CacheItem>> {
  const result = await chrome.storage.local.get(CACHE_KEY);
  return (result[CACHE_KEY] as Record<string, CacheItem> | undefined) ?? {};
}

function getCacheKey(
  segment: Pick<PageSegment, 'text'>,
  settings: UserSettings,
  glossaryVersion: string,
  contextVersion: string,
) {
  return [
    'v3',
    stableTextHash(segment.text),
    settings.targetLang,
    settings.sourceLang,
    settings.mode,
    settings.domainProfile,
    stableTextHash(glossaryVersion),
    stableTextHash(contextVersion),
  ].join(':');
}
