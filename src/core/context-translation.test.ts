import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findSentenceAtOffset,
  resolveContextTranslationTarget,
  resolveHoverTarget,
  resolveSelectionTarget,
} from '@/src/core/context-translation';

describe('context translation target resolution', () => {
  beforeEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          display: 'block',
          visibility: 'visible',
        }) as CSSStyleDeclaration,
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('prefers selected text over the hover target', () => {
    document.body.innerHTML = `
      <main>
        <p id="selected">The word token should translate according to this product context.</p>
        <p id="hovered">Hovered text should not win while there is a selection.</p>
      </main>
    `;
    const selected = document.getElementById('selected')?.firstChild;
    const hovered = document.getElementById('hovered')?.firstChild;
    expect(selected).toBeTruthy();
    expect(hovered).toBeTruthy();

    const range = document.createRange();
    range.setStart(selected as Text, 9);
    range.setEnd(selected as Text, 14);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    mockCaret(hovered as Text, 8);

    const target = resolveContextTranslationTarget({ x: 10, y: 10 });

    expect(target?.translationKind).toBe('context-selection');
    expect(target?.segment.text).toBe('token');
    expect(target?.contextSegments[0]?.text).toContain('product context');
  });

  it('uses the hovered sentence when there is no selection', () => {
    document.body.innerHTML = `
      <main>
        <p id="hovered">First sentence is here. Second sentence has the pointer. Third sentence remains context.</p>
      </main>
    `;
    const textNode = document.getElementById('hovered')?.firstChild as Text;
    window.getSelection()?.removeAllRanges();
    mockCaret(textNode, 41);

    const target = resolveHoverTarget({ x: 20, y: 20 });

    expect(target?.translationKind).toBe('context-hover');
    expect(target?.segment.text).toBe('Second sentence has the pointer.');
    expect(target?.contextSegments[0]?.text).toContain('Third sentence remains context');
  });

  it('falls back to the paragraph when sentence splitting cannot produce useful text', () => {
    document.body.innerHTML = `
      <main>
        <p id="hovered">Context aware translation can still use the entire paragraph when punctuation is missing</p>
      </main>
    `;
    const textNode = document.getElementById('hovered')?.firstChild as Text;
    window.getSelection()?.removeAllRanges();
    mockCaret(textNode, 12);

    const target = resolveHoverTarget({ x: 20, y: 20 });

    expect(target?.segment.text).toBe(
      'Context aware translation can still use the entire paragraph when punctuation is missing',
    );
  });

  it('extracts the sentence at a character offset', () => {
    expect(findSentenceAtOffset('One. Two is selected. Three.', 8)).toBe('Two is selected.');
  });

  it('returns null for empty selections', () => {
    window.getSelection()?.removeAllRanges();
    expect(resolveSelectionTarget()).toBeNull();
  });
});

function mockCaret(node: Text, offset: number) {
  Object.defineProperty(document, 'caretPositionFromPoint', {
    configurable: true,
    value: () => ({
      offsetNode: node,
      offset,
    }),
  });
}
