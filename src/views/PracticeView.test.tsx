import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeView from "./PracticeView";

function renderPractice(targetText: string) {
	render(
		<PracticeView
			targetText={targetText}
			typingState="running"
			onFinish={() => {}}
			onReset={() => {}}
		/>,
	);
	return screen.getByPlaceholderText(
		"Start typing… (this box stays empty; it captures keystrokes)",
	);
}

// The text of each element the target text is split into. A browser only
// stacks a Thai above/below vowel or tone mark on its base consonant when both
// sit in the same element: split across two differently styled elements, the
// mark renders on its own beside a dotted circle. So the split itself is the
// behavior under test here, not an implementation detail.
function renderedPieces() {
	const heading = screen.getByText("Type the text below");
	const section = heading.closest("section");
	if (!section)
		throw new Error('Expected a <section> ancestor of "Type the text below"');
	const paragraph = within(section).getByText(
		(_content, element) =>
			element?.tagName === "P" && element.parentElement?.tagName === "DIV",
	);
	return Array.from(paragraph.children, (child) => child.textContent);
}

describe("PracticeView", () => {
	// กี่ปู = ก + ี (above vowel) + ่ (tone mark), then ป + ู (below vowel).
	const text = "กี่ปู";
	const clusters = ["กี่", "ปู"];

	it.each([
		["nothing typed yet", ""],
		["the caret on an above vowel", "ก"],
		["the caret on a tone mark", "กี"],
		["a whole cluster typed", "กี่"],
		["the caret on a below vowel", "กี่ป"],
	])(
		"keeps each Thai consonant and its vowel and tone marks in one element with %s",
		async (_state, typed) => {
			const user = userEvent.setup();
			const input = renderPractice(text);

			if (typed) await user.type(input, typed);

			expect(renderedPieces()).toEqual(clusters);
		},
	);

	it("keeps the cluster in one element after a wrong mark is typed on it", async () => {
		const user = userEvent.setup();
		const input = renderPractice(text);

		// ั (another above vowel) where ี is expected.
		await user.type(input, "กั");

		expect(renderedPieces()).toEqual(clusters);
	});

	it("still renders one element per character for text without combining marks", () => {
		renderPractice("hi you");

		expect(renderedPieces()).toEqual(["h", "i", " ", "y", "o", "u"]);
	});
});
