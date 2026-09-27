export type TypingState = "idle" | "running" | "finished";
export type TypedMark = "correct" | "incorrect" | null;

export interface SavedText {
	id: number;
	dateCreated: Date;
	/** Last practiced: refreshed every time a session starts with this text. */
	dateModified: Date;
	/** Loaded count: how many sessions have been started with this text, from Start or Load. Shown as "Loaded: N". */
	numberOfLoads: number;
	/** Completed count: how many sessions have typed this text through to the end, with or without mistakes. Shown as "Completed: N". */
	numberOfCompletes: number;
	text: string;
}
