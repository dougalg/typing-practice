import React from "react";
import { Heading } from "../components/Heading";

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
	return (
		<section className="pixel-panel p-5 pb-6 sm:p-6">
			<Heading level={2} className="mb-4">
				Enter text to practice
			</Heading>
			<textarea
				value={sourceText}
				onChange={(e) => onChangeText(e.target.value)}
				onKeyDown={onKeyDown}
				className="pixel-field max-h-[200px] min-h-[80px] resize-y px-[0.9rem] py-3 text-[1.5rem] leading-relaxed"
				rows={4}
				placeholder="Type or paste any text you want to practice..."
			/>
			{errorMessage && (
				<p className="text-miss mt-3 font-bold" role="alert">
					{errorMessage}
				</p>
			)}
			<button onClick={onStart} className="pixel-btn pixel-btn-primary mt-4">
				Start practice
			</button>
		</section>
	);
}

export default SetupView;
