import type { PageSegment } from '@/src/core/dom-scanner';
import type { TranslatedSegment } from '@/src/translation/types';

export type ExtensionMessage =
  | {
      type: 'TRANSLATE_PAGE';
      payload?: {
        force?: boolean;
      };
    }
  | {
      type: 'RESTORE_PAGE';
    }
  | {
      type: 'TRANSLATE_SEGMENTS';
      payload: {
        segments: PageSegment[];
        pageTitle: string;
        pageUrl: string;
        force?: boolean;
      };
    }
  | {
      type: 'TRANSLATION_PROGRESS';
      payload: TranslationProgress;
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
