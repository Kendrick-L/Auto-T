import { getSettings } from '@/src/storage/settings-store';

const ENABLED_ICON = {
  16: 'icons/auto-t-enabled-16.png',
  32: 'icons/auto-t-enabled-32.png',
  48: 'icons/auto-t-enabled-48.png',
  128: 'icons/auto-t-enabled-128.png',
};

const PAUSED_ICON = {
  16: 'icons/auto-t-paused-16.png',
  32: 'icons/auto-t-paused-32.png',
  48: 'icons/auto-t-paused-48.png',
  128: 'icons/auto-t-paused-128.png',
};

export async function syncActionStateFromSettings() {
  const settings = await getSettings();
  await updateActionState(settings.extensionEnabled);
}

export async function updateActionState(enabled: boolean) {
  if (!chrome.action) return;

  await chrome.action.setIcon({
    path: enabled ? ENABLED_ICON : PAUSED_ICON,
  });
  await chrome.action.setTitle({
    title: enabled ? 'Auto-T: ready' : 'Auto-T: paused',
  });
  await chrome.action.setBadgeText({
    text: enabled ? '' : 'OFF',
  });
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#1f7a5a' : '#b42318',
  });
}
