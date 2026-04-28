import { buildTranslationPrompt } from '@/src/translation/prompt-builder';
import { parseTranslationResponse } from '@/src/translation/response-parser';
import type { TranslateRequest, TranslatedSegment } from '@/src/translation/types';

type DeepSeekChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

export async function translateWithDeepSeek(request: TranslateRequest): Promise<TranslatedSegment[]> {
  if (!request.settings.deepseekApiKey) {
    throw new Error('DeepSeek API key is missing.');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.settings.deepseekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. You are a translation engine, not a chatbot.',
        },
        {
          role: 'user',
          content: buildTranslationPrompt(request),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as DeepSeekChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response was empty.');
  }

  return parseTranslationResponse(content, request.segments);
}
