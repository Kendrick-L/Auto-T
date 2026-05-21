import { afterEach, describe, expect, it } from 'vitest';
import { resolveHoverTarget } from '@/src/core/context-translation';
import { INTERACTION_TRANSLATION_ATTR, renderInteractionTranslation } from '@/src/core/interaction-renderer';
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
});

function makeTargetFromSource() {
  document.body.innerHTML = `
    <main>
      <p id="source">This sentence should receive a contextual translation.</p>
    </main>
  `;
  const source = document.getElementById('source') as HTMLElement;
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
