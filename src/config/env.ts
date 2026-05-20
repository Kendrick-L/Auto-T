const env = import.meta.env as ImportMetaEnv &
  Partial<{
    WXT_DEEPSEEK_API_KEY: string;
    DEEPSEEK_API_KEY: string;
  }>;

export function getBundledDeepSeekApiKey() {
  return (env.WXT_DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
}

export function hasBundledDeepSeekApiKey() {
  return getBundledDeepSeekApiKey().length > 0;
}
