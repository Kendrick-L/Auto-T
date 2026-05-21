import type { TranslateRequest } from '@/src/translation/types';
import { getProtectedLiteralPlaceholders, protectSegmentText } from '@/src/translation/protected-literals';

const MODE_INSTRUCTIONS = {
  normal: 'Use natural, faithful, fluent translation.',
  technical: 'Use precise technical terminology. Preserve API names, code identifiers, commands, and product names.',
  academic: 'Use formal academic language. Preserve citations, numbers, formulas, and named entities.',
};

const PROFILE_INSTRUCTIONS = {
  general: 'Use a general professional translation style suitable for everyday webpages.',
  'technical-docs':
    'Treat the page as technical documentation. Preserve API names, CLI commands, file paths, package names, and UI labels.',
  legal:
    'Treat the page as legal or compliance content. Use precise legal wording and preserve obligations, conditions, dates, and party names.',
  medical:
    'Treat the page as medical or health content. Preserve clinical terms, dosages, measurements, warnings, and condition names.',
  finance:
    'Treat the page as financial content. Preserve tickers, currencies, percentages, dates, metrics, risk language, and reporting terms.',
  product:
    'Treat the page as product or SaaS documentation. Keep feature names, plan names, UI labels, and workflow terms consistent.',
};

export function buildTranslationPrompt(request: TranslateRequest) {
  const glossaryText = request.glossary.length
    ? request.glossary
        .map((item) => `- ${item.source} => ${item.target}${item.note ? ` (${item.note})` : ''}`)
        .join('\n')
    : 'None';
  const contextText = request.contextSegments?.length
    ? JSON.stringify(
        request.contextSegments.map((segment) => ({
          id: segment.id,
          text: segment.text,
        })),
      )
    : 'None';
  const protectedLiteralText = buildProtectedLiteralText(request);

  return [
    'You are a professional bilingual webpage translation engine.',
    `Source language: ${request.settings.sourceLang}.`,
    `Target language: ${request.settings.targetLang}.`,
    `Page title: ${request.pageTitle}.`,
    `Page URL: ${request.pageUrl}.`,
    MODE_INSTRUCTIONS[request.settings.mode],
    PROFILE_INSTRUCTIONS[request.settings.domainProfile],
    'Rules:',
    '1. Translate every segment faithfully without adding explanations.',
    '2. Preserve URLs, code identifiers, placeholders, product names, and numbers.',
    '3. Follow the glossary when applicable.',
    '4. Return valid JSON only, with the exact shape: {"segments":[{"id":"...","translation":"..."}]}.',
    '5. Keep the output segment order identical to the input order.',
    '6. Use nearby page context only to improve consistency; do not translate context-only text unless it appears in input segments.',
    '7. Keep protected literal placeholders exactly unchanged in translations.',
    '',
    'Glossary:',
    glossaryText,
    '',
    'Nearby page context:',
    contextText,
    '',
    'Protected literals:',
    protectedLiteralText,
    '',
    'Input segments:',
    JSON.stringify(
      request.segments.map((segment) => ({
        id: segment.id,
        text: protectSegmentText(segment),
      })),
    ),
  ].join('\n');
}

function buildProtectedLiteralText(request: TranslateRequest) {
  const lines = request.segments.flatMap((segment) =>
    getProtectedLiteralPlaceholders(segment).map(
      (literal) => `- ${segment.id}: ${literal.placeholder} = ${literal.text}`,
    ),
  );

  return lines.length ? lines.join('\n') : 'None';
}
