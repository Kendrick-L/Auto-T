import { EXTENSION_SEGMENT_ATTR, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';
import { stableTextHash } from '@/src/utils/hash';

export type PageSegment = {
  id: string;
  text: string;
  tagName: string;
  hash: string;
};

const TRANSLATABLE_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,td,th';
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

export function scanPageSegments(limit = 80): PageSegment[] {
  const elements = [...document.querySelectorAll<HTMLElement>(TRANSLATABLE_SELECTOR)];
  const segments: PageSegment[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    if (segments.length >= limit) break;
    if (element.closest(SKIP_SELECTOR)) continue;
    if (hasTranslatableChild(element)) continue;
    if (!isVisible(element)) continue;

    const text = normalizeText(element.innerText);
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

function hasTranslatableChild(element: HTMLElement) {
  return Boolean(element.querySelector(TRANSLATABLE_SELECTOR));
}
