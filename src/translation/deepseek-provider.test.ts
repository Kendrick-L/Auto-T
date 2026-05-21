import { describe, expect, it } from 'vitest';
import { buildDeepSeekRequestBody } from '@/src/translation/deepseek-provider';
import type { TranslateRequest } from '@/src/translation/types';

describe('buildDeepSeekRequestBody', () => {
  it('uses the selected DeepSeek chat model with deterministic temperature', () => {
    const body = buildDeepSeekRequestBody(makeRequest('deepseek-chat'));

    expect(body.model).toBe('deepseek-chat');
    expect(body).toMatchObject({
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
  });

  it('uses the selected DeepSeek reasoner model without chat temperature', () => {
    const body = buildDeepSeekRequestBody(makeRequest('deepseek-reasoner'));

    expect(body.model).toBe('deepseek-reasoner');
    expect(body).not.toHaveProperty('temperature');
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
