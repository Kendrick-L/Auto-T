import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslatedSegment, TranslationContextSegment, TranslationKind } from '@/src/translation/types';

export type ExtensionMessage =
  | {
      type: 'TRANSLATE_PAGE';
      payload?: {
        force?: boolean;
        scope?: TranslationScope;
      };
    }
  | {
      type: 'RESTORE_PAGE';
    }
  | {
      type: 'COMMAND_TRANSLATE_VISIBLE';
    }
  | {
      type: 'COMMAND_TRANSLATE_CONTEXT';
    }
  | {
      type: 'TRANSLATE_SEGMENTS';
      payload: {
        segments: PageSegment[];
        contextSegments?: TranslationContextSegment[];
        pageTitle: string;
        pageUrl: string;
        force?: boolean;
        debugLogging?: boolean;
        translationKind?: TranslationKind;
      };
    }
  | {
      type: 'TRANSLATION_PROGRESS';
      payload: TranslationProgress;
    }
  | {
      type: 'TRANSLATION_BATCH_RESULT';
      payload: {
        segments: TranslatedSegment[];
      };
    };

export type ExtensionResponse =
  | {
      ok: true;
      data: Record<string, unknown> & {
        segments?: TranslatedSegment[];
      };
    }
  | {
      ok: false;
      error: string;
    };

export type TranslationProgress = {
  total: number;
  completed: number;
  cached: number;
  translated: number;
  currentBatch?: number;
  totalBatches?: number;
};

export type TranslationScope = 'visible' | 'page';
