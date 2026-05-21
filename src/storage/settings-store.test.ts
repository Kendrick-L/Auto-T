import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSettings } from '@/src/storage/settings-store';

describe('getSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults new installs to Flash', async () => {
    stubStoredSettings(undefined);

    await expect(getSettings()).resolves.toMatchObject({
      deepseekModel: 'flash',
    });
  });

  it('migrates legacy chat and reasoner model settings', async () => {
    stubStoredSettings({ deepseekModel: 'deepseek-chat' });
    await expect(getSettings()).resolves.toMatchObject({ deepseekModel: 'flash' });

    stubStoredSettings({ deepseekModel: 'deepseek-reasoner' });
    await expect(getSettings()).resolves.toMatchObject({ deepseekModel: 'pro' });
  });
});

function stubStoredSettings(settings: Record<string, unknown> | undefined) {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async () => ({ autoTSettings: settings })),
      },
    },
  });
}
