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

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;

export async function translateWithDeepSeek(request: TranslateRequest): Promise<TranslatedSegment[]> {
  if (!request.settings.deepseekApiKey) {
    throw new Error('DeepSeek API key is missing.');
  }

  const response = await requestDeepSeek(request);

  if (!response.ok) {
    throw new Error(formatDeepSeekError(response));
  }

  const data = (await response.json()) as DeepSeekChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response was empty.');
  }

  return parseTranslationResponse(content, request.segments);
}

async function requestDeepSeek(request: TranslateRequest) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        DEEPSEEK_URL,
        {
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
        },
        REQUEST_TIMEOUT_MS,
      );

      if (response.ok || !isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
    }

    await sleep(600 * attempt);
  }

  throw lastError instanceof Error ? lastError : new Error('DeepSeek request failed.');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`DeepSeek request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function formatDeepSeekError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return 'DeepSeek API authentication failed. Check your API key.';
  }
  if (response.status === 429) {
    return 'DeepSeek API rate limit reached. Try again later.';
  }
  return `DeepSeek API error: ${response.status} ${response.statusText}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
