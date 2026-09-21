---

description: "Task list for Practice History in the Sidebar"
---

# Tasks: Practice History in the Sidebar

**Input**: Design documents from `/specs/001-practice-history/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/history-module.md, contracts/sidebar-ui.md, quickstart.md

**Tests**: Included and mandatory. Constitution Principle III requires tests written before or alongside the implementation, and Principle V requires axe and keyboard tests. In every story phase, write the test tasks first and confirm they FAIL for the right reason before starting the implementation tasks.

**Organization**: Tasks are grouped by user story so each can be implemented and tested independently. All paths are relative to the repository root. Persistence code lives only in `src/features/savedItems/`; run `pnpm test` (Vitest) and `pnpm build` (`tsc && vite build`) to verify.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Test files sit beside the code they cover (`Foo.tsx` / `Foo.test.tsx`)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Get the toolchain able to test IndexedDB and accessibility

- [ ] T001 In the worktree root run `pnpm install` (the worktree has no `node_modules`). Confirm `pnpm test` runs and the existing `src/components/Heading.test.tsx` passes.
- [ ] T002 Add the two dev dependencies with `pnpm add -D fake-indexeddb vitest-axe`, updating `package.json` and `pnpm-lock.yaml` (never edit the lockfile by hand). Check that the resolved `vitest-axe` works with Vitest 5.0.1; if it does not, do not keep it, and instead add `axe-core` and write the `expectNoA11yViolations` helper in T003 that calls `axe-core` directly (research.md R8).
- [ ] T003 Update `src/test/setup.ts`: keep `import "@testing-library/jest-dom/vitest"`, add `import "fake-indexeddb/auto"`, register the axe matcher (`toHaveNoViolations` from `vitest-axe`, including its type augmentation so `tsc` accepts it) and add an `afterEach` that removes the `savedTextsDb` database contents so tests do not leak rows into each other.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared type and the schema migration that every story relies on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Move the `SavedText` interface (`id`, `dateCreated`, `dateModified`, `numberOfLoads`, `numberOfCompletes`, `text`) from `src/features/savedItems/db.ts` to `src/types.ts`, keeping the field types unchanged. Import it in `db.ts` with `import type`. Add a short comment on `dateModified` ("last practiced"), `numberOfLoads` ("practice count") and `numberOfCompletes` (data-model.md R4). Nothing else may redeclare these fields as a separate shared type.
- [ ] T005 [P] Write `src/features/savedItems/db.test.ts` (must fail first). Seed a version-1 database named `savedTextsDb` with the v1 schema `++id, dateCreated, dateLastUsed, text` and rows including duplicates of one `text`, then open the current database module (use `vi.resetModules()` and a dynamic `import("./db")` so the seed happens before the module opens the database). Assert: duplicates in a group collapse to one row keeping the lowest `id`; `dateCreated` = earliest in the group; `dateModified` = latest in the group; `numberOfLoads` and `numberOfCompletes` = sum of the group; rows with a unique `text` are unchanged; adding a second row with an existing `text` after the upgrade rejects with a `ConstraintError` (unique index).
- [ ] T006 Implement the schema change in `src/features/savedItems/db.ts` (depends on T004, T005): add `version(2).stores({ savedTexts: "++id, dateCreated, dateModified, text" })` with an `.upgrade()` that merges duplicate `text` rows exactly as T005 asserts, then `version(3).stores({ savedTexts: "++id, dateCreated, dateModified, &text" })`. Keep `version(1)` as it is so existing browsers upgrade. Data-model.md rule: "`text` … Non-empty, no trailing whitespace (`normalizeText`); **unique** across entries". Run `pnpm test src/features/savedItems/db.test.ts` until green.

**Checkpoint**: The store enforces one row per text and existing users' data survives the upgrade

---

## Phase 3: User Story 1 - Practiced texts are remembered automatically (Priority: P1) 🎯 MVP

**Goal**: Starting practice stores the text once, it survives reloads, and the sidebar lists it, with the empty state and storage-failure messages.

**Independent Test**: Enter a text, press Start, reload the page, and the text is in the sidebar. Starting again with the same text leaves one entry at the top. Empty text adds nothing.

### Tests for User Story 1 ⚠️

> Write these first and confirm they FAIL before T010 to T012

- [ ] T007 [P] [US1] Write `src/features/savedItems/history.test.ts` against `fake-indexeddb` per contracts/history-module.md: `normalizeText("a b  \n")` returns `"a b"` and a whitespace-only string returns `""`; `recordPractice` on a new text creates exactly one entry with `numberOfLoads` "Starts at 1 on creation", `numberOfCompletes` "Starts at 0", `dateCreated` and `dateModified` set; a second `recordPractice` for the same text leaves one entry with `numberOfLoads` "+1 on every later start or load", a later `dateModified` and an unchanged `dateCreated`; two `recordPractice` calls issued together for the same text leave one entry with `numberOfLoads = 2`; `recordPractice("")` and `recordPractice("   \n")` write nothing and resolve `{ ok: true }`; when the store rejects (make the table's write throw), `recordPractice` resolves `{ ok: false }` and does not reject; `useHistory` (via `renderHook`) returns `{ status: "loading" }` first, then `{ status: "ready", entries }` in descending `dateModified` order with no cap on the number of entries, and `{ status: "error" }` when the read fails instead of throwing.
- [ ] T008 [P] [US1] Write `src/views/Sidebar.test.tsx`: renders a region named "Practice History"; with no entries shows "No practice history yet. Texts you practice will appear here."; with entries shows a `list` of `listitem`s most recently practiced first; when the read fails shows an `alert` "Practice history could not be loaded." and does not throw; with `saveError` set shows an `alert` "Your practice history could not be saved. You can keep practicing."; and `expect(container).toHaveNoViolations()` in the empty, populated and error states (Principle V).
- [ ] T009 [P] [US1] Write `src/App.test.tsx` (US1 part) using `userEvent`: typing text and pressing "Start practice" makes it appear in the sidebar; pressing Start again with the same text (after Reset) leaves exactly one entry for it; entering only whitespace shows "Please enter some text to practice first." and adds no entry; text stored earlier is still listed after unmounting and re-rendering `App` (stands in for a reload); when the store's write fails, practice still starts and the save-failure alert appears in the sidebar.

### Implementation for User Story 1

- [ ] T010 [US1] Create `src/features/savedItems/history.ts` (depends on T006, T007) with the contract signatures: `normalizeText` (returns `input.trimEnd()`), `WriteResult`, `recordPractice(text)` (one read-write transaction: create the entry with `numberOfLoads` "Starts at 1 on creation" and `numberOfCompletes` "Starts at 0", or refresh an existing one with `dateModified = now` and `numberOfLoads` "+1 on every later start or load"; ignore empty normalised text; catch every error and resolve `{ ok: false }`), `HistoryState` and `useHistory()` (wraps `useLiveQuery` reading `savedTextsDb.savedTexts.orderBy("dateModified").reverse().toArray()` with the `try/catch` inside the querier so an error becomes `{ status: "error" }` and is never thrown during render; no `.limit`). No `any`.
- [ ] T011 [US1] Rewrite `src/views/Sidebar.tsx` (depends on T010, T008) to use `useHistory()` and the `SidebarProps` from contracts/sidebar-ui.md (`onLoadRequest`, `saveError?`): heading "Practice History" as the region's name, a `ul` of `li` entries with a `key` of `item.id`, the empty state text, and both `role="alert"` messages. It must import persistence only from `../features/savedItems/history` and must no longer import `savedTextsDb`.
- [ ] T012 [US1] Update `src/App.tsx` (depends on T010, T011, T009): lift the active session `{ text, runId }` into `App` (increment `runId` on every start), start the session synchronously and call `recordPractice(text)` without awaiting it before starting, use `normalizeText` in place of the inline `trimEnd()`, render `<PracticeView key={runId} …>`, set a `saveError` state when the write resolves `{ ok: false }` and pass it to `Sidebar`, and remove the direct `savedTextsDb.savedTexts.add(...)` call and its import. Run `pnpm test` until T007 to T009 are green and `pnpm build` passes.

**Checkpoint**: User Story 1 works on its own: history is stored without duplicates and listed after reload

---

## Phase 4: User Story 2 - Load a previous text from the sidebar (Priority: P1)

**Goal**: The Load control on an entry starts a fresh session with that entry's full text, mid-practice or not, and by keyboard.

**Independent Test**: With an entry in the history, activate its Load button. The practice view shows exactly that text with the typing input focused and progress at zero. Loading while another text is half typed restarts cleanly.

### Tests for User Story 2 ⚠️

- [ ] T013 [P] [US2] Write `src/components/SavedTextItem.test.tsx` (Load part): the Load `button` has an accessible name that is "Load" followed by the entry's preview text (`getByRole("button", { name: /^Load .*quick brown fox/ })`); clicking it calls `onLoadRequest` once; with `userEvent` it can be reached with Tab and activated with both Enter and Space.
- [ ] T014 [P] [US2] Extend `src/App.test.tsx`: after starting text A and pressing Reset, activating Load on A's entry shows A's full text in the practice view, focuses the typing input and shows 0 characters typed; typing half of A then loading entry B replaces A with B at the first character with progress cleared; loading the entry that is currently running restarts it from the first character; loading moves that entry to the top of the list and increases its practice count without creating a second entry; a Load reached and activated only by keyboard (Tab, Enter) works; activating Load twice in quick succession leaves one entry per text and one running session.

### Implementation for User Story 2

- [ ] T015 [US2] Update `src/components/SavedTextItem.tsx` (depends on T013): give the Load `button` and the preview paragraph ids from `useId()` and set `aria-labelledby` on the button to both ids so its name is "Load" plus the preview; type the props from the shared `SavedText` (import it from `../types`, not from `features/`) picking only the displayed fields plus `onLoadRequest`, per contracts/sidebar-ui.md; keep the 3-line clamp on the preview; ensure a visible focus ring on the button (Tailwind `focus-visible:` utilities).
- [ ] T016 [US2] Update `src/App.tsx` (depends on T012, T014, T015): replace `handleLoadRequest` (which currently ignores the selected item) with a handler that takes the `SavedText` entry and runs the same start routine as the Start button with `entry.text` (increment `runId`, set state `running`, `recordPractice(entry.text)`, clear the setup error), so the remount via `key={runId}` gives a fresh session even for the same text. Pass it to `Sidebar` as `onLoadRequest`. Run `pnpm test` until T013 and T014 are green.

**Checkpoint**: User Stories 1 and 2 both work: store then load, by mouse or keyboard

---

## Phase 5: User Story 3 - See how each text has gone (Priority: P2)

**Goal**: Each entry shows a preview, its last-practiced date, its practice count and its completion count, and finishing a text raises its completion count live.

**Independent Test**: Type a text to the end, and its entry shows "Completed 1 time" without a refresh. Reset another text midway and its completion count stays 0 while its practice count reflects the attempt.

### Tests for User Story 3 ⚠️

- [ ] T017 [P] [US3] Extend `src/components/SavedTextItem.test.tsx`: shows "Last practiced: {medium date}" using `dateModified` (not `dateCreated`); shows "Practiced 1 time" and "Practiced 3 times" and "Completed 0 times", "Completed 1 time" with correct singular and plural; a very long text still renders (preview clamped by styling, full text present); `expect(container).toHaveNoViolations()` for a normal and a long-text entry.
- [ ] T018 [P] [US3] Extend `src/features/savedItems/history.test.ts`: `recordCompletion(text)` increments only `numberOfCompletes` for the entry with that text ("+1 per completed session"), leaving `numberOfLoads` and `dateModified` unchanged; `recordCompletion` for a text with no entry resolves `{ ok: true }` without creating an entry; when the store rejects it resolves `{ ok: false }` and does not reject.
- [ ] T019 [P] [US3] Extend `src/App.test.tsx`: typing a short text to the end (character by character with `userEvent.keyboard` into the typing input) increases that entry's completed count in the sidebar with no reload; pressing Reset midway and loading another entry midway leave the completed count unchanged; completing the same text twice shows "Completed 2 times".
- [ ] T020 [P] [US3] Extend `src/views/Sidebar.test.tsx`: with 100 seeded entries all 100 Load buttons are present in most-recent-first order and the populated view has no axe violations; a long-text entry does not remove the other entries from the list.

### Implementation for User Story 3

- [ ] T021 [US3] Add `recordCompletion(text)` to `src/features/savedItems/history.ts` (depends on T010, T018): in one read-write transaction find the entry by its unique `text` and increment `numberOfCompletes` by 1 (do not touch `numberOfLoads` or `dateModified`), tolerate a missing entry, and resolve `{ ok: false }` on any error instead of rejecting.
- [ ] T022 [US3] Update `src/components/SavedTextItem.tsx` (depends on T015, T017): show, as visible text and not colour alone, "Last practiced: {date}" using the existing `Intl.DateTimeFormat("en-CA", { dateStyle: "medium" })` on `dateModified`, "Practiced {n} time(s)" from `numberOfLoads` and "Completed {m} time(s)" from `numberOfCompletes`, with singular for 1. Use `text-slate-600` or darker on white for secondary text so AA contrast holds.
- [ ] T023 [US3] Update `src/App.tsx` (depends on T016, T019, T021): when `PracticeView` calls `onFinish` while the state is `running`, set the state to `finished` and call `recordCompletion(session.text)`; ignore a second `onFinish` when the state is already `finished` so a text is never counted twice. Route a `{ ok: false }` result into the same `saveError` notice as in T012.
- [ ] T024 [US3] Update `src/views/Sidebar.tsx` (depends on T011, T020): put the list in a container with a bounded height and `overflow-y-auto` so 100 or more entries scroll inside the sidebar without overlapping other content, and confirm entries wrap instead of overflowing at the 3-of-12 grid width.

**Checkpoint**: All three user stories work independently and together

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates from the constitution and the quickstart

- [ ] T025 Run `pnpm format` and commit the result so it produces no diff on the committed code (Constitution: Formatting).
- [ ] T026 Run `pnpm test` and `pnpm build` from the worktree root and confirm both pass, including all axe checks (Constitution: Quality Gates).
- [ ] T027 Confirm FR-015 by searching `src/` for any network use (`fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`) and confirming there are none introduced by this feature.
- [ ] T028 Run the manual scenarios in `specs/001-practice-history/quickstart.md` in `pnpm dev`, including the keyboard-only pass, 200% zoom and narrow width reflow, the legacy-data upgrade, the storage-unavailable case, and the contrast check of the new text colours (at least 4.5:1). Record the results for the PR.
- [ ] T029 Prepare the PR description (Constitution: Development Workflow): justify the two new dev dependencies (`fake-indexeddb` and `vitest-axe`, or `axe-core` if the fallback in T002 was used), note the contrast check result from T028, and state the known gap that `SetupView` and `PracticeView` still have no axe tests. Add a follow-up issue for that gap. Do not push to `main`; open a pull request from this branch.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start immediately. T001 before T002 before T003.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories. T004 and T005 in parallel, then T006.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational and on the App session state and Sidebar list from US1 (T010 to T012), because Load restarts the session that US1 introduces.
- **User Story 3 (Phase 5)**: Depends on US1 (T010 to T012) for the module and App wiring, and on US2's `SavedTextItem` (T015) and `App` handler (T016), because these tasks edit the same files in sequence.
- **Polish (Phase 6)**: Depends on all three stories.

### Within Each User Story

- Test tasks first, confirmed failing, before implementation
- `history.ts` before `Sidebar.tsx` before `App.tsx`
- `SavedTextItem.tsx` and `App.tsx` are edited by several stories, so run those edits in phase order to avoid conflicts

### Parallel Opportunities

- T004 and T005 (Phase 2)
- T007, T008 and T009 (US1 tests, three different files)
- T013 and T014 (US2 tests, two different files)
- T017, T018, T019 and T020 (US3 tests, four different files)
- Different stories touch the same files (`App.tsx`, `SavedTextItem.tsx`), so they are not run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write history.test.ts in src/features/savedItems/history.test.ts"
Task: "Write Sidebar.test.tsx in src/views/Sidebar.test.tsx"
Task: "Write App.test.tsx (US1 part) in src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart scenarios 1 to 4, then `pnpm test` and `pnpm build`
5. US1 alone already stops users losing texts, but Load is still not functional, so ship US1 and US2 together if a release is planned

### Incremental Delivery

1. Setup + Foundational: store and migration ready
2. Add User Story 1: stored and listed without duplicates
3. Add User Story 2: Load works (this completes the requested capability)
4. Add User Story 3: counts, dates, live completion, scrolling list
5. Polish: format, gates, manual checks, PR

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] labels map each task to its user story for traceability
- Commit after each task or logical group, using Conventional Commits (`pnpm commit`); scopes from `commitlint.config.js` such as `features`, `views`, `components`, `deps`
- The spec's edge case for a very long text is covered by T017 and T020; the browser-storage-blocked case by T007, T008 and T009
- Verify each test fails for the right reason before writing the implementation
