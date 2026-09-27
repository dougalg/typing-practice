import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TypingState, TypedMark } from "../types";
import { Heading } from "../components/Heading";

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
		<div className="pixel-panel p-5 pb-6 sm:p-6">
			<div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
				<button onClick={onReset} className="pixel-btn">
					Reset
				</button>
				<div className="text-muted flex flex-wrap items-center gap-x-6 gap-y-1">
					<div>
						<span className="text-ink font-bold">{position}</span> /{" "}
						<span>{targetText.length}</span> characters
					</div>
					<div>
						<span className="text-ink font-bold">{progressPercentage}%</span>{" "}
						complete
					</div>
				</div>
			</div>

			{/* Segmented like a retro health bar; the counts above carry the value. */}
			<div className="border-ink bg-track mb-6 h-5 border-3 p-0.5">
				<div
					className={`h-full bg-[repeating-linear-gradient(90deg,currentColor_0_12px,transparent_12px_16px)] transition-[width] duration-200 motion-reduce:transition-none ${
						isFinished ? "text-ok" : "text-hit"
					}`}
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>

			<section>
				<Heading level={2} className="mb-4">
					Type the text below
				</Heading>
				<div
					className={`flex min-h-20 items-center border-3 border-solid px-[0.9rem] py-3 text-left ${
						isFinished ? "border-ok bg-ok-bg" : "border-ink bg-panel"
					}`}
				>
					<p className="m-0 font-mono text-[1.5rem] leading-relaxed wrap-break-word whitespace-pre-wrap">
						{Array.from(targetText).map((ch, i) => {
							const mark = typedMarks[i] ?? null;
							const isCaret = typingState === "running" && i === position;

							// Incorrect characters are tinted and underlined so they are
							// distinguishable without relying on color alone.
							const className =
								mark === "correct"
									? "text-ok"
									: mark === "incorrect"
										? "bg-miss-bg text-miss underline decoration-4 underline-offset-4"
										: isCaret
											? "bg-hit text-panel"
											: "text-muted";

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
					className="pixel-field mt-4 px-[0.9rem] py-2.5"
					type="text"
					autoComplete="off"
					spellCheck={false}
					disabled={typingState !== "running"}
					placeholder="Start typing… (this box stays empty; it captures keystrokes)"
				/>
				{errorMessage && (
					<p
						className={`mt-3 font-bold ${isFinished ? "text-ok" : "text-miss"}`}
						role="alert"
					>
						{errorMessage}
					</p>
				)}
			</section>
		</div>
	);
}

export default PracticeView;
