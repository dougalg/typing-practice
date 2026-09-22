import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SavedTextItem } from "./SavedTextItem";
import { readingOrder } from "../test/readingOrder";

describe("SavedTextItem", () => {
	it("announces its content in a sensible reading order", async () => {
		render(
			<SavedTextItem
				id={1}
				text="The quick brown fox jumps over the lazy dog."
				dateCreated={new Date(2026, 0, 19)}
				dateModified={new Date(2026, 1, 2)}
				numberOfLoads={3}
				numberOfCompletes={1}
				onLoadRequest={() => {}}
			/>,
		);

		await expect(readingOrder()).resolves.toMatchInlineSnapshot(`
			"document
			paragraph
			The quick brown fox jumps over the lazy dog.
			end of paragraph
			paragraph
			Last Practiced On:
			end of paragraph
			paragraph
			Jan 19, 2026
			end of paragraph
			button, Load
			end of document"
		`);
	});
});
