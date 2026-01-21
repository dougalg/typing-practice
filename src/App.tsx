import { useMemo, useState } from "react";
import "./style.css";
import type { TypingState } from "./types";
import SetupView from "./views/SetupView";
import PracticeView from "./views/PracticeView";

function App() {
	const [sourceText, setSourceText] = useState("");
	const [typingState, setTypingState] = useState<TypingState>("idle");
	const [setupError, setSetupError] = useState("");

	const targetText = useMemo(() => sourceText.trimEnd(), [sourceText]);

	const handleStart = () => {
		if (!targetText) {
			setSetupError("Please enter some text to practice first.");
			return;
		}
		setTypingState("running");
		setSetupError("");
	};

	const handleSourceKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleStart();
		}
	};

	const handleReset = () => {
		setTypingState("idle");
		setSetupError("");
	};

	if (typingState === "idle") {
		return (
			<SetupView
				sourceText={sourceText}
				errorMessage={setupError}
				onChangeText={setSourceText}
				onKeyDown={handleSourceKeyDown}
				onStart={handleStart}
			/>
		);
	}

	return (
		<PracticeView
			targetText={targetText}
			typingState={typingState}
			onFinish={() => setTypingState("finished")}
			onReset={handleReset}
		/>
	);
}
export default App;
