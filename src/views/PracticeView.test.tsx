import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PracticeView from "./PracticeView";

function typingInput() {
	return screen.getByRole("textbox", { name: "Typing input" });
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
});
