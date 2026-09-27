import React, { useId } from "react";
import { Button } from "../components/Button";
import { Eyebrow, Panel } from "../components/Panel";
import { fieldClassName } from "../components/field";

type SetupViewProps = {
	sourceText: string;
	errorMessage: string;
	onChangeText: (value: string) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onStart: () => void;
};

function SetupView({
	sourceText,
	errorMessage,
	onChangeText,
	onKeyDown,
	onStart,
}: SetupViewProps) {
	const headingId = useId();
	const textareaId = useId();
	const hintId = useId();

	return (
		<Panel aria-labelledby={headingId}>
			<Eyebrow id={headingId} className="mb-4">
				<label htmlFor={textareaId}>Enter text to practice</label>
			</Eyebrow>
			<textarea
				id={textareaId}
				value={sourceText}
				onChange={(e) => onChangeText(e.target.value)}
				onKeyDown={onKeyDown}
				aria-describedby={hintId}
				aria-invalid={errorMessage ? true : undefined}
				className={`${fieldClassName} max-h-[50vh] min-h-40 resize-y text-lg leading-relaxed [overflow-wrap:anywhere]`}
				rows={6}
				placeholder="Type or paste any text you want to practice..."
			/>
			{errorMessage && (
				<p
					className="bg-danger-soft text-danger mt-3 rounded-lg px-3 py-2 text-sm font-medium"
					role="alert"
				>
					{errorMessage}
				</p>
			)}
			<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
				<p id={hintId} className="text-ink-muted m-0 text-sm">
					Press{" "}
					<kbd className="border-line-strong bg-surface-sunken text-ink rounded-md border px-1.5 py-0.5 font-mono text-xs">
						Ctrl
					</kbd>{" "}
					/{" "}
					<kbd className="border-line-strong bg-surface-sunken text-ink rounded-md border px-1.5 py-0.5 font-mono text-xs">
						Cmd
					</kbd>{" "}
					+{" "}
					<kbd className="border-line-strong bg-surface-sunken text-ink rounded-md border px-1.5 py-0.5 font-mono text-xs">
						Enter
					</kbd>{" "}
					to start
				</p>
				<Button variant="primary" onClick={onStart}>
					Start practice
					<span aria-hidden="true">→</span>
				</Button>
			</div>
		</Panel>
	);
}

export default SetupView;
