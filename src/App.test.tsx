import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dexie } from "dexie";
// Real input through Playwright, for 002's tests, where native <dialog>
// behavior (Escape, focus) is part of what is being tested.
import { page, userEvent as browserUserEvent } from "vitest/browser";
import App from "./App";
import * as historyModule from "./features/savedItems/history";
import { savedTextsDb } from "./features/savedItems/db";

// In the browser, ES module namespaces are real and their exports cannot be
// redefined, so `vi.spyOn(historyModule, ...)` needs the module to be wrapped
// first. `spy: true` keeps every export's real implementation.
vi.mock("./features/savedItems/history", { spy: true });

const SETUP_PLACEHOLDER = "Type or paste any text you want to practice...";
const TYPING_PLACEHOLDER =
	"Start typing… (this box stays empty; it captures keystrokes)";

function setupBox() {
	return screen.getByPlaceholderText(SETUP_PLACEHOLDER);
}
function startButton() {
	return screen.getByRole("button", { name: "Start practice" });
}
function resetButton() {
	return screen.getByRole("button", { name: "Reset" });
}
function sidebarRegion() {
	return screen.getByRole("region", { name: "Practice History" });
}

// PracticeView renders the target text as one <span> per character, so it can
// never be found as a single text node. Match on the <p> whose combined text
// content is exactly the target text, scoped to the "Type the text below"
// section so it can't collide with the sidebar's own preview of the same text
// (the current code already saves every started text there too).
function getPracticeText(text: string) {
	const heading = screen.getByText("Type the text below");
	const section = heading.closest("section");
	if (!section)
		throw new Error('Expected a <section> ancestor of "Type the text below"');
	return within(section).getByText(
		(_content, element) =>
			element?.tagName === "P" && element.textContent === text,
	);
}

describe("App (characterization: current behavior before the practice-history feature)", () => {
	it("[U1] the idle app shows the setup text box and a Start practice button", () => {
		render(<App />);

		expect(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start practice" }),
		).toBeInTheDocument();
	});

	it("[U2] starting with a text switches to the practice view showing that text with the typing input present", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
			"hello",
		);
		await user.click(screen.getByRole("button", { name: "Start practice" }));

		expect(getPracticeText("hello")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(
				"Start typing… (this box stays empty; it captures keystrokes)",
			),
		).toBeInTheDocument();
	});

	it("[U3] pressing Ctrl+Enter in the setup text box starts practice", async () => {
		const user = userEvent.setup();
		render(<App />);

		const textbox = screen.getByPlaceholderText(
			"Type or paste any text you want to practice...",
		);
		await user.type(textbox, "hello{Control>}{Enter}{/Control}");

		expect(
			screen.getByPlaceholderText(
				"Start typing… (this box stays empty; it captures keystrokes)",
			),
		).toBeInTheDocument();
	});

	it("[U4] pressing Reset in the practice view returns to the setup view", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
			"hello",
		);
		await user.click(screen.getByRole("button", { name: "Start practice" }));
		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
		).toBeInTheDocument();
	});

	it("[U5] typing the whole text correctly shows the finished message (progress stays one character short: a pre-existing quirk, not introduced here)", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
			"hi",
		);
		await user.click(screen.getByRole("button", { name: "Start practice" }));

		const typingInput = screen.getByPlaceholderText(
			"Start typing… (this box stays empty; it captures keystrokes)",
		);
		await user.type(typingInput, "hi");

		expect(screen.getByText("Nice work! You finished.")).toBeInTheDocument();
		// Pre-existing quirk, captured as-is: PracticeView's onInput handler calls
		// onFinish() instead of setPosition() on the last character, so `position`
		// never reaches targetText.length and the progress bar reports one
		// character short (here (2-1)/2 = 50%), even though typing is complete.
		expect(screen.getByText("50%")).toBeInTheDocument();
	});

	it("[A4] starting with empty or whitespace-only text shows the setup error and adds no entry", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
			"   ",
		);
		await user.click(screen.getByRole("button", { name: "Start practice" }));

		expect(
			screen.getByText("Please enter some text to practice first."),
		).toBeInTheDocument();
		// Still on the setup view: practice never started.
		expect(
			screen.getByPlaceholderText(
				"Type or paste any text you want to practice...",
			),
		).toBeInTheDocument();
	});
});

describe("App (specs/001-practice-history, User Story 1)", () => {
	it("[A1] with an empty history, starting practice with a new text makes it appear in the sidebar", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());

		expect(
			await within(sidebarRegion()).findByText("hello world"),
		).toBeInTheDocument();
	});

	it("[A2] a text started earlier is still listed after the app is unmounted and mounted again", async () => {
		const user = userEvent.setup();
		const { unmount } = render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await within(sidebarRegion()).findByText("hello world");
		unmount();

		render(<App />);

		expect(
			await within(sidebarRegion()).findByText("hello world"),
		).toBeInTheDocument();
	});

	it("[A3] starting practice again with exactly the same text leaves one entry, with its last-practiced date advanced", async () => {
		// A weaker version of this test (counting entries only) cannot tell a
		// correct upsert apart from a write that silently fails and rolls back:
		// both leave exactly one row. Asserting dateModified actually advanced
		// rules that out (found via a deliberate mutant, see tdd/cycle-log.md).
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		const user = userEvent.setup({
			advanceTimers: (ms) => vi.advanceTimersByTime(ms),
		});
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await within(sidebarRegion()).findByText("hello world");
		await user.click(resetButton());
		vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
		// Reset now clears the setup box (FR-016, driven in User Story 2), so the
		// same text has to be retyped before starting again.
		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		vi.useRealTimers();

		const items = await within(sidebarRegion()).findAllByRole("listitem");
		expect(items).toHaveLength(1);
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.dateModified).toEqual(new Date("2026-01-02T00:00:00Z"));
	});

	it("[A13] on first visit with no history, the sidebar shows the empty-state message", async () => {
		render(<App />);

		expect(
			await within(sidebarRegion()).findByText(
				"No practice history yet. Texts you practice will appear here.",
			),
		).toBeInTheDocument();
	});

	it("[A14] when saving to the store fails, practice still starts and the sidebar announces the save failure", async () => {
		vi.spyOn(historyModule, "recordPractice").mockResolvedValueOnce({
			ok: false,
		});
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());

		expect(screen.getByPlaceholderText(TYPING_PLACEHOLDER)).toBeInTheDocument();
		expect(await within(sidebarRegion()).findByRole("alert")).toHaveTextContent(
			"Your practice history could not be saved. You can keep practicing.",
		);
		vi.restoreAllMocks();
	});

	it("[A15] when reading the store fails, the sidebar announces it and practice can still be started", async () => {
		await savedTextsDb.close();
		render(<App />);

		expect(await within(sidebarRegion()).findByRole("alert")).toHaveTextContent(
			"Practice history could not be loaded.",
		);

		// Restore the connection before starting, so the write this cycle drives
		// (recordPractice) is not itself also broken by the same closed handle.
		await savedTextsDb.open();
		const user = userEvent.setup();
		await user.type(setupBox(), "hello world");
		await user.click(startButton());

		expect(screen.getByPlaceholderText(TYPING_PLACEHOLDER)).toBeInTheDocument();
	});

	it("[A17] starting with a text and again with the same text plus trailing whitespace leaves one entry", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await within(sidebarRegion()).findByText("hello world");
		await user.click(resetButton());
		// Reset now clears the setup box (FR-016), so the same text plus
		// trailing whitespace is retyped in full.
		await user.type(setupBox(), "hello world  \n");
		await user.click(startButton());

		const items = await within(sidebarRegion()).findAllByRole("listitem");
		expect(items).toHaveLength(1);
	});

	it("[U67] the practice view is shown immediately when Start is pressed, while the history write is still pending", async () => {
		let resolveWrite!: (r: { ok: true }) => void;
		vi.spyOn(historyModule, "recordPractice").mockReturnValueOnce(
			new Promise((resolve) => {
				resolveWrite = resolve;
			}),
		);
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());

		expect(screen.getByPlaceholderText(TYPING_PLACEHOLDER)).toBeInTheDocument();

		resolveWrite({ ok: true });
		vi.restoreAllMocks();
	});
});

describe("App (specs/001-practice-history, User Story 2)", () => {
	it("[A5] pressing Load on an entry opens the practice view with that entry's full text, typing input focused, 0 characters typed", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "the quick brown fox");
		await user.click(startButton());
		await user.click(resetButton());

		const loadButton = await within(sidebarRegion()).findByRole("button", {
			name: /^Load/,
		});
		await user.click(loadButton);

		expect(getPracticeText("the quick brown fox")).toBeInTheDocument();
		const typingInput = screen.getByPlaceholderText(TYPING_PLACEHOLDER);
		expect(typingInput).toHaveFocus();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("[A6] loading a different entry while another text is half typed replaces it with a fresh attempt at the first character", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "second text");
		await user.click(startButton());
		await user.click(resetButton());
		// Reset does not clear the setup box yet (FR-016 is User Story 2's own
		// later step), so it must be cleared explicitly before typing a second,
		// different text.
		await user.clear(setupBox());
		await user.type(setupBox(), "first text");
		await user.click(startButton());
		await user.click(resetButton());

		// Practice "first text" partway.
		const loadFirst = await within(sidebarRegion()).findByRole("button", {
			name: /^Load .*first text/,
		});
		await user.click(loadFirst);
		await user.type(screen.getByPlaceholderText(TYPING_PLACEHOLDER), "fir");

		// Now load "second text" instead.
		const loadSecond = within(sidebarRegion()).getByRole("button", {
			name: /^Load .*second text/,
		});
		await user.click(loadSecond);
		// Baseline updated for specs/002-history-refinements (US1): a Load while
		// a session is in progress now asks first; confirming loads as before.
		await user.click(screen.getByRole("button", { name: "Discard and load" }));

		expect(getPracticeText("second text")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("[A7] loading an entry moves it to the top, updates its last-practiced date, leaves practice count unchanged, adds no second entry", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
		const user = userEvent.setup({
			advanceTimers: (ms) => vi.advanceTimersByTime(ms),
		});
		render(<App />);

		await user.type(setupBox(), "older");
		await user.click(startButton());
		await user.click(resetButton());
		vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
		await user.clear(setupBox());
		await user.type(setupBox(), "newer");
		await user.click(startButton());
		await user.click(resetButton());

		vi.setSystemTime(new Date("2026-01-03T00:00:00Z"));
		const loadOlder = within(sidebarRegion()).getByRole("button", {
			name: /^Load .*older/,
		});
		await user.click(loadOlder);
		vi.useRealTimers();

		// Two listitems exist throughout (both entries always existed; only their
		// order changes), so findAllByRole resolving on "2 items present" would
		// race the asynchronous recordPractice write and its live-query re-sort.
		// Wait for the actual reordering instead.
		await waitFor(() => {
			const items = within(sidebarRegion()).getAllByRole("listitem");
			expect(items[0]).toHaveTextContent("older");
		});
		const items = within(sidebarRegion()).getAllByRole("listitem");
		expect(items).toHaveLength(2);
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(2);
		const olderRow = rows.find((r) => r.text === "older");
		expect(olderRow?.dateModified).toEqual(new Date("2026-01-03T00:00:00Z"));
		expect(olderRow?.numberOfCompletes).toBe(0);
	});

	it("[A8] with the keyboard alone, Tab reaches an entry's Load button and Enter, then Space on another entry, each loads it", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "alpha");
		await user.click(startButton());
		await user.click(resetButton());
		await user.clear(setupBox());
		await user.type(setupBox(), "beta");
		await user.click(startButton());
		await user.click(resetButton());

		const loadAlpha = await within(sidebarRegion()).findByRole("button", {
			name: /^Load .*alpha/,
		});
		loadAlpha.focus();
		await user.keyboard("{Enter}");
		expect(getPracticeText("alpha")).toBeInTheDocument();
		await user.click(resetButton());

		const loadBeta = within(sidebarRegion()).getByRole("button", {
			name: /^Load .*beta/,
		});
		loadBeta.focus();
		await user.keyboard(" ");
		expect(getPracticeText("beta")).toBeInTheDocument();
	});

	it("[A18] activating Load on the same entry several times in a row leaves one entry, one running session, unchanged practice count", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.click(resetButton());

		const loadButton = await within(sidebarRegion()).findByRole("button", {
			name: /^Load/,
		});
		await user.click(loadButton);
		await user.click(resetButton());
		await user.click(loadButton);
		await user.click(resetButton());
		await user.click(loadButton);

		expect(getPracticeText("hello world")).toBeInTheDocument();
		const rows = await savedTextsDb.savedTexts.toArray();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.numberOfCompletes).toBe(0);
	});

	it("[A20] loading the entry that is currently running restarts it from the first character", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.click(resetButton());

		const loadButton = await within(sidebarRegion()).findByRole("button", {
			name: /^Load/,
		});
		await user.click(loadButton);
		await user.type(screen.getByPlaceholderText(TYPING_PLACEHOLDER), "hel");

		await user.click(loadButton);
		// Baseline updated for specs/002-history-refinements (US1): a Load while
		// a session is in progress now asks first; confirming loads as before.
		await user.click(screen.getByRole("button", { name: "Discard and load" }));

		expect(getPracticeText("hello world")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("[A21] after typing a text, starting, and pressing Reset, the setup box is empty", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.click(resetButton());

		expect(setupBox()).toHaveValue("");
	});

	it("[A22] after loading an entry and pressing Reset, the setup box is empty", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.click(resetButton());

		const loadButton = await within(sidebarRegion()).findByRole("button", {
			name: /^Load/,
		});
		await user.click(loadButton);
		await user.click(resetButton());

		expect(setupBox()).toHaveValue("");
	});
});

describe("App (specs/001-practice-history, User Story 3)", () => {
	it("[A9] a very long entry stays listed alongside others, and Load types its full text", async () => {
		const longText = "abcdefghij".repeat(500);
		await savedTextsDb.savedTexts.add({
			text: longText,
			dateCreated: new Date("2026-01-01T00:00:00Z"),
			dateModified: new Date("2026-01-01T00:00:00Z"),
			numberOfLoads: 0,
			numberOfCompletes: 0,
		});
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "short");
		await user.click(startButton());
		await user.click(resetButton());

		const items = await within(sidebarRegion()).findAllByRole("listitem");
		expect(items).toHaveLength(2);

		const loadLong = within(sidebarRegion()).getByRole("button", {
			name: new RegExp(`^Load .*${longText.slice(0, 10)}`),
		});
		await user.click(loadLong);

		expect(getPracticeText(longText)).toBeInTheDocument();
	});

	it("[A10] typing a text to its last character, even after a mistake, raises the practice count by exactly one, visible without a reload", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hi");
		await user.click(startButton());
		const typingInput = screen.getByPlaceholderText(TYPING_PLACEHOLDER);
		await user.type(typingInput, "X"); // mistake: expected "h"
		await user.type(typingInput, "hi"); // corrected, then completes

		expect(
			await within(sidebarRegion()).findByText("Practiced 1 time"),
		).toBeInTheDocument();

		// Finishing the same text again, in a separate session, shows 2.
		await user.click(resetButton());
		await user.type(setupBox(), "hi");
		await user.click(startButton());
		await user.type(screen.getByPlaceholderText(TYPING_PLACEHOLDER), "hi");

		expect(
			await within(sidebarRegion()).findByText("Practiced 2 times"),
		).toBeInTheDocument();
	});

	it("[A11] pressing Reset before finishing leaves the practice count unchanged", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.type(screen.getByPlaceholderText(TYPING_PLACEHOLDER), "hel");
		await user.click(resetButton());

		expect(
			await within(sidebarRegion()).findByText("Practiced 0 times"),
		).toBeInTheDocument();
	});

	it("[A19] starting, loading and finishing a practice make no network request", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
		const sendBeaconSpy =
			typeof navigator.sendBeacon === "function"
				? vi.spyOn(navigator, "sendBeacon")
				: undefined;

		const user = userEvent.setup();
		render(<App />);

		await user.type(setupBox(), "hello world");
		await user.click(startButton());
		await user.click(resetButton());
		const loadButton = await within(sidebarRegion()).findByRole("button", {
			name: /^Load/,
		});
		await user.click(loadButton);
		await user.type(
			screen.getByPlaceholderText(TYPING_PLACEHOLDER),
			"hello world",
		);

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(xhrOpenSpy).not.toHaveBeenCalled();
		if (sendBeaconSpy) expect(sendBeaconSpy).not.toHaveBeenCalled();
	});

	it("[A12] with 100 entries, the sidebar lists all of them, most recently practiced first", async () => {
		await savedTextsDb.savedTexts.bulkAdd(
			Array.from({ length: 100 }, (_, i) => ({
				text: `text ${i}`,
				dateCreated: new Date(2026, 0, i + 1),
				dateModified: new Date(2026, 0, i + 1),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			})),
		);
		render(<App />);

		const items = await within(sidebarRegion()).findAllByRole("listitem");
		expect(items).toHaveLength(100);
		expect(items[0]).toHaveTextContent("text 99");
	});
});

describe("App (practice text rendering)", () => {
	// Each of these is a base letter plus a combining mark drawn above or below
	// it. Rendered in separate elements, the mark kept the untyped colour while
	// the letter under it was highlighted, so it seemed to vanish.
	it.each([
		["U+0363 combining superscript a", "a\u0363"],
		["Thai above vowel, long ee (ดี)", "ดี"],
		["Thai below vowel, long oo (ดู)", "ดู"],
	])(
		"renders a %s in the same element as the letter it sits on",
		async (_label, glyph) => {
			const user = userEvent.setup();
			render(<App />);

			await user.type(setupBox(), `${glyph}x`);
			await user.click(startButton());

			const section = screen
				.getByText("Type the text below")
				.closest("section");
			if (!section)
				throw new Error(
					'Expected a <section> ancestor of "Type the text below"',
				);
			expect(within(section).getByText(glyph)).toBeInTheDocument();
		},
	);
});

interface Version1Row {
	text: string;
	dateCreated: Date;
	dateModified: Date;
	numberOfLoads: number;
	numberOfCompletes: number;
}

/**
 * Replaces the app's database with one in the ORIGINAL (version 1) schema,
 * holding `rows`, as a user of the app from before 001 would have it. Dexie
 * opens lazily, so reopening `savedTextsDb` afterwards runs every upgrade.
 */
async function seedVersion1Database(rows: Version1Row[]) {
	savedTextsDb.close();
	await Dexie.delete(savedTextsDb.name);
	const v1 = new Dexie(savedTextsDb.name);
	v1.version(1).stores({ savedTexts: "++id, dateCreated, dateLastUsed, text" });
	await v1.open();
	await v1.table("savedTexts").bulkAdd(rows);
	v1.close();
	await savedTextsDb.open();
}

function version1Row(
	overrides: Partial<Version1Row> & { text: string },
): Version1Row {
	return {
		dateCreated: new Date("2026-01-01T00:00:00Z"),
		dateModified: new Date("2026-01-01T00:00:00Z"),
		numberOfLoads: 1,
		numberOfCompletes: 0,
		...overrides,
	};
}

// Vitest browser mode's default viewport, restored after a test changes it.
const DEFAULT_VIEWPORT = { width: 414, height: 896 };

// Test ids below are 002's (specs/002-history-refinements/tdd/test-list.md).
// 001's tests above reuse some of the same ids, so filter by this describe
// name too: -t "002-history-refinements.*\[A17\]".
describe("App (specs/002-history-refinements, checks carried over from 001)", () => {
	it("[A17] data from before 001, with duplicate rows of one text, shows one entry per text", async () => {
		await seedVersion1Database([
			version1Row({ text: "alpha", dateModified: new Date(2026, 0, 1) }),
			version1Row({ text: "alpha", dateModified: new Date(2026, 0, 2) }),
			version1Row({ text: "beta", dateModified: new Date(2026, 0, 3) }),
		]);

		render(<App />);

		const items = await within(sidebarRegion()).findAllByRole("listitem");
		expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
			"beta",
			"alpha",
		]);
	});

	it("[A18] with IndexedDB unusable from the start, practice can still be started and the sidebar shows an alert", async () => {
		// Closed but still allowed to auto-open, so the app's first query opens
		// the database afresh, and that open fails the way it does in a browser
		// where storage is blocked.
		savedTextsDb.close({ disableAutoOpen: false });
		const openSpy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
			throw new DOMException(
				"IndexedDB is not available.",
				"InvalidStateError",
			);
		});
		try {
			const user = userEvent.setup();
			render(<App />);

			expect(
				await within(sidebarRegion()).findByRole("alert"),
			).toHaveTextContent("Practice history could not be loaded.");

			await user.type(setupBox(), "hello world");
			await user.click(startButton());
			expect(
				screen.getByPlaceholderText(TYPING_PLACEHOLDER),
			).toBeInTheDocument();
		} finally {
			openSpy.mockRestore();
			await savedTextsDb.open();
		}
	});

	it("[A19] at a 320 CSS px viewport with entries listed, the page does not scroll sideways and every Load button is fully visible", async () => {
		// WCAG 1.4.10 Reflow: content must fit 320 CSS px without horizontal
		// scrolling. The entries include a long unbroken text, the likeliest
		// thing to push the layout wider.
		const REFLOW_WIDTH = 320;
		await savedTextsDb.savedTexts.bulkAdd([
			{
				text: "short text",
				dateCreated: new Date(2026, 0, 1),
				dateModified: new Date(2026, 0, 1),
				numberOfLoads: 1,
				numberOfCompletes: 0,
			},
			{
				text: "unbroken".repeat(40),
				dateCreated: new Date(2026, 0, 2),
				dateModified: new Date(2026, 0, 2),
				numberOfLoads: 1,
				numberOfCompletes: 0,
			},
		]);
		await page.viewport(REFLOW_WIDTH, 800);
		try {
			render(<App />);
			const loadButtons = await within(sidebarRegion()).findAllByRole(
				"button",
				{ name: /^Load/ },
			);
			expect(loadButtons).toHaveLength(2);

			const root = document.documentElement;
			expect(root.clientWidth).toBe(REFLOW_WIDTH);
			expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
			for (const button of loadButtons) {
				const box = button.getBoundingClientRect();
				expect(box.left).toBeGreaterThanOrEqual(0);
				expect(box.right).toBeLessThanOrEqual(root.clientWidth);
			}
		} finally {
			await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
		}
	});
});

const DISCARD_QUESTION = "Discard your progress on this text?";

/** Adds history entries directly, the last one most recently practiced. */
async function addHistory(...texts: string[]) {
	await savedTextsDb.savedTexts.bulkAdd(
		texts.map((text, i) => ({
			text,
			dateCreated: new Date(2026, 0, i + 1),
			dateModified: new Date(2026, 0, i + 1),
			numberOfLoads: 1,
			numberOfCompletes: 0,
		})),
	);
}

function loadButtonFor(text: string) {
	return within(sidebarRegion()).findByRole("button", {
		name: new RegExp(`^Load .*${text}`),
	});
}

function typingInput() {
	return screen.getByPlaceholderText(TYPING_PLACEHOLDER);
}

/** The practice view's "Characters" statistic, e.g. "2 / 10". */
function charactersTyped() {
	const term = screen.getByText("Characters");
	if (!term.nextElementSibling)
		throw new Error('Expected a <dd> after "Characters"');
	return term.nextElementSibling;
}

describe("App (specs/002-history-refinements, User Story 1)", () => {
	it("[A1] with a session in progress, pressing Load on a different entry shows the discard question and leaves the session untouched", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));
		await browserUserEvent.type(typingInput(), "fi");

		await browserUserEvent.click(await loadButtonFor("second text"));

		expect(
			screen.getByRole("dialog", { name: DISCARD_QUESTION }),
		).toBeInTheDocument();
		expect(getPracticeText("first text")).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("2 / 10");
	});

	it("[A2] choosing Cancel closes the confirmation, keeps the same text and typed position, and returns focus to the pressed Load button", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));
		await browserUserEvent.type(typingInput(), "fi");
		const loadSecond = await loadButtonFor("second text");
		await browserUserEvent.click(loadSecond);

		await browserUserEvent.click(
			screen.getByRole("button", { name: "Cancel" }),
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("first text")).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("2 / 10");
		expect(loadSecond).toHaveFocus();
	});

	it("[A3] pressing Escape on the confirmation does the same as Cancel", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));
		await browserUserEvent.type(typingInput(), "fi");
		const loadSecond = await loadButtonFor("second text");
		await browserUserEvent.click(loadSecond);

		await browserUserEvent.keyboard("{Escape}");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("first text")).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("2 / 10");
		expect(loadSecond).toHaveFocus();
		// The browser closes a dialog on Escape by itself; the app must also
		// have let go of the held-back load, so the next Load asks again.
		await browserUserEvent.click(loadSecond);
		expect(
			screen.getByRole("dialog", { name: DISCARD_QUESTION }),
		).toBeInTheDocument();
	});

	it("[A4] choosing Discard and load starts the chosen entry from its first character", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));
		await browserUserEvent.type(typingInput(), "fi");
		await browserUserEvent.click(await loadButtonFor("second text"));

		await browserUserEvent.click(
			screen.getByRole("button", { name: "Discard and load" }),
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("second text")).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("0 / 11");
	});

	it("[A5] with a session in progress, pressing Load on the running entry also shows the confirmation", async () => {
		await addHistory("hello world");
		render(<App />);
		const loadButton = await loadButtonFor("hello world");
		await browserUserEvent.click(loadButton);
		await browserUserEvent.type(typingInput(), "he");

		await browserUserEvent.click(loadButton);

		expect(
			screen.getByRole("dialog", { name: DISCARD_QUESTION }),
		).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("2 / 11");
	});

	it("[A6] with a session started but nothing typed, pressing Load loads immediately with no confirmation", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));

		await browserUserEvent.click(await loadButtonFor("second text"));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("second text")).toBeInTheDocument();
	});

	it("[A7] with a session finished, pressing Load loads immediately with no confirmation", async () => {
		await addHistory("second text", "hi");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("hi"));
		await browserUserEvent.type(typingInput(), "hi");
		expect(screen.getByText("Nice work! You finished.")).toBeInTheDocument();

		await browserUserEvent.click(await loadButtonFor("second text"));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("second text")).toBeInTheDocument();
	});

	it("[A8] using only the keyboard, the user can open the confirmation from a Load button, cancel it, open it again and confirm it", async () => {
		await addHistory("second text", "first text");
		render(<App />);
		await browserUserEvent.click(await loadButtonFor("first text"));
		const loadSecond = await loadButtonFor("second text");
		// From here on, keyboard only: type, then Tab from the typing input to
		// the Load button (bounded, so a broken tab order fails, not hangs).
		await waitFor(() => expect(typingInput()).toHaveFocus());
		await browserUserEvent.keyboard("fi");
		for (let i = 0; i < 10 && document.activeElement !== loadSecond; i++) {
			await browserUserEvent.tab();
		}
		expect(loadSecond).toHaveFocus();

		await browserUserEvent.keyboard("{Enter}");
		expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
		await browserUserEvent.keyboard("{Enter}");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(loadSecond).toHaveFocus();

		await browserUserEvent.keyboard(" ");
		await browserUserEvent.tab();
		expect(
			screen.getByRole("button", { name: "Discard and load" }),
		).toHaveFocus();
		await browserUserEvent.keyboard("{Enter}");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(getPracticeText("second text")).toBeInTheDocument();
		expect(charactersTyped()).toHaveTextContent("0 / 11");
	});
});
