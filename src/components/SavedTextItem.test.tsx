import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavedTextItem } from "./SavedTextItem";

describe("SavedTextItem (characterization: current behavior before the practice-history feature)", () => {
	it("[U7] shows its text and calls onLoadRequest once when Load is pressed", async () => {
		const user = userEvent.setup();
		const onLoadRequest = vi.fn();

		render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-02T12:00:00Z")}
				numberOfLoads={1}
				numberOfCompletes={0}
				onLoadRequest={onLoadRequest}
			/>,
		);

		expect(screen.getByText("hello world")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Load" }));

		expect(onLoadRequest).toHaveBeenCalledOnce();
	});
});
