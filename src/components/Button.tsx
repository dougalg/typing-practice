import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export type ButtonProps = {
	variant?: ButtonVariant;
	size?: ButtonSize;
} & ComponentProps<"button">;

export const Button = ({
	variant = "secondary",
	size = "md",
	type = "button",
	className,
	...props
}: ButtonProps) => {
	return (
		<button
			{...props}
			type={type}
			className={[
				base,
				sizeClassName[size],
				variantClassName[variant],
				className,
			]
				.filter(Boolean)
				.join(" ")}
		/>
	);
};

// Focus uses a real outline (not a box-shadow) so it stays visible in
// forced-colors / Windows High Contrast mode.
const base = [
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap select-none",
	"transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
	"motion-safe:active:translate-y-px",
	"disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-safe:disabled:active:translate-y-0",
].join(" ");

const sizeClassName: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-sm",
	md: "h-11 px-5 text-[0.95rem]",
};

const variantClassName: Record<ButtonVariant, string> = {
	primary: [
		"border-transparent bg-accent text-on-accent shadow-sm shadow-accent/30",
		"hover:bg-accent-hover hover:shadow-md hover:shadow-accent/30",
		"active:bg-accent-active active:shadow-sm",
		"disabled:hover:bg-accent",
	].join(" "),
	secondary: [
		"border-line-strong bg-surface-raised text-ink shadow-xs",
		"hover:border-accent/50 hover:bg-accent-soft hover:text-accent-ink",
		"active:bg-accent-soft/70",
		"disabled:hover:border-line-strong disabled:hover:bg-surface-raised disabled:hover:text-ink",
	].join(" "),
	ghost: [
		"border-transparent bg-transparent text-ink-muted",
		"hover:bg-accent-soft hover:text-accent-ink",
		"active:bg-accent-soft/70",
		"disabled:hover:bg-transparent disabled:hover:text-ink-muted",
	].join(" "),
};
