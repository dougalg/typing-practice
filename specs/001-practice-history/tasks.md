---

description: "Task list for Practice History in the Sidebar"
---

# Tasks: Practice History in the Sidebar

**Input**: Design documents from `/specs/001-practice-history/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/history-module.md, contracts/sidebar-ui.md, quickstart.md, tdd/test-list.md

**Tests**: Mandatory. Constitution Principle III (Test-Driven Development) requires every behavior change to be driven by a test that failed first, and Principle V requires axe and keyboard tests. In every story phase the test tasks come first: write them, run them, and confirm they FAIL for the right reason (a summary with at least one `failed`; an all-skipped run does not count) before starting the implementation tasks. Record each red in `specs/001-practice-history/tdd/cycle-log.md`.

**Behavior markers**: `[A#]` and `[U#]` in a task are behavior ids from `tdd/test-list.md`. Every task that writes a test for a behavior, or implements it, carries its marker. Do not remove them.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. All paths are relative to the repository root. Persistence code lives only in `src/features/savedItems/`. Run `pnpm test` (Vitest) and `pnpm build` (`tsc && vite build`) to verify. Task ids continue in creation order, so the ids of the later-added tasks (T030 onward) sit earlier in the file than T004.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Test files sit beside the code they cover (`Foo.tsx` / `Foo.test.tsx`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Get the toolchain able to test IndexedDB and accessibility

- [ ] T001 In the worktree root run `pnpm install --frozen-lockfile` (the worktree has no `node_modules`). Confirm `pnpm test` runs and the existing `src/components/Heading.test.tsx` passes (baseline: 2 passed).
- [ ] T002 Add the two dev dependencies with `pnpm add -D fake-indexeddb vitest-axe`, updating `package.json` and `pnpm-lock.yaml` (never edit the lockfile by hand). Check that the resolved `vitest-axe` works with Vitest 5.0.1; if it does not, do not keep it, and instead add `axe-core` and write the `expectNoA11yViolations` helper in T003 that calls `axe-core` directly (research.md R8).
- [ ] T003 Update `src/test/setup.ts`: keep `import "@testing-library/jest-dom/vitest"`, add `import "fake-indexeddb/auto"`, register the axe matcher (`toHaveNoViolations` from `vitest-axe`, including its type augmentation so `tsc` accepts it) and add an `afterEach` that removes the `savedTextsDb` database contents so tests do not leak rows into each other.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pin what the untested code does today, then add the shared type and the schema migration that every story relies on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Characterization tests (run green against the untouched code, before T004)

> These record what the code does now. They MUST pass on the current code without any source change. If one fails for a reason other than a mistake in the test, stop and report it instead of changing the code. Their behaviors move from `PENDING` to `BASELINE` in `tdd/test-list.md` when green.

- [X] T030 [P] Write `src/App.test.tsx` characterization tests with `userEvent`: the idle app shows the setup text box and a "Start practice" button [U1]; Start with a text shows the practice view with that text and the typing input [U2]; Ctrl+Enter in the setup box starts practice [U3]; Reset returns to the setup view [U4]; typing the whole text into the typing input shows "Nice work! You finished." with progress at 100% [U5]; Start with empty and whitespace-only text shows "Please enter some text to practice first." and adds no row to `savedTextsDb.savedTexts` [A4]. Rely on the `fake-indexeddb` setup from T003.
- [X] T031 [P] Write the characterization test in `src/views/Sidebar.test.tsx` [U6]: a row added directly to `savedTextsDb.savedTexts` appears in the sidebar together with a Load button. Do not assert on the heading text or on the 5-row limit, since both change in this feature.
- [X] T032 [P] Write the characterization test in `src/components/SavedTextItem.test.tsx` [U7]: the entry shows its text, and pressing Load calls `onLoadRequest` once.
- [X] T033 [P] Write the characterization test in `src/features/savedItems/db.test.ts` [U8]: a row added to `savedTextsDb.savedTexts` reads back by id with every field intact and `dateCreated` and `dateModified` still `Date` values.

### Type and schema

- [X] T004 [P] Move the `SavedText` interface (`id`, `dateCreated`, `dateModified`, `numberOfLoads`, `numberOfCompletes`, `text`) from `src/features/savedItems/db.ts` to `src/types.ts`, keeping the field types unchanged. Import it in `db.ts` with `import type`. Add a short comment on `dateModified` ("last practiced"), `numberOfLoads` ("practice count") and `numberOfCompletes` (data-model.md R4). Nothing else may redeclare these fields as a separate shared type. Run T030 to T033 again afterwards; they must still pass.
- [X] T005 [P] Write the migration tests in `src/features/savedItems/db.test.ts` (must fail first) [U31] [U32] [U33] [U34] [U35] [U36] [U37] [U38] [U39] [U40]. Seed a version-1 database named `savedTextsDb` with the v1 schema `++id, dateCreated, dateLastUsed, text` and rows including duplicates of one `text`, then open the current database module (use `vi.resetModules()` and a dynamic `import("./db")` so the seed happens before the module opens the database). Assert: duplicates in a group collapse to one row keeping the lowest `id`; `dateCreated` = earliest in the group; `dateModified` = latest in the group; `numberOfLoads` and `numberOfCompletes` = sum of the group; a group of three merges into one; rows with a unique `text` are unchanged; the row count equals the number of distinct texts; an empty v1 database upgrades to an empty table; adding a second row with an existing `text` after the upgrade rejects with a `ConstraintError` (unique index); a new text is accepted; a database created fresh enforces the same rule.
- [X] T006 Implement the schema change in `src/features/savedItems/db.ts` (depends on T004, T005) [U31] [U32] [U33] [U34] [U35] [U36] [U37] [U38] [U39] [U40]: add `version(2).stores({ savedTexts: "++id, dateCreated, dateModified, text" })` with an `.upgrade()` that merges duplicate `text` rows exactly as T005 asserts, then `version(3).stores({ savedTexts: "++id, dateCreated, dateModified, &text" })`. Keep `version(1)` as it is so existing browsers upgrade. Data-model.md rule: "`text` … Non-empty, no trailing whitespace (`normalizeText`); **unique** across entries". Run `pnpm test src/features/savedItems/db.test.ts` until green.

**Checkpoint**: The store enforces one row per text and existing users' data survives the upgrade

---

## Phase 3: User Story 1 - Practiced texts are remembered automatically (Priority: P1) 🎯 MVP

**Goal**: Starting practice stores the text once, it survives reloads, and the sidebar lists it, with the empty state and storage-failure messages.

**Independent Test**: Enter a text, press Start, reload the page, and the text is in the sidebar. Starting again with the same text leaves one entry at the top. Empty text adds nothing.

### Tests for User Story 1 ⚠️

> Write these first and confirm they FAIL before T010 to T012

- [X] T007 [P] [US1] Write `src/features/savedItems/history.test.ts` against `fake-indexeddb` per contracts/history-module.md [U9] [U10] [U11] [U12] [U13] [U14] [U15] [U16] [U17] [U18] [U19] [U20] [U68] [U69] [U25] [U26] [U27] [U28] [U29] [U30]: `normalizeText("a b  \n")` returns `"a b"`, text without trailing whitespace is unchanged, leading and inner whitespace are kept, `""` and whitespace-only return `""`, and it is idempotent at `""`, `"a"`, `"a  "`, `"  a \n"`, `"\n"`; `recordPractice` on a new text creates exactly one entry with `numberOfCompletes` "Starts at 0" (the practice count) and `dateCreated` equal to `dateModified`; a second `recordPractice` for the same text leaves one entry with a later `dateModified` (fake only `Date`, with `vi.useFakeTimers({ toFake: ["Date"] })`), an unchanged `dateCreated` and an unchanged `numberOfCompletes` ("never changed by start, load, reset or abandon"); the same text plus trailing whitespace updates the same entry and stores the trimmed text; a text differing only by case or inner spacing creates a separate entry; `recordPractice("")` and `recordPractice("   \n")` write nothing and resolve `{ ok: true }`; two `recordPractice` calls issued together for the same text leave exactly one entry; when the store rejects (make the table's write throw), `recordPractice` resolves `{ ok: false }` and does not reject; when the first insert of a new text fails with a unique-text `ConstraintError` (simulate the race by spying on `savedTextsDb.savedTexts.add` so that it inserts the row itself and then throws `ConstraintError`), `recordPractice` retries once as an update, leaves one entry and resolves `{ ok: true }`; when that retry also fails it resolves `{ ok: false }` and does not reject; `useHistory` (via `renderHook`) returns `{ status: "loading" }` first and then `{ status: "ready", entries }`, an empty array for an empty store, entries in descending `dateModified` order, all 6 entries when 6 exist and all 100 when 100 exist, updates without a remount after `recordPractice`, and `{ status: "error" }` when the read fails instead of throwing.
- [X] T008 [P] [US1] Extend `src/views/Sidebar.test.tsx` [U53] [U54] [U57] [U58] [U59] [U60] [U61] [U62] [U63] [U64] [U65]: renders a region named "Practice History"; with no entries shows "No practice history yet. Texts you practice will appear here." and does not show it when an entry exists; with entries shows a `list` of `listitem`s most recently practiced first; when the read fails shows an `alert` "Practice history could not be loaded." and does not throw; with `saveError` set shows an `alert` "Your practice history could not be saved. You can keep practicing."; with a readable store and no `saveError` shows no alert; and `expect(container).toHaveNoViolations()` in the empty, populated, read-failure and save-failure states (Principle V).
- [ ] T009 [P] [US1] Extend `src/App.test.tsx` (US1 part) using `userEvent` [A1] [A2] [A3] [A13] [A14] [A15] [A16] [A17] [U67]: typing text and pressing "Start practice" makes it appear in the sidebar; pressing Start again with the same text (after Reset) leaves exactly one entry for it, at the top; the same text plus trailing spaces and a newline still leaves one entry; text stored earlier is still listed after unmounting and re-rendering `App` (stands in for a reload); the first visit shows the empty-state message; when the store's write fails, practice still starts and the save-failure alert appears in the sidebar; when the store's read fails, the load-failure alert appears and practice can still be started; a version-1 database seeded with duplicate rows of one text (as in T005) shows one entry for that text with the summed counts; with a `recordPractice` that never resolves, the practice view is shown immediately after pressing Start (mock `../features/savedItems/history` for this one test only).

### Implementation for User Story 1

- [X] T010 [US1] Create `src/features/savedItems/history.ts` (depends on T006, T007) [U9] [U10] [U11] [U12] [U13] [U14] [U15] [U16] [U17] [U18] [U19] [U20] [U68] [U69] [U25] [U26] [U27] [U28] [U29] [U30] with the contract signatures: `normalizeText` (returns `input.trimEnd()`), `WriteResult`, `recordPractice(text)` (one read-write transaction: create the entry with `numberOfCompletes` "Starts at 0" and the legacy `numberOfLoads` written as 0, or refresh an existing one with `dateModified = now` and nothing else; if inserting a new text fails with a unique-text `ConstraintError`, retry once as an update of the existing entry; ignore empty normalised text; catch every other error, and a failed retry, and resolve `{ ok: false }`), `HistoryState` and `useHistory()` (wraps `useLiveQuery` reading `savedTextsDb.savedTexts.orderBy("dateModified").reverse().toArray()` with the `try/catch` inside the querier so an error becomes `{ status: "error" }` and is never thrown during render; no `.limit`). No `any`.
- [X] T011 [US1] Rewrite `src/views/Sidebar.tsx` (depends on T010, T008) [U53] [U54] [U57] [U58] [U59] [U60] [U61] [U62] [U63] [U64] [U65] to use `useHistory()` and the `SidebarProps` from contracts/sidebar-ui.md (`onLoadRequest`, `saveError?`): heading "Practice History" as the region's name, a `ul` of `li` entries with a `key` of `item.id`, the empty state text, and both `role="alert"` messages. It must import persistence only from `../features/savedItems/history` and must no longer import `savedTextsDb`. The characterization test T031 must still pass.
- [ ] T012 [US1] Update `src/App.tsx` (depends on T010, T011, T009) [A1] [A2] [A3] [A13] [A14] [A15] [A16] [A17] [U67]: lift the active session `{ text, runId }` into `App` (increment `runId` on every start), start the session synchronously and call `recordPractice(text)` without awaiting it before starting, use `normalizeText` in place of the inline `trimEnd()`, render `<PracticeView key={runId} …>`, set a `saveError` state when the write resolves `{ ok: false }` and pass it to `Sidebar`, and remove the direct `savedTextsDb.savedTexts.add(...)` call and its import. Run `pnpm test` until T007 to T009 are green, the characterization tests T030 to T033 still pass, and `pnpm build` passes.

### Acceptance confirmation for User Story 1

- [X] T035 [US1] Confirm [A1] is green: run `pnpm vitest run src/App.test.tsx -t "<the A1 test name>"` and check the summary shows at least one `passed`; set A1 to `DONE` in `tdd/test-list.md` once the full suite is green.
- [X] T036 [US1] Confirm [A2] is green: same command with the A2 test name, at least one `passed`.
- [X] T037 [US1] Confirm [A3] is green: same command with the A3 test name, at least one `passed`.
- [X] T038 [US1] Confirm [A4] is still green (characterization, it passed in T030 and must pass after every change): same command with the A4 test name.
- [X] T039 [US1] Confirm [A13] is green: same command with the A13 test name, at least one `passed`.
- [X] T040 [US1] Confirm [A14] is green: same command with the A14 test name, at least one `passed`.
- [X] T041 [US1] Confirm [A15] is green: same command with the A15 test name, at least one `passed`.
- [ ] T042 [US1] Confirm [A16] is green: same command with the A16 test name, at least one `passed`.
- [X] T043 [US1] Confirm [A17] is green: same command with the A17 test name, at least one `passed`.

**Checkpoint**: User Story 1 works on its own: history is stored without duplicates and listed after reload

---

## Phase 4: User Story 2 - Load a previous text from the sidebar (Priority: P1)

**Goal**: The Load control on an entry starts a fresh session with that entry's full text, mid-practice or not, and by keyboard.

**Independent Test**: With an entry in the history, activate its Load button. The practice view shows exactly that text with the typing input focused and progress at zero. Loading while another text is half typed restarts cleanly.

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Extend `src/components/SavedTextItem.test.tsx` (Load part) [U41] [U42] [U43]: the Load `button` has an accessible name that is "Load" followed by the entry's preview text (`getByRole("button", { name: /^Load .*quick brown fox/ })`); with `userEvent`, pressing Enter on the focused button calls `onLoadRequest` once, and pressing Space does too.
- [X] T034 [P] [US2] Extend `src/views/Sidebar.test.tsx` [U55] [U56]: pressing Load on one of two entries calls `onLoadRequest` with exactly that entry; the Load buttons of the two entries have different accessible names.
- [ ] T014 [P] [US2] Extend `src/App.test.tsx` [A5] [A6] [A7] [A8] [A18] [A20]: after starting text A and pressing Reset, one click on Load for A's entry shows A's full text in the practice view, focuses the typing input and shows 0 characters typed; typing half of A then loading entry B replaces A with B at the first character with progress cleared; loading the entry that is currently running restarts it from the first character; loading moves that entry to the top of the list and updates its last-practiced date, leaves its practice count unchanged and creates no second entry; a Load reached and activated only by keyboard (Tab, Enter, then Tab and Space on another entry) works; activating Load several times in quick succession leaves one entry per text, one running session on the loaded text and an unchanged practice count.
- [ ] T056 [US2] Extend `src/App.test.tsx` (after T014, same file) [A21] [A22]: after typing a text into the setup box, pressing "Start practice" and then Reset, the setup view shows an empty text box (this is red today, because the draft is kept); after starting a text, pressing Reset, loading an entry from the sidebar and pressing Reset again, the setup text box is empty.

### Implementation for User Story 2

- [X] T015 [US2] Update `src/components/SavedTextItem.tsx` (depends on T013, T034) [U41] [U42] [U43] [U55] [U56]: give the Load `button` and the preview paragraph ids from `useId()` and set `aria-labelledby` on the button to both ids so its name is "Load" plus the preview; type the props from the shared `SavedText` (import it from `../types`, not from `features/`) picking only the displayed fields plus `onLoadRequest`, per contracts/sidebar-ui.md; keep the 3-line clamp on the preview; ensure a visible focus ring on the button (Tailwind `focus-visible:` utilities). The characterization test T032 must still pass.
- [ ] T016 [US2] Update `src/App.tsx` (depends on T012, T014, T015) [A5] [A6] [A7] [A8] [A18] [A20]: replace `handleLoadRequest` (which currently ignores the selected item) with a handler that takes the `SavedText` entry and runs the same start routine as the Start button with `entry.text` (increment `runId`, set state `running`, `recordPractice(entry.text)`, clear the setup error), so the remount via `key={runId}` gives a fresh session even for the same text. Pass it to `Sidebar` as `onLoadRequest`. Run `pnpm test` until T013, T014 and T034 are green.
- [ ] T057 [US2] Update `src/App.tsx` (depends on T016, T056) [A21] [A22]: make `handleReset` in `AppInner` also clear the setup text (`setSourceText("")`) in addition to returning the typing state to `idle` and clearing the setup error, so Reset always shows an empty setup box (FR-016). The characterization test for Reset returning to the setup view (T030, [U4]) must still pass.

### Acceptance confirmation for User Story 2

- [ ] T044 [US2] Confirm [A5] is green: run `pnpm vitest run src/App.test.tsx -t "<the A5 test name>"`, at least one `passed`.
- [ ] T045 [US2] Confirm [A6] is green: same command with the A6 test name, at least one `passed`.
- [ ] T046 [US2] Confirm [A7] is green: same command with the A7 test name, at least one `passed`.
- [ ] T047 [US2] Confirm [A8] is green: same command with the A8 test name, at least one `passed`.
- [ ] T048 [US2] Confirm [A18] is green: same command with the A18 test name, at least one `passed`.
- [ ] T049 [US2] Confirm [A20] is green: same command with the A20 test name, at least one `passed`.
- [ ] T058 [US2] Confirm [A21] is green: same command with the A21 test name, at least one `passed`.
- [ ] T059 [US2] Confirm [A22] is green: same command with the A22 test name, at least one `passed`.

**Checkpoint**: User Stories 1 and 2 both work: store then load, by mouse or keyboard

---

## Phase 5: User Story 3 - See how each text has gone (Priority: P2)

**Goal**: Each entry shows a preview, its last-practiced date and its practice count, and finishing a text (with or without mistakes) raises its practice count live.

**Independent Test**: Type a text to the end, and its entry shows "Practiced 1 time" without a refresh. Reset another text midway and its practice count stays "Practiced 0 times".

### Tests for User Story 3 ⚠️

- [ ] T017 [P] [US3] Extend `src/components/SavedTextItem.test.tsx` [U44] [U45] [U46] [U47] [U50] [U51] [U52]: shows "Last practiced: {medium date}" using `dateModified` (not `dateCreated`) when the two dates differ, with dates at midday UTC so the day does not depend on the time zone; shows "Practiced 0 times", "Practiced 1 time" and "Practiced 2 times" for `numberOfCompletes` of 0, 1 and 2, and no separate "Completed" text; a text of several thousand characters still renders (preview clamped by styling, full text present) with its Load button; `expect(container).toHaveNoViolations()` for a normal and a long-text entry.
- [ ] T018 [P] [US3] Extend `src/features/savedItems/history.test.ts` [U21] [U22] [U23] [U24]: `recordCompletion(text)` increments `numberOfCompletes` (the practice count) by one for the entry with that text ("+1 per finished session"), leaving both dates unchanged; two calls give 2; `recordCompletion` for a text with no entry resolves `{ ok: true }` without creating an entry; when the store rejects it resolves `{ ok: false }` and does not reject.
- [ ] T019 [P] [US3] Extend `src/App.test.tsx` [A9] [A10] [A11] [A12]: typing a short text to the end (character by character with `userEvent.keyboard` into the typing input) raises that entry's practice count in the sidebar by exactly one with no reload, also when a wrong character was typed and corrected on the way, and finishing the same text twice shows "Practiced 2 times"; pressing Reset midway and loading another entry midway leave the practice count unchanged; an entry with a text of several thousand characters shows only a short preview, the other entries stay listed, and Load types the full text (the test types its first characters and checks the progress counter total equals the full length); with 100 seeded entries all 100 Load buttons are present, most recently practiced first.
- [ ] T020 [P] [US3] Extend `src/views/Sidebar.test.tsx` [U66]: with 100 seeded entries all 100 Load buttons are present in most-recent-first order and the populated view has no axe violations; a long-text entry does not remove the other entries from the list.

### Implementation for User Story 3

- [ ] T021 [US3] Add `recordCompletion(text)` to `src/features/savedItems/history.ts` (depends on T010, T018) [U21] [U22] [U23] [U24]: in one read-write transaction find the entry by its unique `text` and increment `numberOfCompletes` by 1 (the practice count; do not touch `dateModified` or the legacy `numberOfLoads`), tolerate a missing entry, and resolve `{ ok: false }` on any error instead of rejecting.
- [ ] T022 [US3] Update `src/components/SavedTextItem.tsx` (depends on T015, T017) [A9] [U44] [U45] [U46] [U47] [U50] [U51] [U52]: show, as visible text and not colour alone, "Last practiced: {date}" using the existing `Intl.DateTimeFormat("en-CA", { dateStyle: "medium" })` on `dateModified`, "Practiced {n} time(s)" from `numberOfCompletes` (singular for 1, "Practiced 0 times" for 0) and no separate "Completed" text. Use `text-slate-600` or darker on white for secondary text so AA contrast holds.
- [ ] T023 [US3] Update `src/App.tsx` (depends on T016, T019, T021) [A10] [A11]: when `PracticeView` calls `onFinish` while the state is `running`, set the state to `finished` and call `recordCompletion(session.text)`; ignore a second `onFinish` when the state is already `finished` so a text is never counted twice. Route a `{ ok: false }` result into the same `saveError` notice as in T012.
- [ ] T024 [US3] Update `src/views/Sidebar.tsx` (depends on T011, T020) [A12] [U66]: put the list in a container with a bounded height and `overflow-y-auto` so 100 or more entries scroll inside the sidebar without overlapping other content, and confirm entries wrap instead of overflowing at the 3-of-12 grid width.

### Acceptance confirmation for User Story 3

- [ ] T050 [US3] Confirm [A9] is green: run `pnpm vitest run src/App.test.tsx -t "<the A9 test name>"`, at least one `passed`.
- [ ] T051 [US3] Confirm [A10] is green: same command with the A10 test name, at least one `passed`.
- [ ] T052 [US3] Confirm [A11] is green: same command with the A11 test name, at least one `passed`.
- [ ] T053 [US3] Confirm [A12] is green: same command with the A12 test name, at least one `passed`.

**Checkpoint**: All three user stories work independently and together

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates from the constitution and the quickstart

- [ ] T054 Write the guard test for [A19] in `src/App.test.tsx`: spy on `globalThis.fetch`, `XMLHttpRequest.prototype.open` and `navigator.sendBeacon`, run start, load and finish through the UI, and assert none was called. This is a guard, not a driver: it passes on the first run, so it cannot be seen failing. Prove it is not vacuous by temporarily adding a `fetch("/x")` call in `src/App.tsx`, observing the test fail, and removing the call again; record both runs in `tdd/cycle-log.md`.
- [ ] T055 Confirm [A19] is green on the restored code: run `pnpm vitest run src/App.test.tsx -t "<the A19 test name>"`, at least one `passed`.
- [ ] T025 Run `pnpm format` and commit the result so it produces no diff on the committed code (Constitution: Formatting).
- [ ] T026 Run `pnpm test` and `pnpm build` from the worktree root and confirm both pass, including all axe checks (Constitution: Quality Gates).
- [ ] T027 Confirm FR-015 by searching `src/` for any network use (`fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`) and confirming there are none introduced by this feature.
- [ ] T028 Run the manual scenarios in `specs/001-practice-history/quickstart.md` in `pnpm dev`, including the keyboard-only pass, 200% zoom and narrow width reflow, the legacy-data upgrade, the storage-unavailable case, and the contrast check of the new text colours (at least 4.5:1). Record the results for the PR.
- [ ] T029 Prepare the PR description (Constitution: Development Workflow): justify the two new dev dependencies (`fake-indexeddb` and `vitest-axe`, or `axe-core` if the fallback in T002 was used), note the contrast check result from T028, and state the known gap that `SetupView` and `PracticeView` still have no axe tests. Add a follow-up issue for that gap. Do not push to `main`; open a pull request from this branch.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start immediately. T001 before T002 before T003.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories. The characterization tests T030 to T033 come first and run against untouched code; then T004 and T005 in parallel, then T006.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational and on the App session state and Sidebar list from US1 (T010 to T012), because Load restarts the session that US1 introduces.
- **User Story 3 (Phase 5)**: Depends on US1 (T010 to T012) for the module and App wiring, and on US2's `SavedTextItem` (T015) and `App` handler (T016), because these tasks edit the same files in sequence.
- **Polish (Phase 6)**: Depends on all three stories. T054 is written last, once load and finish exist.

### Within Each User Story

- Test tasks first, confirmed failing, before implementation
- `history.ts` before `Sidebar.tsx` before `App.tsx`
- `SavedTextItem.tsx` and `App.tsx` are edited by several stories, so run those edits in phase order to avoid conflicts
- The acceptance confirmation tasks close each story; a story is not complete until they are green

### Parallel Opportunities

- T030, T031, T032 and T033 (characterization, four different files)
- T004 and T005 (Phase 2)
- T007, T008 and T009 (US1 tests, three different files)
- T013, T034 and T014 (US2 tests, three different files); T056 extends the same file as T014, so it follows it
- T017, T018, T019 and T020 (US3 tests, four different files)
- Different stories touch the same files (`App.tsx`, `SavedTextItem.tsx`), so they are not run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write history.test.ts in src/features/savedItems/history.test.ts"
Task: "Extend Sidebar.test.tsx in src/views/Sidebar.test.tsx"
Task: "Extend App.test.tsx (US1 part) in src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (characterization first, then type and schema)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart scenarios 1 to 4, then `pnpm test` and `pnpm build`
5. US1 alone already stops users losing texts, but Load is still not functional, so ship US1 and US2 together if a release is planned

### Incremental Delivery

1. Setup + Foundational: baseline pinned, store and migration ready
2. Add User Story 1: stored and listed without duplicates
3. Add User Story 2: Load works (this completes the requested capability)
4. Add User Story 3: counts, dates, live completion, scrolling list
5. Polish: guard test, format, gates, manual checks, PR

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] labels map each task to its user story for traceability
- Commit after each task or logical group, using Conventional Commits (`pnpm commit`); scopes from `commitlint.config.js` such as `features`, `views`, `components`, `deps`
- Never weaken, skip, delete or filter a test to reach green; when a test and the code disagree, `spec.md` decides
- Refactor only on a green suite, and never change a test in the same commit as a behavior change
- The spec's edge case for a very long text is covered by [U50] and [A9]; the browser-storage-blocked case by [U20], [U30], [A14] and [A15]
- Verify each test fails for the right reason before writing the implementation
