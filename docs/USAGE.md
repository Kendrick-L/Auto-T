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

1. Open the Auto-T popup.
2. Click Settings.
3. Enter your DeepSeek API Key.
4. Choose source language, target language, translation mode, and display mode.
5. Save settings.

Important:

- Do not commit API Keys.
- Do not paste API Keys into docs, issues, logs, or screenshots.
- Real translation tests consume DeepSeek API quota.

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

