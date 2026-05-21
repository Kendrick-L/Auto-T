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

## Completed Capabilities

- Options includes a `Domain profile` selector.
- DeepSeek prompts include both translation mode and domain profile instructions.
- DeepSeek batch prompts include nearby page context for consistency while keeping input bounded.
- Cache keys include the domain profile so finance/legal/medical/product translations do not reuse stale general-mode cache entries.
- Cache keys include nearby context fingerprints so context-aware translations do not reuse stale unrelated entries.
- Prompt builder tests cover domain profile, glossary, and nearby context injection.

## Current Gaps

- No generated page-level summary yet; current context is nearby scanned segments only.
- No domain-level or page-level glossary yet.
- No glossary import/export yet.
- No cache management UI yet.
- No DeepSeek model selector yet.
- No manual quality benchmark recorded across GitHub, MDN, Wikipedia, and news pages.

## Acceptance Checklist For Phase 2

- [x] Domain profile affects DeepSeek prompt.
- [x] Domain profile affects translation cache key.
- [x] Domain profile is configurable in Options.
- [x] Prompt builder has unit coverage for profile and glossary content.
- [x] Nearby page context included in prompt.
- [x] Nearby context affects translation cache key.
- [ ] Domain/page glossary supported.
- [ ] Cache can be cleared globally and per site.
- [ ] DeepSeek model can be configured.
- [ ] Quality smoke results recorded for representative pages.

## Next Recommended Step

Add cache management UI: clear all cache, clear current-site cache, and explain cache/privacy impact.
