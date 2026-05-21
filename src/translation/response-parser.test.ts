import { describe, expect, it } from 'vitest';
import { parseTranslationResponse } from '@/src/translation/response-parser';

describe('parseTranslationResponse', () => {
  it('extracts JSON from fenced content with surrounding prose', () => {
    const translations = parseTranslationResponse(
      [
        'Here is the result:',
        '```json',
        JSON.stringify({
          segments: [{ id: 'segment-1', translation: '你好，世界。' }],
        }),
        '```',
        'Done.',
      ].join('\n'),
      [makeSegment('segment-1', 'Hello world.')],
    );

    expect(translations).toEqual([
      {
        id: 'segment-1',
        source: 'Hello world.',
        translation: '你好，世界。',
      },
    ]);
  });

  it('repairs common JSON typos and trailing commas', () => {
    const translations = parseTranslationResponse(
      `{
        "segments": [
          { "id": "segment-1", "translation"> "第一段。" },
          { "id": "segment-2", "translation": "第二段。", },
        ],
      }`,
      [makeSegment('segment-1', 'First segment.'), makeSegment('segment-2', 'Second segment.')],
    );

    expect(translations.map((segment) => segment.translation)).toEqual(['第一段。', '第二段。']);
  });

  it('extracts the first balanced JSON object when prose follows JSON', () => {
    const translations = parseTranslationResponse(
      `${JSON.stringify({
        segments: [{ id: 'segment-1', translation: '只有 JSON 会被解析。' }],
      })}\nThese are the translations.`,
      [makeSegment('segment-1', 'Only JSON should be parsed.')],
    );

    expect(translations[0]?.translation).toBe('只有 JSON 会被解析。');
  });

  it('keeps valid segments when other returned segments are malformed', () => {
    const translations = parseTranslationResponse(
      JSON.stringify({
        segments: [
          { id: 'segment-1', translation: '保留这个。' },
          { id: 'segment-2' },
          'not an object',
          { id: 'unknown', translation: 'Ignore unknown ids.' },
        ],
      }),
      [makeSegment('segment-1', 'Keep this.'), makeSegment('segment-2', 'Missing translation.')],
    );

    expect(translations).toEqual([
      {
        id: 'segment-1',
        source: 'Keep this.',
        translation: '保留这个。',
      },
    ]);
  });

  it('throws when no usable segment can be recovered', () => {
    expect(() =>
      parseTranslationResponse(
        JSON.stringify({
          segments: [{ id: 'unknown', translation: 'Ignored.' }, { id: 'segment-1' }],
        }),
        [makeSegment('segment-1', 'Needs a translation.')],
      ),
    ).toThrow('usable translations');
  });

  it('recovers translation text from nested non-standard fields', () => {
    const translations = parseTranslationResponse(
      JSON.stringify({
        segments: [
          { id: 1, translation: { zh: '嵌套译文。' } },
          { id: 'segment-2', translatedText: 42 },
          { id: 'segment-3', target: ['数组译文。'] },
        ],
      }),
      [makeSegment('1', 'Nested text.'), makeSegment('segment-2', 'Number text.'), makeSegment('segment-3', 'Array text.')],
    );

    expect(translations.map((segment) => segment.translation)).toEqual(['嵌套译文。', '42', '数组译文。']);
  });

  it('restores protected literal placeholders in translated text', () => {
    const translations = parseTranslationResponse(
      JSON.stringify({
        segments: [
          {
            id: 'segment-1',
            translation: '在每次运行前，Hermes 会快照 [[AUTO_T_LITERAL_1]]。',
          },
        ],
      }),
      [
        {
          id: 'segment-1',
          text: 'Before each pass, Hermes snapshots ~/.hermes/skills/.',
          tagName: 'p',
          hash: 'hash',
          protectedLiterals: ['~/.hermes/skills/'],
        },
      ],
    );

    expect(translations).toEqual([
      {
        id: 'segment-1',
        source: 'Before each pass, Hermes snapshots ~/.hermes/skills/.',
        translation: '在每次运行前，Hermes 会快照 ~/.hermes/skills/。',
      },
    ]);
  });
});

function makeSegment(id: string, text: string) {
  return {
    id,
    text,
    tagName: 'p',
    hash: id,
  };
}
