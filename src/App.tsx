import { useCallback, useMemo, useState } from "react";
import "./style.css";
import type { TypingState } from "./types";
import SetupView from "./views/SetupView";
import PracticeView from "./views/PracticeView";
import { PageLayout } from "./layouts/Page";
import { Sidebar } from "./views/Sidebar";
import {
	normalizeText,
	recordCompletion,
	recordPractice,
} from "./features/savedItems/history";

interface Session {
	text: string;
	runId: number;
}

function App() {
	const [typingState, setTypingState] = useState<TypingState>("idle");
	const [session, setSession] = useState<Session>({ text: "", runId: 0 });
	const [saveError, setSaveError] = useState(false);

	const startSession = useCallback((text: string) => {
		setSession((prev) => ({ text, runId: prev.runId + 1 }));
		setTypingState("running");
		recordPractice(text).then((result) => {
			if (!result.ok) setSaveError(true);
		});
	}, []);

	const handleLoadRequest = useCallback(
		(item: { text: string }) => {
			startSession(item.text);
		},
		[startSession],
	);

	const handleFinish = useCallback(() => {
		// Guards against a text being counted twice if onFinish is ever invoked
		// more than once for the same session (PracticeView's own guards should
		// already prevent this, but recordCompletion is not itself idempotent).
		setTypingState((prev) => {
			if (prev === "finished") return prev;
			recordCompletion(session.text).then((result) => {
				if (!result.ok) setSaveError(true);
			});
			return "finished";
		});
	}, [session.text]);

	return (
		<PageLayout
			main={
				<AppInner
					typingState={typingState}
					setTypingState={setTypingState}
					session={session}
					onStartSession={startSession}
					onFinish={handleFinish}
				/>
			}
			sidebar={
				<Sidebar onLoadRequest={handleLoadRequest} saveError={saveError} />
			}
		/>
	);
}

interface AppInnerProps {
	typingState: TypingState;
	setTypingState: (typingState: TypingState) => void;
	session: Session;
	onStartSession: (text: string) => void;
	onFinish: () => void;
}

function AppInner({
	typingState,
	setTypingState,
	session,
	onStartSession,
	onFinish,
}: AppInnerProps) {
	const [sourceText, setSourceText] = useState("");
	const [setupError, setSetupError] = useState("");

	const targetText = useMemo(() => normalizeText(sourceText), [sourceText]);

	const handleStart = () => {
		if (!targetText) {
			setSetupError("Please enter some text to practice first.");
			return;
		}
		onStartSession(targetText);
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
		setSourceText("");
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
			key={session.runId}
			targetText={session.text}
			typingState={typingState}
			onFinish={onFinish}
			onReset={handleReset}
		/>
	);
}
export default App;
