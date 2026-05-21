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

## Completed Capabilities

- Options includes a `Domain profile` selector.
- DeepSeek prompts include both translation mode and domain profile instructions.
- Cache keys include the domain profile so finance/legal/medical/product translations do not reuse stale general-mode cache entries.
- Prompt builder tests cover domain profile and glossary injection.

## Current Gaps

- No page context summary yet.
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
- [ ] Page context summary included in prompt.
- [ ] Domain/page glossary supported.
- [ ] Cache can be cleared globally and per site.
- [ ] DeepSeek model can be configured.
- [ ] Quality smoke results recorded for representative pages.

## Next Recommended Step

Add page context summary for each batch, using nearby scanned segments without sending the full page.
