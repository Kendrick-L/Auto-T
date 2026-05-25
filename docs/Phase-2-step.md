# Phase 2 Step Plan: Translation Quality

## Phase

Phase 2 maps to `Milestone 2: 翻译质量增强` in `ITERATION_PLAN.md`.

Stage branch:

```text
stage/m2-quality
```

Current development branch:

```text
agent/m1/debug-segment-console
```

## Current Goal

Improve translation quality and professional control after the Phase 1 webpage translation chain is usable.

## Step Progress

| Step | Status | Branch | Notes |
| --- | --- | --- | --- |
| Domain profile prompt | Done | `agent/m1/debug-segment-console` | Adds a specialized domain profile setting for general, technical docs, legal, medical, finance, and product documentation. |
| Nearby context prompt | Done | `agent/m1/debug-segment-console` | Adds nearby scanned segments to each DeepSeek batch prompt without sending the full page. |
| Cache management UI and helpers | Done | `agent/m1/debug-segment-console` | Options can show cache count and clear all cached translations. Popup identifies the active http/https hostname and can clear cached entries for the current site. |
| DeepSeek model selector | Done | `agent/m1/debug-segment-console` | Options can choose `Flash` or `Pro`; Auto-T sends `deepseek-v4-flash` or `deepseek-v4-pro` to DeepSeek and separates cache keys by model. |
| Chinese source skip | Done | `agent/m1/debug-segment-console` | When the target language is Chinese, Chinese-language pages or context shortcut targets are skipped before DeepSeek requests. |
| Protected inline literals | Done | `agent/m1/debug-segment-console` | Inline `code`, `kbd`, and `samp` literals inside paragraph text are sent as protected placeholders and restored into translations unchanged. |
| Response parser fallback | Done | `agent/m1/debug-segment-console` | Parser recovers JSON from fences/prose, repairs common punctuation issues, skips malformed segment entries, and recovers alternate/nested translation fields. |

## Completed Capabilities

- Options includes a `Domain profile` selector.
- DeepSeek prompts include both translation mode and domain profile instructions.
- DeepSeek batch prompts include nearby page context for consistency while keeping input bounded.
- Cache keys include the domain profile so finance/legal/medical/product translations do not reuse stale general-mode cache entries.
- Cache keys include nearby context fingerprints so context-aware translations do not reuse stale unrelated entries.
- Prompt builder tests cover domain profile, glossary, and nearby context injection.
- Options includes cache status and a `Clear all` cache action.
- Translation cache entries record the source hostname for new saves.
- Storage helpers support cache stats, clearing all cache, and clearing cache entries for a recorded hostname.
- Popup includes current-site cache status and `Clear site` for active http/https tabs.
- Options includes a DeepSeek model selector for `Flash` and `Pro`.
- DeepSeek requests use the selected model, and cache keys include the selected model.
- Chinese source pages are detected by document language and source text heuristics and skipped when the target language is Chinese.
- Inline code/path literals inside paragraphs are preserved in translated text while block code remains skipped.
- DeepSeek response parsing handles common JSON wrappers, small punctuation mistakes, malformed entries, and alternate translation fields.
- M3 interaction work has started on this branch: `Option+V` translates visible text, and `Option+T` translates selected text first or the hovered sentence/paragraph without automatic page-load/hover requests. Hover sentence detection now uses the full owner block instead of the inline word node, inline `code`/`kbd`/`samp` literals are protected, and context translation shows a loading state before the result arrives. Repeating `Option+T` on the same target toggles its interaction translation off; selecting text in a block with an existing hover translation removes the older interaction first; `Option+V` clears existing interaction translations before visible-area translation.

## Current Gaps

- M3 interaction translations currently render as page blocks after or inside the target block; selection popup, pronunciation, copy actions, right-click menu, and floating launcher are still future work.
- No generated page-level summary yet; current context is nearby scanned segments only.
- No domain-level or page-level glossary yet.
- No glossary import/export yet.
- DeepSeek compatibility model names should be revisited before their planned upstream deprecation date.
- No manual quality benchmark recorded across GitHub, MDN, Wikipedia, and news pages.

## Acceptance Checklist For Phase 2

- [x] Domain profile affects DeepSeek prompt.
- [x] Domain profile affects translation cache key.
- [x] Domain profile is configurable in Options.
- [x] Prompt builder has unit coverage for profile and glossary content.
- [x] Nearby page context included in prompt.
- [x] Nearby context affects translation cache key.
- [x] Cache can be inspected and cleared globally from Options.
- [x] Cache storage helper can clear entries by recorded hostname.
- [x] Current-site cache clearing is available from the popup for active http/https tabs.
- [x] DeepSeek model can be configured.
- [ ] Domain/page glossary supported.
- [ ] Quality smoke results recorded for representative pages.

## Next Recommended Step

For M3, add manual Chrome evidence for `Option+V` and `Option+T`, then consider right-click menu and copy-translation actions. For Phase 2 quality, record a small benchmark only if API quota is allowed.

## New Window Handoff

Use `docs/PROJECT_HANDOFF.md` as the project state entrypoint.

Use `docs/PHASE_2_NEW_WINDOW_PROMPT.md` when starting a new model/window for Phase 2 continuation.

Before continuing Phase 2, the new window must run:

```bash
git status --short --branch
git log --oneline -5 --decorate
```

If pause/action-icon WIP is present in the worktree, do not discard it. Finish it first or leave it untouched before starting cache management.
