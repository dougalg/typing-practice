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

		// Baseline updated for the intended change in [U41]: the button's
		// accessible name is no longer exactly "Load", it is "Load" plus the
		// entry's preview text. The observable behavior this test pins (click
		// calls onLoadRequest once) is unchanged; only the query needed to find
		// the button changed. See tdd/cycle-log.md.
		await user.click(screen.getByRole("button", { name: /^Load/ }));

		expect(onLoadRequest).toHaveBeenCalledOnce();
	});
});

describe("SavedTextItem (specs/001-practice-history contracts/sidebar-ui.md)", () => {
	it("[U41] the Load button's accessible name is 'Load' followed by the entry's preview text", () => {
		render(
			<SavedTextItem
				id={1}
				text="the quick brown fox"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-02T12:00:00Z")}
				numberOfLoads={1}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /^Load .*quick brown fox/ }),
		).toBeInTheDocument();
	});

	it("[U42] pressing Enter on the focused Load button calls onLoadRequest once", async () => {
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

		screen.getByRole("button", { name: /^Load/ }).focus();
		await user.keyboard("{Enter}");

		expect(onLoadRequest).toHaveBeenCalledOnce();
	});

	it("[U43] pressing Space on the focused Load button calls onLoadRequest once", async () => {
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

		screen.getByRole("button", { name: /^Load/ }).focus();
		await user.keyboard(" ");

		expect(onLoadRequest).toHaveBeenCalledOnce();
	});
});
