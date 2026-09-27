import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfirmDiscardDialog } from "./ConfirmDiscardDialog";

const QUESTION = "Discard your progress on this text?";

describe("ConfirmDiscardDialog (specs/002-history-refinements contracts/ui.md)", () => {
	it("[U14] with open true, shows a modal dialog named by its question", () => {
		render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
		);

		const dialog = screen.getByRole("dialog", { name: QUESTION });
		// :modal matches only a dialog opened with showModal(): focus is kept
		// inside it and the rest of the page is inert.
		expect(dialog.matches(":modal")).toBe(true);
	});
});
