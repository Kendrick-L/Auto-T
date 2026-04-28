import { z } from 'zod';
import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslatedSegment } from '@/src/translation/types';

const ResponseSchema = z.object({
  segments: z.array(
    z.object({
      id: z.string(),
      translation: z.string(),
    }),
  ),
});

export function parseTranslationResponse(content: string, sourceSegments: PageSegment[]): TranslatedSegment[] {
  const json = extractJson(content);
  const parsed = ResponseSchema.parse(JSON.parse(json));
  const sourceById = new Map(sourceSegments.map((segment) => [segment.id, segment.text]));

  return parsed.segments
    .filter((segment) => sourceById.has(segment.id))
    .map((segment) => ({
      id: segment.id,
      source: sourceById.get(segment.id) ?? '',
      translation: segment.translation,
    }));
}

function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) return trimmed;

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]) return match[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  throw new Error('DeepSeek response did not contain JSON.');
}
