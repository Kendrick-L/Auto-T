import { EXTENSION_SEGMENT_ATTR, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import { stableTextHash } from '@/src/utils/hash';

export type PageSegment = {
  id: string;
  text: string;
  tagName: string;
  hash: string;
};

export type ScanPageSegmentsOptions = {
  limit?: number;
  viewportOnly?: boolean;
};

const SEGMENT_BOUNDARY_SELECTOR = [
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
  '[class*="question" i]',
  '[class*="answer" i]',
  '[class*="option" i]',
  '[class*="scenario" i]',
  '[class*="instruction" i]',
].join(',');

const BLOCK_FALLBACK_SELECTOR = 'main,article,section,div';
const HARD_SKIP_SELECTOR = [
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'kbd',
  'samp',
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

export function scanPageSegments(options: ScanPageSegmentsOptions = {}): PageSegment[] {
  const limit = options.limit ?? 80;
  const textNodes = collectTextNodes(options.viewportOnly ?? false);
  const candidates = new Map<HTMLElement, string[]>();

  for (const node of textNodes) {
    const owner = findSegmentOwner(node);
    if (!owner) continue;

    const parts = candidates.get(owner) ?? [];
    parts.push(node.textContent ?? '');
    candidates.set(owner, parts);
  }

  const segments: PageSegment[] = [];
  const seen = new Set<string>();

  for (const [element, parts] of candidates) {
    if (segments.length >= limit) break;
    if (!isVisible(element)) continue;
    if (options.viewportOnly && !isInViewport(element)) continue;

    const text = normalizeText(parts.join(' '));
    if (!isUsefulText(text)) continue;

    const hash = stableTextHash(text);
    if (seen.has(hash)) continue;
    seen.add(hash);

    const id = element.getAttribute(EXTENSION_SEGMENT_ATTR) ?? `auto_t_${hash}`;
    element.setAttribute(EXTENSION_SEGMENT_ATTR, id);

    segments.push({
      id,
      text,
      tagName: element.tagName.toLowerCase(),
      hash,
    });
  }

  return segments;
}

function collectTextNodes(viewportOnly: boolean) {
  const nodes: Text[] = [];
  const root = document.body;
  if (!root) return nodes;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeText(node.textContent ?? '');
      if (!text) return NodeFilter.FILTER_REJECT;

      const parent = node.parentElement;
      if (!parent || parent.closest(HARD_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;
      if (viewportOnly && !isTextNodeInViewport(node as Text)) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      nodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  return nodes;
}

function findSegmentOwner(textNode: Text) {
  let element = textNode.parentElement;
  let fallback: HTMLElement | null = null;

  while (element && element !== document.body && element !== document.documentElement) {
    if (element.closest(HARD_SKIP_SELECTOR)) return null;
    if (element.matches(SEGMENT_BOUNDARY_SELECTOR)) return element;

    const style = window.getComputedStyle(element);
    if (!fallback && (isBlockLike(style.display) || element.matches(BLOCK_FALLBACK_SELECTOR))) {
      fallback = element;
    }

    element = element.parentElement;
  }

  return fallback;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function isUsefulText(text: string) {
  if (text.length < 12) return false;
  if (text.length > 3500) return false;
  if (/^[\d\s.,:/\\|()[\]{}#%+-]+$/.test(text)) return false;
  if (text.split(/\s+/).length < 3 && text.length < 24) return false;
  return true;
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function isInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const verticalPadding = Math.round(window.innerHeight * 0.35);
  return rect.bottom >= -verticalPadding && rect.top <= window.innerHeight + verticalPadding;
}

function isTextNodeInViewport(node: Text) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  range.detach();

  if (rect.width === 0 || rect.height === 0) {
    return node.parentElement ? isInViewport(node.parentElement) : false;
  }

  const verticalPadding = Math.round(window.innerHeight * 0.35);
  return rect.bottom >= -verticalPadding && rect.top <= window.innerHeight + verticalPadding;
}

function isBlockLike(display: string) {
  return (
    display === 'block' ||
    display === 'list-item' ||
    display === 'table-cell' ||
    display === 'table-row' ||
    display === 'flex' ||
    display === 'grid'
  );
}
