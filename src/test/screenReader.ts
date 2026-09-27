import { Virtual } from "@guidepup/virtual-screen-reader";

/** Upper bound on steps, so a container that never ends cannot hang a test. */
const MAX_STEPS = 5000;

/**
 * Reads `container` once from start to end with a virtual screen reader and
 * returns what it spoke, in order: roles, names, text, and the "end of ..."
 * markers.
 *
 * Asserting on this log checks what assistive technology announces and in what
 * order (reading order, accessible names), which axe cannot. Uses a fresh
 * `Virtual` instance per call so no state leaks between tests.
 *
 * The reader wraps back to the first item after the last one (there is no
 * "end of document" unless the container is the whole body), so the read stops
 * when it is back on the first item's node with the first item's phrase.
 */
export async function spokenPhrases(container: Node): Promise<string[]> {
	const reader = new Virtual();
	await reader.start({ container });
	try {
		const firstNode = reader.activeNode;
		const firstPhrase = await reader.lastSpokenPhrase();
		for (let step = 0; step < MAX_STEPS; step += 1) {
			if ((await reader.lastSpokenPhrase()) === "end of document") break;
			await reader.next();
			const wrapped =
				reader.activeNode === firstNode &&
				(await reader.lastSpokenPhrase()) === firstPhrase;
			if (wrapped) return (await reader.spokenPhraseLog()).slice(0, -1);
		}
		return await reader.spokenPhraseLog();
	} finally {
		await reader.stop();
	}
}
