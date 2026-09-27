import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "./Button";

export interface ConfirmDiscardDialogProps {
	open: boolean;
	onConfirm: () => void;
	/** Cancel button or Escape. */
	onCancel: () => void;
}

/**
 * Asks before a practice session in progress is discarded. A native <dialog>
 * opened with showModal(), so the browser makes the rest of the page inert.
 * The browser still lets Tab and Shift+Tab leave the page from the last and
 * first buttons, so those two wraps are handled here.
 */
export const ConfirmDiscardDialog = ({
	open,
	onConfirm,
	onCancel,
}: ConfirmDiscardDialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);
	const questionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	}, [open]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
		if (event.key !== "Tab") return;
		if (!event.shiftKey && event.target === confirmRef.current) {
			event.preventDefault();
			cancelRef.current?.focus();
		} else if (event.shiftKey && event.target === cancelRef.current) {
			event.preventDefault();
			confirmRef.current?.focus();
		}
	};

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby={questionId}
			// The native `cancel` event: Escape (or the platform's back gesture).
			onCancel={() => onCancel()}
			onKeyDown={handleKeyDown}
			// Styled like the app's panels; the backdrop dims the inert page.
			className="border-line bg-surface text-ink m-auto w-[calc(100%-2rem)] max-w-md border-4 p-5 shadow-[6px_6px_0_var(--color-line)] backdrop:bg-[#141414]/50 sm:p-7"
		>
			<p
				id={questionId}
				className="font-pixel m-0 text-sm leading-relaxed sm:text-base"
			>
				Discard your progress on this text?
			</p>
			{/* Cancel is the safe choice, so it is first and the primary style. */}
			<div className="mt-6 flex flex-wrap justify-end gap-3">
				<Button ref={cancelRef} variant="primary" autoFocus onClick={onCancel}>
					Cancel
				</Button>
				<Button ref={confirmRef} variant="secondary" onClick={onConfirm}>
					Discard and load
				</Button>
			</div>
		</dialog>
	);
};
