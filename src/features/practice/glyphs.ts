import type { TypedMark } from "../../types";

export type GlyphState = "correct" | "incorrect" | "caret" | "pending";

/** One user-perceived character of the practice text, styled as a unit. */
export interface Glyph {
	text: string;
	state: GlyphState;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Splits the practice text into grapheme clusters so a combining mark is
 * rendered in the same element, and so the same colour, as the letter it
 * sits on. Typing still advances one UTF-16 code unit at a time; `marks` and
 * `position` use those offsets, and a cluster takes its state from all of
 * the units it covers.
 */
export function toGlyphs(
	text: string,
	marks: TypedMark[],
	position: number,
	isRunning: boolean,
): Glyph[] {
	return Array.from(segmenter.segment(text), ({ segment, index }) => {
		const end = index + segment.length;
		const covered = marks.slice(index, end);

		let state: GlyphState = "pending";
		if (covered.includes("incorrect")) state = "incorrect";
		else if (isRunning && position >= index && position < end) state = "caret";
		else if (
			covered.length === segment.length &&
			covered.every((m) => m === "correct")
		)
			state = "correct";

		return { text: segment, state };
	});
}
