import { describe, expect, it } from 'vitest';
import { buildDeepSeekRequestBody } from '@/src/translation/deepseek-provider';
import type { TranslateRequest } from '@/src/translation/types';

describe('buildDeepSeekRequestBody', () => {
  it('maps Flash to the current DeepSeek flash model with deterministic temperature', () => {
    const body = buildDeepSeekRequestBody(makeRequest('flash'));

    expect(body.model).toBe('deepseek-v4-flash');
    expect(body).toMatchObject({
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
  });

  it('maps Pro to the current DeepSeek pro model', () => {
    const body = buildDeepSeekRequestBody(makeRequest('pro'));

    expect(body.model).toBe('deepseek-v4-pro');
    expect(body.temperature).toBe(0.2);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});

function makeRequest(deepseekModel: TranslateRequest['settings']['deepseekModel']): TranslateRequest {
  return {
    segments: [
      {
        id: 'segment-1',
        text: 'Translate this text.',
        tagName: 'p',
        hash: 'hash',
      },
    ],
    pageTitle: 'Model test',
    pageUrl: 'https://example.com/model',
    settings: {
      extensionEnabled: true,
      deepseekApiKey: '',
      deepseekModel,
      targetLang: 'zh-CN',
      sourceLang: 'auto',
      mode: 'normal',
      domainProfile: 'general',
      displayMode: 'bilingual',
      autoTranslate: false,
      enableCache: true,
      debugLogging: false,
    },
    glossary: [],
  };
}
