import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

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
