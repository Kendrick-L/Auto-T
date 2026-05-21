# Auto-T Project Handoff

## Purpose

This document is the first file a new model/window should read before continuing Auto-T development.

Auto-T is a Chrome MV3 bilingual webpage translation extension powered by DeepSeek. The near-term goal is a reliable local Chrome extension with visible/page translation, bilingual rendering, debugging, cache, glossary, and quality controls.

## Repository State

- Repository: `git@github.com:Kendrick-L/Auto-T.git`
- Working directory: `/Users/lvtong/Documents/Practice/Auto-T`
- Current branch: `agent/m1/debug-segment-console`
- Latest pushed commit at time of this handoff: `2c676c6 add nearby context to translation prompts`
- Current package version in working tree: `0.1.21`

Important: run this first in any new window:

```bash
git status --short --branch
git log --oneline -5 --decorate
```

## Current Worktree Warning

The current worktree may include uncommitted WIP for a requested M1/M3 interaction enhancement:

- Global `Pause translation` / `Resume translation` popup control.
- Active vs paused Chrome toolbar icon.
- `OFF` badge while paused.
- Settings field `extensionEnabled`.
- New icon assets under `public/icons`.
- New action state helper under `src/action`.

If these files are present in `git status`, do not discard them. Either finish and validate that WIP first, or explicitly leave it alone before continuing Phase 2 work.

Likely WIP files:

```text
entrypoints/background.ts
entrypoints/content.ts
entrypoints/popup/App.tsx
entrypoints/popup/style.css
src/storage/settings-store.ts
src/translation/translate-service.ts
wxt.config.ts
public/icons/*
src/action/action-state.ts
```

## Completed Phase 1 Summary

Phase 1 goal: stabilize core webpage translation.

Completed:

- Chrome MV3 extension scaffold with WXT + React + TypeScript.
- Popup actions: `Visible`, `Page`, `Retry visible`, `Restore`.
- Options settings: DeepSeek API Key, languages, translation mode, domain profile, display mode, cache, debug logging, glossary.
- `.env` DeepSeek key fallback for local development.
- Text-node-first DOM scanner.
- Rule-aware scanner with Mobalytics and GitHub rules.
- Button/short heading capture.
- Visible pre-scan.
- Optional auto visible translation on scroll.
- Lightweight MutationObserver for newly inserted visible content.
- Loading spinner while segments translate.
- Rich-text/Lexical portal rendering.
- Restore support.
- Debug console logging and local debug log server.
- DeepSeek batch fallback and progressive render.
- Manual smoke fixture and server.
- Scanner and prompt builder tests.

Phase 1 still needs manual evidence:

- Manual Chrome load test recorded with URL.
- Real DeepSeek extension smoke test recorded.

## Completed Phase 2 Summary

Phase 2 goal: improve translation quality and professional control.

Completed:

- Domain profile prompt:
  - `general`
  - `technical-docs`
  - `legal`
  - `medical`
  - `finance`
  - `product`
- Domain profile affects DeepSeek prompt.
- Domain profile affects translation cache key.
- Nearby scanned context is included in each DeepSeek batch prompt.
- Nearby context affects cache key through a context fingerprint.
- Prompt tests cover domain profile, glossary, and context injection.
- Options shows translation cache count and can clear all local cache entries.
- Cache storage helpers support stats, clearing all cache, and clearing entries by recorded hostname for newly saved cache entries.

Phase 2 current docs:

```text
docs/Phase-2-step.md
```

## Recommended Next Phase 2 Task

Wire current-site cache clearing into a safe UI entry point, or continue with glossary import/export / DeepSeek model selection.

Expected scope:

- Reuse `clearCachedTranslationsForHostname` from `src/storage/cache-store.ts`.
- Identify the translated page hostname from popup/content context rather than assuming Options can see it.
- Add user-facing current-site cache cleanup only when hostname detection is safe.
- Update docs:
  - `docs/Phase-2-step.md`
  - `docs/USAGE.md`
  - `ITERATION_PLAN.md` if roadmap status changes.
- Add or update cache behavior tests.

Do not consume DeepSeek API quota for cache UI work.

## Validation Commands

Run before commit:

```bash
npm test
npm run compile
npm run build
npm run zip
```

Manual smoke fixture:

```bash
npm run smoke:manual:server
```

Then open:

```text
http://127.0.0.1:38476/
```

DeepSeek smoke test, only if real API quota is allowed:

```bash
npm run smoke:deepseek
```

## Documentation Rules

Every development task must update docs before handoff:

- `docs/Phase-2-step.md` for Phase 2 status.
- `docs/USAGE.md` for user-facing behavior or test instructions.
- `ITERATION_PLAN.md` for roadmap status changes.
- `docs/PROJECT_HANDOFF.md` if branch state, next task, or handoff assumptions change.

## Safety Notes

- Do not commit `.env`.
- Do not print or paste DeepSeek API keys.
- `.env` keys are bundled into local extension builds; use only for private local builds.
- Debug logs can contain page text; avoid using them on sensitive pages.
- Preserve user/uncommitted changes. Never use destructive git commands unless explicitly requested.
