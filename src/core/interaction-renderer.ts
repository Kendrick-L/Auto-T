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

const TRANSLATION_INNER_CLASS = 'auto-t-translation-inner';
const TRANSLATION_LOADING_CLASS = 'auto-t-translation-loading';
const TRANSLATION_LOADING_SPINNER_CLASS = 'auto-t-translation-spinner';
const TRANSLATION_LOADING_LABEL_CLASS = 'auto-t-translation-loading-label';
const TABLE_CELL_SELECTOR = 'td,th';
const COMPACT_SOURCE_SELECTOR = 'button,[role="button"],[role="option"],label';

export function renderInteractionLoading(target: ContextTranslationTarget): RenderInteractionResult {
  injectInteractionStyle();

  if (!target.anchor.isConnected) {
    return {
      id: target.segment.id,
      status: 'missing-source',
      translation: 'Translating...',
    };
  }

  const existing = document.querySelector<HTMLElement>(
    `[${INTERACTION_TRANSLATION_ATTR}="${CSS.escape(target.segment.id)}"]`,
  );
  const node = existing ?? createInteractionNode(target.segment.id);
  node.classList.add(TRANSLATION_LOADING_CLASS);
  node.textContent = '';

  const inner = document.createElement('span');
  inner.className = TRANSLATION_INNER_CLASS;
  inner.setAttribute('aria-label', 'Translating');

  const spinner = document.createElement('span');
  spinner.className = TRANSLATION_LOADING_SPINNER_CLASS;
  spinner.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = TRANSLATION_LOADING_LABEL_CLASS;
  label.textContent = 'Translating...';

  inner.append(spinner, label);
  node.append(inner);

  placeInteractionNode(target.anchor, node);

  return {
    id: target.segment.id,
    status: existing ? 'updated' : 'inserted',
    translation: 'Translating...',
  };
}

export function clearInteractionLoading(target: ContextTranslationTarget) {
  const existing = document.querySelector<HTMLElement>(
    `[${INTERACTION_TRANSLATION_ATTR}="${CSS.escape(target.segment.id)}"]`,
  );
  if (existing?.classList.contains(TRANSLATION_LOADING_CLASS)) {
    existing.remove();
  }
}

export function hasInteractionTranslation(segmentId: string) {
  return Boolean(getInteractionNode(segmentId));
}

export function removeInteractionTranslation(segmentId: string) {
  getInteractionNode(segmentId)?.remove();
}

export function clearInteractionTranslations() {
  document.querySelectorAll(`.${INTERACTION_TRANSLATION_CLASS}`).forEach((node) => node.remove());
}

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
  setInteractionText(node, translated.translation);

  placeInteractionNode(target.anchor, node);

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

function getInteractionNode(segmentId: string) {
  return document.querySelector<HTMLElement>(`[${INTERACTION_TRANSLATION_ATTR}="${CSS.escape(segmentId)}"]`);
}

function setInteractionText(node: HTMLElement, text: string) {
  node.classList.remove(TRANSLATION_LOADING_CLASS);
  node.textContent = '';

  const inner = document.createElement('span');
  inner.className = TRANSLATION_INNER_CLASS;
  inner.textContent = text;
  node.append(inner);
}

function placeInteractionNode(anchor: HTMLElement, node: HTMLElement) {
  const tableCell = anchor.closest<HTMLElement>(TABLE_CELL_SELECTOR);
  if (tableCell) {
    node.setAttribute('data-auto-t-interaction-placement', 'table-cell');
    tableCell.appendChild(node);
    return;
  }

  node.setAttribute(
    'data-auto-t-interaction-placement',
    anchor.matches(COMPACT_SOURCE_SELECTOR) ? 'compact-source' : 'after-block',
  );
  if (node.previousElementSibling === anchor) return;
  anchor.insertAdjacentElement('afterend', node);
}

function injectInteractionStyle() {
  if (document.getElementById('auto-t-interaction-style')) return;

  const style = document.createElement('style');
  style.id = 'auto-t-interaction-style';
  style.textContent = `
    .${INTERACTION_TRANSLATION_CLASS} {
      display: block;
      box-sizing: border-box;
      width: auto;
      max-width: min(680px, 100%);
      margin: 8px 0 10px;
      padding: 6px 8px;
      border: 1px solid rgba(31, 122, 90, 0.18);
      border-left: 2px solid rgba(31, 122, 90, 0.72);
      border-radius: 6px;
      background: rgba(31, 122, 90, 0.06);
      color: inherit;
      font: inherit;
      line-height: 1.45;
      opacity: 0.86;
      white-space: normal;
      overflow-wrap: anywhere;
      clear: both;
    }
    .${INTERACTION_TRANSLATION_CLASS}[data-auto-t-interaction-placement="table-cell"] {
      display: block;
      width: 100%;
      max-width: 100%;
      margin: 6px 0 2px;
      padding: 5px 7px;
    }
    .${INTERACTION_TRANSLATION_CLASS}[data-auto-t-interaction-placement="compact-source"] {
      width: fit-content;
      min-width: min(220px, 100%);
      max-width: min(520px, 100%);
      margin-top: 6px;
    }
    .${INTERACTION_TRANSLATION_CLASS} .${TRANSLATION_INNER_CLASS} {
      display: inline;
      font: inherit;
      color: inherit;
      white-space: inherit;
    }
    .${INTERACTION_TRANSLATION_CLASS}.${TRANSLATION_LOADING_CLASS} {
      opacity: 0.68;
    }
    .${INTERACTION_TRANSLATION_CLASS}.${TRANSLATION_LOADING_CLASS} .${TRANSLATION_INNER_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 0.35em;
      vertical-align: baseline;
    }
    .${INTERACTION_TRANSLATION_CLASS} .${TRANSLATION_LOADING_SPINNER_CLASS} {
      display: inline-block;
      width: 0.82em;
      height: 0.82em;
      border: 0.13em solid currentColor;
      border-right-color: transparent;
      border-radius: 999px;
      animation: auto-t-interaction-translation-spin 0.8s linear infinite;
      flex: 0 0 auto;
    }
    .${INTERACTION_TRANSLATION_CLASS} .${TRANSLATION_LOADING_LABEL_CLASS} {
      font: inherit;
      color: inherit;
    }
    @keyframes auto-t-interaction-translation-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.documentElement.appendChild(style);
}
