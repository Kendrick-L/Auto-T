# Auto-T

Auto-T is a local-first Chrome MV3 extension for AI bilingual webpage translation.

## MVP Scope

- Configure a DeepSeek API key.
- Scan visible webpage text into translation segments.
- Batch translate segments through a background service worker.
- Render bilingual translations under the original text.
- Restore translated pages.
- Persist settings, glossary entries, and translation cache.

## Planning

- [Iteration plan](./ITERATION_PLAN.md)
- [subAgent workflow](./subAgent.md)
- [Phase 1 progress](./docs/Phase-1-step.md)
- [Usage guide](./docs/USAGE.md)

## Development

```bash
npm install
npm run dev
```

Load the generated extension from `.output/chrome-mv3` in Chrome.

## Build

```bash
npm run build
```
