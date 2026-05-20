import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslatedSegment } from '@/src/translation/types';

export function parseTranslationResponse(content: string, sourceSegments: PageSegment[]): TranslatedSegment[] {
  const json = extractJson(content);
  const parsed = parseSegments(parseJsonWithRepair(json));
  const sourceById = new Map(sourceSegments.map((segment) => [segment.id, segment.text]));

  return parsed.segments
    .filter((segment) => sourceById.has(segment.id))
    .map((segment) => ({
      id: segment.id,
      source: sourceById.get(segment.id) ?? '',
      translation: segment.translation,
    }));
}

type ParsedResponse = {
  segments: {
    id: string;
    translation: string;
  }[];
};

function parseSegments(value: unknown): ParsedResponse {
  if (!isRecord(value) || !Array.isArray(value.segments)) {
    throw new Error('DeepSeek response JSON must contain a segments array.');
  }

  return {
    segments: value.segments.map((segment, index) => {
      if (!isRecord(segment)) {
        throw new Error(`DeepSeek segment ${index + 1} was not an object.`);
      }

      const id = toStringValue(segment.id);
      const translation = readTranslation(segment);
      if (!id) {
        throw new Error(`DeepSeek segment ${index + 1} was missing id.`);
      }
      if (!translation) {
        throw new Error(`DeepSeek segment ${index + 1} was missing translation text.`);
      }

      return { id, translation };
    }),
  };
}

function readTranslation(segment: Record<string, unknown>) {
  return (
    toStringValue(segment.translation) ??
    toStringValue(segment.target) ??
    toStringValue(segment.translatedText) ??
    toStringValue(segment.text) ??
    readFirstStringValue(segment.translation)
  );
}

function readFirstStringValue(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const nestedValue of Object.values(value)) {
    const text = toStringValue(nestedValue);
    if (text) return text;
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function parseJsonWithRepair(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (error) {
    const repaired = repairCommonJsonTypos(json);
    if (repaired === json) throw error;

    try {
      return JSON.parse(repaired);
    } catch {
      throw error;
    }
  }
}

function repairCommonJsonTypos(json: string) {
  return json.replace(/"([A-Za-z][A-Za-z0-9_]*)"\s*>/g, '"$1":');
}
