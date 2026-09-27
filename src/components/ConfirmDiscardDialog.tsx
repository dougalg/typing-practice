import { useEffect, useId, useRef } from "react";

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
export const ConfirmDiscardDialog = ({ open }: ConfirmDiscardDialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const questionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && open && !dialog.open) dialog.showModal();
	}, [open]);

	return (
		<dialog ref={dialogRef} aria-labelledby={questionId}>
			<p id={questionId}>Discard your progress on this text?</p>
		</dialog>
	);
};
