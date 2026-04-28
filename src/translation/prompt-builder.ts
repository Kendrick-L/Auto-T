import type { TranslateRequest } from '@/src/translation/types';

const MODE_INSTRUCTIONS = {
  normal: 'Use natural, faithful, fluent translation.',
  technical: 'Use precise technical terminology. Preserve API names, code identifiers, commands, and product names.',
  academic: 'Use formal academic language. Preserve citations, numbers, formulas, and named entities.',
};

export function buildTranslationPrompt(request: TranslateRequest) {
  const glossaryText = request.glossary.length
    ? request.glossary
        .map((item) => `- ${item.source} => ${item.target}${item.note ? ` (${item.note})` : ''}`)
        .join('\n')
    : 'None';

  return [
    'You are a professional bilingual webpage translation engine.',
    `Source language: ${request.settings.sourceLang}.`,
    `Target language: ${request.settings.targetLang}.`,
    `Page title: ${request.pageTitle}.`,
    `Page URL: ${request.pageUrl}.`,
    MODE_INSTRUCTIONS[request.settings.mode],
    'Rules:',
    '1. Translate every segment faithfully without adding explanations.',
    '2. Preserve URLs, code identifiers, placeholders, product names, and numbers.',
    '3. Follow the glossary when applicable.',
    '4. Return valid JSON only, with the exact shape: {"segments":[{"id":"...","translation":"..."}]}.',
    '5. Keep the output segment order identical to the input order.',
    '',
    'Glossary:',
    glossaryText,
    '',
    'Input segments:',
    JSON.stringify(
      request.segments.map((segment) => ({
        id: segment.id,
        text: segment.text,
      })),
    ),
  ].join('\n');
}
