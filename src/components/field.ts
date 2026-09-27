/**
 * Shared text-field styling. Focus uses a real outline (plus a soft ring) so it
 * remains visible in forced-colors / Windows High Contrast mode.
 */
export const fieldClassName = [
	"block w-full min-w-0 rounded-xl border border-line-strong bg-surface-sunken px-4 py-3 text-ink",
	"transition-[border-color,box-shadow,background-color] duration-150 ease-out",
	"placeholder:text-ink-muted/80",
	"hover:border-ink-muted/60",
	"focus:border-accent focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent)] focus:outline-2 focus:outline-offset-0 focus:outline-transparent",
	"focus-visible:outline-focus",
	"disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line-strong",
].join(" ");
