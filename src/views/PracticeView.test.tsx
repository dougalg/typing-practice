import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeView from "./PracticeView";

function typingInput() {
	return screen.getByRole("textbox", { name: "Typing input" });
}

// The "Characters" statistic: its <dd> reads "{position} / {length}".
function charactersTyped() {
	const term = screen.getByText("Characters");
	const definition = term.nextElementSibling;
	if (!definition) throw new Error('Expected a <dd> after "Characters"');
	return definition;
}

// The target text is one <span> per character, so match the <p> whose
// combined text is exactly the target.
function getPracticeText(text: string) {
	return screen.getByText(
		(_content, element) =>
			element?.tagName === "P" && element.textContent === text,
	);
}

describe("PracticeView (characterization: current behavior before specs/002-history-refinements)", () => {
	it("[U1] while running, shows the target text and a focused typing input", async () => {
		render(
			<PracticeView
				targetText="hello"
				typingState="running"
				onFinish={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		expect(getPracticeText("hello")).toBeInTheDocument();
		await waitFor(() => expect(typingInput()).toHaveFocus());
	});

	it("[U2] a correct character moves the position on by one", async () => {
		const user = userEvent.setup();
		render(
			<PracticeView
				targetText="hello"
				typingState="running"
				onFinish={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		await user.type(typingInput(), "h");

		expect(charactersTyped()).toHaveTextContent("1 / 5");
	});

	it("[U3] a wrong character shows the error message and does not move the position", async () => {
		const user = userEvent.setup();
		render(
			<PracticeView
				targetText="hello"
				typingState="running"
				onFinish={vi.fn()}
				onReset={vi.fn()}
			/>,
		);

		await user.type(typingInput(), "x");

		expect(screen.getByRole("alert")).toHaveTextContent(
			'Error at position 1: expected "h" but got "x". Keep typing until you get it right!',
		);
		expect(charactersTyped()).toHaveTextContent("0 / 5");
	});

	it("[U4] typing the whole text calls onFinish once", async () => {
		const user = userEvent.setup();
		const onFinish = vi.fn();
		render(
			<PracticeView
				targetText="hi"
				typingState="running"
				onFinish={onFinish}
				onReset={vi.fn()}
			/>,
		);

		await user.type(typingInput(), "hi");

		expect(onFinish).toHaveBeenCalledOnce();
	});

	it("[U5] pressing Reset calls onReset", async () => {
		const user = userEvent.setup();
		const onReset = vi.fn();
		render(
			<PracticeView
				targetText="hello"
				typingState="running"
				onFinish={vi.fn()}
				onReset={onReset}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(onReset).toHaveBeenCalledOnce();
	});
});
