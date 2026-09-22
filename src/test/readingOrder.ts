import { virtual } from "@guidepup/virtual-screen-reader";

// `virtual` is a module-level singleton, so tests calling this must not run
// concurrently within a file — their start/stop cycles would interleave.
export const readingOrder = async (
	container: HTMLElement = document.body,
): Promise<string> => {
	await virtual.start({ container });
	try {
		while ((await virtual.lastSpokenPhrase()) !== "end of document") {
			await virtual.next();
		}
		return (await virtual.spokenPhraseLog()).join("\n");
	} finally {
		await virtual.stop();
	}
};
