import type { PageSegment } from '@/src/core/dom-scanner';
import type { GlossaryItem } from '@/src/storage/glossary-store';
import type { UserSettings } from '@/src/storage/settings-store';

export type TranslationMode = 'normal' | 'technical' | 'academic';
export type DomainProfile = 'general' | 'technical-docs' | 'legal' | 'medical' | 'finance' | 'product';

export type TranslationContextSegment = {
  id: string;
  text: string;
};

export type TranslateRequest = {
  segments: PageSegment[];
  contextSegments?: TranslationContextSegment[];
  pageTitle: string;
  pageUrl: string;
  force?: boolean;
  settings: UserSettings;
  glossary: GlossaryItem[];
  debugLogging?: boolean;
};

export type TranslatedSegment = {
  id: string;
  source: string;
  translation: string;
};
