import { EXTENSION_SEGMENT_ATTR, EXTENSION_TRANSLATION_ATTR, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import type { TranslatedSegment } from '@/src/translation/types';

export function renderTranslations(segments: TranslatedSegment[]) {
  injectStyle();

  for (const segment of segments) {
    const source = document.querySelector<HTMLElement>(`[${EXTENSION_SEGMENT_ATTR}="${CSS.escape(segment.id)}"]`);
    if (!source) continue;

    const existing = document.querySelector<HTMLElement>(`[${EXTENSION_TRANSLATION_ATTR}="${CSS.escape(segment.id)}"]`);
    if (existing) {
      existing.textContent = segment.translation;
      continue;
    }

    const translation = document.createElement('div');
    translation.className = EXTENSION_TRANSLATION_CLASS;
    translation.setAttribute(EXTENSION_TRANSLATION_ATTR, segment.id);
    translation.textContent = segment.translation;
    source.insertAdjacentElement('afterend', translation);
  }
}

function injectStyle() {
  if (document.getElementById('auto-t-style')) return;

  const style = document.createElement('style');
  style.id = 'auto-t-style';
  style.textContent = `
    .${EXTENSION_TRANSLATION_CLASS} {
      margin: 4px 0 10px;
      padding-left: 10px;
      border-left: 2px solid #2f6fed;
      color: #1d4ed8;
      font-size: 0.95em;
      line-height: 1.65;
    }
  `;
  document.documentElement.appendChild(style);
}
