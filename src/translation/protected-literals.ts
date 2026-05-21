import type { PageSegment } from '@/src/core/dom-scanner';

const PROTECTED_LITERAL_PREFIX = 'AUTO_T_LITERAL';

export type ProtectedLiteralPlaceholder = {
  placeholder: string;
  text: string;
};

export function getProtectedLiteralPlaceholders(segment: Pick<PageSegment, 'protectedLiterals'>) {
  const literals = [...new Set(segment.protectedLiterals ?? [])].filter(Boolean);

  return literals.map((text, index) => ({
    placeholder: `[[${PROTECTED_LITERAL_PREFIX}_${index + 1}]]`,
    text,
  }));
}

export function protectSegmentText(segment: Pick<PageSegment, 'text' | 'protectedLiterals'>) {
  return getProtectedLiteralPlaceholders(segment).reduce(
    (text, literal) => text.split(literal.text).join(literal.placeholder),
    segment.text,
  );
}

export function restoreProtectedLiterals(
  text: string,
  segment: Pick<PageSegment, 'protectedLiterals'> | undefined,
) {
  return getProtectedLiteralPlaceholders(segment ?? {}).reduce(
    (restored, literal) => restored.split(literal.placeholder).join(literal.text),
    text,
  );
}
