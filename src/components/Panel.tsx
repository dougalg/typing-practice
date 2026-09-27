import type { ComponentProps } from "react";

/** Chunky bordered card with a hard, unblurred drop shadow. */
export const Panel = ({ className, ...props }: ComponentProps<"section">) => (
	<section
		{...props}
		className={[
			"border-line bg-surface min-w-0 border-4 p-5 shadow-[6px_6px_0_var(--color-line)] sm:p-7",
			className,
		]
			.filter(Boolean)
			.join(" ")}
	/>
);

/** Small uppercase section label, in the pixel font. */
export const Eyebrow = ({ className, ...props }: ComponentProps<"h2">) => (
	<h2
		{...props}
		className={[
			"font-pixel text-ink m-0 text-sm leading-snug font-normal uppercase sm:text-base",
			className,
		]
			.filter(Boolean)
			.join(" ")}
	/>
);
