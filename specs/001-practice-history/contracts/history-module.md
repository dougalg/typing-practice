# Contract: `features/savedItems/history.ts`

Internal module boundary. Views and `App` use persistence only through this module (Constitution
Principle IV). Signatures are the contract; bodies belong to implementation.

```ts
import type { SavedText } from "../../types";

/** Trailing whitespace removed. "" means there is nothing to practice. */
export function normalizeText(input: string): string;

export type WriteResult = { ok: true } | { ok: false };

/**
 * Called when a session starts (Start or Load). Creates the entry (numberOfCompletes = 0) or
 * refreshes an existing one (dateModified = now; the practice count is NOT changed). If the insert
 * of a new text loses a race to another writer (unique-text ConstraintError), retries once as an
 * update. Ignores empty text (resolves { ok: true } without writing). Never rejects.
 */
export function recordPractice(text: string): Promise<WriteResult>;

/**
 * Called when a session for `text` reaches its last character (with or without mistakes made on
 * the way). Increments numberOfCompletes, the practice count, on the entry with that text; a
 * missing entry is not an error. Never rejects.
 */
export function recordCompletion(text: string): Promise<WriteResult>;

export type HistoryState =
	| { status: "loading" }
	| { status: "ready"; entries: SavedText[] } // most recently practiced first
	| { status: "error" };

/** Live list of entries. Re-renders when the store changes. Never throws during render. */
export function useHistory(): HistoryState;
```

## Behavioural guarantees (each maps to a test)

| Guarantee | Spec |
|-----------|------|
| `normalizeText("a b  \n")` returns `"a b"`; whitespace-only returns `""` | FR-003, edge cases |
| `recordPractice` on a new text creates exactly one entry with `numberOfCompletes = 0` (practice count 0) | FR-001 |
| `recordPractice` on an existing text leaves exactly one entry, moves it to the top, and leaves `numberOfCompletes` unchanged | FR-002, FR-009 |
| Two `recordPractice` calls issued together for the same text leave one entry | Edge case (quick repeats) |
| When `recordPractice` loses a race to another writer (`ConstraintError` on insert), it retries once as an update, leaves one entry and resolves `{ ok: true }` | FR-017 |
| When that retry also fails, `recordPractice` resolves `{ ok: false }` | FR-013, FR-017 |
| `recordCompletion` increments `numberOfCompletes` by one and changes nothing else | FR-010 |
| Empty or whitespace text writes nothing | FR-003 |
| When the store rejects, write functions resolve `{ ok: false }` and `useHistory` returns `{ status: "error" }`; nothing throws into React | FR-013 |
| Entries returned in descending `dateModified` order, with no cap | FR-005, SC-006 |

## `App` integration contract

| Event in `App` | Action |
|----------------|--------|
| Start with normalised text `t` non-empty | Set active session `{ text: t, runId: runId + 1 }`, state `running`, then `recordPractice(t)` (not awaited before starting) |
| Start with empty text | Show the existing setup error; no session, no write |
| `Sidebar` `onLoadRequest(entry)` | Same as Start with `t = entry.text` |
| `PracticeView` `onFinish` while state is `running` | Set state `finished`, then `recordCompletion(session.text)` |
| Any write resolves `{ ok: false }` | Show the history-save notice in the sidebar |
| Reset | Return to setup with the setup text box emptied (clear the draft), whether the session began from typed text or a Load (FR-016); no write |

`PracticeView` is rendered with `key={runId}`, so every start or load yields a fresh view with all
progress cleared.
