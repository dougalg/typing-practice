/**
 * Shared text-field styling: a thick ink border with an inset "bevel". Focus
 * uses a real outline so it remains visible in forced-colors / Windows High
 * Contrast mode.
 */
export const fieldClassName = [
	"block w-full min-w-0 border-3 border-line bg-surface px-4 py-3 text-ink shadow-[inset_3px_3px_0_var(--color-track)]",
	"placeholder:text-ink-muted",
	"focus:border-accent focus:outline-4 focus:outline-offset-2 focus:outline-transparent",
	"focus-visible:outline-focus",
	"disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:shadow-none",
].join(" ");
