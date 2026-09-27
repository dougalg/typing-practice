---
feature: 002-history-refinements
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 10
planned_at: 4823aa2
updated_at: 4823aa2
suite_baseline: green
---

# Test List: Practice History Refinements

Trace ids. Acceptance scenarios are `US<story>.<n>` in `spec.md` order (10 in total). Requirements are
`FR-001`-`FR-011`, success criteria `SC-001`-`SC-004`, and `Edge: <topic>` names a bullet under Edge Cases.
Behaviors carried over from `001` trace to that spec as `001:FR-0xx`.

Planning notes:

- **Precondition: the loop runs in Vitest browser mode, not jsdom.** Phase 1 of `tasks.md` (T001-T009)
  moves the suite first, with no behavior change. jsdom 30.1.0 has no `showModal()`, so the dialog
  behaviors (`U14`-`U24`, `A1`-`A8`) cannot go red for the right reason until that is done. Treat
  T001-T009 as the loop's preflight, as `001`'s run did with its setup tasks.
- **The outer loop is a real-browser integration test.** After the migration, every `A` behavior renders
  the real `App` in headless Chromium, driven by `userEvent` from `vitest/browser` (real input). Still not
  a full end-to-end test: no real page reload (research.md R1).
- **Characterization first.** `PracticeView` has no tests and `onTypingStarted` changes it, so `U1`-`U7`
  capture its current behavior before `U8`-`U13`. They are `PENDING` until green on the untouched view,
  then `BASELINE`.
- **Intended baseline changes to `001`'s tests.** US1 changes what a mid-practice Load does (`001`'s `A6`,
  `A20`), and US2 replaces "Practiced N time(s)" (`001`'s `U45`-`U47`, `A7`, `A10`, `A11`, `A18`) and the
  "starting never changes the count" rule (`001` `U15`). Each is updated in the cycle that changes the
  rule, and recorded in `tdd/cycle-log.md`.
- **No property library.** The version 4 count correction is sampled at both sides of each boundary
  (`U43`-`U46`).

## Outer loop: acceptance behaviors

Hosted by `src/App.test.tsx` in Vitest browser mode (after the migration). `A17`-`A19` are `001`'s manual
checks 11, 12 and 16, now automated.

| id  | behavior                                                                                                                                               | traces                       | kind    | state   | test                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------- | ------- | ----------------------------------------------------------------------- |
| A1  | With a session in progress, pressing Load on a different entry shows "Discard your progress on this text?" and leaves the session untouched underneath | US1.1, FR-001, SC-001        | example | PENDING |                                                                         |
| A2  | Choosing Cancel closes the confirmation, keeps the same text and typed position, and puts focus back on the Load button that was pressed               | US1.2, FR-003, SC-002        | example | PENDING |                                                                         |
| A3  | Pressing Escape on the confirmation does the same as Cancel                                                                                            | US1.2, FR-003                | example | PENDING |                                                                         |
| A4  | Choosing "Discard and load" starts the chosen entry from its first character                                                                           | US1.3, FR-002                | example | PENDING |                                                                         |
| A5  | With a session in progress, pressing Load on the running entry also shows the confirmation                                                             | US1.4, FR-001                | example | PENDING |                                                                         |
| A6  | With a session started but nothing typed, pressing Load loads immediately with no confirmation                                                         | US1.5, FR-004                | example | PENDING |                                                                         |
| A7  | With a session finished, pressing Load loads immediately with no confirmation                                                                          | US1.5, FR-004                | example | PENDING |                                                                         |
| A8  | Using only the keyboard, the user can open the confirmation from a Load button, cancel it, open it again and confirm it                                | US1.6, FR-005, SC-003        | example | PENDING |                                                                         |
| A9  | Starting a new text shows "Loaded: 1" and "Completed: 0" on its entry                                                                                  | US2.1, FR-007, FR-008        | example | PENDING |                                                                         |
| A10 | Starting the same text again from the setup box raises "Loaded" by one and leaves "Completed"                                                          | US2.2, FR-008, SC-004        | example | PENDING |                                                                         |
| A11 | Loading an entry from the sidebar raises its "Loaded" by one and leaves "Completed"                                                                    | US2.2, FR-008, SC-004        | example | PENDING |                                                                         |
| A12 | Finishing a text, with a mistake on the way, raises "Completed" by one and leaves "Loaded"                                                             | US2.3, FR-009, SC-004        | example | PENDING |                                                                         |
| A13 | Cancelling the confirmation leaves the target entry's "Loaded" count and last-practiced date unchanged                                                 | US2.4, FR-010                | example | PENDING |                                                                         |
| A14 | Pressing Load several times quickly while a session is in progress shows exactly one confirmation                                                      | Edge: repeated Load          | example | PENDING |                                                                         |
| A15 | Pressing Reset while a session is in progress returns to the empty setup box with no confirmation                                                      | FR-006                       | example | PENDING |                                                                         |
| A16 | An entry stored with a load count of 0 shows "Loaded: 1" after the upgrade                                                                             | FR-011                       | example | PENDING |                                                                         |
| A17 | Data from before `001`, with duplicate rows of one text, shows one entry per text through the real app (closes `001`'s `A16`)                          | 001:FR-012                   | example | PENDING |                                                                         |
| A18 | With IndexedDB unusable from the start, practice can still be started and the sidebar shows an alert                                                   | 001:FR-013, Edge: save fails | example | PENDING |                                                                         |
| A19 | At a 320 CSS px viewport with entries listed, the page does not scroll sideways and every Load button is fully visible (a guard: expected to pass)     | 001:FR-014                   | example | PENDING |                                                                         |
| A20 | When a count cannot be saved, practice still works and the sidebar shows the save-failure message                                                      | Edge: save fails             | example | DONE    | `src/App.test.tsx::[A14]` (from `001`; `recordPractice` path unchanged) |

## Inner loop: unit behaviors

### `src/views/PracticeView.tsx` (untested: characterize before changing)

| id  | behavior                                                                         | traces        | kind             | state    | test                                    |
| --- | -------------------------------------------------------------------------------- | ------------- | ---------------- | -------- | --------------------------------------- |
| U1  | While running, it shows the target text and a focused typing input               | FR-001 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U1]` |
| U2  | A correct character moves the position on by one                                 | FR-001 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U2]` |
| U3  | A wrong character shows the error message and does not move the position         | FR-001 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U3]` |
| U4  | Typing the whole text calls `onFinish` once                                      | FR-004 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U4]` |
| U5  | Pressing Reset calls `onReset`                                                   | FR-006 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U5]` |
| U6  | The running view has no axe violations                                           | FR-005 (base) | characterization | BASELINE | `src/views/PracticeView.test.tsx::[U6]` |
| U7  | The finished view has no axe violations                                          | FR-005 (base) | characterization | PENDING  |                                         |
| U8  | `onTypingStarted` is called once when the first character typed is correct       | FR-001        | example          | PENDING  |                                         |
| U9  | `onTypingStarted` is called once when the first character typed is wrong         | FR-001        | example          | PENDING  |                                         |
| U10 | `onTypingStarted` is called when the first input arrives through composition end | FR-001        | example          | PENDING  |                                         |
| U11 | `onTypingStarted` is not called when nothing has been typed                      | FR-004        | example          | PENDING  |                                         |
| U12 | `onTypingStarted` is not called a second time within the same run                | FR-001        | example          | PENDING  |                                         |
| U13 | After a remount (a new run), the first character calls `onTypingStarted` again   | FR-001        | example          | PENDING  |                                         |

### `src/components/ConfirmDiscardDialog.tsx` (new)

| id  | behavior                                                                              | traces | kind    | state   | test |
| --- | ------------------------------------------------------------------------------------- | ------ | ------- | ------- | ---- |
| U14 | With `open` true, it shows a modal dialog named "Discard your progress on this text?" | FR-005 | example | PENDING |      |
| U15 | When it opens, "Cancel" has focus                                                     | FR-005 | example | PENDING |      |
| U16 | Pressing "Cancel" calls `onCancel` once and not `onConfirm`                           | FR-003 | example | PENDING |      |
| U17 | Pressing Escape calls `onCancel` once                                                 | FR-003 | example | PENDING |      |
| U18 | Pressing "Discard and load" calls `onConfirm` once and not `onCancel`                 | FR-002 | example | PENDING |      |
| U19 | Tab from the last button keeps focus inside the dialog                                | FR-005 | example | PENDING |      |
| U20 | Shift+Tab from the first button keeps focus inside the dialog                         | FR-005 | example | PENDING |      |
| U21 | With `open` false, no dialog is shown                                                 | FR-004 | example | PENDING |      |
| U22 | Changing `open` from true to false closes it                                          | FR-003 | example | PENDING |      |
| U23 | The open dialog has no axe violations                                                 | FR-005 | example | PENDING |      |
| U24 | A screen reader announces it as a dialog with its question                            | FR-005 | example | PENDING |      |

### `src/views/Sidebar.tsx`

`U27`-`U33` automate `001`'s manual checks 15 and 17.

| id  | behavior                                                                                                         | traces     | kind    | state   | test |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------- | ------- | ------- | ---- |
| U26 | Pressing an entry's Load button calls `onLoadRequest` with that entry and that button element                    | FR-003     | example | PENDING |      |
| U27 | A populated sidebar passes axe's colour-contrast rule in the real browser, and fails it on a low-contrast mutant | 001:FR-014 | example | PENDING |      |
| U28 | A screen reader announces the region as "Practice History"                                                       | 001:FR-014 | example | PENDING |      |
| U29 | A screen reader reads the entries newest first                                                                   | 001:FR-005 | example | PENDING |      |
| U30 | A screen reader announces each Load button as "Load" plus that entry's text                                      | 001:FR-014 | example | PENDING |      |
| U31 | A screen reader reads the empty-state message                                                                    | 001:FR-011 | example | PENDING |      |
| U32 | A screen reader announces the read-failure alert                                                                 | 001:FR-013 | example | PENDING |      |
| U33 | A screen reader announces the save-failure alert                                                                 | 001:FR-013 | example | PENDING |      |

### `src/components/SavedTextItem.tsx`

| id  | behavior                               | traces | kind    | state   | test |
| --- | -------------------------------------- | ------ | ------- | ------- | ---- |
| U34 | Shows "Loaded: {numberOfLoads}"        | FR-007 | example | PENDING |      |
| U35 | Shows "Completed: {numberOfCompletes}" | FR-007 | example | PENDING |      |
| U36 | Shows no "Practiced" text              | FR-007 | example | PENDING |      |
| U37 | A screen reader reads both counts      | FR-007 | example | PENDING |      |

### `src/features/savedItems/history.ts`

| id  | behavior                                                                                              | traces         | kind    | state   | test |
| --- | ----------------------------------------------------------------------------------------------------- | -------------- | ------- | ------- | ---- |
| U38 | `recordPractice` on a new text creates one entry with `numberOfLoads = 1` and `numberOfCompletes = 0` | FR-008         | example | PENDING |      |
| U39 | `recordPractice` on an existing text adds 1 to `numberOfLoads` and leaves `numberOfCompletes`         | FR-008, FR-009 | example | PENDING |      |
| U40 | Two `recordPractice` calls for a new text issued together leave one entry with `numberOfLoads = 2`    | FR-008         | example | PENDING |      |
| U41 | When the insert loses a two-writer race, the retry path also adds 1 to `numberOfLoads`                | FR-008         | example | PENDING |      |

### `src/features/savedItems/db.ts` (schema version 4)

Boundary: "max(numberOfLoads, numberOfCompletes, 1)", sampled on both sides of each term.

| id  | behavior                                                                               | traces | kind    | state   | test |
| --- | -------------------------------------------------------------------------------------- | ------ | ------- | ------- | ---- |
| U43 | A row with `numberOfLoads = 0` and `numberOfCompletes = 0` becomes `numberOfLoads = 1` | FR-011 | example | PENDING |      |
| U44 | A row with `numberOfLoads = 2` and `numberOfCompletes = 3` becomes `numberOfLoads = 3` | FR-011 | example | PENDING |      |
| U45 | A row with `numberOfLoads = 3` and `numberOfCompletes = 3` is unchanged                | FR-011 | example | PENDING |      |
| U46 | A row with `numberOfLoads = 1` and `numberOfCompletes = 0` is unchanged                | FR-011 | example | PENDING |      |

(`U25` and `U42` are not used: dropped while planning as duplicates of `U19`/`U20` and of `001`'s
empty-text test.)

## Invariants and edge cases still to place

- **`numberOfLoads >= numberOfCompletes` for new writes.** Holds through the UI because a session is
  always started before it can be finished; guarded by `A12` (finishing never touches "Loaded"). No
  separate test.
- **Composition in progress when Load is pressed.** `U10` covers the signal; whether a half-composed
  character counts as "typed" before composition ends is left to the platform (it does not count until
  composition end).

## Out of scope

- A confirmation on Reset: decided with the user (FR-006, `A15` pins the opposite).
- Undo after confirming a discard: spec Assumptions.
- A confirmation before starting new text from the setup box: that view only shows when no session is in
  progress (spec Assumptions).
- WebKit/Safari runs: Chromium only (research.md R1); the Safari focus quirk is designed around, not
  tested.
- A real page reload: not possible inside a browser-mode test (research.md R1).
- `SetupView` accessibility tests: known gap, not touched by this feature.
- The progress bar stopping one character short of 100%: pre-existing bug, not in scope.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time. The profile still describes
jsdom; task T008 refreshes it after the migration, and these commands are expected to stay the same.

- Single test: `pnpm vitest run {file} -t "{name}"`
- File: `pnpm vitest run {file}`
- Full suite: `pnpm test`
- Coverage: none (not installed)
- Mutation: none (not installed)

A single-test run that matches nothing reports every test as skipped and still exits 0: a red counts only
when the summary shows at least one `failed`, a green only when it shows at least one `passed`.
