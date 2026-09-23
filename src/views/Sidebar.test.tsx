import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoA11yViolations } from "../test/a11y";
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
		// Baseline updated for the intended change in [U41] (SavedTextItem.tsx):
		// the button's accessible name is "Load" plus the entry's preview text,
		// not exactly "Load". See tdd/cycle-log.md.
		expect(screen.getByRole("button", { name: /^Load/ })).toBeInTheDocument();
	});
});

async function addEntry(overrides: {
	text: string;
	dateModified?: Date;
	dateCreated?: Date;
}) {
	await savedTextsDb.savedTexts.add({
		text: overrides.text,
		dateCreated: overrides.dateCreated ?? new Date("2026-01-01T00:00:00Z"),
		dateModified: overrides.dateModified ?? new Date("2026-01-01T00:00:00Z"),
		numberOfLoads: 0,
		numberOfCompletes: 0,
	});
}

describe("Sidebar (specs/001-practice-history contracts/sidebar-ui.md)", () => {
	it("[U53] is a region named Practice History", async () => {
		render(<Sidebar onLoadRequest={vi.fn()} />);

		expect(
			await screen.findByRole("region", { name: "Practice History" }),
		).toBeInTheDocument();
	});

	it("[U57] with no entries shows the empty-state message", async () => {
		render(<Sidebar onLoadRequest={vi.fn()} />);

		expect(
			await screen.findByText(
				"No practice history yet. Texts you practice will appear here.",
			),
		).toBeInTheDocument();
	});

	it("[U58] the empty-state text is absent once an entry exists", async () => {
		await addEntry({ text: "hello world" });

		render(<Sidebar onLoadRequest={vi.fn()} />);

		await screen.findByText("hello world");
		expect(
			screen.queryByText(
				"No practice history yet. Texts you practice will appear here.",
			),
		).not.toBeInTheDocument();
	});

	it("[U54] entries are list items, most recently practiced first", async () => {
		await addEntry({
			text: "older",
			dateModified: new Date("2026-01-01T00:00:00Z"),
		});
		await addEntry({
			text: "newer",
			dateModified: new Date("2026-01-02T00:00:00Z"),
		});

		render(<Sidebar onLoadRequest={vi.fn()} />);

		const items = await screen.findAllByRole("listitem");
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent("newer");
		expect(items[1]).toHaveTextContent("older");
	});

	// role="alert" is not one of the ARIA roles that computes its accessible
	// name from text content, so `getByRole("alert", { name })` can never match
	// plain text inside it. Query by role alone and assert the text separately.

	it("[U59] when the store cannot be read, shows an alert and does not throw", async () => {
		// A mocked Dexie method that throws (rather than a real failure) was
		// found to poison dexie-react-hooks' live-query cache for later tests
		// even after the mock is restored (see tdd/cycle-log.md). Closing the
		// real connection is a real Dexie failure path and recovers cleanly.
		await savedTextsDb.close();

		render(<Sidebar onLoadRequest={vi.fn()} />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Practice history could not be loaded.",
		);
		await savedTextsDb.open();
	});

	it("[U60] with saveError set, shows the save-failure alert", () => {
		render(<Sidebar onLoadRequest={vi.fn()} saveError />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Your practice history could not be saved. You can keep practicing.",
		);
	});

	it("[U61] with a readable store and no saveError, shows no alert", async () => {
		await addEntry({ text: "hello world" });

		render(<Sidebar onLoadRequest={vi.fn()} />);

		await screen.findByText("hello world");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("[U62] the empty sidebar has no axe violations", async () => {
		const { container } = render(<Sidebar onLoadRequest={vi.fn()} />);
		await screen.findByText(
			"No practice history yet. Texts you practice will appear here.",
		);

		await expectNoA11yViolations(container);
	});

	it("[U63] the populated sidebar has no axe violations", async () => {
		await addEntry({ text: "hello world" });
		const { container } = render(<Sidebar onLoadRequest={vi.fn()} />);
		await screen.findByText("hello world");

		await expectNoA11yViolations(container);
	});

	it("[U64] the read-failure sidebar has no axe violations", async () => {
		await savedTextsDb.close();
		const { container } = render(<Sidebar onLoadRequest={vi.fn()} />);
		await screen.findByRole("alert");

		await expectNoA11yViolations(container);
		await savedTextsDb.open();
	});

	it("[U65] the save-failure sidebar has no axe violations", async () => {
		const { container } = render(<Sidebar onLoadRequest={vi.fn()} saveError />);

		await expectNoA11yViolations(container);
	});

	it("[U55] pressing Load on one entry calls onLoadRequest with exactly that entry", async () => {
		const user = userEvent.setup();
		await addEntry({
			text: "older",
			dateModified: new Date("2026-01-01T00:00:00Z"),
		});
		await addEntry({
			text: "newer",
			dateModified: new Date("2026-01-02T00:00:00Z"),
		});
		const onLoadRequest = vi.fn();

		render(<Sidebar onLoadRequest={onLoadRequest} />);

		const olderButton = await screen.findByRole("button", {
			name: /^Load .*older/,
		});
		await user.click(olderButton);

		expect(onLoadRequest).toHaveBeenCalledOnce();
		expect(onLoadRequest).toHaveBeenCalledWith(
			expect.objectContaining({ text: "older" }),
		);
	});

	it("[U56] the Load buttons of two different entries have different accessible names", async () => {
		await addEntry({ text: "alpha" });
		await addEntry({ text: "beta" });

		render(<Sidebar onLoadRequest={vi.fn()} />);

		const alphaButton = await screen.findByRole("button", {
			name: /^Load .*alpha/,
		});
		const betaButton = screen.getByRole("button", { name: /^Load .*beta/ });
		expect(alphaButton).not.toBe(betaButton);
	});

	it("[U66] with 100 entries, renders all 100 Load buttons in most-recent-first order", async () => {
		await savedTextsDb.savedTexts.bulkAdd(
			Array.from({ length: 100 }, (_, i) => ({
				text: `text ${i}`,
				dateCreated: new Date(2026, 0, i + 1),
				dateModified: new Date(2026, 0, i + 1),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			})),
		);

		render(<Sidebar onLoadRequest={vi.fn()} />);

		const buttons = await screen.findAllByRole("button", { name: /^Load/ });
		expect(buttons).toHaveLength(100);
		expect(buttons[0]).toHaveAccessibleName(/text 99/);
		expect(buttons[99]).toHaveAccessibleName(/text 0/);
	});

	it("[U66] with 100 entries, the populated sidebar has no axe violations", async () => {
		await savedTextsDb.savedTexts.bulkAdd(
			Array.from({ length: 100 }, (_, i) => ({
				text: `text ${i}`,
				dateCreated: new Date(2026, 0, i + 1),
				dateModified: new Date(2026, 0, i + 1),
				numberOfLoads: 0,
				numberOfCompletes: 0,
			})),
		);
		const { container } = render(<Sidebar onLoadRequest={vi.fn()} />);
		await screen.findAllByRole("button", { name: /^Load/ });

		await expectNoA11yViolations(container);
	});

	it("[U66] a long-text entry does not remove the other entries from the list", async () => {
		await addEntry({ text: "abcdefghij".repeat(500) });
		await addEntry({
			text: "short",
			dateModified: new Date("2026-01-02T00:00:00Z"),
		});

		render(<Sidebar onLoadRequest={vi.fn()} />);

		const items = await screen.findAllByRole("listitem");
		expect(items).toHaveLength(2);
	});
});
