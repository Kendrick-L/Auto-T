# Phase 1 Step Plan: MVP Stability

## Phase

Phase 1 maps to `Milestone 1: MVP 稳定化` in `ITERATION_PLAN.md`.

Stage branch:

```text
stage/m1-mvp-stability
```

Current development branch:

```text
agent/m1/env-key-and-next-evaluation
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

## Current Gaps

- No automated browser test yet.
- No real DeepSeek API smoke test recorded in repo, because API Key and quota permission are required.
- No dynamic webpage MutationObserver flow yet.
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
- [ ] Manual Chrome load test recorded with test URL.
- [ ] Real DeepSeek translation smoke test recorded after API Key and quota permission are provided.

## Required Parameters For Manual Completion

- DeepSeek API Key, entered in the extension Options page.
- Permission to spend a small amount of DeepSeek API quota.
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
