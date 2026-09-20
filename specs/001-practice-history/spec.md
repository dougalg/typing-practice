# Feature Specification: Practice History in the Sidebar

**Feature Branch**: `worktree-001-practice-history`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "ability to store and load a practice history from the sidebar"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practiced texts are remembered automatically (Priority: P1)

A learner enters a piece of text and starts practicing it. Without any extra step, that text is added to their practice history, so it is still available the next time they open the app, even after closing the browser.

**Why this priority**: Nothing can be loaded unless it has first been stored. This is the foundation of the feature, and on its own it already stops users losing texts they took time to enter or paste.

**Independent Test**: Enter a text, start practice, reload the page, and confirm the text appears in the sidebar history.

**Acceptance Scenarios**:

1. **Given** an empty history, **When** the user starts practice with a new text, **Then** that text appears in the sidebar history.
2. **Given** a text is in the history, **When** the user closes and reopens the app, **Then** the text is still listed.
3. **Given** a text is already in the history, **When** the user starts practice with exactly the same text again, **Then** the history still contains a single entry for that text (not a duplicate), and that entry moves to the top as the most recently practiced.
4. **Given** the user starts practice with empty or whitespace-only text, **When** they try to start, **Then** they see the existing "enter some text" message and nothing is added to the history.

---

### User Story 2 - Load a previous text from the sidebar (Priority: P1)

A learner sees their history in the sidebar and picks an entry. The app loads that text and begins a practice session with it, without the learner retyping or re-pasting anything.

**Why this priority**: This is the other half of the requested capability. Storing without loading has no visible value.

**Independent Test**: With at least one entry in the history, activate its Load control and confirm the practice view opens showing exactly that entry's text, ready to type.

**Acceptance Scenarios**:

1. **Given** the history contains texts, **When** the user activates Load on an entry, **Then** the practice view opens with that entry's full text, and the typing input is ready to receive keystrokes.
2. **Given** the user is mid-practice on one text, **When** they Load a different entry, **Then** the current attempt is replaced by a fresh attempt at the loaded text, starting from the first character.
3. **Given** the user loads an entry, **When** the session begins, **Then** that entry's "last practiced" date is updated and it moves to the top of the list.
4. **Given** the user is using only the keyboard, **When** they tab to an entry and press Enter or Space on its Load control, **Then** it loads exactly as it would with a mouse click.

---

### User Story 3 - See how each text has gone (Priority: P2)

A learner scanning the history can tell entries apart and gauge progress: each entry shows a preview of its text, when it was last practiced, how many times it has been practiced, and how many of those attempts were completed.

**Why this priority**: It makes the history useful for choosing what to practice next, but the feature works without it.

**Independent Test**: Practice a text to completion, then check its sidebar entry shows the updated practice and completion counts.

**Acceptance Scenarios**:

1. **Given** an entry with a long text, **When** it is shown in the sidebar, **Then** only a short preview is shown, and the sidebar layout is not broken.
2. **Given** the user finishes typing an entire text, **When** they look at that entry, **Then** its completion count has increased by one.
3. **Given** the user resets or loads another text before finishing, **When** they look at that entry, **Then** its practice count reflects the attempt but its completion count is unchanged.
4. **Given** the history has many entries, **When** the user views the sidebar, **Then** the entries are ordered most recently practiced first and the list stays usable by scrolling.

---

### Edge Cases

- A text is very long (thousands of characters): the sidebar shows a truncated preview, and loading still uses the full text.
- Two texts differ only by trailing whitespace or newlines: they are treated as the same text, consistent with how the practice view already ignores trailing whitespace.
- The history is empty (first visit): the sidebar shows a short, friendly empty state instead of a blank panel.
- The browser blocks or fails to provide on-device storage (for example, private browsing restrictions): practice still works, and the user is told that history could not be saved instead of the app failing silently.
- Existing users who already have saved texts from the previous version: those entries remain in the history and keep their data, with no manual migration.
- The user activates Load repeatedly in quick succession: only one session starts for the last selection, with no duplicate history entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add a text to the practice history when the user starts a practice session with it, without requiring a separate "save" action.
- **FR-002**: The system MUST NOT create duplicate history entries for the same text. Starting practice with a text already in the history MUST update that entry instead.
- **FR-003**: The system MUST NOT add an entry when the entered text is empty or only whitespace.
- **FR-004**: The system MUST keep the history across page reloads and browser restarts, on the user's own device only.
- **FR-005**: The system MUST list history entries in the sidebar, most recently practiced first.
- **FR-006**: Each sidebar entry MUST show a truncated preview of its text, the date it was last practiced, its practice count and its completion count.
- **FR-007**: Each sidebar entry MUST provide a Load control that begins a new practice session using that entry's full text.
- **FR-008**: Loading an entry MUST replace any practice session in progress, and the new session MUST start at the first character with all previous progress and error marks cleared.
- **FR-009**: Loading an entry MUST update its last-practiced date and increase its practice count.
- **FR-010**: The system MUST increase an entry's completion count when the user types the entire text to the end, and MUST NOT increase it for abandoned or reset attempts.
- **FR-011**: The system MUST show an empty-state message in the sidebar when the history has no entries.
- **FR-012**: The system MUST keep any texts saved by earlier versions of the app, including their dates and counts.
- **FR-013**: If the history cannot be stored or read, the system MUST keep practice usable and MUST tell the user, in a way assistive technology also announces.
- **FR-014**: The history list and its Load controls MUST be fully operable by keyboard, have accessible names that identify which entry each control acts on, and meet WCAG 2.2 AA.
- **FR-015**: The system MUST NOT send history data off the user's device.

### Key Entities

- **History Entry**: One distinct practice text and its usage summary. Attributes: the full text, when it was first stored, when it was last practiced, how many times it has been started, and how many times it has been completed. There is at most one entry per distinct text.
- **Practice Session**: A single attempt at typing a text, either started from newly entered text or loaded from a History Entry. It is not stored as its own record. It updates the counts and dates of the related History Entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can re-start practice on a previously used text in 2 interactions or fewer (find the entry, activate Load), with no retyping.
- **SC-002**: 100% of texts the user has started practicing are still listed after the browser is closed and reopened.
- **SC-003**: Practicing the same text any number of times never produces more than one history entry for it.
- **SC-004**: After a user completes a text, its completion count is visible in the sidebar on the next view of that entry, with no manual refresh.
- **SC-005**: A user who has never used a mouse can find and load a history entry using only the keyboard.
- **SC-006**: The sidebar remains readable and scrollable with 100 or more stored entries, with no overlap or clipping of entry content.

## Assumptions

- "Practice history" means the list of distinct texts the user has practiced, each with usage details, not a log of every individual attempt with timings or accuracy. Per-attempt statistics (speed, accuracy over time) are out of scope.
- Loading an entry immediately begins a practice session with that text, matching the existing Load control's behavior, instead of only filling in the text box for editing.
- Texts are considered the same when they match exactly after trailing whitespace is removed. Differences in case or inner spacing make them different texts.
- Deleting individual entries, clearing the whole history, renaming, tagging and searching entries are out of scope for this feature and can follow later.
- Export, import and syncing history across devices or browsers are out of scope, in line with the app's local-only design.
- The existing saved-texts store and sidebar are the basis for this feature. It extends them and does not add a second, separate store.
- A single user per browser profile: there are no accounts or sharing.
