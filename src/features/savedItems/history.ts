import { savedTextsDb } from "./db";

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

			await savedTextsDb.savedTexts.add({
				text: normalized,
				dateCreated: now,
				dateModified: now,
				numberOfLoads: 0,
				numberOfCompletes: 0,
			});
		});
		return { ok: true };
	} catch {
		return { ok: false };
	}
}
