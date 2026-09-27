import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
	normalizeText,
	recordCompletion,
	recordPractice,
	useHistory,
} from "./history";
import { savedTextsDb } from "./db";

describe("normalizeText (specs/001-practice-history contracts/history-module.md)", () => {
	it("[U9] removes trailing spaces, tabs and newlines", () => {
		expect(normalizeText("a b  \n")).toBe("a b");
	});

	it("[U10] leaves a text with no trailing whitespace unchanged", () => {
		expect(normalizeText("a b")).toBe("a b");
	});

	it("[U11] keeps leading and inner whitespace", () => {
		expect(normalizeText("  a  b")).toBe("  a  b");
	});

	it("[U12] returns an empty string for empty and whitespace-only input", () => {
		expect(normalizeText("")).toBe("");
		expect(normalizeText("   \n\t")).toBe("");
	});

	it("[U13] is idempotent", () => {
		for (const input of ["", "a", "a  ", "  a \n", "\n"]) {
			const once = normalizeText(input);
			expect(normalizeText(once)).toBe(once);
		}
	});
});

describe("recordPractice (specs/001-practice-history contracts/history-module.md)", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("[U14] on a new text creates exactly one entry with practice count 0 and dateCreated equal to dateModified", async () => {
		const result = await recordPractice("hello world");

		expect(result).toEqual({ ok: true });
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.text).toBe("hello world");
		expect(rows[0]?.numberOfCompletes).toBe(0);
		expect(rows[0]?.dateCreated).toEqual(rows[0]?.dateModified);
	});

	it("[U15] on an existing text keeps one entry: dateModified later, dateCreated and practice count unchanged", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		await recordPractice("hello world");
		await savedTextsDb.savedTexts
			.where("text")
			.equals("hello world")
			.modify({ numberOfCompletes: 2 });

		vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
		const result = await recordPractice("hello world");

		expect(result).toEqual({ ok: true });
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.dateCreated).toEqual(new Date("2026-01-01T00:00:00Z"));
		expect(rows[0]?.dateModified).toEqual(new Date("2026-01-02T00:00:00Z"));
		expect(rows[0]?.numberOfCompletes).toBe(2);
	});

	it("[U16] with the same text plus trailing whitespace updates the same entry and stores the trimmed text", async () => {
		await recordPractice("hello world");
		await recordPractice("hello world  \n");

		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.text).toBe("hello world");
	});

	it("[U17] with a text differing only by case or inner spacing creates a separate entry", async () => {
		await recordPractice("hello world");
		await recordPractice("Hello world");
		await recordPractice("hello  world");

		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows.map((r) => r.text).sort()).toEqual([
			"Hello world",
			"hello  world",
			"hello world",
		]);
	});

	it("[U18] with empty or whitespace-only text writes nothing and resolves ok", async () => {
		expect(await recordPractice("")).toEqual({ ok: true });
		expect(await recordPractice("   \n")).toEqual({ ok: true });

		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toEqual([]);
	});

	it("[U19] two calls for the same text issued together leave exactly one entry", async () => {
		await Promise.all([
			recordPractice("hello world"),
			recordPractice("hello world"),
		]);

		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
	});

	it("[U20] when the store rejects the write, resolves { ok: false } and does not reject", async () => {
		vi.spyOn(savedTextsDb.savedTexts, "add").mockRejectedValueOnce(
			new Error("boom"),
		);

		await expect(recordPractice("hello world")).resolves.toEqual({
			ok: false,
		});
	});

	it("[U68] when inserting a new text loses a race (unique-text ConstraintError), retries once as an update and resolves ok", async () => {
		// Simulate another writer winning the race: insert the row directly (as
		// that other writer would), then make our own add() call reject with the
		// ConstraintError a real unique-index conflict would raise.
		await savedTextsDb.savedTexts.add({
			text: "hello world",
			dateCreated: new Date("2026-01-01T00:00:00Z"),
			dateModified: new Date("2026-01-01T00:00:00Z"),
			numberOfLoads: 0,
			numberOfCompletes: 0,
		});
		const constraintError = new Error(
			"Key already exists in the object store.",
		);
		constraintError.name = "ConstraintError";
		vi.spyOn(savedTextsDb.savedTexts, "add").mockRejectedValueOnce(
			constraintError,
		);

		const result = await recordPractice("hello world");

		expect(result).toEqual({ ok: true });
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
	});

	it("[U69] when the retry also fails, resolves { ok: false } and does not reject", async () => {
		// No row actually gets inserted this time, so the retry's lookup finds
		// nothing to update: a genuine, unrecoverable failure.
		const constraintError = new Error(
			"Key already exists in the object store.",
		);
		constraintError.name = "ConstraintError";
		vi.spyOn(savedTextsDb.savedTexts, "add").mockRejectedValueOnce(
			constraintError,
		);

		await expect(recordPractice("hello world")).resolves.toEqual({
			ok: false,
		});
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toEqual([]);
	});
});

describe("useHistory (specs/001-practice-history contracts/history-module.md)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("[U25] reports { status: 'loading' } first, then { status: 'ready' }", async () => {
		const { result } = renderHook(() => useHistory());

		expect(result.current).toEqual({ status: "loading" });
		await waitFor(() =>
			expect(result.current).toEqual({ status: "ready", entries: [] }),
		);
	});

	it("[U26] on an empty store is ready with an empty entries array", async () => {
		const { result } = renderHook(() => useHistory());

		await waitFor(() =>
			expect(result.current).toEqual({ status: "ready", entries: [] }),
		);
	});

	it("[U27] returns entries in descending dateModified order", async () => {
		await savedTextsDb.savedTexts.bulkAdd([
			{
				text: "oldest",
				dateCreated: new Date("2026-01-01T00:00:00Z"),
				dateModified: new Date("2026-01-01T00:00:00Z"),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			},
			{
				text: "newest",
				dateCreated: new Date("2026-01-03T00:00:00Z"),
				dateModified: new Date("2026-01-03T00:00:00Z"),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			},
			{
				text: "middle",
				dateCreated: new Date("2026-01-02T00:00:00Z"),
				dateModified: new Date("2026-01-02T00:00:00Z"),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			},
		]);

		const { result } = renderHook(() => useHistory());

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		const state = result.current;
		if (state.status !== "ready") throw new Error("expected ready");
		expect(state.entries.map((e) => e.text)).toEqual([
			"newest",
			"middle",
			"oldest",
		]);
	});

	it("[U28] returns every entry: all 6 when 6 exist, past the old 5-row cap", async () => {
		await savedTextsDb.savedTexts.bulkAdd(
			Array.from({ length: 6 }, (_, i) => ({
				text: `text ${i}`,
				dateCreated: new Date(2026, 0, i + 1),
				dateModified: new Date(2026, 0, i + 1),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			})),
		);

		const { result } = renderHook(() => useHistory());

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		const state = result.current;
		if (state.status !== "ready") throw new Error("expected ready");
		expect(state.entries).toHaveLength(6);
	});

	it("[U29 part 1/2] updates without remounting after recordPractice (the recordCompletion half is deferred to when that function exists, see tdd/test-list.md)", async () => {
		const { result } = renderHook(() => useHistory());
		await waitFor(() =>
			expect(result.current).toEqual({ status: "ready", entries: [] }),
		);

		await recordPractice("hello world");

		await waitFor(() => {
			const state = result.current;
			if (state.status !== "ready") throw new Error("expected ready");
			expect(state.entries).toHaveLength(1);
		});
	});

	it("[U70] updates without remounting after recordCompletion", async () => {
		await recordPractice("hello world");
		const { result } = renderHook(() => useHistory());
		await waitFor(() => {
			const state = result.current;
			if (state.status !== "ready") throw new Error("expected ready");
			expect(state.entries[0]?.numberOfCompletes).toBe(0);
		});

		await recordCompletion("hello world");

		await waitFor(() => {
			const state = result.current;
			if (state.status !== "ready") throw new Error("expected ready");
			expect(state.entries[0]?.numberOfCompletes).toBe(1);
		});
	});

	it("[U30] when the store cannot be read, returns { status: 'error' } and does not throw during render", async () => {
		vi.spyOn(savedTextsDb.savedTexts, "orderBy").mockImplementation(() => {
			throw new Error("boom");
		});

		const { result } = renderHook(() => useHistory());

		await waitFor(() => expect(result.current).toEqual({ status: "error" }));
	});
});

describe("recordCompletion (specs/001-practice-history contracts/history-module.md)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("[U21] raises the practice count by one and leaves both dates unchanged", async () => {
		await recordPractice("hello world");
		const before = await savedTextsDb.savedTexts
			.where("text")
			.equals("hello world")
			.first();

		const result = await recordCompletion("hello world");

		expect(result).toEqual({ ok: true });
		const after = await savedTextsDb.savedTexts
			.where("text")
			.equals("hello world")
			.first();
		expect(after?.numberOfCompletes).toBe(1);
		expect(after?.dateCreated).toEqual(before?.dateCreated);
		expect(after?.dateModified).toEqual(before?.dateModified);
	});

	it("[U22] two calls for one text give a practice count of 2", async () => {
		await recordPractice("hello world");

		await recordCompletion("hello world");
		await recordCompletion("hello world");

		const row = await savedTextsDb.savedTexts
			.where("text")
			.equals("hello world")
			.first();
		expect(row?.numberOfCompletes).toBe(2);
	});

	it("[U23] for a text with no entry resolves ok and creates no entry", async () => {
		const result = await recordCompletion("never started");

		expect(result).toEqual({ ok: true });
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toEqual([]);
	});

	it("[U24] when the store rejects the write, resolves { ok: false } and does not reject", async () => {
		await recordPractice("hello world");
		vi.spyOn(savedTextsDb.savedTexts, "update").mockRejectedValueOnce(
			new Error("boom"),
		);

		await expect(recordCompletion("hello world")).resolves.toEqual({
			ok: false,
		});
	});
});
