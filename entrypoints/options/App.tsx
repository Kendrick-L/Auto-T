import { FormEvent, useEffect, useState } from 'react';
import { getDeepSeekApiKeySource, getSettings, saveSettings, type UserSettings } from '@/src/storage/settings-store';
import { hasBundledDeepSeekApiKey } from '@/src/config/env';
import { addGlossaryItem, getGlossaryItems, removeGlossaryItem, type GlossaryItem } from '@/src/storage/glossary-store';
import {
  clearAllCachedTranslations,
  getCacheStats,
  type TranslationCacheStats,
} from '@/src/storage/cache-store';

export function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [cacheStats, setCacheStats] = useState<TranslationCacheStats | null>(null);
  const [cacheMessage, setCacheMessage] = useState('');
  const [cacheBusy, setCacheBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSettings().then(setSettings);
    void getGlossaryItems().then(setGlossary);
    void refreshCacheStats();
  }, []);

  if (!settings) {
    return <main className="options">Loading...</main>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    await saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  async function addTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const source = String(form.get('source') ?? '').trim();
    const target = String(form.get('target') ?? '').trim();
    const note = String(form.get('note') ?? '').trim();
    if (!source || !target) return;

    await addGlossaryItem({ source, target, note });
    setGlossary(await getGlossaryItems());
    event.currentTarget.reset();
  }

  async function deleteTerm(id: string) {
    await removeGlossaryItem(id);
    setGlossary(await getGlossaryItems());
  }

  async function refreshCacheStats() {
    setCacheStats(await getCacheStats());
  }

  async function clearAllCache() {
    setCacheBusy(true);
    setCacheMessage('');

    try {
      const removed = await clearAllCachedTranslations();
      await refreshCacheStats();
      setCacheMessage(removed ? `Cleared ${removed} cached translations.` : 'Cache is already empty.');
    } finally {
      setCacheBusy(false);
    }
  }

  return (
    <main className="options">
      <h1>Auto-T Settings</h1>

      <form className="panel" onSubmit={submit}>
        <label>
          DeepSeek API Key
          <input
            type="password"
            value={settings.deepseekApiKey}
            onChange={(event) => setSettings({ ...settings, deepseekApiKey: event.target.value })}
            placeholder={hasBundledDeepSeekApiKey() ? 'Using .env key unless overridden' : 'sk-...'}
          />
          {hasBundledDeepSeekApiKey() ? <small>Environment key detected. This field can override it locally.</small> : null}
          <small>Current source: {getDeepSeekApiKeySource(settings)}</small>
        </label>

        <label>
          DeepSeek model
          <select
            value={settings.deepseekModel}
            onChange={(event) =>
              setSettings({ ...settings, deepseekModel: event.target.value as UserSettings['deepseekModel'] })
            }
          >
            <option value="deepseek-chat">deepseek-chat</option>
            <option value="deepseek-reasoner">deepseek-reasoner</option>
          </select>
          <small>Changing models keeps cache entries separate. Reasoner may be slower and use more tokens.</small>
        </label>

        <label>
          Source language
          <select
            value={settings.sourceLang}
            onChange={(event) => setSettings({ ...settings, sourceLang: event.target.value as UserSettings['sourceLang'] })}
          >
            <option value="auto">Auto</option>
            <option value="en">English</option>
            <option value="zh-CN">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </label>

        <label>
          Target language
          <select
            value={settings.targetLang}
            onChange={(event) => setSettings({ ...settings, targetLang: event.target.value as UserSettings['targetLang'] })}
          >
            <option value="zh-CN">Chinese</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </label>

        <label>
          Translation mode
          <select
            value={settings.mode}
            onChange={(event) => setSettings({ ...settings, mode: event.target.value as UserSettings['mode'] })}
          >
            <option value="normal">Normal</option>
            <option value="technical">Technical</option>
            <option value="academic">Academic</option>
          </select>
        </label>

        <label>
          Domain profile
          <select
            value={settings.domainProfile}
            onChange={(event) =>
              setSettings({ ...settings, domainProfile: event.target.value as UserSettings['domainProfile'] })
            }
          >
            <option value="general">General</option>
            <option value="technical-docs">Technical docs</option>
            <option value="legal">Legal</option>
            <option value="medical">Medical</option>
            <option value="finance">Finance</option>
            <option value="product">Product docs</option>
          </select>
          <small>Changes the DeepSeek prompt and cache key for specialized pages.</small>
        </label>

        <label>
          Display mode
          <select
            value={settings.displayMode}
            onChange={(event) =>
              setSettings({ ...settings, displayMode: event.target.value as UserSettings['displayMode'] })
            }
          >
            <option value="bilingual">Bilingual</option>
            <option value="translation-only">Translation only</option>
          </select>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.enableCache}
            onChange={(event) => setSettings({ ...settings, enableCache: event.target.checked })}
          />
          Enable translation cache
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.debugLogging}
            onChange={(event) => setSettings({ ...settings, debugLogging: event.target.checked })}
          />
          Debug console logging
          <small>Print scan, LLM, and render diagnostics to DevTools. Disable it on sensitive pages.</small>
        </label>

        <button type="submit">Save Settings</button>
        {saved ? <p className="saved">Saved</p> : null}
      </form>

      <section className="panel">
        <h2>Glossary</h2>
        <form className="glossary-form" onSubmit={addTerm}>
          <input name="source" placeholder="Source term" />
          <input name="target" placeholder="Preferred translation" />
          <input name="note" placeholder="Note" />
          <button type="submit">Add</button>
        </form>

        <ul>
          {glossary.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.source}</strong> {'->'} {item.target}
                {item.note ? <small>{item.note}</small> : null}
              </span>
              <button type="button" onClick={() => deleteTerm(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Cache Management</h2>
        <div className="cache-row">
          <span>
            Cached translations
            <small>
              {cacheStats ? `${cacheStats.totalItems} local entries` : 'Loading cache status...'}
            </small>
          </span>
          <button type="button" onClick={refreshCacheStats} disabled={cacheBusy}>
            Refresh
          </button>
        </div>
        <div className="cache-row">
          <span>
            Clear all cache
            <small>Removes locally stored source and translated text. Future translations may call DeepSeek again.</small>
          </span>
          <button type="button" onClick={clearAllCache} disabled={cacheBusy || cacheStats?.totalItems === 0}>
            Clear all
          </button>
        </div>
        <p className="cache-note">
          Current-site cache clearing is available from the popup on active http and https pages.
        </p>
        {cacheMessage ? <p className="saved">{cacheMessage}</p> : null}
      </section>
    </main>
  );
}
