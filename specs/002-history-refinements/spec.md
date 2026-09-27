# Feature Specification: Practice History Refinements

**Feature Branch**: `002-history-refinements`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Confirm before discarding a practice session when loading a sidebar entry mid-practice, and replace the single 'Practiced N times' count with two counts: 'Loaded: N' and 'Completed: N'." Follows `specs/001-practice-history/`, found during its manual checks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Don't lose a half-typed session to a stray click (Priority: P1)

A learner is partway through typing a text and presses Load on a sidebar entry, by accident or on purpose. Instead of silently throwing their progress away, the app asks them to confirm. They can go back to exactly where they were, or discard and load the other text.

**Why this priority**: Losing progress to one mis-click is the kind of small frustration that makes people stop trusting a tool. Today it happens with no warning.

**Independent Test**: Start a text, type a few characters, press Load on another entry, choose Cancel, and confirm the session is unchanged. Repeat and choose to discard: the other text loads.

**Acceptance Scenarios**:

1. **Given** a session with at least one character typed and not yet finished, **When** the user presses Load on a different entry, **Then** a confirmation asks whether to discard their progress, and nothing has changed yet.
2. **Given** that confirmation is showing, **When** the user cancels (the Cancel control or Escape), **Then** the confirmation closes, the session is exactly as it was (same position, same marks), and focus returns to the Load control they pressed.
3. **Given** that confirmation is showing, **When** the user confirms, **Then** the chosen entry loads as a fresh session, as it does today.
4. **Given** a session in progress, **When** the user presses Load on the entry that is currently running, **Then** the same confirmation appears before it restarts.
5. **Given** a session with nothing typed yet, or a session that is finished, **When** the user presses Load, **Then** the entry loads immediately with no confirmation.
6. **Given** the confirmation is showing, **When** the user uses only the keyboard, **Then** they can reach and activate both choices, and Cancel has focus when it first appears.

---

### User Story 2 - See how often a text was loaded and how often it was completed (Priority: P2)

A learner scanning the history sees two numbers on each entry: how many times they have loaded the text, and how many times they have finished it. Comparing them shows which texts they keep starting but rarely finish.

**Why this priority**: It makes the history more useful for choosing what to practice, but nothing breaks without it.

**Independent Test**: Start a text, reset, load it again, and finish it once. Its entry shows "Loaded: 2" and "Completed: 1".

**Acceptance Scenarios**:

1. **Given** a new text, **When** the user starts practicing it, **Then** its entry shows "Loaded: 1" and "Completed: 0".
2. **Given** an entry in the history, **When** the user starts it again from the setup box or loads it from the sidebar, **Then** its loaded count goes up by one and its completed count is unchanged.
3. **Given** a session in progress, **When** the user finishes typing the text, with or without mistakes on the way, **Then** its completed count goes up by one and its loaded count is unchanged.
4. **Given** the user cancels the discard confirmation from User Story 1, **When** they look at the entry they tried to load, **Then** its loaded count is unchanged.

---

### Edge Cases

- Pressing Load several times quickly while a session is in progress shows one confirmation, not several.
- Starting new text from the setup box is not affected by the confirmation: the setup view only appears after the previous session was reset or finished.
- Entries saved before this feature keep the load counts already stored for them. Entries that were stored with a load count lower than they can possibly have had (see Assumptions) are corrected once so the loaded count is never below 1 or below the completed count.
- If the loaded or completed count can't be saved, practice still works and the existing save-failure message appears, as it does today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user activates Load on any entry while a session is in progress (at least one character typed, correct or not, and the text not finished), the system MUST ask for confirmation before discarding the session.
- **FR-002**: Confirming MUST load the chosen entry exactly as `001` FR-007 and FR-008 describe.
- **FR-003**: Cancelling, by the cancel control or the Escape key, MUST close the confirmation, leave the session exactly as it was, and return focus to the Load control that was activated.
- **FR-004**: The system MUST NOT ask for confirmation when no character has been typed in the current session, when the session is finished, or when the setup view is showing.
- **FR-005**: The confirmation MUST be announced to assistive technology with its question, give initial focus to the cancel choice, keep keyboard focus within it while open, be fully operable by keyboard, and meet WCAG 2.2 AA.
- **FR-006**: Pressing Reset during a session in progress MUST [NEEDS CLARIFICATION: also ask for confirmation before discarding the session, or keep resetting immediately as today?]
- **FR-007**: Each sidebar entry MUST show "Loaded: N" and "Completed: N" in place of the single "Practiced N times" count. This replaces `001` FR-006's count.
- **FR-008**: Starting a session with a text, from the setup box or from Load, MUST increase that entry's loaded count by exactly one. A new entry MUST start with a loaded count of 1. This replaces `001` FR-009's "MUST NOT change its practice count".
- **FR-009**: The completed count MUST keep the behavior of `001` FR-010: raised by exactly one when the text is typed to the end, with or without mistakes, and never by resets, abandoned sessions or loads.
- **FR-010**: A cancelled confirmation MUST NOT change any count or date.
- **FR-011**: Existing entries MUST keep their stored load counts, except that any entry whose loaded count is below 1 or below its completed count MUST be raised once to the larger of the two.

### Key Entities

- **History Entry** (from `001`): gains a visible loaded count alongside its completed count. No new stored fields: the load count already exists and was kept through `001`'s upgrade.
- **Discard Confirmation**: a short-lived question shown over a session in progress. It is not stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single stray press of Load never discards a session in progress: in 100% of cases a confirmation appears first.
- **SC-002**: Cancelling the confirmation returns the user to exactly where they were, in one action (one click or one key press).
- **SC-003**: A keyboard-only user can open, cancel and confirm the confirmation without a mouse.
- **SC-004**: After starting, loading or finishing a text, the entry's counts are correct in the sidebar on the next view, with no manual refresh.

## Assumptions

- "In progress" means at least one character typed in the current session, right or wrong, and the text not finished. A session where the learner typed and then deleted everything back to the start still counts as in progress, since they chose to engage with it.
- The confirmation is a single question with two choices: cancel (default) and discard-and-load. Its exact wording is a design detail.
- The labels are "Loaded: N" and "Completed: N", capitalised; the request gave them in lower case.
- Entries created while `001` was live were stored with a load count of 0, because `001` stopped updating that count. Their true count is at least 1 (they exist only because they were started) and at least their completed count, so FR-011's one-time correction restores a lower bound, not the exact history.
- Entries saved by versions before `001` keep the load counts summed during `001`'s upgrade.
- Confirmation before starting new text from the setup box is out of scope: that view only appears once no session is in progress.
- Undo after confirming a discard is out of scope.
