import { describe, expect, it } from "vitest";
import { toGlyphs } from "./glyphs";

describe("toGlyphs", () => {
	it("gives each plain character its own glyph with its mark", () => {
		expect(toGlyphs("ab", ["correct", "incorrect"], 2, true)).toEqual([
			{ text: "a", state: "correct" },
			{ text: "b", state: "incorrect" },
		]);
	});

	it("marks the character at the position as the caret while running", () => {
		expect(toGlyphs("ab", ["correct", null], 1, true)).toEqual([
			{ text: "a", state: "correct" },
			{ text: "b", state: "caret" },
		]);
	});

	it("shows no caret once the run is not running", () => {
		expect(toGlyphs("ab", ["correct", null], 1, false)).toEqual([
			{ text: "a", state: "correct" },
			{ text: "b", state: "pending" },
		]);
	});

	// "a" + U+0363 COMBINING LATIN SMALL LETTER A: a superscript mark drawn
	// over its base letter. Split apart, the mark would keep a different colour
	// from the highlighted letter it sits on and appear to vanish.
	it("keeps a combining mark in the same glyph as its base letter", () => {
		expect(toGlyphs("a\u0363b", [null, null, null], 0, true)).toEqual([
			{ text: "a\u0363", state: "caret" },
			{ text: "b", state: "pending" },
		]);
	});

	it("keeps the caret on the glyph until its combining mark is typed too", () => {
		expect(toGlyphs("a\u0363b", ["correct", null, null], 1, true)).toEqual([
			{ text: "a\u0363", state: "caret" },
			{ text: "b", state: "pending" },
		]);
	});

	it("shows a glyph as correct only once every part of it is correct", () => {
		expect(toGlyphs("a\u0363b", ["correct", "correct", null], 2, true)).toEqual(
			[
				{ text: "a\u0363", state: "correct" },
				{ text: "b", state: "caret" },
			],
		);
	});

	it("shows a glyph as incorrect when any part of it is incorrect", () => {
		expect(toGlyphs("a\u0363b", ["incorrect", null, null], 0, false)).toEqual([
			{ text: "a\u0363", state: "incorrect" },
			{ text: "b", state: "pending" },
		]);
	});

	// Thai vowels are combining marks: "ดี" is ด + U+0E35 SARA II (the long
	// "ee", drawn above) and "ดู" is ด + U+0E39 SARA UU (the long "oo", drawn
	// below).
	it("keeps a Thai above vowel with its consonant", () => {
		expect(toGlyphs("ดีก", ["correct", null, null], 1, true)).toEqual([
			{ text: "ดี", state: "caret" },
			{ text: "ก", state: "pending" },
		]);
	});

	it("keeps a Thai below vowel with its consonant", () => {
		expect(
			toGlyphs("กดู", ["correct", "correct", "correct"], 3, false),
		).toEqual([
			{ text: "ก", state: "correct" },
			{ text: "ดู", state: "correct" },
		]);
	});

	// Marks and position count UTF-16 code units, as the typing logic does.
	it("reads marks by UTF-16 offset past a character outside the BMP", () => {
		expect(
			toGlyphs("\u{1D465}y", ["correct", "correct", null], 2, true),
		).toEqual([
			{ text: "\u{1D465}", state: "correct" },
			{ text: "y", state: "caret" },
		]);
	});
});
