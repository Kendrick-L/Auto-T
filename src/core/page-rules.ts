export type PageRule = {
  id: string;
  matches: string[];
  selectors?: string[];
  containerSelectors?: string[];
  excludeSelectors?: string[];
  extraBlockSelectors?: string[];
};

const COMMON_CONTAINER_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '[class*="content" i]',
  '[class*="article" i]',
  '[class*="post" i]',
].join(',');

const BUILT_IN_PAGE_RULES: PageRule[] = [
  {
    id: 'mobalytics-build',
    matches: ['mobalytics.gg'],
    containerSelectors: ['main', '[class*="build" i]', '[class*="lexical-rich-text-content" i]'],
    extraBlockSelectors: [
      '[data-lexical-editor="true"] p',
      '[data-lexical-editor] p',
      '[class*="lexical-rich-text-content" i] p',
      '[class*="lexical-rich-text-content" i] li',
    ],
    excludeSelectors: ['[class*="sidebar" i]', '[class*="advert" i]', '[class*="ad-" i]'],
  },
  {
    id: 'github-content',
    matches: ['github.com'],
    containerSelectors: ['main', 'article', '[data-testid="issue-viewer-issue-container"]', '.markdown-body'],
    extraBlockSelectors: ['.markdown-body p', '.markdown-body li', '.markdown-body td', '.markdown-body th'],
    excludeSelectors: ['.Header', '.AppHeader', '[data-testid="issue-metadata-sticky"]'],
  },
];

export function getActivePageRule(url = globalThis.location?.href ?? '') {
  const hostname = getHostname(url);
  if (!hostname) return null;

  return BUILT_IN_PAGE_RULES.find((rule) =>
    rule.matches.some((match) => hostname === match || hostname.endsWith(`.${match}`)),
  ) ?? null;
}

export function getRuleBoundarySelector(rule: PageRule | null) {
  return joinSelectors(rule?.selectors, rule?.extraBlockSelectors);
}

export function getRuleExcludeSelector(rule: PageRule | null) {
  return joinSelectors(rule?.excludeSelectors);
}

export function getScanRoots(root: HTMLElement, rule: PageRule | null) {
  const ruleRoots = queryRoots(root, rule?.selectors, rule?.containerSelectors);
  if (ruleRoots.length > 0) return ruleRoots;
  if (!rule) return [root];

  const heuristicRoot = findLikelyContentContainer(root);
  return heuristicRoot ? [heuristicRoot] : [root];
}

function queryRoots(root: HTMLElement, ...selectorGroups: Array<string[] | undefined>) {
  const seen = new Set<HTMLElement>();
  const roots: HTMLElement[] = [];

  for (const selectors of selectorGroups) {
    for (const selector of selectors ?? []) {
      root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        roots.push(element);
      });
    }
  }

  return roots;
}

function findLikelyContentContainer(root: HTMLElement) {
  const bodyWordCount = getWordCount(root.innerText);
  if (bodyWordCount < 120) return null;

  const commonContainers = Array.from(root.querySelectorAll<HTMLElement>(COMMON_CONTAINER_SELECTORS));
  const paragraphs = Array.from(root.querySelectorAll<HTMLElement>('p'));
  const candidates = new Set<HTMLElement>(commonContainers);

  for (const paragraph of paragraphs) {
    if (getWordCount(paragraph.innerText) < 12) continue;
    let current: HTMLElement | null = paragraph;

    while (current && current !== root) {
      const words = getWordCount(current.innerText);
      if (words >= bodyWordCount * 0.12 && words <= bodyWordCount * 0.82) {
        candidates.add(current);
      }
      current = current.parentElement;
    }
  }

  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const words = getWordCount(candidate.innerText);
    if (words < 40 || words > bodyWordCount * 0.9) continue;

    const rect = candidate.getBoundingClientRect();
    const density = words / Math.max(rect.height || 1, 1);
    const score = words + density * 20;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function getWordCount(text: string) {
  return text.match(/\S+/g)?.length ?? 0;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function joinSelectors(...groups: Array<string[] | undefined>) {
  return groups.flatMap((group) => group ?? []).filter(Boolean).join(',');
}
