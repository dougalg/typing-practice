import { useLiveQuery } from "dexie-react-hooks";
import { savedTextsDb } from "./db";
import type { SavedText } from "../../types";

/**
 * Trims trailing whitespace only. An empty result means there is nothing to
 * practice (specs/001-practice-history FR-003).
 */
export function normalizeText(input: string): string {
	return input.trimEnd();
}

export type WriteResult = { ok: true } | { ok: false };

/**
 * Called when a session starts (Start or Load). Creates the entry (practice
 * count 0) or refreshes an existing one (dateModified = now; the practice
 * count is NOT touched here — only recordCompletion changes it). Ignores
 * empty normalised text. Never rejects.
 */
export async function recordPractice(text: string): Promise<WriteResult> {
	const normalized = normalizeText(text);
	if (!normalized) return { ok: true };

	try {
		await savedTextsDb.transaction("rw", savedTextsDb.savedTexts, async () => {
			const now = new Date();
			const existing = await savedTextsDb.savedTexts
				.where("text")
				.equals(normalized)
				.first();

			if (existing) {
				await savedTextsDb.savedTexts.update(existing.id, {
					dateModified: now,
				});
				return;
			}

			try {
				await savedTextsDb.savedTexts.add({
					text: normalized,
					dateCreated: now,
					dateModified: now,
					numberOfLoads: 0,
					numberOfCompletes: 0,
				});
			} catch (err) {
				if (!(err instanceof Error) || err.name !== "ConstraintError")
					throw err;

				// Lost the race to another writer that inserted this text first.
				// Retry once as an update instead of reporting a save failure for a
				// text that is, in fact, saved (specs/001-practice-history FR-017).
				const winner = await savedTextsDb.savedTexts
					.where("text")
					.equals(normalized)
					.first();
				if (!winner) throw err;
				await savedTextsDb.savedTexts.update(winner.id, { dateModified: now });
			}
		});
		return { ok: true };
	} catch {
		return { ok: false };
	}
}

export type HistoryState =
	| { status: "loading" }
	| { status: "ready"; entries: SavedText[] }
	| { status: "error" };

/**
 * Live list of entries, most recently practiced first, no cap. Errors are
 * caught inside the querier so they surface as { status: "error" } instead of
 * being thrown during render by useLiveQuery.
 */
export function useHistory(): HistoryState {
	const result = useLiveQuery<HistoryState>(async () => {
		try {
			const entries = await savedTextsDb.savedTexts
				.orderBy("dateModified")
				.reverse()
				.toArray();
			return { status: "ready", entries };
		} catch {
			return { status: "error" };
		}
	}, []);

	return result ?? { status: "loading" };
}
