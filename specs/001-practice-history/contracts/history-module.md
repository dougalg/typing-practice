# Contract: `features/savedItems/history.ts`

Internal module boundary. Views and `App` use persistence only through this module (Constitution
Principle IV). Signatures are the contract; bodies belong to implementation.

```ts
import type { SavedText } from "../../types";

/** Trailing whitespace removed. "" means there is nothing to practice. */
export function normalizeText(input: string): string;

export type WriteResult = { ok: true } | { ok: false };

/**
 * Called when a session starts (Start or Load). Creates the entry or refreshes it
 * (dateModified = now, numberOfLoads + 1). Ignores empty text (resolves { ok: true } without writing).
 * Never rejects.
 */
export function recordPractice(text: string): Promise<WriteResult>;

/**
 * Called when a session for `text` reaches its last character. Increments numberOfCompletes on
 * the entry with that text; a missing entry is not an error. Never rejects.
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
| `recordPractice` on a new text creates exactly one entry with `numberOfLoads = 1`, `numberOfCompletes = 0` | FR-001 |
| `recordPractice` on an existing text leaves exactly one entry, moves it to the top, `numberOfLoads + 1` | FR-002, FR-009 |
| Two `recordPractice` calls issued together for the same text leave one entry with `numberOfLoads = 2` | Edge case (quick repeats) |
| `recordCompletion` increments `numberOfCompletes` only | FR-010 |
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
| Reset | Return to setup; no write |

`PracticeView` is rendered with `key={runId}`, so every start or load yields a fresh view with all
progress cleared.
