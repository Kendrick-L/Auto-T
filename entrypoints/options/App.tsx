import { FormEvent, useEffect, useState } from 'react';
import { getSettings, saveSettings, type UserSettings } from '@/src/storage/settings-store';
import { hasBundledDeepSeekApiKey } from '@/src/config/env';
import { addGlossaryItem, getGlossaryItems, removeGlossaryItem, type GlossaryItem } from '@/src/storage/glossary-store';

export function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSettings().then(setSettings);
    void getGlossaryItems().then(setGlossary);
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
    </main>
  );
}
