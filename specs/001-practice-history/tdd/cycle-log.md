# Cycle Log: Practice History in the Sidebar

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `pnpm test` -> 2 passed, 0 failed (1 file, `src/components/Heading.test.tsx`)
- commit: `bfb1466`
- recorded: cycle 0, before any change

## Setup: fake-indexeddb and vitest-axe

- Added `fake-indexeddb` and `vitest-axe` as dev dependencies (`pnpm add -D`), regenerated via
  `pnpm install` after an earlier `pnpm format` run corrupted `pnpm-lock.yaml`'s quote style
  (reverted; lockfile must only ever be written by pnpm).
- Verified both against a throwaway `src/test/smoke.test.ts` (removed once verified): Dexie
  add/get round-trips a row through `fake-indexeddb`; `axe()` + `toHaveNoViolations()` passes a
  clean labelled button and, with a deliberate `<img>` with no alt text, reports
  `violations.length > 0` (not vacuous).
- `src/test/setup.ts`: registered `vitest-axe/matchers` via `expect.extend` (the
  `vitest-axe/extend-expect` import alone only adds TypeScript types, not the runtime matcher —
  discovered by a first failing smoke run: `Invalid Chai property: toHaveNoViolations`), added
  `fake-indexeddb/auto`, and an `afterEach` that clears `savedTextsDb.savedTexts` between tests.
- Also added `afterEach(cleanup)` from `@testing-library/react`: this repo runs Vitest without
  globals, so Testing Library's own auto-cleanup (which looks for a global `afterEach`) never
  registers, and a second `render()` in one test file leaves the first render's DOM in place.
  Found via a genuine "multiple elements found" failure while writing the first characterization
  test, not anticipated in advance.
- commit: `eeb3b5f`

## Characterization: App.tsx, Sidebar.tsx, SavedTextItem.tsx, db.ts (tasks T030-T033)

Per the playbook's brownfield section: each test asserts current behavior, was confirmed green
immediately, then verified with a deliberate mutant (break, confirm the characterization test
fails, restore exactly, confirm the full suite is green again with no diff in the production
file). These are not red-green-refactor cycles; states go straight to `BASELINE`.

- U1 (`src/App.test.tsx`): idle app shows the setup box and "Start practice". Mutant: renamed the
  button to "MUTANT-Start practice" in `SetupView.tsx` -> test failed (`Unable to find
  role="button" name "Start practice"`). Restored.
- U2 (`src/App.test.tsx`): starting shows the practice view with the typed text and the typing
  input. Mutant: changed the typing input's placeholder to `"MUTANT"` in `PracticeView.tsx` ->
  failed. Restored.
  - Deviation found while writing this test: the test's own text-matching helper was buggy, not
    the code. `getByText("hello")` can't match split-per-character `<span>`s, and my first
    replacement helper (any `<p>` with that exact textContent) collided with the sidebar's own
    preview of the same text, since the current `App.tsx` already saves every started text to
    `savedTextsDb` on every Start. This surfaced as apparent flakiness (pass/fail depending on
    whether the sidebar's `useLiveQuery` had resolved yet), reproduced 6/10 runs, root-caused by
    isolating the test and reading the actual "multiple elements" error rather than assumed to be
    inherent async flakiness. Fixed by scoping the query to the "Type the text below" `<section>`
    via `within()`. Re-run 6 times clean afterward.
- U3 (`src/App.test.tsx`): Ctrl+Enter starts practice. Mutant: same placeholder mutant as U2 ->
  failed. Restored.
- U4 (`src/App.test.tsx`): Reset returns to the setup view. Mutant: renamed the Reset button to
  "MUTANT-Reset" -> failed. Restored.
- U5 (`src/App.test.tsx`): typing the whole text shows the finished message. Mutant: changed the
  finish message to `"MUTANT"` on the line the "hi" test path actually hits (`PracticeView.tsx`
  line ~100, the `handleTypingInput` branch, not the composition-event branch at line ~195) ->
  failed. Restored.
  - Finding, not fixed (out of this feature's scope, Hard Rule 6): on the last character,
    `handleTypingInput` calls `onFinish()` but never calls `setPosition(nextPos)`, so `position`
    stays one short of `targetText.length` and the progress bar reports `(n-1)/n` instead of
    100% even though typing is complete (observed: "hi", 2 chars, finishes at 50%, not 100%). My
    first draft of U5 assumed 100% and failed against the untouched code for the wrong reason
    (assertion failure, not a broken test) — caught, and the test corrected to assert the actual
    number, with the quirk called out in a comment. Reporting this per Hard Rule 6 rather than
    fixing it; it predates this feature and touches `PracticeView.tsx`, which is out of this
    feature's file scope.
- A4 (`src/App.test.tsx`): empty/whitespace text shows the setup error and adds no entry (already
  true today, tracked as a characterization behavior per `tasks.md`). Mutant: changed the error
  message to `"MUTANT"` in `App.tsx` -> failed. Restored.
- U6 (`src/views/Sidebar.test.tsx`, new file): a stored text appears in the sidebar with a Load
  button. Mutant: changed `.limit(5)` to `.limit(0)` in `Sidebar.tsx` -> `findByText` timed out
  and failed. Restored. Re-run 3 times clean.
- U7 (`src/components/SavedTextItem.test.tsx`, new file): shows its text, Load calls
  `onLoadRequest` once. Mutant: removed the button's `onClick` in `SavedTextItem.tsx` -> failed
  (`onLoadRequest` not called). Restored. Re-run 3 times clean.
- U8 (`src/features/savedItems/db.test.ts`, new file): a row added reads back with every field
  intact, dates still `Date` instances. Mutant: changed the `savedTexts` store definition from
  `"++id, ..."` to `"id, ..."` (no auto-increment) in `db.ts`, so `add()` without an explicit id
  rejects -> failed. Restored. Re-run 3 times clean.

Suite after this phase: `pnpm test` -> 11 passed, 0 failed (5 files). `pnpm build` passes. No
diff remains in any production file (`App.tsx`, `PracticeView.tsx`, `SetupView.tsx`,
`Sidebar.tsx`, `SavedTextItem.tsx`, `db.ts`) — every mutant was restored exactly.

- commit: `77b635f`

## Structural: SavedText moved to src/types.ts (task T004)

No behavior change. Moved the `SavedText` interface into `src/types.ts` per data-model.md, with
`db.ts` importing and re-exporting it so `Sidebar.tsx`'s existing import keeps working. Verified
by `pnpm build` (tsc) and by re-running the U1-U8/A4 characterization suite unchanged.

- suite: `pnpm test` -> 11 passed, 0 failed (unchanged)
- commit: `cc0ca15`

## Structural: extracted openSavedTextsDb(name) as a factory

No behavior change (the default `savedTextsDb` still opens the same name with the same version-1
schema). Introduces the seam the next cycle's migration tests need: an isolated database under a
throwaway name, so seeding version-1 data for a test never touches the real `savedTextsDb` that
the global `afterEach` cleanup and the characterization tests already depend on. Per the
playbook's "introduce the seam as its own refactoring step on green code, then come back."

- suite: `pnpm test` -> 11 passed, 0 failed (unchanged)
- commit: `728dd84`

## Cycle: U31-U40 (schema v2/v3 migration, tasks T005-T006)

One cycle covering all ten migration behaviors together, since they are one implementation (the
version 2 upgrade function and the version 3 unique index) and were written and driven as one
unit rather than ten separate implementation steps.

- test: `src/features/savedItems/db.test.ts`, new `describe("openSavedTextsDb migration from
  version 1 ...")` block, ten `it` blocks tagged `[U31]` to `[U40]`. Helpers added: `seedV1()`
  (opens a version-1-only Dexie instance under a throwaway name and inserts rows, bypassing
  `openSavedTextsDb` so the seed predates any upgrade function) and `row()` (a `SavedText`
  builder with sensible defaults).
- red: `pnpm vitest run src/features/savedItems/db.test.ts` (against `db.ts` with only the
  version-1 schema, no version 2 or 3) -> `Tests 7 failed | 4 passed (11)`. The 4 that passed
  trivially hold without merge/uniqueness logic (a single unique row is already "unchanged"; an
  empty database is already "empty"). The 7 real reds, each a genuine assertion failure, not a
  broken test file:
  - U32: `expected [ 2 ] to have a length of 1` -> two rows, not merged
  - U33: dateCreated/dateModified assertions failed (values from the first-seeded row, not
    earliest/latest)
  - U34: `expected 1 to be 7` (numberOfLoads), `expected 0 to be 4` (numberOfCompletes) -> not
    summed
  - U35: three-row group not merged
  - U36: `expected [ 'a','a','b','c','c','c' ] to deeply equal [ 'a','b','c' ]` -> duplicates not
    collapsed
  - U38: `promise resolved "99" instead of rejecting` -> no unique index yet
  - U40: `promise resolved "2" instead of rejecting` -> no unique index on a fresh database either
- green: implemented in `src/features/savedItems/db.ts`: `version(2).stores({ savedTexts: "++id,
  dateCreated, dateModified, text" }).upgrade(...)` groups existing rows by `text`, and for each
  group of 2+ keeps the lowest id, earliest `dateCreated`, latest `dateModified`, and sums
  `numberOfLoads`/`numberOfCompletes`; then `version(3).stores({ savedTexts: "++id, dateCreated,
  dateModified, &text" })` adds the unique index once duplicates are gone. Suite ->
  `pnpm vitest run src/features/savedItems/db.test.ts`: 11 passed, 0 failed.
- refactor: none needed beyond running Prettier on the new test file (`pnpm format` was avoided
  repo-wide after an earlier incident; only the touched file was formatted:
  `npx prettier --write src/features/savedItems/db.test.ts`). Re-ran the full suite unchanged
  after formatting.
- full suite: `pnpm test` -> 21 passed, 0 failed (5 files), repeated 3 times clean. `pnpm build`
  passes.
- commit: `25a1f11`

## Cycle: U9-U13 (normalizeText, task T007 slice 1 of several)

- test: `src/features/savedItems/history.test.ts` (new file), five `it` blocks tagged `[U9]` to
  `[U13]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts` against `import { normalizeText }
  from "./history"` with no `history.ts` yet -> unresolved-symbol compile error (Vite transform
  error), the allowed non-assertion red per the playbook. Added the minimal stub
  `normalizeText(input) { return input; }`, re-ran -> `Tests 2 failed | 3 passed (5)`, real
  assertion failures (U12: `expected '   \n\t' to be ''`; U13 failed at the same input for the
  same reason). U9, U10, U11 passed trivially against the identity stub (no trailing whitespace in
  those fixtures to strip).
- green: `input.trimEnd()`. `pnpm vitest run src/features/savedItems/history.test.ts` -> 5 passed.
- refactor: none needed; the implementation is already the smallest correct form.
- full suite: `pnpm test` -> 26 passed, 0 failed (6 files).
- commit: `4273644`

## Cycle: U14-U19 (recordPractice upsert, task T007 slice 2)

- test: six `it` blocks added to `history.test.ts`, tagged `[U14]` to `[U19]`.
- red: `pnpm vitest run src/features/savedItems/history.test.ts` with `recordPractice` not yet
  exported -> `TypeError: recordPractice is not a function`, an unresolved-symbol red per the
  playbook (`Tests 6 failed | 5 passed (11)`, the 5 passing being U9-U13 from the earlier cycle).
- green: implemented `recordPractice` directly (the shape was clear enough not to need a fake-it
  stub first): normalise, no-op on empty, else a single `"rw"` transaction that looks up by
  `text`, updates `dateModified` on a hit or adds a new row (`numberOfCompletes: 0`) on a miss.
  `pnpm vitest run src/features/savedItems/history.test.ts` -> 11 passed, repeated 3 times clean.
- refactor: none needed.
- full suite: `pnpm test` -> 32 passed, 0 failed (6 files). `pnpm build` passes.
- commit: (recorded after this entry is written, see report)
