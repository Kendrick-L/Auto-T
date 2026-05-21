import { describe, expect, it } from 'vitest';
import { buildTranslationPrompt } from '@/src/translation/prompt-builder';
import type { TranslateRequest } from '@/src/translation/types';

describe('buildTranslationPrompt', () => {
  it('includes the selected domain profile and glossary terms', () => {
    const prompt = buildTranslationPrompt({
      ...makeRequest({ domainProfile: 'finance' }),
      contextSegments: [
        {
          id: 'context-1',
          text: 'The report discusses operating margin and recurring revenue.',
        },
      ],
    });

    expect(prompt).toContain('Treat the page as financial content');
    expect(prompt).toContain('Revenue => 收入');
    expect(prompt).toContain('Nearby page context:');
    expect(prompt).toContain('operating margin and recurring revenue');
    expect(prompt).toContain('Target language: zh-CN.');
    expect(prompt).toContain('"id":"segment-1"');
  });

  it('keeps technical mode instructions separate from domain profile instructions', () => {
    const prompt = buildTranslationPrompt(makeRequest({ mode: 'technical', domainProfile: 'product' }));

    expect(prompt).toContain('Use precise technical terminology');
    expect(prompt).toContain('Treat the page as product or SaaS documentation');
  });

  it('sends protected inline literals as placeholders', () => {
    const prompt = buildTranslationPrompt({
      ...makeRequest(),
      segments: [
        {
          id: 'segment-1',
          text: 'Hermes snapshots ~/.hermes/skills/ before each pass.',
          tagName: 'p',
          hash: 'abc',
          protectedLiterals: ['~/.hermes/skills/'],
        },
      ],
    });

    expect(prompt).toContain('Protected literals:');
    expect(prompt).toContain('segment-1: [[AUTO_T_LITERAL_1]] = ~/.hermes/skills/');
    expect(prompt).toContain('"text":"Hermes snapshots [[AUTO_T_LITERAL_1]] before each pass."');
  });

  it('adds a contextual rule for selection translations', () => {
    const prompt = buildTranslationPrompt({
      ...makeRequest(),
      translationKind: 'context-selection',
      contextSegments: [
        {
          id: 'context-1',
          text: 'The selected word appears in a software deployment paragraph.',
        },
      ],
    });

    expect(prompt).toContain('translate the selected word, phrase, sentence, or paragraph');
    expect(prompt).toContain('best contextual translation');
    expect(prompt).toContain('software deployment paragraph');
  });
});

function makeRequest(
  overrides: Partial<TranslateRequest['settings']> = {},
): TranslateRequest {
  return {
    segments: [
      {
        id: 'segment-1',
        text: 'Revenue increased by 12% during the quarter.',
        tagName: 'p',
        hash: 'abc',
      },
    ],
    pageTitle: 'Quarterly report',
    pageUrl: 'https://example.com/report',
    settings: {
      extensionEnabled: true,
      deepseekApiKey: '',
      deepseekModel: 'deepseek-chat',
      targetLang: 'zh-CN',
      sourceLang: 'auto',
      mode: 'normal',
      domainProfile: 'general',
      displayMode: 'bilingual',
      autoTranslate: false,
      enableCache: true,
      debugLogging: false,
      ...overrides,
    },
    glossary: [
      {
        id: 'term-1',
        source: 'Revenue',
        target: '收入',
      },
    ],
  };
}
