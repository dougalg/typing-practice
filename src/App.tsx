import { useCallback, useMemo, useState } from "react";
import "./style.css";
import type { TypingState } from "./types";
import SetupView from "./views/SetupView";
import PracticeView from "./views/PracticeView";
import { PageLayout } from "./layouts/Page";
import { Sidebar } from "./views/Sidebar";
import { savedTextsDb } from "./features/savedItems/db";

function App() {
	const [typingState, setTypingState] = useState<TypingState>("idle");
	const handleLoadRequest = useCallback(() => {
		setTypingState("running");
	}, []);
	return (
		<PageLayout
			main={<AppInner typingState={typingState} setTypingState={setTypingState} />}
			sidebar={<Sidebar onLoadRequest={handleLoadRequest} />}
		/>
	);
}

interface AppInnerProps {
	typingState: TypingState;
	setTypingState: (typingState: TypingState) => void;
}

function AppInner({ typingState, setTypingState }: AppInnerProps) {
	const [sourceText, setSourceText] = useState("");
	const [setupError, setSetupError] = useState("");

	const targetText = useMemo(() => sourceText.trimEnd(), [sourceText]);

	const handleStart = () => {
		if (!targetText) {
			setSetupError("Please enter some text to practice first.");
			return;
		}
		savedTextsDb.savedTexts.add({
			text: targetText,
			dateCreated: new Date(),
			dateModified: new Date(),
			numberOfLoads: 1,
			numberOfCompletes: 0,
		});
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
