/**
 * Trims trailing whitespace only. An empty result means there is nothing to
 * practice (specs/001-practice-history FR-003).
 */
export function normalizeText(input: string): string {
	return input.trimEnd();
}
