import { useEffect, useState } from 'react';
import {
  getDeepSeekApiKeySource,
  getEffectiveDeepSeekApiKey,
  getSettings,
  saveSettings,
  type DeepSeekApiKeySource,
} from '@/src/storage/settings-store';
import { updateActionState } from '@/src/action/action-state';
import { clearCachedTranslationsForHostname, getCacheStats } from '@/src/storage/cache-store';
import type { ExtensionMessage, ExtensionResponse, TranslationProgress } from '@/src/messaging/messages';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('Ready');
  const [mode, setMode] = useState<'normal' | 'technical' | 'academic'>('normal');
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [keySource, setKeySource] = useState<DeepSeekApiKeySource>('missing');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [activeHostname, setActiveHostname] = useState<string | null>(null);
  const [siteCacheCount, setSiteCacheCount] = useState<number | null>(null);
  const [cacheBusy, setCacheBusy] = useState(false);

  useEffect(() => {
    void getSettings().then((settings) => {
      setMode(settings.mode);
      setAutoTranslate(settings.autoTranslate);
      setExtensionEnabled(settings.extensionEnabled);
      setKeySource(getDeepSeekApiKeySource(settings));
      void updateActionState(settings.extensionEnabled);
    });
    void refreshActiveSiteCache();

    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'TRANSLATION_PROGRESS') return;
      setProgress(message.payload);
      setStatus('loading');
      setMessage(`Translated ${message.payload.completed}/${message.payload.total} segments`);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  async function sendToActiveTab(message: ExtensionMessage) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    return chrome.tabs.sendMessage(tab.id, message) as Promise<ExtensionResponse>;
  }

  async function getActiveHttpHostname() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;

    try {
      const url = new URL(tab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  async function refreshActiveSiteCache() {
    const hostname = await getActiveHttpHostname();
    setActiveHostname(hostname);

    if (!hostname) {
      setSiteCacheCount(null);
      return;
    }

    const stats = await getCacheStats(hostname);
    setSiteCacheCount(stats.siteItems);
  }

  async function clearActiveSiteCache() {
    setCacheBusy(true);
    setProgress(null);

    try {
      const hostname = activeHostname ?? (await getActiveHttpHostname());
      if (!hostname) {
        setStatus('error');
        setMessage('Open an http or https page to clear site cache.');
        return;
      }

      const removed = await clearCachedTranslationsForHostname(hostname);
      await refreshActiveSiteCache();
      setStatus('success');
      setMessage(removed ? `Cleared ${removed} cached translations for ${hostname}.` : `No cache found for ${hostname}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to clear site cache.');
    } finally {
      setCacheBusy(false);
    }
  }

  async function translate(force = false, scope: 'visible' | 'page' = 'visible') {
    setStatus('loading');
    setMessage(scope === 'visible' ? 'Translating visible text...' : 'Translating page...');
    setProgress(null);

    try {
      const settings = await getSettings();
      setKeySource(getDeepSeekApiKeySource(settings));
      setExtensionEnabled(settings.extensionEnabled);
      if (!settings.extensionEnabled) {
        setStatus('error');
        setMessage('Auto-T is paused. Resume it to translate.');
        return;
      }
      if (!getEffectiveDeepSeekApiKey(settings)) {
        setStatus('error');
        setMessage('Set DeepSeek API key in Options or .env first.');
        await chrome.runtime.openOptionsPage();
        return;
      }

      const response = await sendToActiveTab({ type: 'TRANSLATE_PAGE', payload: { force, scope } });
      if (!response.ok) {
        throw new Error(response.error);
      }

      const segmentCount = response.data.segments?.length ?? 0;
      await refreshActiveSiteCache();
      setStatus('success');
      setMessage(segmentCount ? `Translation complete: ${segmentCount} segments.` : 'No translatable text found.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Translation failed.');
    }
  }

  async function restore() {
    setStatus('loading');
    setMessage('Restoring page...');
    setProgress(null);

    try {
      const response = await sendToActiveTab({ type: 'RESTORE_PAGE' });
      if (!response.ok) {
        throw new Error(response.error);
      }
      await refreshActiveSiteCache();
      setStatus('idle');
      setMessage('Page restored.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Restore failed.');
    }
  }

  async function updateMode(mode: 'normal' | 'technical' | 'academic') {
    const settings = await getSettings();
    await saveSettings({ ...settings, mode });
    setMode(mode);
  }

  async function updateAutoTranslate(enabled: boolean) {
    const settings = await getSettings();
    await saveSettings({ ...settings, autoTranslate: enabled });
    setAutoTranslate(enabled);
  }

  async function updateExtensionEnabled(enabled: boolean) {
    const settings = await getSettings();
    await saveSettings({ ...settings, extensionEnabled: enabled });
    await updateActionState(enabled);
    setExtensionEnabled(enabled);
    setProgress(null);
    setStatus(enabled ? 'idle' : 'success');
    setMessage(enabled ? 'Auto-T resumed.' : 'Auto-T paused. Translation is stopped.');
  }

  return (
    <main className="popup">
      <header>
        <h1>
          <span className={`app-dot ${extensionEnabled ? 'enabled' : 'paused'}`} aria-hidden="true" />
          Auto-T
        </h1>
        <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      <button
        className={extensionEnabled ? 'pause-toggle enabled' : 'pause-toggle paused'}
        type="button"
        onClick={() => updateExtensionEnabled(!extensionEnabled)}
        disabled={status === 'loading'}
      >
        {extensionEnabled ? 'Pause translation' : 'Resume translation'}
      </button>

      <section className="controls">
        <button
          className="primary"
          type="button"
          onClick={() => translate(false, 'visible')}
          disabled={status === 'loading' || !extensionEnabled}
        >
          Visible
        </button>
        <button type="button" onClick={() => translate(false, 'page')} disabled={status === 'loading' || !extensionEnabled}>
          Page
        </button>
        <button
          type="button"
          onClick={() => translate(true, 'visible')}
          disabled={status === 'loading' || !extensionEnabled}
        >
          Retry visible
        </button>
        <button type="button" onClick={restore} disabled={status === 'loading'}>
          Restore
        </button>
      </section>

      <section className="site-cache">
        <span>
          Site cache
          <small>
            {activeHostname
              ? `${activeHostname}: ${siteCacheCount ?? 0} entries`
              : 'Available on http and https pages'}
          </small>
        </span>
        <button type="button" onClick={clearActiveSiteCache} disabled={cacheBusy || !activeHostname}>
          Clear site
        </button>
      </section>

      <label>
        Mode
        <select value={mode} onChange={(event) => updateMode(event.target.value as 'normal' | 'technical' | 'academic')}>
          <option value="normal">Normal</option>
          <option value="technical">Technical</option>
          <option value="academic">Academic</option>
        </select>
      </label>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={autoTranslate}
          disabled={!extensionEnabled}
          onChange={(event) => updateAutoTranslate(event.target.checked)}
        />
        Auto visible on scroll
      </label>

      <p className={`key-source ${keySource}`}>
        {keySource === 'options' ? 'Using saved key' : keySource === 'env' ? 'Using .env key' : 'Missing DeepSeek key'}
      </p>

      {progress ? (
        <div className="progress" aria-label="Translation progress">
          <span style={{ width: `${progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%` }} />
        </div>
      ) : null}

      <p className={`status ${status}`}>{message}</p>
    </main>
  );
}
