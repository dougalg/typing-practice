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
 * The browser still lets Tab leave the page from the last button, so that one
 * wrap is handled here.
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
		if (dialog && open && !dialog.open) dialog.showModal();
	}, [open]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
		if (event.key !== "Tab" || event.shiftKey) return;
		if (event.target === confirmRef.current) {
			event.preventDefault();
			cancelRef.current?.focus();
		}
	};

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby={questionId}
			// The native `cancel` event: Escape (or the platform's back gesture).
			onCancel={() => onCancel()}
			onKeyDown={handleKeyDown}
		>
			<p id={questionId}>Discard your progress on this text?</p>
			<Button ref={cancelRef} autoFocus onClick={onCancel}>
				Cancel
			</Button>
			<Button ref={confirmRef} onClick={onConfirm}>
				Discard and load
			</Button>
		</dialog>
	);
};
