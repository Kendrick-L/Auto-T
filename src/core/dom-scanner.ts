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

const TRANSLATABLE_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,td,th';
const DEEP_TEXT_SELECTOR = `${TRANSLATABLE_SELECTOR},main,article,section,div,span,strong,em`;
const SKIP_SELECTOR = [
  'script',
  'style',
  'noscript',
  'code',
  'pre',
  'kbd',
  'samp',
  'textarea',
  'input',
  'button',
  'select',
  'svg',
  'canvas',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
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
  const elements = [...document.querySelectorAll<HTMLElement>(DEEP_TEXT_SELECTOR)];
  const segments: PageSegment[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    if (segments.length >= limit) break;
    if (element.closest(SKIP_SELECTOR)) continue;
    if (!isVisible(element)) continue;
    if (options.viewportOnly && !isInViewport(element)) continue;

    const text = getElementText(element);
    if (!isUsefulText(text)) continue;
    if (hasBetterChildCandidate(element, text)) continue;

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

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function getElementText(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.textContent?.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textParts: string[] = [];
  let node = walker.nextNode();
  while (node) {
    textParts.push(node.textContent ?? '');
    node = walker.nextNode();
  }

  return normalizeText(textParts.join(' '));
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

function hasBetterChildCandidate(element: HTMLElement, text: string) {
  const children = [...element.querySelectorAll<HTMLElement>(DEEP_TEXT_SELECTOR)];
  for (const child of children) {
    if (child.closest(SKIP_SELECTOR) || !isVisible(child)) continue;

    const childText = getElementText(child);
    if (!isUsefulText(childText)) continue;
    if (childText === text) return true;
    if (childText.length > 60 && childText.length / text.length > 0.72) return true;
  }

  return false;
}
