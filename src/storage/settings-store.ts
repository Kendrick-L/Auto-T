import { getBundledDeepSeekApiKey } from '@/src/config/env';

export type UserSettings = {
  extensionEnabled: boolean;
  deepseekApiKey: string;
  deepseekModel: 'flash' | 'pro';
  targetLang: 'zh-CN' | 'en' | 'ja' | 'ko';
  sourceLang: 'auto' | 'en' | 'zh-CN' | 'ja' | 'ko';
  mode: 'normal' | 'technical' | 'academic';
  domainProfile: 'general' | 'technical-docs' | 'legal' | 'medical' | 'finance' | 'product';
  displayMode: 'bilingual' | 'translation-only';
  autoTranslate: boolean;
  enableCache: boolean;
  debugLogging: boolean;
};

const SETTINGS_KEY = 'autoTSettings';

export const DEFAULT_SETTINGS: UserSettings = {
  extensionEnabled: true,
  deepseekApiKey: '',
  deepseekModel: 'flash',
  targetLang: 'zh-CN',
  sourceLang: 'auto',
  mode: 'normal',
  domainProfile: 'general',
  displayMode: 'bilingual',
  autoTranslate: false,
  enableCache: true,
  debugLogging: false,
};

export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = (result[SETTINGS_KEY] as Partial<UserSettings> | undefined) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    deepseekModel: normalizeDeepSeekModel(stored.deepseekModel),
  };
}

export async function saveSettings(settings: UserSettings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export function getEffectiveDeepSeekApiKey(settings: UserSettings) {
  return settings.deepseekApiKey.trim() || getBundledDeepSeekApiKey();
}

export type DeepSeekApiKeySource = 'options' | 'env' | 'missing';

export function getDeepSeekApiKeySource(settings: UserSettings): DeepSeekApiKeySource {
  if (settings.deepseekApiKey.trim()) return 'options';
  if (getBundledDeepSeekApiKey()) return 'env';
  return 'missing';
}

function normalizeDeepSeekModel(model: unknown): UserSettings['deepseekModel'] {
  if (model === 'pro' || model === 'deepseek-reasoner') return 'pro';
  return 'flash';
}
