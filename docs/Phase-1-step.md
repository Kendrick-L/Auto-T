# Phase 1 Step Plan: MVP Stability

## Phase

Phase 1 maps to `Milestone 1: MVP 稳定化` in `ITERATION_PLAN.md`.

Stage branch:

```text
stage/m1-mvp-stability
```

Current development branch:

```text
agent/m1/debug-segment-console
```

## Current Goal

Stabilize the core webpage translation experience before moving to quality, interaction, dynamic site, PDF, or subtitle work.

## Step Progress

| Step | Status | Branch | Notes |
| --- | --- | --- | --- |
| Create project scaffold | Done | `main` | WXT + React + TypeScript extension initialized. |
| Add iteration and subAgent workflow | Done | `docs/iteration-agent-plan` | Planning and subAgent ownership created. |
| Stabilize MVP translation flow | Done | `agent/framework/mvp-stability` | Progress messages, display mode, cache versioning, DeepSeek timeout/retry, DOM filtering. |
| Visible translation and parser fallback | Done | `agent/m1/visible-parser-ui` | Default visible scope, page scope as secondary action, tolerant DeepSeek response parser, UI refresh. |
| Documentation progress and usage guide | In Progress | `agent/m1/docs-progress-usage` | Adds this progress file, usage guide, and Doc Agent workflow. |
| Immersive Translate benchmark and roadmap update | Done | `agent/m1/docs-immersive-benchmark` | Researched UI/function capabilities and mapped them into `ITERATION_PLAN.md`. |
| Env key fallback and next development evaluation | Done | `agent/m1/env-key-and-next-evaluation` | Uses `.env` as local DeepSeek key fallback and documents next functional/UI priorities. |
| Key source UI and DeepSeek smoke script | Done | `agent/m1/key-source-smoke-test` | Shows active key source and adds a minimal DeepSeek smoke test command. |
| Prescan, auto visible, and typography fix | Done | `agent/m1/prescan-auto-style` | Pre-scans viewport segments, adds optional scroll auto-translate, and makes translated text inherit source typography. |
| Deep DOM capture and vertical layout refinement | Done | `agent/m1/deep-dom-vertical-layout` | Captures deeply nested text containers and stacks translations below source text with slightly smaller typography. |
| Paragraph capture and version bump | In Progress | `agent/m1/paragraph-capture-version-bump` | Fixes paragraph capture when text is nested under inline children and bumps extension version for Chrome reload/publish. |
| Text-node scanner | Done | `agent/m1/text-node-scanner` | Replaces tag-first scanning with visible TextNode scanning so text inside arbitrary tags can be captured. |
| Debug pipeline console logging | Done | `agent/m1/debug-segment-console` | Adds scan, LLM, parser, and render console diagnostics to isolate missed translation stages. |
| Sibling translation insertion | Superseded | `agent/m1/debug-segment-console` | Verified that external sibling insertion can still fail in rich-text containers; replaced by inline rich-text insertion for bilingual mode. |
| Inline rich-text insertion | Done | `agent/m1/debug-segment-console` | Uses a unified inline wrapper inside the source text flow to match rich-text/Markdown layouts more closely. |
| Local debug log capture | Done | `agent/m1/debug-segment-console` | Adds a localhost debug server that persists scan, LLM, and render DOM snapshots into `debug-logs/`. |
| Extension reload guard | Done | `agent/m1/debug-segment-console` | Prevents stale content scripts from throwing uncaught `Extension context invalidated` errors after Chrome extension reload. |
| Background debug serialization fix | Done | `agent/m1/debug-segment-console` | Keeps service-worker debug records as structured JSON instead of falling back to `[object Object]`. |
| Batch fallback and partial render | Done | `agent/m1/debug-segment-console` | Repairs common malformed JSON responses and retries failed batches by single segment so successful translations still render. |

## Completed Capabilities

- Chrome MV3 extension scaffold.
- Popup actions: visible translation, page translation, retry visible, restore.
- Options settings: DeepSeek API Key, source language, target language, translation mode, display mode, cache toggle, glossary.
- DOM scanning with skip rules for code, forms, navigation, header/footer, hidden nodes, duplicated text.
- Default visible-area translation for faster feedback.
- Page-level translation fallback for broader coverage.
- DeepSeek request timeout, retry, rate-limit/auth error messages.
- Tolerant translation response parsing for common model output variants.
- Translation cache invalidated by source text, language, mode, and glossary version.
- Bilingual and translation-only display modes.
- Competitive capability baseline for Immersive Translate recorded in `ITERATION_PLAN.md`.
- DeepSeek API Key can be provided by Options or `.env` fallback for local development.
- Popup and Options can show whether the active DeepSeek key comes from Options, `.env`, or is missing.
- Viewport segment pre-scan reduces click-time parsing work.
- Optional `Auto visible on scroll` can translate newly visible untranslated segments after scroll idle.
- Translation typography inherits source font size, family, weight, line height, letter spacing, and color.
- Deep DOM scanning can capture text stored in nested `div/span/strong/em` structures.
- Bilingual translations prefer vertical stacking under the source block and use a slightly smaller font.
- Paragraphs with nested inline text are not skipped in favor of child `span/strong/em` nodes.
- Extension version is bumped when a publishable update is prepared.
- Scanner starts from visible text nodes rather than a fixed tag whitelist.
- Debug logging can print captured text, DeepSeek batches/responses, parsed translations, and render insertion status.
- Renderer can insert translations inside the source text flow using an inline wrapper and line break for rich-text pages.
- Local debug server can persist console diagnostics and inserted-node snapshots into the repo for later analysis.
- Content script safely stops Chrome API work after extension reload and asks the user to refresh the page.
- Background debug logging serializes structured records safely in service-worker contexts.
- Translation service no longer drops all successful batches when one later batch returns malformed JSON.

## Current Gaps

- No automated browser test yet.
- No manual Chrome extension page-translation test recorded yet.
- No full dynamic webpage MutationObserver flow yet; current auto visible scroll support is a lightweight M1.5 mitigation.
- No selection popup, hover translation, or input box translation yet.
- No PDF or subtitle support yet.
- Manual Chrome and real DeepSeek smoke test evidence still need to be recorded.

## Acceptance Checklist For Phase 1

- [x] `npm run compile` passes.
- [x] `npm run build` passes.
- [x] Popup supports visible translation as the primary action.
- [x] Popup keeps page translation as a secondary action.
- [x] Restore removes translation nodes and restores hidden source text.
- [x] DeepSeek parser no longer fails when translation text is returned under common alternate keys.
- [x] Documentation describes usage, testing, progress, and agent responsibilities.
- [x] New requirement intake rule documented.
- [x] Doc Agent ownership documented.
- [x] Immersive Translate capability benchmark mapped to roadmap.
- [x] Basic privacy explanation added to usage docs.
- [x] `.env` DeepSeek API Key fallback implemented for local development.
- [x] Next development functional/UI priorities documented.
- [x] Key source UI implemented.
- [x] `npm run smoke:deepseek` recorded.
- [x] Viewport segment pre-scan implemented.
- [x] Optional scroll auto visible translation implemented.
- [x] Translation typography inherits source style.
- [x] Deep nested text containers are scanned.
- [x] Translation layout stacks below source blocks with slightly smaller text.
- [x] Paragraph capture keeps `p` nodes even when text is nested in inline children.
- [x] Extension/package version bumped for this update.
- [x] Text-node-first scanning implemented for arbitrary tag nesting.
- [x] Debug pipeline logging implemented behind an Options switch.
- [x] Translation insertion avoids external block nodes for bilingual rich-text paragraphs.
- [x] Rich-text insertion uses inline wrapper placement for bilingual mode.
- [x] Debug logs can be written to `debug-logs/auto-t-latest.json`.
- [x] Stale content scripts handle extension reload without uncaught errors.
- [x] Background debug logs preserve structured batch details.
- [x] Batch-level parse failures retry individually and return partial successful translations.
- [ ] Manual Chrome load test recorded with test URL.
- [ ] Real Chrome extension page-translation smoke test recorded.

## Required Parameters For Manual Completion

- DeepSeek API Key, provided by `.env` or Options.
- Permission to spend a small amount of DeepSeek API quota in the browser extension.
- At least one test URL, preferably:
  - `https://developer.mozilla.org/`
  - `https://en.wikipedia.org/`
  - A GitHub README page.

## Requirement Intake Rule

When a new user requirement arrives:

1. Compare it against this file and `ITERATION_PLAN.md`.
2. If it already belongs to a later phase, mark it as deferred and name the target phase.
3. If it is not documented and is necessary for the current phase, prioritize it in the current phase.
4. If it is not documented and not necessary for the current phase, add it to the appropriate future phase before implementation.
5. After implementation, update this file in the same development branch before review.

## Next Recommended Step

Run a manual Chrome test with a real DeepSeek API Key, then record:

- Chrome version.
- Test URL.
- Target language.
- Result for `Visible`.
- Result for `Page`.
- Any parser or layout errors.
