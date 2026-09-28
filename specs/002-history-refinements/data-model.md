# Data Model: Practice History Refinements

Builds on [`001`'s data model](../001-practice-history/data-model.md). Only the changes are listed.

## History Entry (`SavedText`)

No new fields. One field's meaning is restored:

| Field               | Meaning in 001                             | Meaning in 002                                                                                            |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `numberOfLoads`     | Legacy, unused; new entries written with 0 | **Loaded count**: sessions started with this text, from Start or Load. New entry: 1. Shown as "Loaded: N" |
| `numberOfCompletes` | Practice count                             | **Completed count**, same rules. Shown as "Completed: N"                                                  |

Invariants (after version 4):

- `numberOfLoads >= 1`
- `numberOfLoads >= numberOfCompletes` for rows written by 002. Rows corrected by version 4 satisfy it by
  construction. (A text finished more often than started is impossible through the UI.)

## Operations

| Trigger                                | Effect                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Start or confirmed Load of text `t`    | Create (`numberOfLoads = 1`, `numberOfCompletes = 0`, both dates now), or `dateModified = now` and `numberOfLoads += 1` |
| Two-writer race on insert (retry path) | Same as the existing-entry case: `dateModified = now`, `numberOfLoads += 1`                                             |
| Session reaches its last character     | `numberOfCompletes += 1` (unchanged)                                                                                    |
| Load cancelled at the confirmation     | No write                                                                                                                |
| Reset                                  | No write (unchanged)                                                                                                    |

## Schema versions

| Version | Stores                                              | Upgrade                                                                   |
| ------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| 1–3     | as in 001                                           | as in 001                                                                 |
| 4       | same as 3: `++id, dateCreated, dateModified, &text` | for every row: `numberOfLoads = max(numberOfLoads, numberOfCompletes, 1)` |

## Not stored

- **Session touched**: in `App` state, reset on every start.
- **Pending load**: `{ item, trigger }` while the confirmation is open; cleared on confirm or cancel.
