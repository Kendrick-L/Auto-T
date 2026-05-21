import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllCachedTranslations,
  clearCachedTranslationsForHostname,
  getCachedTranslation,
  getCacheStats,
  saveCachedTranslations,
} from '@/src/storage/cache-store';
import { DEFAULT_SETTINGS } from '@/src/storage/settings-store';

const CACHE_KEY = 'autoTTranslationCache';

describe('translation cache store', () => {
  let storage: Record<string, unknown>;

  beforeEach(() => {
    storage = {};

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
          set: vi.fn(async (value: Record<string, unknown>) => {
            storage = {
              ...storage,
              ...value,
            };
          }),
          remove: vi.fn(async (key: string) => {
            delete storage[key];
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves entries with hostname metadata and reports cache stats', async () => {
    await saveCachedTranslations(
      [
        {
          id: 'segment-1',
          source: 'Revenue increased by 12%.',
          translation: '收入增长了 12%。',
        },
      ],
      DEFAULT_SETTINGS,
      'glossary-v1',
      new Map([['segment-1', 'quarterly report context']]),
      'https://Finance.Example.com/report',
    );

    await expect(
      getCachedTranslation(
        { id: 'new-id', text: 'Revenue increased by 12%.', tagName: 'p', hash: 'hash' },
        DEFAULT_SETTINGS,
        'glossary-v1',
        'quarterly report context',
      ),
    ).resolves.toEqual({
      id: 'new-id',
      source: 'Revenue increased by 12%.',
      translation: '收入增长了 12%。',
    });

    await expect(getCacheStats('finance.example.com')).resolves.toEqual({
      totalItems: 1,
      siteItems: 1,
      siteHostname: 'finance.example.com',
    });
  });

  it('keeps cache entries separate for different DeepSeek models', async () => {
    await saveCachedTranslations(
      [
        {
          id: 'segment-1',
          source: 'Model-specific cached text.',
          translation: 'Flash 模型译文。',
        },
      ],
      { ...DEFAULT_SETTINGS, deepseekModel: 'flash' },
      'glossary-v1',
    );

    await expect(
      getCachedTranslation(
        { id: 'pro-id', text: 'Model-specific cached text.', tagName: 'p', hash: 'hash' },
        { ...DEFAULT_SETTINGS, deepseekModel: 'pro' },
        'glossary-v1',
      ),
    ).resolves.toBeNull();
  });

  it('clears cached translations for one hostname without touching other sites', async () => {
    await saveCachedTranslations(
      [{ id: 'segment-1', source: 'First page text.', translation: '第一页文本。' }],
      DEFAULT_SETTINGS,
      'glossary-v1',
      undefined,
      'https://docs.example.com/a',
    );
    await saveCachedTranslations(
      [{ id: 'segment-2', source: 'Second page text.', translation: '第二页文本。' }],
      DEFAULT_SETTINGS,
      'glossary-v1',
      undefined,
      'https://news.example.com/b',
    );

    await expect(clearCachedTranslationsForHostname('DOCS.EXAMPLE.COM')).resolves.toBe(1);
    await expect(getCacheStats('docs.example.com')).resolves.toMatchObject({ totalItems: 1, siteItems: 0 });
    await expect(getCacheStats('news.example.com')).resolves.toMatchObject({ totalItems: 1, siteItems: 1 });
  });

  it('does not count hostless legacy entries as current-site cache', async () => {
    await saveCachedTranslations(
      [{ id: 'segment-1', source: 'Legacy cached text.', translation: '旧缓存文本。' }],
      DEFAULT_SETTINGS,
      'glossary-v1',
    );

    await expect(getCacheStats('docs.example.com')).resolves.toMatchObject({ totalItems: 1, siteItems: 0 });
    await expect(clearCachedTranslationsForHostname('docs.example.com')).resolves.toBe(0);
    await expect(getCacheStats()).resolves.toMatchObject({ totalItems: 1 });
  });

  it('clears the full cache', async () => {
    await saveCachedTranslations(
      [{ id: 'segment-1', source: 'Cached text.', translation: '缓存文本。' }],
      DEFAULT_SETTINGS,
      'glossary-v1',
    );

    await expect(clearAllCachedTranslations()).resolves.toBe(1);
    await expect(getCacheStats()).resolves.toEqual({ totalItems: 0, siteItems: 0 });
    expect(storage[CACHE_KEY]).toBeUndefined();
  });
});
