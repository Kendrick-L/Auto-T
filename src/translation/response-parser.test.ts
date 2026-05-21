import { describe, expect, it } from 'vitest';
import { parseTranslationResponse } from '@/src/translation/response-parser';

describe('parseTranslationResponse', () => {
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
