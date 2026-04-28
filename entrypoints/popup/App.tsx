import { useState } from 'react';
import { getSettings, saveSettings } from '@/src/storage/settings-store';
import type { ExtensionMessage, ExtensionResponse } from '@/src/messaging/messages';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('Ready');

  async function sendToActiveTab(message: ExtensionMessage) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    return chrome.tabs.sendMessage(tab.id, message) as Promise<ExtensionResponse>;
  }

  async function translate(force = false) {
    setStatus('loading');
    setMessage('Translating page...');

    try {
      const settings = await getSettings();
      if (!settings.deepseekApiKey) {
        setStatus('error');
        setMessage('Set your DeepSeek API key first.');
        await chrome.runtime.openOptionsPage();
        return;
      }

      const response = await sendToActiveTab({ type: 'TRANSLATE_PAGE', payload: { force } });
      if (!response.ok) {
        throw new Error(response.error);
      }

      setStatus('success');
      setMessage('Translation complete.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Translation failed.');
    }
  }

  async function restore() {
    setStatus('loading');
    setMessage('Restoring page...');

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
        <button type="button" onClick={() => translate(false)} disabled={status === 'loading'}>
          Translate
        </button>
        <button type="button" onClick={() => translate(true)} disabled={status === 'loading'}>
          Retry
        </button>
        <button type="button" onClick={restore} disabled={status === 'loading'}>
          Restore
        </button>
      </section>

      <label>
        Mode
        <select onChange={(event) => updateMode(event.target.value as 'normal' | 'technical' | 'academic')}>
          <option value="normal">Normal</option>
          <option value="technical">Technical</option>
          <option value="academic">Academic</option>
        </select>
      </label>

      <p className={`status ${status}`}>{message}</p>
    </main>
  );
}
