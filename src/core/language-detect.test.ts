import { describe, expect, it } from 'vitest';
import { detectPageLanguage, isLikelyChineseText, shouldSkipChineseSourceTranslation } from '@/src/core/language-detect';
import { DEFAULT_SETTINGS } from '@/src/storage/settings-store';

describe('language detection', () => {
  it('detects Chinese from the document language tag', () => {
    expect(detectPageLanguage([{ text: 'This text is short.' }], 'zh-CN')).toBe('zh-CN');
  });

  it('detects likely Chinese source text', () => {
    expect(isLikelyChineseText('这是一个中文网页，已经不需要再翻译成中文。')).toBe(true);
  });

  it('does not treat normal English text as Chinese', () => {
    expect(isLikelyChineseText('This is an English paragraph about product release notes.')).toBe(false);
  });

  it('skips Chinese source pages only when the target language is Chinese', () => {
    const segments = [{ text: '这是一个中文网页，已经不需要再翻译成中文。' }];

    expect(shouldSkipChineseSourceTranslation(DEFAULT_SETTINGS, segments, '')).toBe(true);
    expect(
      shouldSkipChineseSourceTranslation({ ...DEFAULT_SETTINGS, targetLang: 'en' }, segments, ''),
    ).toBe(false);
  });
});
