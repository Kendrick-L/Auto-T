import {
  EXTENSION_SEGMENT_ATTR,
  EXTENSION_SOURCE_HIDDEN_CLASS,
  EXTENSION_TRANSLATION_ATTR,
  EXTENSION_TRANSLATION_CLASS,
} from '@/src/constants';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment } from '@/src/translation/types';

export function renderTranslations(segments: TranslatedSegment[], displayMode: UserSettings['displayMode']) {
  injectStyle();

  for (const segment of segments) {
    const source = document.querySelector<HTMLElement>(`[${EXTENSION_SEGMENT_ATTR}="${CSS.escape(segment.id)}"]`);
    if (!source) continue;
    source.classList.toggle(EXTENSION_SOURCE_HIDDEN_CLASS, displayMode === 'translation-only');

    const existing = document.querySelector<HTMLElement>(`[${EXTENSION_TRANSLATION_ATTR}="${CSS.escape(segment.id)}"]`);
    if (existing) {
      existing.textContent = segment.translation;
      inheritSourceTypography(source, existing);
      placeTranslation(source, existing, displayMode);
      continue;
    }

    const translation = document.createElement('div');
    translation.className = EXTENSION_TRANSLATION_CLASS;
    translation.setAttribute(EXTENSION_TRANSLATION_ATTR, segment.id);
    translation.textContent = segment.translation;
    inheritSourceTypography(source, translation);
    placeTranslation(source, translation, displayMode);
  }
}

function inheritSourceTypography(source: HTMLElement, translation: HTMLElement) {
  const sourceStyle = window.getComputedStyle(source);
  const sourceFontSize = Number.parseFloat(sourceStyle.fontSize);
  translation.style.fontSize = Number.isFinite(sourceFontSize) ? `${Math.max(sourceFontSize * 0.92, 10)}px` : sourceStyle.fontSize;
  translation.style.fontFamily = sourceStyle.fontFamily;
  translation.style.fontWeight = sourceStyle.fontWeight;
  translation.style.letterSpacing = sourceStyle.letterSpacing;
  translation.style.lineHeight = sourceStyle.lineHeight;
  translation.style.color = sourceStyle.color;
}

function placeTranslation(source: HTMLElement, translation: HTMLElement, displayMode: UserSettings['displayMode']) {
  if (displayMode === 'translation-only') {
    source.insertAdjacentElement('afterend', translation);
    return;
  }

  const sourceStyle = window.getComputedStyle(source);
  const isInline = sourceStyle.display.startsWith('inline');
  if (isInline) {
    source.insertAdjacentElement('afterend', translation);
    return;
  }

  source.appendChild(translation);
}

function injectStyle() {
  if (document.getElementById('auto-t-style')) return;

  const style = document.createElement('style');
  style.id = 'auto-t-style';
  style.textContent = `
    .${EXTENSION_TRANSLATION_CLASS} {
      display: block;
      width: 100%;
      box-sizing: border-box;
      clear: both;
      margin: 6px 0 0;
      padding-left: 8px;
      border-left: 1px solid color-mix(in srgb, currentColor 22%, transparent);
      opacity: 0.86;
      white-space: normal;
    }
    .${EXTENSION_SOURCE_HIDDEN_CLASS} {
      display: none !important;
    }
  `;
  document.documentElement.appendChild(style);
}
