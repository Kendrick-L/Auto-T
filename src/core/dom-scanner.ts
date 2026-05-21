import { EXTENSION_SEGMENT_ATTR, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import { getActivePageRule, getRuleBoundarySelector, getRuleExcludeSelector, getScanRoots } from '@/src/core/page-rules';
import { stableTextHash } from '@/src/utils/hash';

export type PageSegment = {
  id: string;
  text: string;
  tagName: string;
  hash: string;
  protectedLiterals?: string[];
};

export type ScanPageSegmentsOptions = {
  limit?: number;
  pageUrl?: string;
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
const INLINE_PROTECTED_SELECTOR = 'code,kbd,samp';
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
type CandidatePart = {
  text: string;
  protected: boolean;
};

export function scanPageSegments(options: ScanPageSegmentsOptions = {}): PageSegment[] {
  const limit = options.limit ?? 80;
  const pageRule = getActivePageRule(options.pageUrl);
  const textNodes = collectTextNodes(options.viewportOnly ?? false, pageRule);
  const candidates = new Map<HTMLElement, CandidatePart[]>();

  for (const node of textNodes) {
    const owner = findSegmentOwner(node, pageRule);
    if (!owner) continue;

    const parts = candidates.get(owner) ?? [];
    parts.push({
      text: node.textContent ?? '',
      protected: isInlineProtectedTextNode(node),
    });
    candidates.set(owner, parts);
  }

  const segments: PageSegment[] = [];
  const seen = new Set<string>();

  for (const [element, parts] of candidates) {
    if (segments.length >= limit) break;
    if (!isVisible(element)) continue;
    if (options.viewportOnly && !isInViewport(element)) continue;

    const text = normalizeText(parts.map((part) => part.text).join(' '));
    const protectedLiterals = getProtectedLiterals(parts);
    if (!isUsefulText(text, element)) continue;
    if (protectedLiterals.length > 0 && parts.every((part) => part.protected)) continue;

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
      ...(protectedLiterals.length ? { protectedLiterals } : {}),
    });
  }

  return segments;
}

function collectTextNodes(viewportOnly: boolean, pageRule: ReturnType<typeof getActivePageRule>) {
  const nodes: Text[] = [];
  const root = document.body;
  if (!root) return nodes;

  const seen = new Set<Text>();
  const scanRoots = getScanRoots(root, pageRule);

  for (const scanRoot of scanRoots) {
    const walker = document.createTreeWalker(scanRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = normalizeText(node.textContent ?? '');
        if (!text) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent || shouldSkipElement(parent, pageRule)) return NodeFilter.FILTER_REJECT;
        if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;
        if (viewportOnly && !isTextNodeInViewport(node as Text)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && !seen.has(node as Text)) {
        seen.add(node as Text);
        nodes.push(node as Text);
      }
      node = walker.nextNode();
    }
  }

  return nodes;
}

function findSegmentOwner(textNode: Text, pageRule: ReturnType<typeof getActivePageRule>) {
  let element = textNode.parentElement;
  let fallback: HTMLElement | null = null;
  const ruleBoundarySelector = getRuleBoundarySelector(pageRule);

  while (element && element !== document.body && element !== document.documentElement) {
    if (shouldSkipElement(element, pageRule)) return null;
    if (ruleBoundarySelector && element.matches(ruleBoundarySelector)) return element;
    if (element.matches(SEGMENT_BOUNDARY_SELECTOR)) return element;

    const style = window.getComputedStyle(element);
    if (!fallback && (isBlockLike(style.display) || element.matches(BLOCK_FALLBACK_SELECTOR))) {
      fallback = element;
    }

    element = element.parentElement;
  }

  return fallback;
}

function shouldSkipElement(element: HTMLElement, pageRule: ReturnType<typeof getActivePageRule>) {
  if (element.closest(HARD_SKIP_SELECTOR)) return true;

  const ruleExcludeSelector = getRuleExcludeSelector(pageRule);
  return Boolean(ruleExcludeSelector && element.closest(ruleExcludeSelector));
}

function isInlineProtectedTextNode(node: Text) {
  const parent = node.parentElement;
  return Boolean(parent?.closest(INLINE_PROTECTED_SELECTOR));
}

function getProtectedLiterals(parts: CandidatePart[]) {
  return [
    ...new Set(
      parts
        .filter((part) => part.protected)
        .map((part) => normalizeText(part.text))
        .filter(Boolean),
    ),
  ];
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function isUsefulText(text: string, element?: HTMLElement) {
  if (isInteractiveLabel(element)) {
    return text.length >= 3 && !/^[\d\s.,:/\\|()[\]{}#%+-]+$/.test(text);
  }
  if (isHeading(element)) {
    return text.length >= 3 && !/^[\d\s.,:/\\|()[\]{}#%+-]+$/.test(text);
  }

  if (text.length < 12) return false;
  if (text.length > 3500) return false;
  if (/^[\d\s.,:/\\|()[\]{}#%+-]+$/.test(text)) return false;
  if (text.split(/\s+/).length < 3 && text.length < 24) return false;
  return true;
}

function isInteractiveLabel(element?: HTMLElement) {
  return Boolean(element?.matches('button,label,[role="button"],[role="option"]'));
}

function isHeading(element?: HTMLElement) {
  return Boolean(element?.matches('h1,h2,h3,h4,h5,h6'));
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
