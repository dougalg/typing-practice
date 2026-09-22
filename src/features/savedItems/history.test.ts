import { describe, expect, it } from "vitest";
import { normalizeText } from "./history";

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
