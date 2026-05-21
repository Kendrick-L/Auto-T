import { EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import type { ContextTranslationTarget } from '@/src/core/context-translation';
import type { TranslatedSegment } from '@/src/translation/types';

export const INTERACTION_TRANSLATION_CLASS = 'auto-t-interaction-translation';
export const INTERACTION_TRANSLATION_ATTR = 'data-auto-t-interaction-for';

export type RenderInteractionResult = {
  id: string;
  status: 'inserted' | 'updated' | 'missing-source';
  translation: string;
};

export function renderInteractionTranslation(
  target: ContextTranslationTarget,
  translated: TranslatedSegment,
): RenderInteractionResult {
  injectInteractionStyle();

  if (!target.anchor.isConnected) {
    return {
      id: target.segment.id,
      status: 'missing-source',
      translation: translated.translation,
    };
  }

  const existing = document.querySelector<HTMLElement>(
    `[${INTERACTION_TRANSLATION_ATTR}="${CSS.escape(target.segment.id)}"]`,
  );
  const node = existing ?? createInteractionNode(target.segment.id);
  node.textContent = translated.translation;

  if (!existing) {
    target.anchor.insertAdjacentElement('afterend', node);
  }

  return {
    id: target.segment.id,
    status: existing ? 'updated' : 'inserted',
    translation: translated.translation,
  };
}

function createInteractionNode(segmentId: string) {
  const node = document.createElement('div');
  node.className = `${EXTENSION_TRANSLATION_CLASS} ${INTERACTION_TRANSLATION_CLASS}`;
  node.setAttribute(INTERACTION_TRANSLATION_ATTR, segmentId);
  node.setAttribute('translate', 'no');
  return node;
}

function injectInteractionStyle() {
  if (document.getElementById('auto-t-interaction-style')) return;

  const style = document.createElement('style');
  style.id = 'auto-t-interaction-style';
  style.textContent = `
    .${INTERACTION_TRANSLATION_CLASS} {
      display: block;
      box-sizing: border-box;
      margin: 6px 0 8px;
      padding: 6px 8px;
      border-left: 2px solid #1f7a5a;
      background: rgba(31, 122, 90, 0.08);
      color: inherit;
      font: inherit;
      line-height: inherit;
      opacity: 0.92;
      white-space: normal;
      overflow-wrap: anywhere;
    }
  `;
  document.documentElement.appendChild(style);
}
