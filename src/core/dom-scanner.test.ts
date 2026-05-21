import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scanPageSegments } from '@/src/core/dom-scanner';

describe('scanPageSegments', () => {
  beforeEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({
          display: getDisplay(element as HTMLElement),
          visibility: 'visible',
        }) as CSSStyleDeclaration,
    );

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
      const top = Number(this.dataset.testTop ?? 10);
      const height = Number(this.dataset.testHeight ?? 32);
      const width = Number(this.dataset.testWidth ?? 640);
      return {
        bottom: top + height,
        height,
        left: 0,
        right: width,
        top,
        width,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('uses Mobalytics page rules to scan rich text and short button labels', () => {
    document.body.innerHTML = `
      <main>
        <aside class="sidebar">This sidebar advertisement should never be translated.</aside>
        <button>Show All</button>
        <section class="lexical-rich-text-content">
          <p>This is my leveling guide for Poisonburst Pathfinder, swap to endgame after campaign.</p>
          <p>Vendor regex: "y: \\+Its: S|\\d+% i.+mov|ward|phy.*att.*|uiv"</p>
        </section>
      </main>
    `;

    const texts = scanPageSegments({
      limit: 20,
      pageUrl: 'https://mobalytics.gg/poe-2/profile/example/builds/demo',
    }).map((segment) => segment.text);

    expect(texts).toContain('Show All');
    expect(texts).toContain('This is my leveling guide for Poisonburst Pathfinder, swap to endgame after campaign.');
    expect(texts.join(' ')).not.toContain('sidebar advertisement');
  });

  it('uses GitHub page rules to prefer markdown content and exclude chrome UI', () => {
    document.body.innerHTML = `
      <header class="Header">Pull requests and navigation should stay out.</header>
      <main>
        <article class="markdown-body">
          <h1>Project Overview</h1>
          <p>This repository contains a small browser extension for bilingual webpage translation.</p>
          <ul>
            <li>Translate visible content while preserving the original page layout.</li>
          </ul>
        </article>
      </main>
    `;

    const texts = scanPageSegments({ limit: 20, pageUrl: 'https://github.com/acme/project' }).map(
      (segment) => segment.text,
    );

    expect(texts).toContain('Project Overview');
    expect(texts).toContain('This repository contains a small browser extension for bilingual webpage translation.');
    expect(texts).toContain('Translate visible content while preserving the original page layout.');
    expect(texts.join(' ')).not.toContain('Pull requests and navigation');
  });

  it('keeps generic scanning broad on pages without a built-in rule', () => {
    document.body.innerHTML = `
      <nav>This navigation item should be skipped by the hard skip selector.</nav>
      <main>
        <p>Generic documentation pages still need to scan normal paragraph content.</p>
        <code>const ignored = true;</code>
      </main>
    `;

    const texts = scanPageSegments({ limit: 20, pageUrl: 'https://example.com/docs' }).map((segment) => segment.text);

    expect(texts).toContain('Generic documentation pages still need to scan normal paragraph content.');
    expect(texts.join(' ')).not.toContain('navigation item');
    expect(texts.join(' ')).not.toContain('const ignored');
  });
});

function getDisplay(element: HTMLElement) {
  if (element.dataset.testDisplay) return element.dataset.testDisplay;
  if (['P', 'H1', 'H2', 'H3', 'LI', 'MAIN', 'ARTICLE', 'SECTION', 'DIV', 'HEADER', 'NAV', 'ASIDE'].includes(element.tagName)) {
    return 'block';
  }
  return 'inline';
}
