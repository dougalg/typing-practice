export type TypingState = "idle" | "running" | "finished";
export type TypedMark = "correct" | "incorrect" | null;

export interface SavedText {
	id: number;
	dateCreated: Date;
	/** Last practiced: refreshed every time a session starts with this text. */
	dateModified: Date;
	/** Legacy, unused: how many sessions earlier versions started with this text. No longer read, shown or updated. */
	numberOfLoads: number;
	/** Practice count: how many sessions have typed this text through to the end, with or without mistakes. */
	numberOfCompletes: number;
	text: string;
}
