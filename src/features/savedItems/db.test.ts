import { describe, expect, it } from "vitest";
import { savedTextsDb } from "./db";

describe("savedTextsDb (characterization: current behavior before the practice-history feature)", () => {
	it("[U8] a row added to the current store reads back with all its fields intact, dates still Date values", async () => {
		const dateCreated = new Date("2026-01-01T12:00:00Z");
		const dateModified = new Date("2026-01-02T12:00:00Z");

		const id = await savedTextsDb.savedTexts.add({
			text: "hello world",
			dateCreated,
			dateModified,
			numberOfLoads: 3,
			numberOfCompletes: 1,
		});

		const row = await savedTextsDb.savedTexts.get(id);

		expect(row).toEqual({
			id,
			text: "hello world",
			dateCreated,
			dateModified,
			numberOfLoads: 3,
			numberOfCompletes: 1,
		});
		expect(row?.dateCreated).toBeInstanceOf(Date);
		expect(row?.dateModified).toBeInstanceOf(Date);
	});
});
