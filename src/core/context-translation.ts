import { EXTENSION_SEGMENT_ATTR, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import { stableTextHash } from '@/src/utils/hash';
import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslationContextSegment, TranslationKind } from '@/src/translation/types';

export type PointerPosition = {
  x: number;
  y: number;
};

export type ContextTranslationTarget = {
  anchor: HTMLElement;
  contextSegments: TranslationContextSegment[];
  segment: PageSegment;
  translationKind: Extract<TranslationKind, 'context-selection' | 'context-hover'>;
};

type CaretLookup = {
  node: Node;
  offset: number;
};

const BLOCK_OWNER_SELECTOR = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'figcaption',
  'td',
  'th',
  'label',
  'button',
  '[role="listitem"]',
  '[role="option"]',
  '[role="button"]',
  '[role="group"]',
  'main',
  'article',
  'section',
  'div',
].join(',');

const HARD_SKIP_SELECTOR = [
  'script',
  'style',
  'noscript',
  'pre',
  'textarea',
  'input',
  'select',
  'svg',
  'canvas',
  'nav',
  'footer',
  'aside',
  'menu',
  '[hidden]',
  '[aria-hidden="true"]',
  '[contenteditable="true"]',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  `.${EXTENSION_TRANSLATION_CLASS}`,
].join(',');

const INLINE_PROTECTED_SELECTOR = 'code,kbd,samp';
const SENTENCE_BOUNDARY_PATTERN = /[.!?。！？；;]\s*/g;

export function resolveContextTranslationTarget(pointer: PointerPosition | null): ContextTranslationTarget | null {
  const selectionTarget = resolveSelectionTarget();
  if (selectionTarget) return selectionTarget;

  if (!pointer) return null;
  return resolveHoverTarget(pointer);
}

export function resolveSelectionTarget(selection: Selection | null = window.getSelection()): ContextTranslationTarget | null {
  const selectedText = normalizeText(selection?.toString() ?? '');
  if (!selectedText || !selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const anchor = findBlockOwner(range.commonAncestorContainer);
  if (!anchor) return null;

  const anchorText = getElementText(anchor);
  const contextSegments = anchorText ? [toContextSegment(anchor, anchorText)] : [];

  return {
    anchor,
    contextSegments,
    segment: createInteractionSegment({
      anchor,
      text: selectedText,
      tagName: anchor.tagName.toLowerCase(),
      translationKind: 'context-selection',
      protectedLiterals: getProtectedLiteralsInRange(range),
    }),
    translationKind: 'context-selection',
  };
}

export function resolveHoverTarget(pointer: PointerPosition): ContextTranslationTarget | null {
  const caret = getCaretFromPoint(pointer);
  if (!caret) return null;

  const anchor = findBlockOwner(caret.node);
  if (!anchor) return null;

  const blockText = getElementText(anchor);
  if (!blockText) return null;

  const nodeText = caret.node.nodeType === Node.TEXT_NODE ? normalizeText(caret.node.textContent ?? '') : '';
  const sentence = nodeText ? findSentenceAtOffset(caret.node.textContent ?? '', caret.offset) : null;
  const text = normalizeText(sentence ?? '') || blockText;

  return {
    anchor,
    contextSegments: [toContextSegment(anchor, blockText)],
    segment: createInteractionSegment({
      anchor,
      text,
      tagName: anchor.tagName.toLowerCase(),
      translationKind: 'context-hover',
      protectedLiterals: getProtectedLiterals(anchor).filter((literal) => text.includes(literal)),
    }),
    translationKind: 'context-hover',
  };
}

export function findSentenceAtOffset(text: string, offset: number): string | null {
  const normalizedText = text.replace(/\s+/g, ' ');
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const normalizedOffset = normalizeOffset(text, safeOffset);
  let start = 0;
  let match: RegExpExecArray | null;

  SENTENCE_BOUNDARY_PATTERN.lastIndex = 0;
  while ((match = SENTENCE_BOUNDARY_PATTERN.exec(normalizedText))) {
    const end = match.index + match[0].length;
    if (normalizedOffset <= end) {
      const candidate = normalizeText(normalizedText.slice(start, end));
      return isUsefulInteractionText(candidate) ? candidate : null;
    }
    start = end;
  }

  const tail = normalizeText(normalizedText.slice(start));
  return isUsefulInteractionText(tail) ? tail : null;
}

function getCaretFromPoint(pointer: PointerPosition): CaretLookup | null {
  const documentWithCaretPosition = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const position = documentWithCaretPosition.caretPositionFromPoint?.(pointer.x, pointer.y);
  if (position?.offsetNode) {
    return {
      node: position.offsetNode,
      offset: position.offset,
    };
  }

  const range = documentWithCaretPosition.caretRangeFromPoint?.(pointer.x, pointer.y);
  if (range?.startContainer) {
    return {
      node: range.startContainer,
      offset: range.startOffset,
    };
  }

  const element = document.elementFromPoint(pointer.x, pointer.y);
  const textNode = element ? findFirstTextNode(element) : null;
  return textNode ? { node: textNode, offset: 0 } : null;
}

function findBlockOwner(node: Node): HTMLElement | null {
  const start = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  let element = start instanceof HTMLElement ? start : null;

  while (element && element !== document.body && element !== document.documentElement) {
    if (element.closest(HARD_SKIP_SELECTOR)) return null;
    if (element.matches(BLOCK_OWNER_SELECTOR) && getElementText(element)) return element;
    element = element.parentElement;
  }

  return null;
}

function createInteractionSegment(options: {
  anchor: HTMLElement;
  protectedLiterals: string[];
  tagName: string;
  text: string;
  translationKind: TranslationKind;
}): PageSegment {
  const text = normalizeText(options.text);
  const anchorId = ensureAnchorId(options.anchor);
  const hash = stableTextHash(text);
  return {
    id: `auto_t_interaction_${stableTextHash(`${options.translationKind}|${anchorId}|${text}`)}`,
    text,
    tagName: options.tagName,
    hash,
    ...(options.protectedLiterals.length ? { protectedLiterals: options.protectedLiterals } : {}),
  };
}

function ensureAnchorId(anchor: HTMLElement) {
  const existing = anchor.getAttribute(EXTENSION_SEGMENT_ATTR);
  if (existing) return existing;

  const id = `auto_t_anchor_${stableTextHash(`${anchor.tagName}|${getElementText(anchor)}`)}`;
  anchor.setAttribute(EXTENSION_SEGMENT_ATTR, id);
  return id;
}

function toContextSegment(anchor: HTMLElement, text: string): TranslationContextSegment {
  return {
    id: anchor.getAttribute(EXTENSION_SEGMENT_ATTR) ?? ensureAnchorId(anchor),
    text: truncateContextText(text),
  };
}

function getElementText(element: HTMLElement) {
  const parts: string[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(`.${EXTENSION_TRANSLATION_CLASS}`)) {
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

  return normalizeText(parts.join(' '));
}

function getProtectedLiteralsInRange(range: Range) {
  const commonAncestor = range.commonAncestorContainer;
  const owner = findBlockOwner(commonAncestor);
  if (!owner) return [];

  return getProtectedLiterals(owner).filter((literal) => range.toString().includes(literal));
}

function getProtectedLiterals(element: HTMLElement) {
  return [
    ...new Set(
      Array.from(element.querySelectorAll<HTMLElement>(INLINE_PROTECTED_SELECTOR))
        .map((node) => normalizeText(node.textContent ?? ''))
        .filter(Boolean),
    ),
  ];
}

function findFirstTextNode(element: Element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return normalizeText(node.textContent ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  return walker.nextNode() as Text | null;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeOffset(originalText: string, originalOffset: number) {
  return originalText.slice(0, originalOffset).replace(/\s+/g, ' ').length;
}

function truncateContextText(text: string) {
  const normalized = normalizeText(text);
  return normalized.length > 320 ? `${normalized.slice(0, 320)}...` : normalized;
}

function isUsefulInteractionText(text: string) {
  return text.length >= 2 && !/^[\d\s.,:/\\|()[\]{}#%+-]+$/.test(text);
}
