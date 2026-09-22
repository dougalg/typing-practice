import { Dexie, type EntityTable } from "dexie";
import type { SavedText } from "../../types";

export type { SavedText };

export type SavedTextsDb = Dexie & {
	savedTexts: EntityTable<SavedText, "id">;
};

/**
 * Opens a savedTexts database under the given name. Exposed as a factory (rather
 * than only the singleton below) so tests can open an isolated, same-schema
 * database under a throwaway name, without touching the real `savedTextsDb` that
 * the app and the shared test cleanup hook use.
 */
export function openSavedTextsDb(name: string): SavedTextsDb {
	const db = new Dexie(name) as SavedTextsDb;

	db.version(1).stores({
		savedTexts: "++id, dateCreated, dateLastUsed, text",
	});

	// `dateLastUsed` was never a real field (the app always wrote `dateModified`),
	// so that index was always empty; this version corrects it. It also merges
	// any duplicate rows the pre-history-feature code created (it added a new
	// row on every practice start instead of updating an existing one), which
	// version 3's unique index below could not otherwise be added on top of.
	db.version(2)
		.stores({
			savedTexts: "++id, dateCreated, dateModified, text",
		})
		.upgrade(async (tx) => {
			const rows = await tx.table<SavedText, number>("savedTexts").toArray();
			const byText = new Map<string, SavedText[]>();
			for (const r of rows) {
				const group = byText.get(r.text);
				if (group) group.push(r);
				else byText.set(r.text, [r]);
			}

			for (const group of byText.values()) {
				if (group.length < 2) continue;

				const keeper = group.reduce((a, b) => (a.id < b.id ? a : b));
				const merged: SavedText = {
					...keeper,
					dateCreated: group
						.map((r) => r.dateCreated)
						.reduce((a, b) => (a < b ? a : b)),
					dateModified: group
						.map((r) => r.dateModified)
						.reduce((a, b) => (a > b ? a : b)),
					numberOfLoads: group.reduce((sum, r) => sum + r.numberOfLoads, 0),
					numberOfCompletes: group.reduce(
						(sum, r) => sum + r.numberOfCompletes,
						0,
					),
				};

				await tx.table("savedTexts").put(merged);
				for (const r of group) {
					if (r.id !== keeper.id) {
						await tx.table("savedTexts").delete(r.id);
					}
				}
			}
		});

	// A unique index cannot be added in the same version as the upgrade that
	// removes the duplicates it would otherwise reject, so uniqueness is its
	// own version, applied after version 2 has already deduplicated.
	db.version(3).stores({
		savedTexts: "++id, dateCreated, dateModified, &text",
	});

	return db;
}

export const savedTextsDb = openSavedTextsDb("savedTextsDb");
