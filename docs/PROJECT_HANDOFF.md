# Auto-T Project Handoff

## Purpose

This document is the first file a new model/window should read before continuing Auto-T development.

Auto-T is a Chrome MV3 bilingual webpage translation extension powered by DeepSeek. The near-term goal is a reliable local Chrome extension with visible/page translation, bilingual rendering, debugging, cache, glossary, and quality controls.

## Repository State

- Repository: `git@github.com:Kendrick-L/Auto-T.git`
- Working directory: `/Users/lvtong/Documents/Practice/Auto-T`
- Current branch: `agent/m1/debug-segment-console`
- Latest pushed commit before protected inline literal work: `690348d feat: add deepseek model selector`
- Current package version in working tree: `0.1.24`

Important: run this first in any new window:

```bash
git status --short --branch
git log --oneline -5 --decorate
```

## Current Worktree Warning

Do not reset or discard local changes. Always start with `git status --short --branch` and inspect any WIP before editing. The pause/resume and toolbar icon work was completed in this branch, so new WIP should be treated as user work unless proven otherwise.

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
- Global `Pause translation` / `Resume translation` popup control.
- Active vs paused Chrome toolbar icon and `OFF` badge.
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
- Popup identifies the active http/https hostname and can clear current-site cache entries.
- DeepSeek model selector supports `deepseek-chat` and `deepseek-reasoner`.
- DeepSeek model is included in the translation cache key.
- Inline `code`, `kbd`, and `samp` literals inside paragraph text are protected with placeholders and restored unchanged in translations.

Phase 2 current docs:

```text
docs/Phase-2-step.md
```

## Recommended Next Phase 2 Task

Continue with response parser / JSON repair fallback, then record a small quality benchmark if API quota is allowed.

Expected scope:

- Add parser fixtures for code fences, prose before/after JSON, missing fields, and non-string values.
- Keep tests offline; do not call DeepSeek.
- Update docs with parser behavior and remaining limitations.
- Update docs:
  - `docs/Phase-2-step.md`
  - `docs/USAGE.md`
  - `ITERATION_PLAN.md` if roadmap status changes.
- Avoid real DeepSeek requests unless API quota is explicitly allowed.

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
