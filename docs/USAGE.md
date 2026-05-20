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

Recommended workflow:

1. Open a webpage.
2. Scroll to the section you want to read.
3. Click `Visible`.
4. Continue scrolling and click `Visible` again for the next section.
5. Use `Page` only when you want broader coverage.

## Display Modes

`Bilingual`:

- Keeps the original text visible.
- Inserts translation under the original segment.

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
