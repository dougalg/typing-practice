import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

export interface ConfirmDiscardDialogProps {
	open: boolean;
	onConfirm: () => void;
	/** Cancel button or Escape. */
	onCancel: () => void;
}

/**
 * Asks before a practice session in progress is discarded. A native <dialog>
 * opened with showModal(), so the browser keeps focus inside it and makes the
 * rest of the page inert.
 */
export const ConfirmDiscardDialog = ({
	open,
	onCancel,
}: ConfirmDiscardDialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const questionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && open && !dialog.open) dialog.showModal();
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby={questionId}
			// The native `cancel` event: Escape (or the platform's back gesture).
			onCancel={() => onCancel()}
		>
			<p id={questionId}>Discard your progress on this text?</p>
			<Button autoFocus onClick={onCancel}>
				Cancel
			</Button>
		</dialog>
	);
};
