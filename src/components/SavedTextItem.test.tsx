import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoA11yViolations } from "../test/a11y";
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

	it("[U44] shows 'Last practiced:' with the date of dateModified, not dateCreated, when the two differ", () => {
		render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-02-15T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(screen.getByText(/Last practiced:/)).toHaveTextContent(
			"Last practiced: Feb 15, 2026",
		);
	});

	it("[U45] shows 'Practiced 1 time' (singular) for a practice count of 1", () => {
		render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={1}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(screen.getByText("Practiced 1 time")).toBeInTheDocument();
	});

	it("[U46] shows 'Practiced 2 times' for a practice count of 2", () => {
		render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={2}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(screen.getByText("Practiced 2 times")).toBeInTheDocument();
	});

	it("[U47] shows 'Practiced 0 times' for a practice count of 0, and no separate 'Completed' text", () => {
		render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(screen.getByText("Practiced 0 times")).toBeInTheDocument();
		expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
	});

	it("[U50] a text of several thousand characters still renders its full text and its Load button", () => {
		const longText = "abcdefghij".repeat(500);
		render(
			<SavedTextItem
				id={1}
				text={longText}
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		expect(screen.getByText(longText)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^Load/ })).toBeInTheDocument();
	});

	it("[U51] a normal entry has no axe violations", async () => {
		const { container } = render(
			<SavedTextItem
				id={1}
				text="hello world"
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		await expectNoA11yViolations(container);
	});

	it("[U52] a long-text entry has no axe violations", async () => {
		const { container } = render(
			<SavedTextItem
				id={1}
				text={"abcdefghij".repeat(500)}
				dateCreated={new Date("2026-01-01T12:00:00Z")}
				dateModified={new Date("2026-01-01T12:00:00Z")}
				numberOfLoads={0}
				numberOfCompletes={0}
				onLoadRequest={vi.fn()}
			/>,
		);

		await expectNoA11yViolations(container);
	});
});
