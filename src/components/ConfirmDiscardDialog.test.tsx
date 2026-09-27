import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// Real input through Playwright: the dialog's behavior is the browser's own.
import { userEvent } from "vitest/browser";
import { expectNoA11yViolations } from "../test/a11y";
import { spokenPhrases } from "../test/screenReader";
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

	it("[U17] pressing Escape calls onCancel once", async () => {
		const onCancel = vi.fn();
		render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={onCancel} />,
		);

		await userEvent.keyboard("{Escape}");

		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("[U18] pressing Discard and load calls onConfirm once and not onCancel", async () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		render(
			<ConfirmDiscardDialog open onConfirm={onConfirm} onCancel={onCancel} />,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Discard and load" }),
		);

		expect(onConfirm).toHaveBeenCalledOnce();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("[U19] Tab from the last button keeps focus inside the dialog", async () => {
		render(
			<>
				<button type="button">Outside</button>
				<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />
			</>,
		);
		screen.getByRole("button", { name: "Discard and load" }).focus();

		await userEvent.tab();

		expect(screen.getByRole("dialog")).toContainElement(
			document.activeElement as HTMLElement,
		);
	});

	it("[U20] Shift+Tab from the first button keeps focus inside the dialog", async () => {
		render(
			<>
				<button type="button">Outside</button>
				<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />
			</>,
		);
		screen.getByRole("button", { name: "Cancel" }).focus();

		await userEvent.tab({ shift: true });

		expect(screen.getByRole("dialog")).toContainElement(
			document.activeElement as HTMLElement,
		);
	});

	it("[U21] with open false, no dialog is shown", () => {
		render(
			<ConfirmDiscardDialog
				open={false}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("[U22] changing open from true to false closes it", () => {
		const { rerender } = render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
		);

		rerender(
			<ConfirmDiscardDialog
				open={false}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("[U23] the open dialog has no axe violations", async () => {
		const { container } = render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
		);

		await expectNoA11yViolations(container);
	});

	it("[U24] a screen reader announces it as a dialog with its question", async () => {
		const { container } = render(
			<ConfirmDiscardDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />,
		);

		const phrases = await spokenPhrases(container);

		expect(phrases[0]).toBe(`dialog, ${QUESTION}`);
	});
});
