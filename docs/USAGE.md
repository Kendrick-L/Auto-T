# Auto-T Usage Guide

## What Auto-T Does Today

Auto-T is a local Chrome MV3 extension for bilingual webpage translation with DeepSeek.

Current MVP features:

- Translate the visible area of the current webpage.
- Translate more of the page when needed.
- Show translations below the original text.
- Switch between bilingual and translation-only display modes.
- Restore the page by removing inserted translations.
- Configure DeepSeek API Key, languages, translation mode, cache, and glossary.
- Enable temporary debug console logging to inspect scan, LLM, and render stages.
- Show per-text loading indicators while visible/page/scroll translations are running.
- Use built-in page rules for selected sites to improve content scanning.
- Cache translations to reduce repeated API calls.

Not supported yet:

- PDF translation.
- Video subtitle translation.
- OCR.
- Selection popup.
- Hover translation.
- Input box translation.
- Dynamic page auto-translation.

## Local Development

Install dependencies:

```bash
npm install
```

Start development build:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Type check:

```bash
npm run compile
```

DeepSeek smoke test:

```bash
npm run smoke:deepseek
```

This reads `WXT_DEEPSEEK_API_KEY` or `DEEPSEEK_API_KEY` from `.env` and sends one tiny request to DeepSeek. It does not print the key.

Package extension:

```bash
npm run zip
```

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select:

```text
.output/chrome-mv3
```

5. Pin Auto-T if desired.

After each update, run `npm run build`, then click Reload on the Auto-T extension card in `chrome://extensions`. The extension version is bumped for publishable updates so Chrome shows a new version.

Refresh already-open webpages after reloading the extension. Chrome invalidates old content-script contexts during extension reloads, so old tabs cannot safely keep using the previous script instance.

Current version: `0.1.14`.

## Configure DeepSeek

You can configure DeepSeek in either of two ways.

Option A: `.env` for local development:

```bash
WXT_DEEPSEEK_API_KEY=your_key_here
```

`DEEPSEEK_API_KEY` is also supported in this project.

After changing `.env`, restart the dev server or rebuild the extension:

```bash
npm run dev
```

Option B: Options page override:

1. Open the Auto-T popup.
2. Click Settings.
3. Enter your DeepSeek API Key.
4. Choose source language, target language, translation mode, and display mode.
5. Save settings.

Priority:

1. Options page key.
2. `.env` key bundled at build time.

Important:

- Do not commit API Keys.
- Do not paste API Keys into docs, issues, logs, or screenshots.
- Real translation tests consume DeepSeek API quota.
- A `.env` key is bundled into the extension build and can be extracted from a shared build artifact. Use it only for local development or private builds.

## Privacy Boundary

Auto-T is local-first, but translation is not fully local when DeepSeek is used.

Current behavior:

- The DeepSeek API Key can come from Chrome local extension storage or from `.env` at build time.
- A build-time `.env` key is embedded in the generated extension bundle.
- Text selected for translation is sent to the DeepSeek API.
- Page title and page URL are included in translation requests to improve context.
- Translation cache is stored locally through Chrome storage.
- Cache can be disabled in Options.
- Glossary items are stored locally.

Do not use real translation on sensitive pages unless you are comfortable sending the selected text, page title, and URL to DeepSeek.

Recommended sensitive-data practice:

- Use `Visible` instead of `Page` to reduce the amount of text sent.
- Disable cache before translating sensitive material.
- Avoid translating secrets, credentials, contracts, private customer data, or unreleased company documents.
- Clear extension storage manually from Chrome if sensitive content was translated by mistake.

## Use The Popup

Available actions:

- `Visible`: translates visible text near the current viewport. This is the recommended default.
- `Page`: translates more of the page. This can be slower and may consume more API quota.
- `Retry visible`: re-runs visible translation without cache.
- `Restore`: removes Auto-T translations and restores hidden source text.
- `Auto visible on scroll`: when enabled, translates untranslated visible text after scrolling stops.

The popup also shows the active DeepSeek key source:

- `Using saved key`: Options page key is active.
- `Using .env key`: local build-time key is active.
- `Missing DeepSeek key`: no key is available.

Recommended workflow:

1. Open a webpage.
2. Scroll to the section you want to read.
3. Click `Visible`.
4. Continue scrolling and click `Visible` again for the next section.
5. Use `Page` only when you want broader coverage.

For hands-free reading, enable `Auto visible on scroll`. It is off by default because every newly translated viewport can consume DeepSeek API quota.

## Debug Translation Pipeline

Enable `Debug console logging` in Options when a page misses translations.

To persist the debug output into this codebase, start the local log server before testing:

```bash
npm run debug:server
```

The server writes:

```text
debug-logs/auto-t-latest.json
debug-logs/auto-t-latest.jsonl
```

For one page only, you can also open DevTools on that page and run:

```js
localStorage.setItem('AUTO_T_DEBUG', '1');
```

Reload the page after setting it. Disable it with:

```js
localStorage.removeItem('AUTO_T_DEBUG');
```

Then open DevTools on the target webpage and run `Visible`, `Page`, or `Retry visible`.

The console prints grouped logs with the prefix `[Auto-T Debug]`:

- `scan ... segments`: text captured from the DOM scanner.
- `sending segments to background`: text sent from the content script.
- `translation cache split`: whether each request is cached or sent to DeepSeek.
- `DeepSeek batch ... source`: source text sent to the LLM.
- `DeepSeek raw content`: raw model response.
- `DeepSeek parsed response`: parsed translation objects.
- `render result`: whether each translation was inserted, updated, or failed because the source node was missing.
- Batch translations are rendered progressively as each DeepSeek batch succeeds, so later failures do not block earlier visible output.

`render result` also includes source, anchor, and inserted translation node snapshots with `outerHTML`, bounding rect, and computed style.

Use this to identify the failing stage:

- Missing from `scan`: DOM scanner/filtering issue.
- Present in `scan` but absent from `DeepSeek batch`: cache/request routing issue.
- Present in batch but missing or malformed in `DeepSeek parsed response`: LLM or parser issue.
- Present in parsed response but `missing-source` in `render result`: DOM changed before insertion.
- Present with `inserted` or `updated` but not visible: renderer/CSS/layout issue.

Turn debug logging off after diagnosis, especially on private pages.

## Display Modes

`Bilingual`:

- Keeps the original text visible.
- Inserts translation inside the original text flow with an inline wrapper and a line break.
- Uses the source text family, color, weight, and line height with a slightly smaller font size.

`Translation only`:

- Hides the original source segment.
- Shows the translation in its place.
- Restore brings source text back.

## Translation Modes

`Normal`:

- General-purpose faithful translation.

`Technical`:

- Preserves API names, code identifiers, commands, product names, and technical terms.

`Academic`:

- Uses more formal language and preserves citations, numbers, formulas, and named entities.

## Glossary

The glossary lets you define preferred translations.

Each item contains:

- Source term.
- Preferred translation.
- Optional note.

Changing the glossary invalidates old cache entries for future translation requests.

## Test Plan

Run before pushing or merging:

```bash
npm run compile
npm run build
```

Manual Chrome test:

1. Load `.output/chrome-mv3` in Chrome.
2. Configure a DeepSeek API Key.
3. Open a test webpage.
4. Click `Visible`.
5. Confirm translations appear below visible text.
6. Click `Visible` again after scrolling.
7. Click `Page` on a short article.
8. Click `Restore`.
9. Confirm translations are removed and hidden source text returns.

Suggested test URLs:

- MDN documentation page.
- Wikipedia article.
- GitHub README.
- Plain news article.

Record for each manual run:

- Browser and version.
- Test URL.
- Target language.
- Translation mode.
- Display mode.
- Whether API quota was used.
- Any layout, parser, or performance issues.

## Known Limitations

- DeepSeek output quality and structure can vary. The parser handles common variants but not every possible malformed response.
- Large pages should use `Visible` first to avoid slow full-page requests.
- Dynamic content is not automatically translated yet.
- Some websites with unusual DOM structures may still include irrelevant text or skip desired text.
