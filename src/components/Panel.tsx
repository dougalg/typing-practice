import type { ComponentProps } from "react";

/** Card surface shared by the main views and the sidebar. */
export const Panel = ({ className, ...props }: ComponentProps<"section">) => (
	<section
		{...props}
		className={[
			"border-line bg-surface min-w-0 rounded-2xl border p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-12px_rgb(15_23_42/0.14)] sm:p-7",
			className,
		]
			.filter(Boolean)
			.join(" ")}
	/>
);

/** Small uppercase section label. */
export const Eyebrow = ({ className, ...props }: ComponentProps<"h2">) => (
	<h2
		{...props}
		className={[
			"text-ink-muted m-0 text-xs font-semibold tracking-[0.12em] uppercase",
			className,
		]
			.filter(Boolean)
			.join(" ")}
	/>
);
