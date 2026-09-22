import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as historyModule from "./features/savedItems/history";
import { savedTextsDb } from "./features/savedItems/db";

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
		// Reset does not clear the setup box (that is FR-016, driven in User
		// Story 2), so the box still reads "hello world" here.
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
		await user.type(setupBox(), "  \n");
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
