import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Eyebrow, Panel } from "../components/Panel";
import { fieldClassName } from "../components/field";
import type { TypingState, TypedMark } from "../types";

type PracticeViewProps = {
	targetText: string;
	typingState: TypingState;
	onFinish: () => void;
	onReset: () => void;
};

function displayChar(ch: string) {
	if (ch === " ") return "space";
	if (ch === "\n") return "newline";
	if (ch === "\t") return "tab";
	return ch;
}

function PracticeView({
	targetText,
	typingState,
	onFinish,
	onReset,
}: PracticeViewProps) {
	const [position, setPosition] = useState(0);
	const [typedMarks, setTypedMarks] = useState<TypedMark[]>([]);
	const [isComposing, setIsComposing] = useState(false);
	const [currentInputValue, setCurrentInputValue] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const typingInputRef = useRef<HTMLInputElement>(null);
	const headingId = useId();

	// Reset typing state when target changes or we start a new run
	useEffect(() => {
		if (typingState === "running") {
			setPosition(0);
			setTypedMarks(Array.from({ length: targetText.length }, () => null));
			setCurrentInputValue("");
			setErrorMessage("");
			setIsComposing(false);
			setTimeout(() => typingInputRef.current?.focus(), 0);
		}
	}, [targetText, typingState]);

	const progressPercentage = useMemo(
		() =>
			targetText.length > 0
				? Math.round((position / targetText.length) * 100)
				: 0,
		[position, targetText.length],
	);

	const handleTypingInput = (event: React.FormEvent<HTMLInputElement>) => {
		if (typingState !== "running" || isComposing) return;

		const inputElement = event.currentTarget;
		const newValue = inputElement.value;

		if (newValue.length > currentInputValue.length) {
			const typedChar = newValue.slice(currentInputValue.length);
			const actual = typedChar[0];
			const expected = targetText[position];

			if (expected === undefined) {
				onFinish();
				setErrorMessage("Nice work! You finished.");
				inputElement.value = "";
				setCurrentInputValue("");
				return;
			}

			const isExpectedWhitespace =
				typeof expected === "string" &&
				expected.length === 1 &&
				/\s/.test(expected);
			const isCorrect =
				actual === expected || (actual === " " && isExpectedWhitespace);

			if (!isCorrect) {
				setTypedMarks((prev) => {
					const next = prev.slice();
					next[position] = "incorrect";
					return next;
				});
				setErrorMessage(
					`Error at position ${position + 1}: expected "${displayChar(expected)}" but got "${displayChar(actual)}". Keep typing until you get it right!`,
				);
				inputElement.value = currentInputValue;
				return;
			}

			setTypedMarks((prev) => {
				const next = prev.slice();
				next[position] = "correct";
				return next;
			});
			setErrorMessage("");

			const nextPos = position + 1;
			if (nextPos >= targetText.length) {
				onFinish();
				setErrorMessage("Nice work! You finished.");
				inputElement.value = "";
				setCurrentInputValue("");
			} else {
				setPosition(nextPos);
				inputElement.value = "";
				setCurrentInputValue("");
			}
		} else if (newValue.length < currentInputValue.length) {
			// Backspace
			setErrorMessage("");
			setPosition((pos) => {
				if (pos <= 0) return 0;
				const newPos = pos - 1;
				setTypedMarks((prev) => {
					const next = prev.slice();
					next[newPos] = null;
					return next;
				});
				return newPos;
			});
			setCurrentInputValue("");
			inputElement.value = "";
		}
	};

	const handleTypingKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (typingState !== "running") return;
		if (event.key === "Backspace" && !isComposing) {
			event.preventDefault();
			setErrorMessage("");
			setPosition((pos) => {
				if (pos <= 0) return 0;
				const newPos = pos - 1;
				setTypedMarks((prev) => {
					const next = prev.slice();
					next[newPos] = null;
					return next;
				});
				return newPos;
			});
			setCurrentInputValue("");
			if (typingInputRef.current) {
				typingInputRef.current.value = "";
			}
		}
	};

	const handleCompositionStart = () => {
		setIsComposing(true);
	};

	const handleCompositionEnd = (
		event: React.CompositionEvent<HTMLInputElement>,
	) => {
		setIsComposing(false);
		if (typingState !== "running") return;

		const inputElement = event.currentTarget;
		const composedText = inputElement.value;

		if (composedText.length > 0) {
			const expected = targetText[position];
			const actual = composedText[0];

			if (expected !== undefined) {
				const isExpectedWhitespace =
					typeof expected === "string" &&
					expected.length === 1 &&
					/\s/.test(expected);
				const isCorrect =
					actual === expected || (actual === " " && isExpectedWhitespace);

				if (!isCorrect) {
					setTypedMarks((prev) => {
						const next = prev.slice();
						next[position] = "incorrect";
						return next;
					});
					setErrorMessage(
						`Error at position ${position + 1}: expected "${displayChar(expected)}" but got "${displayChar(actual)}". Keep typing until you get it right!`,
					);
				} else {
					setTypedMarks((prev) => {
						const next = prev.slice();
						next[position] = "correct";
						return next;
					});
					setErrorMessage("");

					const nextPos = position + 1;
					if (nextPos >= targetText.length) {
						onFinish();
						setErrorMessage("Nice work! You finished.");
					} else {
						setPosition(nextPos);
					}
				}
			}
		}

		inputElement.value = "";
		setCurrentInputValue("");
	};

	const isFinished = typingState === "finished";

	return (
		<Panel aria-labelledby={headingId}>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<dl className="m-0 flex flex-wrap items-baseline gap-x-8 gap-y-2">
					<div className="flex flex-col-reverse">
						<dt className="text-ink-muted text-xs font-semibold tracking-[0.12em] uppercase">
							Characters
						</dt>
						<dd className="text-ink m-0 font-mono text-2xl font-semibold tabular-nums">
							{position}
							<span className="text-ink-muted text-base font-normal">
								{" "}
								/ {targetText.length}
							</span>
						</dd>
					</div>
					<div className="flex flex-col-reverse">
						<dt className="text-ink-muted text-xs font-semibold tracking-[0.12em] uppercase">
							Complete
						</dt>
						<dd className="text-ink m-0 font-mono text-2xl font-semibold tabular-nums">
							{progressPercentage}%
						</dd>
					</div>
				</dl>
				<Button variant="secondary" size="sm" onClick={onReset}>
					<span aria-hidden="true">↺</span>
					Reset
				</Button>
			</div>

			<div
				role="progressbar"
				aria-label="Progress"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={progressPercentage}
				className="bg-line mb-7 h-2 overflow-hidden rounded-full"
			>
				<div
					className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 ${
						isFinished ? "bg-success" : "bg-accent"
					}`}
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>

			<Eyebrow id={headingId} className="mb-3">
				Type the text below
			</Eyebrow>
			<div
				className={`rounded-xl border px-5 py-4 transition-colors duration-300 ${
					isFinished
						? "border-success/50 bg-success-soft"
						: "border-line bg-surface-sunken"
				}`}
			>
				{/* overflow-wrap:anywhere (unlike break-word) also lowers the element's
				    min-content width, so a long unbroken run can't widen the layout. */}
				<p className="m-0 font-mono text-xl leading-[1.9] [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-2xl">
					{Array.from(targetText).map((ch, i) => {
						const mark = typedMarks[i] ?? null;
						const isCaret = typingState === "running" && i === position;

						const className =
							mark === "correct"
								? "text-success"
								: mark === "incorrect"
									? "rounded-sm bg-danger-soft text-danger underline decoration-wavy decoration-1 underline-offset-4"
									: isCaret
										? "rounded-sm bg-accent-soft text-accent-ink font-semibold underline decoration-2 underline-offset-[6px]"
										: "text-ink-muted";

						const key = `${i}-${ch ?? ""}`;

						return (
							<span key={key} className={className}>
								{ch}
							</span>
						);
					})}
				</p>
			</div>
			<input
				ref={typingInputRef}
				value={currentInputValue}
				onInput={handleTypingInput}
				onKeyDown={handleTypingKeyDown}
				onCompositionStart={handleCompositionStart}
				onCompositionEnd={handleCompositionEnd}
				aria-label="Typing input"
				className={`${fieldClassName} mt-4`}
				type="text"
				autoComplete="off"
				spellCheck={false}
				disabled={typingState !== "running"}
				placeholder="Start typing… (this box stays empty; it captures keystrokes)"
			/>
			{errorMessage && (
				<p
					className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
						isFinished
							? "bg-success-soft text-success"
							: "bg-danger-soft text-danger"
					}`}
					role="alert"
				>
					{errorMessage}
				</p>
			)}
		</Panel>
	);
}

export default PracticeView;
