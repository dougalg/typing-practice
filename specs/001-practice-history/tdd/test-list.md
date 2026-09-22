---
feature: 001-practice-history
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 13
planned_at: bfb1466
updated_at: 7797347
suite_baseline: green
---

# Test List: Practice History in the Sidebar

Trace ids. `spec.md` has no numbered acceptance criteria, so acceptance scenarios are addressed as
`US<story>.<scenario>` in the order they appear (for example `US2.3` is the third acceptance
scenario of User Story 2). The 13 scenarios are the `spec_criteria`. Requirements are `FR-001` to
`FR-017`, success criteria `SC-001` to `SC-006`, and `Edge: <topic>` names a bullet under Edge Cases.

Planning notes:

- **The outer loop is integration-level, not end-to-end.** The profile has no browser runner. Every `A`
  behavior is a Testing Library test that renders the real `App` (real Sidebar, PracticeView, Dexie
  over `fake-indexeddb`) and drives it with `user-event`. It does not prove real-browser layout,
  scrolling, focus rings, zoom or colour contrast; those stay in the manual pass in `quickstart.md`.
- **Characterization first.** `App.tsx`, `Sidebar.tsx`, `SavedTextItem.tsx` and `db.ts` have no tests and this
  feature changes all four. Behaviors of kind `characterization` are written and must pass against the
  untouched code before any change. They are `PENDING` until that test exists and is green; the loop
  then sets them to `BASELINE`.
- **Time and the clock.** Contracts do not inject a clock. Tests that need distinct timestamps fake only
  `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`), because faking timers wholesale can hang
  `fake-indexeddb`.
- **No property library.** Invariants are sampled at their boundaries with example tests (see U13).
- **One count.** The spec has a single practice count, raised only when a text is typed to the end
  (`numberOfCompletes`). Start and Load never change it. `numberOfLoads` is legacy and untested.

Refresh log (2026-09-21, spec changed: one practice count, Reset empties the setup box, two-tab retry):

- Reworded, still `PENDING`, ids kept: A7, A10, A11, U14, U15, U19, U21, U45, U46, U47.
- Added: A21, A22 (Reset), U68, U69 (two-tab retry).
- Dropped: U48, U49 (the separate "Completed" count no longer exists).
- Removed from "still to place" because they are now decided: repeated Load and the count, the setup
  box after Load, and concurrent writes from two tabs.

## Outer loop: acceptance behaviors

One per acceptance scenario, plus one per requirement or edge case that has no scenario. Each stays red
until the feature works through `App`. Integration level, hosted by `pnpm vitest run src/App.test.tsx`.

| id  | behavior                                                                                                                                | traces                     | kind             | state   | test |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------- | ------- | ---- |
| A1  | With an empty history, starting practice with a new text makes that text appear in the sidebar                                          | US1.1, FR-001              | example          | DONE | `src/App.test.tsx::[A1]` |
| A2  | A text started earlier is still listed after the app is unmounted and mounted again (storage kept)                                      | US1.2, FR-004, SC-002      | example          | DONE | `src/App.test.tsx::[A2]` |
| A3  | Starting practice again with exactly the same text leaves one entry, with its last-practiced date advanced — NOTE: strengthened beyond "one entry" (see cycle-log): a rolled-back failed write also leaves one entry, so dateModified is asserted too | US1.3, FR-002, SC-003, FR-009 | example | DONE | `src/App.test.tsx::[A3]` |
| A4  | Starting with empty or whitespace-only text shows "Please enter some text to practice first." and adds no entry (already true today)   | US1.4, FR-003              | characterization | BASELINE |  `src/App.test.tsx::[A4] starting with empty or whitespace-only text shows the setup error and adds no entry`    |
| A5  | Pressing Load on an entry opens the practice view with that entry's full text, typing input focused, 0 characters typed, in one click  | US2.1, FR-007, SC-001      | example          | PENDING |      |
| A6  | Loading a different entry while another text is half typed replaces it with a fresh attempt at the first character                      | US2.2, FR-008              | example          | PENDING |      |
| A7  | Loading an entry moves it to the top of the list and updates its last-practiced date, leaves its practice count unchanged and adds no second entry | US2.3, FR-009      | example          | PENDING |      |
| A8  | With the keyboard alone, Tab reaches an entry's Load button and Enter, then Space on another entry, each loads it                       | US2.4, FR-014, SC-005      | example          | PENDING |      |
| A9  | An entry with a very long text shows only a short preview, the other entries remain listed, and Load types the full text                | US3.1, Edge: long text     | example          | PENDING |      |
| A10 | Typing a text to its last character, even after a mistake on the way, raises that entry's practice count by exactly one, visible without a reload | US3.2, FR-010, SC-004 | example        | PENDING |      |
| A11 | Pressing Reset, or loading another entry, before finishing leaves the practice count unchanged                                          | US3.3, FR-010              | example          | PENDING |      |
| A12 | With many entries (100) the sidebar lists all of them, most recently practiced first                                                    | US3.4, FR-005, SC-006      | example          | PENDING |      |
| A13 | On first visit with no history the sidebar shows the empty-state message                                                                | FR-011, Edge: empty        | example          | DONE | `src/App.test.tsx::[A13]` |
| A14 | When saving to the store fails, practice still starts and the sidebar announces that history could not be saved                         | FR-013, Edge: storage      | example          | DONE | `src/App.test.tsx::[A14]` |
| A15 | When reading the store fails, the sidebar announces that history could not be loaded and practice can still be started — NOTE: driven as "fails, alert shows, connection restored, then practice starts", not simultaneous failure of both read and write (see cycle-log) | FR-013, Edge: storage | example | DONE | `src/App.test.tsx::[A15]` |
| A16 | Data from the previous app version, including duplicate rows of one text, appears as one entry per text                                 | FR-012, Edge: legacy data  | example          | BLOCKED: no safe seam to seed pre-migration data through the real `savedTextsDb` singleton without deleting the shared physical database mid-suite, which risks corrupting other tests' state (see cycle-log). The underlying claim is already fully proven at the module boundary by U31-U40, which exercise the exact same `openSavedTextsDb` code path `savedTextsDb` is constructed from. |      |
| A17 | Starting with a text and again with the same text plus trailing spaces or newlines leaves one entry                                     | FR-002, Edge: trailing ws  | example          | DONE | `src/App.test.tsx::[A17]` |
| A18 | Activating Load on the same entry several times in a row leaves one entry per text, one running session on the loaded text, and an unchanged practice count | Edge: repeated Load, FR-009 | example    | PENDING |      |
| A19 | Starting, loading and finishing a practice make no network request (fetch, XHR, beacon are never called): a guard, cannot start red    | FR-015                     | example          | PENDING |      |
| A20 | Loading the entry that is currently running restarts it from the first character                                                        | FR-008                     | example          | PENDING |      |
| A21 | After typing a text into the setup box, starting, and pressing Reset, the setup view shows an empty text box                            | FR-016                     | example          | PENDING |      |
| A22 | After loading an entry and pressing Reset, the setup view shows an empty text box                                                       | US2.5, FR-016              | example          | PENDING |      |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. Each line names one observable result.

### `src/App.tsx` (existing, untested: characterize before changing)

| id  | behavior                                                                                               | traces        | kind             | state   | test |
| --- | ------------------------------------------------------------------------------------------------------ | ------------- | ---------------- | ------- | ---- |
| U1  | The idle app shows the setup text box and a "Start practice" button                                    | FR-001 (base) | characterization | BASELINE | `src/App.test.tsx::[U1] the idle app shows the setup text box and a Start practice button` |
| U2  | Starting with a text switches to the practice view showing that text with the typing input present     | FR-007 (base) | characterization | BASELINE | `src/App.test.tsx::[U2] starting with a text switches to the practice view showing that text with the typing input present` |
| U3  | Pressing Ctrl+Enter in the setup text box starts practice                                              | FR-014 (base) | characterization | BASELINE | `src/App.test.tsx::[U3] pressing Ctrl+Enter in the setup text box starts practice` |
| U4  | Pressing Reset in the practice view returns to the setup view                                          | FR-008 (base) | characterization | BASELINE | `src/App.test.tsx::[U4] pressing Reset in the practice view returns to the setup view` |
| U5  | Typing the whole text correctly shows "Nice work! You finished." — NOTE: progress does NOT reach 100%, a pre-existing quirk found while writing this test (see cycle-log); it plateaus at (n-1)/n because `handleTypingInput` never sets `position` on the last character | FR-010 (base) | characterization | BASELINE | `src/App.test.tsx::[U5] typing the whole text correctly shows the finished message (progress stays one character short: a pre-existing quirk, not introduced here)` |
| U67 | The practice view is shown immediately when Start is pressed, while the history write is still pending | FR-013        | example          | DONE | `src/App.test.tsx::[U67]` |

### `src/views/Sidebar.tsx` (existing, untested)

| id  | behavior                                                                                                 | traces         | kind             | state   | test |
| --- | -------------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ------- | ---- |
| U6  | A text already in the store appears in the sidebar together with a Load button                           | FR-005 (base)  | characterization | BASELINE | `src/views/Sidebar.test.tsx::[U6] a text already in the store appears in the sidebar together with a Load button` |
| U53 | The sidebar is a region named "Practice History"                                                         | FR-005         | example          | DONE | `src/views/Sidebar.test.tsx::[U53]` |
| U54 | Entries are list items, most recently practiced first                                                    | FR-005         | example          | DONE | `src/views/Sidebar.test.tsx::[U54]` |
| U55 | Pressing Load on one entry calls onLoadRequest with exactly that entry                                   | FR-007         | example          | PENDING |      |
| U56 | Load buttons of two different entries have different accessible names                                    | FR-014         | example          | PENDING |      |
| U57 | With no entries the sidebar shows "No practice history yet. Texts you practice will appear here."        | FR-011         | example          | DONE | `src/views/Sidebar.test.tsx::[U57]` |
| U58 | The empty-state text is absent when at least one entry exists                                            | FR-011         | example          | DONE | `src/views/Sidebar.test.tsx::[U58]` |
| U59 | When the store cannot be read, an alert "Practice history could not be loaded." shows and nothing throws — NOTE: simulated via a real `savedTextsDb.close()`, not a mocked Dexie method (see cycle-log) | FR-013 | example | DONE | `src/views/Sidebar.test.tsx::[U59]` |
| U60 | With saveError set, an alert "Your practice history could not be saved. You can keep practicing." shows — NOTE: asserted via role + textContent, not getByRole(name), since role="alert" doesn't name-from-content (see cycle-log) | FR-013 | example | DONE | `src/views/Sidebar.test.tsx::[U60]` |
| U61 | With a readable store and saveError unset, no alert is shown                                             | FR-013         | example          | DONE | `src/views/Sidebar.test.tsx::[U61]` |
| U62 | The empty sidebar has no axe violations — NOTE: via expectNoA11yViolations (axe-core directly), not vitest-axe (see cycle-log) | FR-014 | example | DONE | `src/views/Sidebar.test.tsx::[U62]` |
| U63 | The populated sidebar has no axe violations                                                              | FR-014         | example          | DONE | `src/views/Sidebar.test.tsx::[U63]` |
| U64 | The sidebar in the read-failure state has no axe violations                                              | FR-014         | example          | DONE | `src/views/Sidebar.test.tsx::[U64]` |
| U65 | The sidebar in the save-failure state has no axe violations                                              | FR-014         | example          | DONE | `src/views/Sidebar.test.tsx::[U65]` |
| U66 | With 100 entries the sidebar renders all 100 Load buttons in most-recent-first order                     | FR-005, SC-006 | example          | PENDING |      |

### `src/components/SavedTextItem.tsx` (existing, untested)

| id  | behavior                                                                                            | traces          | kind             | state    | test |
| --- | --------------------------------------------------------------------------------------------------- | --------------- | ---------------- | -------- | ---- |
| U7  | Shows its text and calls onLoadRequest once when Load is pressed                                    | FR-007 (base)   | characterization | BASELINE  | `src/components/SavedTextItem.test.tsx::[U7] shows its text and calls onLoadRequest once when Load is pressed` |
| U41 | The Load button's accessible name is "Load" followed by the entry's preview text                    | FR-014          | example          | DONE | `src/components/SavedTextItem.test.tsx::[U41]` |
| U42 | Pressing Enter on the focused Load button calls onLoadRequest once                                  | FR-014          | example          | DONE | `src/components/SavedTextItem.test.tsx::[U42]` |
| U43 | Pressing Space on the focused Load button calls onLoadRequest once                                  | FR-014          | example          | DONE | `src/components/SavedTextItem.test.tsx::[U43]` |
| U44 | Shows "Last practiced:" with the date of dateModified, not dateCreated, when the two differ         | FR-006          | example          | PENDING  |      |
| U45 | Shows "Practiced 1 time" (singular) for a practice count of 1                                       | FR-006          | example          | PENDING  |      |
| U46 | Shows "Practiced 2 times" for a practice count of 2                                                 | FR-006          | example          | PENDING  |      |
| U47 | Shows "Practiced 0 times" for a practice count of 0, and no separate "Completed" text               | FR-006          | example          | PENDING  |      |
| U48 | ~~Shows "Completed 1 time"~~ Dropped: the separate completion count no longer exists                | FR-006          | example          | DROPPED  |      |
| U49 | ~~Shows "Completed 2 times"~~ Dropped: the separate completion count no longer exists               | FR-006          | example          | DROPPED  |      |
| U50 | An entry with a text of several thousand characters still renders its full text and its Load button | Edge: long text | example          | PENDING  |      |
| U51 | A normal entry has no axe violations                                                                | FR-014          | example          | PENDING  |      |
| U52 | A long-text entry has no axe violations                                                             | FR-014          | example          | PENDING  |      |

### `src/features/savedItems/history.ts` (new)

| id  | behavior                                                                                                                        | traces                 | kind    | state   | test |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------- | ------- | ---- |
| U9  | normalizeText removes trailing spaces, tabs and newlines ("a b  \n" gives "a b")                                                | FR-003, FR-002         | example | DONE | `src/features/savedItems/history.test.ts::[U9]` |
| U10 | normalizeText leaves a text with no trailing whitespace unchanged                                                               | FR-002                 | example | DONE | `src/features/savedItems/history.test.ts::[U10]` |
| U11 | normalizeText keeps leading and inner whitespace ("  a  b" stays "  a  b")                                                      | FR-002                 | example | DONE | `src/features/savedItems/history.test.ts::[U11]` |
| U12 | normalizeText returns "" for "" and for whitespace-only input                                                                   | FR-003                 | example | DONE | `src/features/savedItems/history.test.ts::[U12]` |
| U13 | normalizeText is idempotent (sampled at "", "a", "a  ", "  a \n", "\n"; not a property test, no library)                        | FR-002                 | example | DONE | `src/features/savedItems/history.test.ts::[U13]` |
| U14 | recordPractice on a new text creates exactly one entry with practice count 0 and dateCreated equal to dateModified              | FR-001                 | example | DONE | `src/features/savedItems/history.test.ts::[U14]` |
| U15 | recordPractice on an existing text keeps one entry: dateModified later, dateCreated and practice count unchanged                | FR-002, FR-009         | example | DONE | `src/features/savedItems/history.test.ts::[U15]` |
| U16 | recordPractice with the same text plus trailing whitespace updates the same entry and stores the trimmed text                   | FR-002                 | example | DONE | `src/features/savedItems/history.test.ts::[U16]` |
| U17 | recordPractice with a text differing only by case or inner spacing creates a separate entry                                     | FR-002                 | example | DONE | `src/features/savedItems/history.test.ts::[U17]` |
| U18 | recordPractice with "" or whitespace-only writes nothing and resolves ok                                                        | FR-003                 | example | DONE | `src/features/savedItems/history.test.ts::[U18]` |
| U19 | Two recordPractice calls for the same text issued together leave exactly one entry                                              | Edge: repeated Load    | example | DONE | `src/features/savedItems/history.test.ts::[U19]` |
| U20 | When the store rejects the write, recordPractice resolves { ok: false } and does not reject                                     | FR-013                 | example | DONE | `src/features/savedItems/history.test.ts::[U20]` |
| U68 | When inserting a new text fails with a unique-text ConstraintError (another writer created it first), recordPractice retries once as an update, leaves one entry and resolves ok | FR-017 | example | DONE | `src/features/savedItems/history.test.ts::[U68]` |
| U69 | When that retry also fails, recordPractice resolves { ok: false } and does not reject                                           | FR-013, FR-017         | example | DONE | `src/features/savedItems/history.test.ts::[U69]` |
| U21 | recordCompletion raises the practice count by one and leaves both dates unchanged                                               | FR-010                 | example | PENDING |      |
| U22 | Two recordCompletion calls for one text give a practice count of 2                                                              | FR-010                 | example | PENDING |      |
| U23 | recordCompletion for a text with no entry resolves ok and creates no entry                                                      | FR-010                 | example | PENDING |      |
| U24 | When the store rejects the write, recordCompletion resolves { ok: false } and does not reject                                   | FR-013                 | example | PENDING |      |
| U25 | useHistory reports { status: "loading" } first, then { status: "ready" }                                                        | FR-005                 | example | DONE | `src/features/savedItems/history.test.ts::[U25]` |
| U26 | useHistory on an empty store is ready with an empty entries array                                                               | FR-011                 | example | DONE | `src/features/savedItems/history.test.ts::[U26]` |
| U27 | useHistory returns entries in descending dateModified order                                                                     | FR-005                 | example | DONE | `src/features/savedItems/history.test.ts::[U27]` |
| U28 | useHistory returns every entry: all 6 when 6 exist (past the old cap of 5); the 100-entry case moves to US3 (U66/A12), which is the sidebar-facing version of this same claim | FR-005, SC-006 | example | DONE | `src/features/savedItems/history.test.ts::[U28]` |
| U29 | useHistory updates without remounting after recordPractice — SPLIT: the recordCompletion half did not yet exist (that function is added in US3, task T021) and is deferred to U70 | SC-004                 | example | DONE | `src/features/savedItems/history.test.ts::[U29 part 1/2]` |
| U70 | useHistory updates without remounting after recordCompletion (split from U29; drive once recordCompletion exists, task T021)     | SC-004                 | example | PENDING |      |
| U30 | When the store cannot be read, useHistory returns { status: "error" } and does not throw during render                          | FR-013                 | example | DONE | `src/features/savedItems/history.test.ts::[U30]` |

### `src/features/savedItems/db.ts` (existing, untested; schema v2 and v3)

| id  | behavior                                                                                                             | traces        | kind             | state   | test |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------- | ------- | ---- |
| U8  | A row added to the current store reads back with all its fields intact, dates still Date values                      | FR-004 (base) | characterization | BASELINE | `src/features/savedItems/db.test.ts::[U8] a row added to the current store reads back with all its fields intact, dates still Date values` |
| U31 | Upgrading a version-1 database leaves a row with a unique text unchanged, including its id and every field           | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U31]` |
| U32 | Two version-1 rows with the same text become one row, keeping the lowest id                                          | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U32]` |
| U33 | The merged row's dateCreated is the earliest and its dateModified the latest of the group                            | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U33]` |
| U34 | The merged row's numberOfCompletes and numberOfLoads are the sums of the group                                       | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U34]` |
| U35 | A group of three rows with the same text merges into one row                                                         | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U35]` |
| U36 | Rows with different texts stay separate: the row count after upgrade equals the number of distinct texts             | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U36]` |
| U37 | Upgrading a version-1 database with no rows succeeds and leaves an empty table                                       | FR-012        | example          | DONE | `src/features/savedItems/db.test.ts::[U37]` |
| U38 | After the upgrade, adding a row whose text already exists is rejected with a ConstraintError                         | FR-002        | example          | DONE | `src/features/savedItems/db.test.ts::[U38]` |
| U39 | After the upgrade, adding a row with a new text succeeds                                                             | FR-001        | example          | DONE | `src/features/savedItems/db.test.ts::[U39]` |
| U40 | A database created fresh, with no earlier version, enforces the same unique-text rule                                | FR-002        | example          | DONE | `src/features/savedItems/db.test.ts::[U40]` |

## Invariants and edge cases still to place

Each must become a numbered line above before the feature is done, or be dropped with a reason.

- **Ties in dateModified.** The order of two entries with an identical last-practiced instant is
  unspecified, so U27 and U54 use distinct timestamps.
- **Single `SavedText` definition.** Verified by `pnpm build`, not by a runtime test (task T004).
- **Genuinely blocked or absent storage.** A and U behaviors simulate failure by making Dexie calls
  reject. A private window with storage disabled is a manual check in `quickstart.md`.
- **Legacy `numberOfLoads`.** Kept in the type and the store, no longer read, shown or updated. It is
  covered only through the migration sums (U34). No test asserts it is left alone by Start or Load.

## Out of scope

- Per-attempt statistics (speed, accuracy over time): spec Assumptions.
- A separate count of mistake-free attempts: spec Assumptions.
- Deleting individual entries, clearing the history, renaming, tagging, searching: spec Assumptions.
- Export, import and cross-device sync: spec Assumptions.
- Case-insensitive or whitespace-insensitive matching of "the same text": spec Assumptions (U17 pins the opposite).
- Accessibility tests for `SetupView` and `PracticeView`: known gap in `plan.md`, follow-up issue.
- Visual layout: preview clamping, scrolling, focus ring, 200% zoom, colour contrast. jsdom cannot
  compute layout or contrast; covered by the manual pass in `quickstart.md`.
- Mutation testing: no tool in the profile; the audit uses deliberate mutants on the riskiest behaviors
  (U15, U21, U32 to U35, U68).

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time (stack `typescript`, run from the
repository root):

- Single test: `pnpm vitest run {file} -t "{name}"`
- File: `pnpm vitest run {file}`
- Full suite: `pnpm test`
- Coverage: none (not installed)
- Mutation: none (not installed)

Reading a single-test run: `-t` is a name pattern and a name matching nothing prints all tests as
skipped and still exits 0. A red is valid only when the summary shows at least one `failed`; a green
only when it shows at least one `passed`.
