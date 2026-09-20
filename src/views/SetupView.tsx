import React from "react";

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
		<section className="rounded-[14px] border border-slate-300/40 bg-linear-to-br from-slate-50 to-blue-50 p-5 pb-6">
			<h2 className="m-0 mb-3 text-[0.95rem] tracking-[0.09em] text-slate-500 uppercase">
				Enter text to practice
			</h2>
			<textarea
				value={sourceText}
				onChange={(e) => onChangeText(e.target.value)}
				onKeyDown={onKeyDown}
				className="font-inherit max-h-[200px] min-h-[80px] w-full resize-y rounded-[10px] border border-slate-300 bg-white px-[0.9rem] py-3 text-[1.5rem] leading-relaxed text-slate-950 transition-all duration-150 ease-out placeholder:text-slate-400 focus:border-blue-600 focus:shadow-[0_0_0_1px_rgba(37,99,235,0.4),0_0_0_4px_rgba(191,219,254,0.9)] focus:outline-none"
				rows={4}
				placeholder="Type or paste any text you want to practice..."
			/>
			{errorMessage && (
				<p className="mt-2.5 min-h-[1.25rem] text-sm text-red-700" role="alert">
					{errorMessage}
				</p>
			)}
			<button
				onClick={onStart}
				className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-gradient-to-br from-blue-500 to-blue-700 px-5 py-[0.55rem] text-[0.95rem] font-semibold tracking-[0.03em] text-blue-50 uppercase shadow-[0_10px_25px_rgba(37,99,235,0.35),0_0_0_1px_rgba(30,64,175,0.7)] transition-all duration-[120ms] ease-out hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(37,99,235,0.4),0_0_0_1px_rgba(30,64,175,0.75)] hover:brightness-105 active:translate-y-0 active:shadow-[0_6px_18px_rgba(37,99,235,0.35),0_0_0_1px_rgba(30,64,175,0.8)]"
			>
				Start practice
			</button>
		</section>
	);
}

export default SetupView;
