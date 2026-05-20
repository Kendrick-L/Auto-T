import {
  EXTENSION_SEGMENT_ATTR,
  EXTENSION_SOURCE_HIDDEN_CLASS,
  EXTENSION_TRANSLATION_ATTR,
  EXTENSION_TRANSLATION_CLASS,
} from '@/src/constants';
import type { UserSettings } from '@/src/storage/settings-store';
import type { TranslatedSegment } from '@/src/translation/types';

export type RenderTranslationResult = {
  id: string;
  status: 'inserted' | 'updated' | 'missing-source';
  sourceText?: string;
  translation: string;
  placement?: TranslationPlacement;
  anchor?: ElementSnapshot;
  source?: ElementSnapshot;
  translationNode?: ElementSnapshot;
};

const TRANSLATION_INNER_CLASS = 'auto-t-translation-inner';
const TRANSLATION_PORTAL_ID = 'auto-t-translation-layer';
type TranslationPlacement = 'inline-inside-source' | 'after-source' | 'portal-overlay';
type PlacementResult = {
  anchor: HTMLElement;
  placement: TranslationPlacement;
};
type ElementSnapshot = {
  tagName: string;
  className: string;
  text: string;
  rect: {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  };
  style: {
    display: string;
    visibility: string;
    opacity: string;
    overflow: string;
    position: string;
    whiteSpace: string;
    zIndex: string;
  };
  outerHTML: string;
};

export function renderTranslations(segments: TranslatedSegment[], displayMode: UserSettings['displayMode']) {
  injectStyle();
  const results: RenderTranslationResult[] = [];

  for (const segment of segments) {
    const source = document.querySelector<HTMLElement>(`[${EXTENSION_SEGMENT_ATTR}="${CSS.escape(segment.id)}"]`);
    if (!source) {
      results.push({
        id: segment.id,
        status: 'missing-source',
        translation: segment.translation,
      });
      continue;
    }
    source.classList.toggle(EXTENSION_SOURCE_HIDDEN_CLASS, displayMode === 'translation-only');
    const sourceText = getSourceText(source);

    const existing = document.querySelector<HTMLElement>(`[${EXTENSION_TRANSLATION_ATTR}="${CSS.escape(segment.id)}"]`);
    if (existing) {
      setTranslationText(existing, segment.translation);
      inheritSourceTypography(source, existing);
      const placementResult = placeTranslation(source, existing, displayMode);
      results.push({
        id: segment.id,
        status: 'updated',
        sourceText,
        translation: segment.translation,
        placement: placementResult.placement,
        anchor: snapshotElement(placementResult.anchor),
        source: snapshotElement(source),
        translationNode: snapshotElement(existing),
      });
      continue;
    }

    const translation = createTranslationElement(segment.id, segment.translation);
    translation.className = EXTENSION_TRANSLATION_CLASS;
    translation.setAttribute(EXTENSION_TRANSLATION_ATTR, segment.id);
    inheritSourceTypography(source, translation);
    const placementResult = placeTranslation(source, translation, displayMode);
    results.push({
      id: segment.id,
      status: 'inserted',
      sourceText,
      translation: segment.translation,
      placement: placementResult.placement,
      anchor: snapshotElement(placementResult.anchor),
      source: snapshotElement(source),
      translationNode: snapshotElement(translation),
    });
  }

  return results;
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

function createTranslationElement(segmentId: string, translationText: string) {
  const wrapper = document.createElement('span');
  wrapper.className = EXTENSION_TRANSLATION_CLASS;
  wrapper.setAttribute(EXTENSION_TRANSLATION_ATTR, segmentId);
  wrapper.setAttribute('translate', 'no');

  const lineBreak = document.createElement('br');
  const inner = document.createElement('span');
  inner.className = TRANSLATION_INNER_CLASS;
  inner.textContent = translationText;

  wrapper.append(lineBreak, inner);
  return wrapper;
}

function setTranslationText(translation: HTMLElement, text: string) {
  const inner = translation.querySelector<HTMLElement>(`.${TRANSLATION_INNER_CLASS}`);
  if (inner) {
    inner.textContent = text;
    return;
  }

  translation.textContent = '';
  translation.append(document.createElement('br'));
  const nextInner = document.createElement('span');
  nextInner.className = TRANSLATION_INNER_CLASS;
  nextInner.textContent = text;
  translation.append(nextInner);
}

function placeTranslation(
  source: HTMLElement,
  translation: HTMLElement,
  displayMode: UserSettings['displayMode'],
): PlacementResult {
  if (displayMode === 'translation-only') {
    source.insertAdjacentElement('afterend', translation);
    return { anchor: source, placement: 'after-source' };
  }

  const richTextRoot = findRichTextRoot(source);
  if (richTextRoot) {
    const portalItem = ensurePortalItem(source, translation);
    return { anchor: portalItem, placement: 'portal-overlay' };
  }

  const anchor = findLastTextAnchor(source) ?? source;
  anchor.appendChild(translation);
  return { anchor, placement: 'inline-inside-source' };
}

function injectStyle() {
  if (document.getElementById('auto-t-style')) return;

  const style = document.createElement('style');
  style.id = 'auto-t-style';
  style.textContent = `
    .${EXTENSION_TRANSLATION_CLASS} {
      display: inline;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: 0;
      opacity: 0.86;
      white-space: inherit;
    }
    #${TRANSLATION_PORTAL_ID} {
      position: absolute;
      inset: 0 auto auto 0;
      z-index: 2147483646;
      pointer-events: none;
    }
    #${TRANSLATION_PORTAL_ID} .${EXTENSION_TRANSLATION_CLASS} {
      position: absolute;
      display: block;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    #${TRANSLATION_PORTAL_ID} .${EXTENSION_TRANSLATION_CLASS} br {
      display: none;
    }
    .${EXTENSION_TRANSLATION_CLASS}.${EXTENSION_TRANSLATION_CLASS} {
      font: inherit;
      color: inherit;
    }
    .${TRANSLATION_INNER_CLASS} {
      display: inline;
      font: inherit;
      color: inherit;
      white-space: inherit;
    }
    .${EXTENSION_SOURCE_HIDDEN_CLASS} {
      display: none !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function findRichTextRoot(element: HTMLElement) {
  return element.closest<HTMLElement>(
    [
      '[data-lexical-editor="true"]',
      '[data-lexical-editor]',
      '.lexical-rich-text-content',
      '[class*="lexical-rich-text-content" i]',
    ].join(','),
  );
}

function ensurePortalItem(source: HTMLElement, translation: HTMLElement) {
  const layer = ensurePortalLayer();
  const rect = source.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(source);
  const existing = layer.querySelector<HTMLElement>(
    `[${EXTENSION_TRANSLATION_ATTR}="${CSS.escape(translation.getAttribute(EXTENSION_TRANSLATION_ATTR) ?? '')}"]`,
  );
  const item = existing ?? translation;

  item.className = EXTENSION_TRANSLATION_CLASS;
  item.style.left = `${Math.round((rect.left + window.scrollX) * 100) / 100}px`;
  item.style.top = `${Math.round((rect.bottom + window.scrollY + 3) * 100) / 100}px`;
  item.style.width = `${Math.max(Math.round(rect.width * 100) / 100, 120)}px`;
  item.style.fontSize = translation.style.fontSize;
  item.style.fontFamily = translation.style.fontFamily;
  item.style.fontWeight = translation.style.fontWeight;
  item.style.letterSpacing = translation.style.letterSpacing;
  item.style.lineHeight = translation.style.lineHeight;
  item.style.color = translation.style.color;
  item.style.opacity = '0.86';
  item.style.whiteSpace = sourceStyle.whiteSpace === 'nowrap' ? 'normal' : sourceStyle.whiteSpace;

  if (!existing) {
    layer.appendChild(item);
  }

  return item;
}

function ensurePortalLayer() {
  const existing = document.getElementById(TRANSLATION_PORTAL_ID);
  if (existing instanceof HTMLElement) return existing;

  const layer = document.createElement('div');
  layer.id = TRANSLATION_PORTAL_ID;
  layer.setAttribute('translate', 'no');
  document.body.appendChild(layer);
  return layer;
}

function findLastTextAnchor(root: HTMLElement) {
  let lastTextNode: Text | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;

      const parent = node.parentElement;
      if (!parent || parent.closest(`.${EXTENSION_TRANSLATION_CLASS}`)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    lastTextNode = node as Text;
    node = walker.nextNode();
  }

  return lastTextNode?.parentElement ?? null;
}

function getSourceText(element: HTMLElement) {
  const parts: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent?.closest(`.${EXTENSION_TRANSLATION_CLASS}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    parts.push(node.textContent ?? '');
    node = walker.nextNode();
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function snapshotElement(element: HTMLElement): ElementSnapshot {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return {
    tagName: element.tagName.toLowerCase(),
    className: String(element.className || ''),
    text: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 2000),
    rect: {
      bottom: Math.round(rect.bottom * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      left: Math.round(rect.left * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
    },
    style: {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      overflow: style.overflow,
      position: style.position,
      whiteSpace: style.whiteSpace,
      zIndex: style.zIndex,
    },
    outerHTML: element.outerHTML.slice(0, 6000),
  };
}
