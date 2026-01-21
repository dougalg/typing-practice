import React, { useEffect, useMemo, useRef, useState } from "react";
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

function PracticeView({ targetText, typingState, onFinish, onReset }: PracticeViewProps) {
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

	const handleTypingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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

	return (
		<div className="rounded-[18px] bg-white/96 p-8 pb-9 shadow-[0_18px_60px_rgba(15,23,42,0.2),0_0_0_1px_rgba(148,163,184,0.25)] backdrop-blur-[14px] sm:p-6 sm:pb-7">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="m-0 text-[2.2rem] tracking-[-0.03em] text-slate-950 sm:text-[1.8rem]">
					Typing Practice
				</h1>
				<button
					onClick={onReset}
					className="cursor-pointer rounded-full border-none bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200"
				>
					Reset
				</button>
			</div>

			<div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
				<div
					className={`h-full transition-all duration-300 ${
						typingState === "finished" ? "bg-green-500" : "bg-blue-500"
					}`}
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>

			<div className="mb-6 flex items-center gap-6 text-sm text-slate-600">
				<div>
					<span className="font-semibold">{position}</span> /{" "}
					<span>{targetText.length}</span> characters
				</div>
				<div>
					<span className="font-semibold">{progressPercentage}%</span> complete
				</div>
			</div>

			<section className="mb-5 rounded-[14px] border border-slate-300/40 bg-gradient-to-br from-slate-50 to-blue-50 p-5 pb-6">
				<h2 className="m-0 mb-3 text-[0.95rem] tracking-[0.09em] text-slate-500 uppercase">
					Type the text below
				</h2>
				<div
					className={`mt-2 flex min-h-[80px] items-center rounded-[10px] px-[0.9rem] py-3 text-left ${
						typingState === "finished"
							? "border border-solid border-green-500 bg-gradient-to-br from-green-50 to-green-50/50"
							: "border border-solid border-blue-500 bg-blue-50"
					}`}
				>
					<p className="m-0 font-mono text-[0.95rem] break-words whitespace-pre-wrap">
						{Array.from(targetText).map((ch, i) => {
							const mark = typedMarks[i] ?? null;
							const isCaret = typingState === "running" && i === position;

							const className =
								mark === "correct"
									? "text-green-600"
									: mark === "incorrect"
										? "text-red-600"
										: isCaret
											? "text-blue-600 font-semibold"
											: "";

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
					className="font-inherit mt-3 w-full rounded-[10px] border border-slate-300 bg-white px-[0.9rem] py-2.5 transition-all duration-150 ease-out placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.4),0_0_0_4px_rgba(191,219,254,0.9)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-200"
					type="text"
					autoComplete="off"
					spellCheck={false}
					disabled={typingState !== "running"}
					placeholder="Start typing… (this box stays empty; it captures keystrokes)"
				/>
				{errorMessage && (
					<p
						className="mt-2.5 min-h-[1.25rem] text-sm text-red-700"
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
