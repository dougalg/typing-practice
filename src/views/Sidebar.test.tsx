import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { savedTextsDb } from "../features/savedItems/db";

describe("Sidebar (characterization: current behavior before the practice-history feature)", () => {
	it("[U6] a text already in the store appears in the sidebar together with a Load button", async () => {
		await savedTextsDb.savedTexts.add({
			text: "hello world",
			dateCreated: new Date(),
			dateModified: new Date(),
			numberOfLoads: 1,
			numberOfCompletes: 0,
		});

		render(<Sidebar onLoadRequest={vi.fn()} />);

		expect(await screen.findByText("hello world")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
	});
});
