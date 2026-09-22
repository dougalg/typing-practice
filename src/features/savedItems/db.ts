import { Dexie, type EntityTable } from "dexie";
import type { SavedText } from "../../types";

export type { SavedText };

export const savedTextsDb = new Dexie("savedTextsDb") as Dexie & {
	savedTexts: EntityTable<SavedText, "id">;
};

savedTextsDb.version(1).stores({
	savedTexts: "++id, dateCreated, dateLastUsed, text",
});
