import { useEffect, useState } from 'react';
import {
  getDeepSeekApiKeySource,
  getEffectiveDeepSeekApiKey,
  getSettings,
  saveSettings,
  type DeepSeekApiKeySource,
} from '@/src/storage/settings-store';
import type { ExtensionMessage, ExtensionResponse, TranslationProgress } from '@/src/messaging/messages';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('Ready');
  const [mode, setMode] = useState<'normal' | 'technical' | 'academic'>('normal');
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [keySource, setKeySource] = useState<DeepSeekApiKeySource>('missing');

  useEffect(() => {
    void getSettings().then((settings) => {
      setMode(settings.mode);
      setKeySource(getDeepSeekApiKeySource(settings));
    });

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

  async function translate(force = false, scope: 'visible' | 'page' = 'visible') {
    setStatus('loading');
    setMessage(scope === 'visible' ? 'Translating visible text...' : 'Translating page...');
    setProgress(null);

    try {
      const settings = await getSettings();
      setKeySource(getDeepSeekApiKeySource(settings));
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

  return (
    <main className="popup">
      <header>
        <h1>Auto-T</h1>
        <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      <section className="controls">
        <button className="primary" type="button" onClick={() => translate(false, 'visible')} disabled={status === 'loading'}>
          Visible
        </button>
        <button type="button" onClick={() => translate(false, 'page')} disabled={status === 'loading'}>
          Page
        </button>
        <button type="button" onClick={() => translate(true, 'visible')} disabled={status === 'loading'}>
          Retry visible
        </button>
        <button type="button" onClick={restore} disabled={status === 'loading'}>
          Restore
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
