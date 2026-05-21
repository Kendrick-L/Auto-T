import type { PageSegment } from '@/src/core/dom-scanner';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment } from '@/src/translation/types';
import { stableTextHash } from '@/src/utils/hash';

type CacheItem = TranslatedSegment & {
  key: string;
  createdAt: number;
  siteHostname?: string;
};

const CACHE_KEY = 'autoTTranslationCache';
const MAX_CACHE_ITEMS = 800;

export type TranslationCacheStats = {
  totalItems: number;
  siteItems: number;
  siteHostname?: string;
};

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
  pageUrl?: string,
) {
  const cache = await getCache();
  const now = Date.now();
  const siteHostname = getHostnameFromUrl(pageUrl);

  for (const segment of segments) {
    const key = getCacheKey({ text: segment.source }, settings, glossaryVersion, contextVersions?.get(segment.id) ?? '');
    cache[key] = {
      ...segment,
      key,
      createdAt: now,
      ...(siteHostname ? { siteHostname } : {}),
    };
  }

  const compacted = Object.fromEntries(
    Object.entries(cache)
      .sort(([, left], [, right]) => right.createdAt - left.createdAt)
      .slice(0, MAX_CACHE_ITEMS),
  );

  await chrome.storage.local.set({ [CACHE_KEY]: compacted });
}

export async function getCacheStats(siteHostname?: string): Promise<TranslationCacheStats> {
  const cache = await getCache();
  const normalizedHostname = normalizeHostname(siteHostname);
  const items = Object.values(cache);

  return {
    totalItems: items.length,
    siteItems: normalizedHostname ? items.filter((item) => item.siteHostname === normalizedHostname).length : 0,
    ...(normalizedHostname ? { siteHostname: normalizedHostname } : {}),
  };
}

export async function clearAllCachedTranslations(): Promise<number> {
  const cache = await getCache();
  await chrome.storage.local.remove(CACHE_KEY);
  return Object.keys(cache).length;
}

export async function clearCachedTranslationsForHostname(siteHostname: string): Promise<number> {
  const normalizedHostname = normalizeHostname(siteHostname);
  if (!normalizedHostname) return 0;

  const cache = await getCache();
  let removed = 0;

  const remaining = Object.fromEntries(
    Object.entries(cache).filter(([, item]) => {
      const shouldRemove = item.siteHostname === normalizedHostname;
      if (shouldRemove) removed += 1;
      return !shouldRemove;
    }),
  );

  await chrome.storage.local.set({ [CACHE_KEY]: remaining });
  return removed;
}

export function getHostnameFromUrl(pageUrl?: string) {
  if (!pageUrl) return undefined;

  try {
    return normalizeHostname(new URL(pageUrl).hostname);
  } catch {
    return undefined;
  }
}

async function getCache(): Promise<Record<string, CacheItem>> {
  const result = await chrome.storage.local.get(CACHE_KEY);
  return (result[CACHE_KEY] as Record<string, CacheItem> | undefined) ?? {};
}

function normalizeHostname(siteHostname?: string) {
  const normalized = siteHostname?.trim().toLowerCase();
  return normalized || undefined;
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
    settings.deepseekModel,
    settings.domainProfile,
    stableTextHash(glossaryVersion),
    stableTextHash(contextVersion),
  ].join(':');
}
