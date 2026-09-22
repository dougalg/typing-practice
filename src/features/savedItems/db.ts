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

	return db;
}

export const savedTextsDb = openSavedTextsDb("savedTextsDb");
