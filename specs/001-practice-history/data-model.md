# Data Model: Practice History in the Sidebar

## Entity: History Entry (`SavedText`)

One row per distinct practice text. The type is defined once in `src/types.ts` and imported by the
feature module, the database definition and the presentational components.

| Field | Type | Meaning | Rules |
|-------|------|---------|-------|
| `id` | number | Auto-incremented primary key | Assigned by the store |
| `text` | string | The full text to type | Non-empty, no trailing whitespace (`normalizeText`); **unique** across entries |
| `dateCreated` | Date | When the entry was first stored | Set once at creation, never changed |
| `dateModified` | Date | **Last practiced**: the last time a session was started with this text | Set to "now" on every start or load |
| `numberOfCompletes` | number | **Practice count**: how many sessions typed the text through to the end, with or without mistakes | Starts at 0, +1 per finished session; never changed by start, load, reset or abandon |
| `numberOfLoads` | number | **Legacy, unused**: how many sessions earlier versions started with this text | No longer read, shown or updated. New entries are written with 0. Kept in the type and the store so no data migration is needed |

Invariants:

- `numberOfCompletes >= 0`. It is the only count the sidebar shows.
- `dateCreated <= dateModified`.
- No two entries share the same `text` (enforced by the unique index from schema version 3).

Maps to spec Key Entity "History Entry". "Practice Session" is not stored; it only drives updates to
the fields above.

## Text normalisation

`normalizeText(input: string): string` returns `input.trimEnd()`. An empty result means "nothing to
practice": no session starts and no entry is written (FR-003). It is the only place this rule lives.

## Operations and state transitions

| Trigger | Effect on the store |
|---------|--------------------|
| Start with text `t` (normalised, non-empty) | If no entry has `text = t`: create one (`numberOfCompletes = 0`, `numberOfLoads = 0`, both dates now). Otherwise: `dateModified = now` and nothing else (FR-009) |
| Load entry `e` | Same as Start with `t = e.text` |
| Session for `t` reaches the last character | If an entry has `text = t`: `numberOfCompletes += 1` (FR-010) |
| Reset, Load of another entry, or leaving | No change beyond the start that already happened |

Each operation runs in a single read-write transaction so a read followed by a write cannot
interleave with another one in the same tab. Across tabs the unique index is the backstop: if the
insert for a new text fails with a `ConstraintError` because another writer created that text first,
the operation retries once as an update of the existing entry (FR-017). If the retry also fails, or
any other error occurs, the operation resolves `{ ok: false }`.

## Ordering and reads

The sidebar reads all entries ordered by `dateModified` descending (index on `dateModified`), so the
most recently practiced is first (FR-005). There is no row cap. The list is kept live: writes from
the operations above update the view without manual refresh (SC-004).

## Schema versions

| Version | `savedTexts` store definition | Notes |
|---------|-------------------------------|-------|
| 1 (existing) | `++id, dateCreated, dateLastUsed, text` | `dateLastUsed` is not a real field, so that index is empty. Duplicates by `text` are possible |
| 2 | `++id, dateCreated, dateModified, text` | Upgrade merges duplicate `text` rows (see below) |
| 3 | `++id, dateCreated, dateModified, &text` | Unique text index; no upgrade function needed |

### Version 2 upgrade: merge duplicates

Group all rows by `text`. For each group of more than one row, keep the row with the lowest `id`
and set:

- `dateCreated` = earliest in the group
- `dateModified` = latest in the group
- `numberOfLoads` = sum of the group
- `numberOfCompletes` = sum of the group

Delete the other rows of the group. Groups of one are untouched. Rows keep their original values
otherwise, so a user with no duplicates sees no change (FR-012).

## Read result shape (used by the sidebar)

`useHistory()` returns one of:

- `{ status: "loading" }` before the first result
- `{ status: "ready", entries: SavedText[] }` (empty array means the empty state)
- `{ status: "error" }` when the store cannot be read

See [contracts/history-module.md](./contracts/history-module.md).
