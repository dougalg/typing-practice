import { Dexie, type EntityTable } from "dexie";

export interface SavedText {
	id: number;
	dateCreated: Date;
	dateModified: Date;
	numberOfLoads: number;
	numberOfCompletes: number;
	text: string;
}

export const savedTextsDb = new Dexie("savedTextsDb") as Dexie & {
	savedTexts: EntityTable<SavedText, "id">;
};

savedTextsDb.version(1).stores({
	savedTexts: "++id, dateCreated, dateLastUsed, text",
});
