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
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-3 font-pixel leading-none font-normal uppercase whitespace-nowrap select-none",
	"focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-focus",
	"disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

const sizeClassName: Record<ButtonSize, string> = {
	sm: "h-9 px-3 text-xs",
	md: "h-11 px-5 text-xs sm:text-sm",
};

// Raised variants carry a hard drop shadow; pressing drops the button into it.
const raised = [
	"shadow-[4px_4px_0_var(--color-line)]",
	"active:shadow-none motion-safe:active:translate-x-1 motion-safe:active:translate-y-1",
	"disabled:shadow-[4px_4px_0_var(--color-line)] motion-safe:disabled:active:translate-none",
].join(" ");

const variantClassName: Record<ButtonVariant, string> = {
	primary: [
		raised,
		"border-line bg-coin text-ink",
		"hover:bg-coin-hover",
		"disabled:hover:bg-coin",
	].join(" "),
	secondary: [
		raised,
		"border-line bg-surface-raised text-ink",
		"hover:bg-accent-soft",
		"disabled:hover:bg-surface-raised",
	].join(" "),
	ghost: [
		"border-transparent bg-transparent text-ink-muted",
		"hover:bg-accent-soft hover:text-ink",
		"disabled:hover:bg-transparent disabled:hover:text-ink-muted",
	].join(" "),
};
