import { Dexie } from "dexie";
import { describe, expect, it } from "vitest";
import { openSavedTextsDb, savedTextsDb, type SavedText } from "./db";

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

let migrationDbCounter = 0;
/**
 * A throwaway database name, deleted first: the browser's IndexedDB is real and
 * outlives a test file, so a rerun in the same browser (watch mode) would
 * otherwise find last run's upgraded database under the same name.
 */
async function migrationDbName() {
	migrationDbCounter += 1;
	const name = `savedTextsDb_migration_test_${migrationDbCounter}`;
	await Dexie.delete(name);
	return name;
}

/**
 * Seeds a database under `name` with the ORIGINAL (version 1) schema, bypassing
 * openSavedTextsDb entirely so the seeded rows predate any later version's
 * upgrade function. Each test uses its own name so it never touches the real
 * `savedTextsDb` the rest of the suite depends on.
 */
async function seedV1(name: string, rows: SavedText[]) {
	const raw = new Dexie(name) as Dexie & {
		savedTexts: Dexie.Table<SavedText, number>;
	};
	raw
		.version(1)
		.stores({ savedTexts: "++id, dateCreated, dateLastUsed, text" });
	await raw.open();
	for (const row of rows) {
		await raw.table("savedTexts").add(row, row.id);
	}
	raw.close();
}

function row(
	overrides: Partial<SavedText> & { id: number; text: string },
): SavedText {
	return {
		dateCreated: new Date("2026-01-01T00:00:00Z"),
		dateModified: new Date("2026-01-01T00:00:00Z"),
		numberOfLoads: 1,
		numberOfCompletes: 0,
		...overrides,
	};
}

describe("openSavedTextsDb migration from version 1 (specs/001-practice-history FR-012)", () => {
	it("[U31] a row with a unique text is unchanged after the upgrade, including its id", async () => {
		const name = await migrationDbName();
		await seedV1(name, [row({ id: 1, text: "solo" })]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toEqual([row({ id: 1, text: "solo" })]);
	});

	it("[U32] two rows with the same text become one row, keeping the lowest id", async () => {
		const name = await migrationDbName();
		await seedV1(name, [
			row({ id: 5, text: "dup" }),
			row({ id: 2, text: "dup" }),
		]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe(2);
	});

	it("[U33] the merged row's dateCreated is the earliest and dateModified the latest of the group", async () => {
		const name = await migrationDbName();
		await seedV1(name, [
			row({
				id: 1,
				text: "dup",
				dateCreated: new Date("2026-03-01T00:00:00Z"),
				dateModified: new Date("2026-03-05T00:00:00Z"),
			}),
			row({
				id: 2,
				text: "dup",
				dateCreated: new Date("2026-01-01T00:00:00Z"),
				dateModified: new Date("2026-02-01T00:00:00Z"),
			}),
		]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toHaveLength(1);
		expect(rows[0]?.dateCreated).toEqual(new Date("2026-01-01T00:00:00Z"));
		expect(rows[0]?.dateModified).toEqual(new Date("2026-03-05T00:00:00Z"));
	});

	it("[U34] the merged row's numberOfCompletes and numberOfLoads are the sums of the group", async () => {
		const name = await migrationDbName();
		await seedV1(name, [
			row({ id: 1, text: "dup", numberOfLoads: 2, numberOfCompletes: 1 }),
			row({ id: 2, text: "dup", numberOfLoads: 5, numberOfCompletes: 3 }),
		]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toHaveLength(1);
		expect(rows[0]?.numberOfLoads).toBe(7);
		expect(rows[0]?.numberOfCompletes).toBe(4);
	});

	it("[U35] a group of three rows with the same text merges into one row", async () => {
		const name = await migrationDbName();
		await seedV1(name, [
			row({ id: 3, text: "triple" }),
			row({ id: 1, text: "triple" }),
			row({ id: 2, text: "triple" }),
		]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe(1);
	});

	it("[U36] rows with different texts stay separate: the row count equals the number of distinct texts", async () => {
		const name = await migrationDbName();
		await seedV1(name, [
			row({ id: 1, text: "a" }),
			row({ id: 2, text: "a" }),
			row({ id: 3, text: "b" }),
			row({ id: 4, text: "c" }),
			row({ id: 5, text: "c" }),
			row({ id: 6, text: "c" }),
		]);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows.map((r) => r.text).sort()).toEqual(["a", "b", "c"]);
	});

	it("[U37] an empty version-1 database upgrades successfully and leaves an empty table", async () => {
		const name = await migrationDbName();
		await seedV1(name, []);

		const db = openSavedTextsDb(name);
		const rows = await db.savedTexts.toArray();

		expect(rows).toEqual([]);
	});

	it("[U38] after the upgrade, adding a row whose text already exists is rejected", async () => {
		const name = await migrationDbName();
		await seedV1(name, [row({ id: 1, text: "existing" })]);

		const db = openSavedTextsDb(name);
		await expect(
			db.savedTexts.add(row({ id: 99, text: "existing" })),
		).rejects.toMatchObject({ name: "ConstraintError" });
	});

	it("[U39] after the upgrade, adding a row with a new text succeeds", async () => {
		const name = await migrationDbName();
		await seedV1(name, [row({ id: 1, text: "existing" })]);

		const db = openSavedTextsDb(name);
		await expect(
			db.savedTexts.add(row({ id: 2, text: "brand new" })),
		).resolves.toBe(2);
	});

	it("[U40] a database created fresh, with no earlier version, enforces the same unique-text rule", async () => {
		const name = await migrationDbName();
		const db = openSavedTextsDb(name);

		await db.savedTexts.add(row({ id: 1, text: "first" }));

		await expect(
			db.savedTexts.add(row({ id: 2, text: "first" })),
		).rejects.toMatchObject({ name: "ConstraintError" });
	});
});

/**
 * Seeds a database under `name` at schema version 3 (the version 001 shipped),
 * bypassing openSavedTextsDb, so opening it afterwards runs only the upgrades
 * added since.
 */
async function seedV3(name: string, rows: SavedText[]) {
	const raw = new Dexie(name) as Dexie & {
		savedTexts: Dexie.Table<SavedText, number>;
	};
	raw
		.version(3)
		.stores({ savedTexts: "++id, dateCreated, dateModified, &text" });
	await raw.open();
	await raw.table("savedTexts").bulkAdd(rows);
	raw.close();
}

async function loadsAfterUpgrade(
	numberOfLoads: number,
	numberOfCompletes: number,
) {
	const name = await migrationDbName();
	await seedV3(name, [
		row({ id: 1, text: "entry", numberOfLoads, numberOfCompletes }),
	]);
	const rows = await openSavedTextsDb(name).savedTexts.toArray();
	return rows[0]?.numberOfLoads;
}

// Version 4 sets numberOfLoads to max(numberOfLoads, numberOfCompletes, 1),
// sampled on both sides of each term (no property-based library here).
describe("openSavedTextsDb version 4 count correction (specs/002-history-refinements FR-011)", () => {
	it("[U43] a row with a loaded count of 0 and a completed count of 0 gets a loaded count of 1", async () => {
		expect(await loadsAfterUpgrade(0, 0)).toBe(1);
	});

	it("[U44] a row with a loaded count of 2 and a completed count of 3 gets a loaded count of 3", async () => {
		expect(await loadsAfterUpgrade(2, 3)).toBe(3);
	});

	it("[U45] a row with a loaded count of 3 and a completed count of 3 is unchanged", async () => {
		expect(await loadsAfterUpgrade(3, 3)).toBe(3);
	});
});
