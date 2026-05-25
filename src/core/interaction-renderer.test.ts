import { afterEach, describe, expect, it } from 'vitest';
import { resolveHoverTarget } from '@/src/core/context-translation';
import {
  INTERACTION_TRANSLATION_ATTR,
  clearInteractionTranslationsForAnchor,
  clearInteractionTranslations,
  clearInteractionLoading,
  hasInteractionTranslation,
  removeInteractionTranslation,
  renderInteractionLoading,
  renderInteractionTranslation,
} from '@/src/core/interaction-renderer';
import { restorePage } from '@/src/core/restore';

describe('renderInteractionTranslation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates an existing interaction translation for the same target', () => {
    document.body.innerHTML = `
      <main>
        <p id="source">This sentence should receive a contextual translation.</p>
      </main>
    `;
    const target = resolveHoverTarget({ x: 0, y: 0 }) ?? makeTargetFromSource();

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '第一次译文',
    });
    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '第二次译文',
    });

    const nodes = document.querySelectorAll(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.textContent).toBe('第二次译文');
  });

  it('restore removes interaction translations', () => {
    const target = makeTargetFromSource();

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '上下文译文',
    });
    restorePage();

    expect(document.querySelector(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`)).toBeNull();
  });

  it('renders and clears interaction loading state', () => {
    const target = makeTargetFromSource();

    renderInteractionLoading(target);
    const loading = document.querySelector<HTMLElement>(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`);

    expect(loading?.classList.contains('auto-t-translation-loading')).toBe(true);
    expect(loading?.textContent).toContain('Translating...');

    clearInteractionLoading(target);

    expect(document.querySelector(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`)).toBeNull();
  });

  it('places table-cell interaction translations inside the cell', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td id="source">A table cell sentence that needs more room.</td>
          </tr>
        </tbody>
      </table>
    `;
    const source = document.getElementById('source') as HTMLElement;
    const target = makeTarget(source);

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '表格单元格译文',
    });

    const translation = document.querySelector<HTMLElement>(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`);
    expect(translation?.parentElement).toBe(source);
    expect(translation?.getAttribute('data-auto-t-interaction-placement')).toBe('table-cell');
  });

  it('marks compact source translations for roomier block styling', () => {
    document.body.innerHTML = `<button id="source">Translate this button label</button>`;
    const source = document.getElementById('source') as HTMLElement;
    const target = makeTarget(source);

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '按钮译文',
    });

    const translation = document.querySelector<HTMLElement>(`[${INTERACTION_TRANSLATION_ATTR}="${target.segment.id}"]`);
    expect(translation?.previousElementSibling).toBe(source);
    expect(translation?.getAttribute('data-auto-t-interaction-placement')).toBe('compact-source');
  });

  it('can detect, remove, and clear interaction translations', () => {
    const target = makeTargetFromSource();

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '上下文译文',
    });
    expect(hasInteractionTranslation(target.segment.id)).toBe(true);

    removeInteractionTranslation(target.segment.id);
    expect(hasInteractionTranslation(target.segment.id)).toBe(false);

    renderInteractionTranslation(target, {
      id: target.segment.id,
      source: target.segment.text,
      translation: '上下文译文',
    });
    clearInteractionTranslations();
    expect(hasInteractionTranslation(target.segment.id)).toBe(false);
  });

  it('clears other interaction translations attached to the same anchor', () => {
    const first = makeTargetFromSource();
    const second = {
      ...first,
      segment: {
        ...first.segment,
        id: 'interaction-2',
        text: 'A selected word',
      },
    };

    renderInteractionTranslation(first, {
      id: first.segment.id,
      source: first.segment.text,
      translation: '整句译文',
    });
    renderInteractionTranslation(second, {
      id: second.segment.id,
      source: second.segment.text,
      translation: '选区译文',
    });

    clearInteractionTranslationsForAnchor(second.anchor, second.segment.id);

    expect(hasInteractionTranslation(first.segment.id)).toBe(false);
    expect(hasInteractionTranslation(second.segment.id)).toBe(true);
  });
});

function makeTargetFromSource() {
  document.body.innerHTML = `
    <main>
      <p id="source">This sentence should receive a contextual translation.</p>
    </main>
  `;
  const source = document.getElementById('source') as HTMLElement;
  return makeTarget(source);
}

function makeTarget(source: HTMLElement) {
  return {
    anchor: source,
    contextSegments: [{ id: 'context-1', text: source.textContent ?? '' }],
    segment: {
      id: 'interaction-1',
      text: source.textContent ?? '',
      tagName: 'p',
      hash: 'hash',
    },
    translationKind: 'context-hover' as const,
  };
}
