# Research: Practice History in the Sidebar

Technical Context had no open NEEDS CLARIFICATION items. The items below are the design questions
that the current code and the spec raise. Each was checked against the code in `src/` and the
installed library sources.

## R1. What does the current code already do, and what is wrong with it?

**Findings** (from `src/App.tsx`, `src/features/savedItems/db.ts`, `src/views/Sidebar.tsx`,
`src/components/SavedTextItem.tsx`):

- `handleStart` calls `savedTextsDb.savedTexts.add(...)` on every Start, so the same text is stored
  again each time. This breaks FR-002. Existing users may already have duplicate rows.
- `Sidebar` passes `handleLoadRequest`, which ignores the selected item and only sets state to
  `running`, so Load does not load anything (FR-007).
- `numberOfCompletes` is never incremented (FR-010).
- `SavedTextItem` shows `dateCreated` under a "Last Practiced On" label; the stored `dateModified`
  is the right field (FR-006).
- The schema string is `"++id, dateCreated, dateLastUsed, text"`, and `dateLastUsed` is not a field
  on the record, so that index is empty. The sidebar reads `limit(5)` in insertion order and no
  sorting is applied (FR-005).
- List items in `Sidebar` have no `key`.

**Decision**: Build on this store and fix these points. Do not add a second store (matches the spec
assumption).

## R2. How is "the same text" decided?

**Decision**: Two texts are the same when they are equal after `trimEnd()`. Expose it as one pure
function, `normalizeText`, and use it both for the empty/whitespace check and as the stored value.

**Rationale**: `App` already derives `targetText = sourceText.trimEnd()` and rejects an empty result,
so every stored row is already trimmed. Reusing the same rule keeps existing data consistent and
matches the spec edge case. Case and inner whitespace stay significant because they matter when
typing.

**Alternatives considered**: hashing or lower-casing (rejected: would merge texts that are typed
differently); trimming both ends (rejected: leading whitespace can be intentional, e.g. indented
code, and it would change the text being practiced).

## R3. How to guarantee one row per text, including for existing users?

**Decision**: Two Dexie versions.

- `version(2)`: index `dateModified` instead of the dead `dateLastUsed`, and an `upgrade` function
  that groups existing rows by `text` and merges each group into one row: keep the lowest `id`,
  earliest `dateCreated`, latest `dateModified`, and sum `numberOfLoads` and `numberOfCompletes`.
- `version(3)`: change the `text` index to a unique index (`&text`).

**Rationale**: A unique index cannot be created while duplicates exist, and Dexie applies the
schema change before it runs the upgrade function of the same version. Deduplicating in v2 and
adding uniqueness in v3 avoids a `ConstraintError` on first launch. The unique index also protects
against two browser tabs racing to insert the same text. Constitution Principle I requires the new
version and upgrade path.

**Alternatives considered**: a single version doing both (rejected: fails for users with
duplicates); enforcing uniqueness only in code through a read-then-write transaction (rejected:
weaker under multiple tabs, and needs the migration anyway).

**Validation**: `db.test.ts` seeds a version-1 database containing duplicates, opens it through the
current schema, and asserts the merged rows and unique constraint.

## R4. Where does last-practiced live, and what do the counts mean?

**Decision** (revised after the spec changed to one count): Reuse existing fields. `dateModified` is
the last-practiced timestamp, refreshed on every start or load. `numberOfCompletes` is the practice
count, raised only when a session reaches its last character, with or without mistakes. The sidebar
shows only this count. `numberOfLoads` is legacy: no longer read, shown or updated, and new entries
get 0. It stays in the type and the store so no migration or rename is needed.

**Consequence**: entries saved by earlier versions show "Practiced 0 times" until finished again,
because earlier versions never incremented `numberOfCompletes`. The spec records this.

**Rationale**: Renaming fields needs a migration and touches every call site for no user-visible
gain. The meaning is documented in [data-model.md](./data-model.md) so the fuzzy name does not
mislead future readers.

## R5. How does Load restart a session, including mid-practice and on the same text?

**Findings**: `PracticeView` resets its internal state in an effect keyed on
`[targetText, typingState]`. Loading the same text while a run is in progress changes neither
dependency, so nothing would reset. Loading a different text works today only because
`targetText` changes.

**Decision**: `App` owns `{ text, runId }` for the active session, where `runId` increments on
every start or load. `PracticeView` is rendered with `key={runId}`, which remounts it and clears all
progress (FR-008). The existing mount effect already focuses the typing input when the state is
`running`, which satisfies the focus requirement in Principle V.

**Alternatives considered**: adding a reset prop or imperative handle to `PracticeView` (rejected:
more API surface and more chance of stale marks); leaving state inside `AppInner` (rejected:
`Sidebar` sits beside it, not below it, so the text must live in `App`).

## R6. Should starting a session wait for the storage write?

**Decision**: No. `App` starts the session synchronously and calls `recordPractice(text)` without
awaiting it. Completion calls `recordCompletion(text)`, which finds the row by its unique text, so
no entry id needs to be tracked across the asynchronous gap.

**Rationale**: FR-013 requires practice to stay usable when storage fails, and blocking on the
write would make a slow or broken database delay typing. Looking up by text also removes a
race between "row id arrives" and "user finishes very quickly".

## R7. How do storage failures reach the user without crashing the app?

**Findings**: In `dexie-react-hooks` 4.4.0, `useLiveQuery` stores an observable error and re-throws it
during render (`if (monitor.current.error) throw monitor.current.error;`). Left alone, a read
failure would unmount the tree unless an error boundary exists (none does).

**Decision**: `useHistory` wraps its query so that errors are caught inside the querier and returned
as a value (`{ status: "error" }`) instead of thrown. Write functions (`recordPractice`,
`recordCompletion`) return a promise that resolves to `{ ok: true }` or `{ ok: false }`, never
rejects. `App` turns a failed write into a message shown in the sidebar. The message uses
`role="alert"` so assistive technology announces it (FR-013, Principle V).

**Alternatives considered**: an error boundary around the sidebar (rejected: it would replace the
whole panel and makes recovery awkward, and writes are not covered by render errors anyway).

## R8. How to test IndexedDB and accessibility in this repo?

**Findings**: jsdom has no IndexedDB. `vitest-axe` and `fake-indexeddb` are not installed, and the
constitution explicitly says to add an axe dependency with the first accessibility test.

**Decision**: Add `fake-indexeddb` (loaded through `fake-indexeddb/auto` in `src/test/setup.ts`) as
a dev dependency. A shared helper in setup clears the database between tests.

**Update, confirmed at implementation time**: `vitest-axe` (tried first, as originally planned)
does not work with this stack. Its type augmentation uses the pre-Vitest-5
`declare global { namespace Vi { interface Assertion ... } }` pattern; Vitest 5's own `Assertion`
interface is augmented via `declare module "vitest"` instead (confirmed against
`@testing-library/jest-dom`, which does work). The runtime matcher registers fine, but
`toHaveNoViolations()` never appears on the real `expect()` return type — a `tsc` failure, not a
runtime one, so `pnpm test` alone did not catch it; only `pnpm build` did. Fell back to the
alternative this research already named: `axe-core` directly, called from a small
`expectNoA11yViolations(container)` helper in `src/test/a11y.ts` that throws with a formatted
summary on any violation. No custom Chai matcher, so no type augmentation is needed at all.

**Alternatives considered**: mocking Dexie (rejected: would not exercise the migration or the
unique index, which are the riskiest parts); Playwright end-to-end (rejected as new heavyweight
tooling for a feature this size; the quickstart lists a manual browser pass instead).

## R9. Accessible naming and structure of the sidebar list

**Decision**: Sidebar is a labelled region with a heading. Entries are list items. Each Load button
gets its accessible name from its own text plus the entry's preview (`aria-labelledby` pointing at
both), so a screen-reader user hears which text will load (FR-014). The empty state and the error
notice are plain text; the error notice has `role="alert"`. Counts and dates are visible text, not
colour, so status does not rely on colour alone. Text colours reuse the existing slate palette at
`slate-600` or darker on white, which meets 4.5:1; this is to be confirmed in the PR as the
constitution requires.

## R10. What happens when two tabs start the same new text at once?

**Decision**: The unique text index (schema version 3) lets only one insert win. The loser gets a
`ConstraintError`, and `recordPractice` retries once as an update of the entry the other tab just
created. It then resolves `{ ok: true }` and the user sees no error (FR-017). If the retry also fails,
or the error is anything other than a unique-text conflict, it resolves `{ ok: false }` as before.

**Alternatives considered**: reporting `{ ok: false }` on the conflict (rejected: the text is in fact
saved, so "could not be saved" would be wrong); unbounded retries (rejected: one retry covers the race
and a loop hides real failures).

**Testing note**: `fake-indexeddb` runs in one process, so the race is simulated by making the first
`add` for a text insert the row itself and then throw `ConstraintError`.

## R11. What does Reset do to the setup text box?

**Findings**: `AppInner` keeps the setup text (`sourceText`) in its own state, and `handleReset` only
sets the typing state back to `idle`, so the previous draft stays in the box.

**Decision**: `handleReset` also clears `sourceText`, so Reset always returns to an empty setup box,
after typed practice and after a Load alike (FR-016). Loading an entry does not put its text into the
setup box, so there is nothing to keep. This replaces the earlier open question about the draft.

## Summary of open questions

None. All decisions above are ready for Phase 1.
