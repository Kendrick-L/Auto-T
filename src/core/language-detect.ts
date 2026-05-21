import type { PageSegment } from '@/src/core/dom-scanner';
import type { UserSettings } from '@/src/storage/settings-store';

export type DetectedLanguage = 'zh-CN' | 'unknown';

export function shouldSkipChineseSourceTranslation(
  settings: Pick<UserSettings, 'targetLang'>,
  segments: Pick<PageSegment, 'text'>[],
  documentLanguage = document.documentElement.lang,
) {
  return settings.targetLang === 'zh-CN' && detectPageLanguage(segments, documentLanguage) === 'zh-CN';
}

export function detectPageLanguage(
  segments: Pick<PageSegment, 'text'>[],
  documentLanguage = document.documentElement.lang,
): DetectedLanguage {
  if (isChineseLanguageTag(documentLanguage)) return 'zh-CN';

  const text = segments
    .map((segment) => segment.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return isLikelyChineseText(text) ? 'zh-CN' : 'unknown';
}

export function isLikelyChineseText(text: string) {
  const hanCharacters = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  if (hanCharacters < 4) return false;

  const latinCharacters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const signalCharacters = hanCharacters + latinCharacters;
  if (signalCharacters === 0) return false;

  return hanCharacters / signalCharacters >= 0.2;
}

function isChineseLanguageTag(language: string) {
  return language.trim().toLowerCase().startsWith('zh');
}
