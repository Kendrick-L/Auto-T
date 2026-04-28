import type { PageSegment } from '@/src/core/dom-scanner';
import type { GlossaryItem } from '@/src/storage/glossary-store';
import type { UserSettings } from '@/src/storage/settings-store';

export type TranslationMode = 'normal' | 'technical' | 'academic';

export type TranslateRequest = {
  segments: PageSegment[];
  pageTitle: string;
  pageUrl: string;
  force?: boolean;
  settings: UserSettings;
  glossary: GlossaryItem[];
};

export type TranslatedSegment = {
  id: string;
  source: string;
  translation: string;
};
