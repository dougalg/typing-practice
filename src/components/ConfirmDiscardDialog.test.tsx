import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// Real input through Playwright: the dialog's behavior is the browser's own.
import { userEvent } from "vitest/browser";
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

	it("[U15] when it opens, Cancel has focus", () => {
		render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
		);

		expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
	});

	it("[U16] pressing Cancel calls onCancel once and not onConfirm", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		render(
			<ConfirmDiscardDialog open onConfirm={onConfirm} onCancel={onCancel} />,
		);

		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
