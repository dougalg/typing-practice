import { virtual } from "@guidepup/virtual-screen-reader";

const MAX_STEPS = 10_000;

// Guidepup rebuilds the accessibility tree from the live DOM on every step and
// locates its cursor by node identity, so a mutation mid-traversal can strand
// the cursor and spin forever. Never call this from a `.concurrent` test, and
// let async rendering settle first. The step cap turns a stranded cursor into a
// fast failure instead of an unbounded log that SIGABRTs the Vitest worker.
export const readingOrder = async (
	container: HTMLElement = document.body,
): Promise<string> => {
	await virtual.start({ container });
	try {
		let steps = 0;
		while ((await virtual.lastSpokenPhrase()) !== "end of document") {
			if (++steps > MAX_STEPS) {
				throw new Error(
					`readingOrder exceeded ${MAX_STEPS} steps — the DOM is probably mutating mid-traversal.`,
				);
			}
			await virtual.next();
		}
		return (await virtual.spokenPhraseLog()).join("\n");
	} finally {
		await virtual.stop();
	}
};
