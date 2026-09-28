# Contract changes: `features/savedItems/history.ts` and `db.ts`

Signatures are unchanged from [`001`](../../001-practice-history/contracts/history-module.md). Behavior
changes:

| Function                                   | 001                              | 002                                       |
| ------------------------------------------ | -------------------------------- | ----------------------------------------- |
| `recordPractice(text)` on a new text       | creates with `numberOfLoads = 0` | creates with `numberOfLoads = 1`          |
| `recordPractice(text)` on an existing text | `dateModified = now` only        | `dateModified = now`, `numberOfLoads + 1` |
| `recordPractice` two-writer retry          | `dateModified = now`             | `dateModified = now`, `numberOfLoads + 1` |
| `recordCompletion(text)`                   | `numberOfCompletes + 1`          | unchanged                                 |

`openSavedTextsDb(name)` adds version 4 (same stores as version 3) with an upgrade that sets
`numberOfLoads = max(numberOfLoads, numberOfCompletes, 1)` on every row.

## Guarantees (each maps to a test)

| Guarantee                                                                          | Spec           |
| ---------------------------------------------------------------------------------- | -------------- |
| New text: one entry, `numberOfLoads = 1`, `numberOfCompletes = 0`                  | FR-008         |
| Existing text: `numberOfLoads` +1, `numberOfCompletes` unchanged                   | FR-008, FR-009 |
| Two concurrent starts of a new text: one entry, `numberOfLoads = 2`                | FR-008         |
| Version 4 raises `numberOfLoads` 0 → 1                                             | FR-011         |
| Version 4 raises `numberOfLoads` below `numberOfCompletes` up to it                | FR-011         |
| Version 4 leaves a row with `numberOfLoads >= max(1, numberOfCompletes)` unchanged | FR-011         |
