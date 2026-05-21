import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslatedSegment } from '@/src/translation/types';
import { restoreProtectedLiterals } from '@/src/translation/protected-literals';

export function parseTranslationResponse(content: string, sourceSegments: PageSegment[]): TranslatedSegment[] {
  const json = extractJson(content);
  const parsed = parseSegments(parseJsonWithRepair(json));
  const sourceById = new Map(sourceSegments.map((segment) => [segment.id, segment.text]));
  const segmentById = new Map(sourceSegments.map((segment) => [segment.id, segment]));

  const translations = parsed.segments
    .filter((segment) => sourceById.has(segment.id))
    .map((segment) => ({
      id: segment.id,
      source: sourceById.get(segment.id) ?? '',
      translation: restoreProtectedLiterals(segment.translation, segmentById.get(segment.id)),
    }));

  if (sourceSegments.length > 0 && translations.length === 0) {
    throw new Error('DeepSeek response did not contain usable translations.');
  }

  return translations;
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

  const segments: ParsedResponse['segments'] = [];
  for (const segment of value.segments) {
    const parsed = parseSegment(segment);
    if (parsed) segments.push(parsed);
  }

  return {
    segments,
  };
}

function parseSegment(segment: unknown) {
  if (!isRecord(segment)) return null;

  const id = toStringValue(segment.id);
  const translation = readTranslation(segment);
  if (!id || !translation) return null;

  return { id, translation };
}

function readTranslation(segment: Record<string, unknown>) {
  return (
    toStringValue(segment.translation) ??
    toStringValue(segment.target) ??
    toStringValue(segment.translatedText) ??
    toStringValue(segment.text) ??
    readFirstStringValue(segment.translation) ??
    readFirstStringValue(segment.target) ??
    readFirstStringValue(segment.translatedText) ??
    readFirstStringValue(segment.text)
  );
}

function readFirstStringValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const nestedValue of value) {
      const text = toStringValue(nestedValue) ?? readFirstStringValue(nestedValue);
      if (text) return text;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;
  for (const nestedValue of Object.values(value)) {
    const text = toStringValue(nestedValue) ?? readFirstStringValue(nestedValue);
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

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]) return match[1].trim();

  const jsonObject = extractFirstBalancedJsonObject(trimmed);
  if (jsonObject) return jsonObject;

  throw new Error('DeepSeek response did not contain JSON.');
}

function extractFirstBalancedJsonObject(text: string) {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return null;
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
  return json
    .replace(/"([A-Za-z][A-Za-z0-9_]*)"\s*>/g, '"$1":')
    .replace(/,\s*([}\]])/g, '$1');
}
