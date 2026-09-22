import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
		expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
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
});
