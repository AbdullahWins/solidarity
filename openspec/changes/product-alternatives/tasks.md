# Tasks

## 1. Matching

- [ ] 1.1 Create `lib/alternatives.ts` with `findAlternatives(scanned, history, limit = 3)`: shared category, fine tone, different barcode, one per barcode, newest first. Verify with jest tests for matching, exclusions (same code, avoid, neutral, no category) and the limit.

## 2. UI

- [ ] 2.1 Add `AlternativesRow` to avoid results (single mode). Verify in a demo screenshot with seeded categories.
- [ ] 2.2 Run `npm run verify`. Verify that it passes.
