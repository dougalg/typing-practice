import { createElement, type ComponentProps } from "react";

export type HeadingProps = {
	level: 1 | 2 | 3 | 4 | 5 | 6;
} & ComponentProps<"h1">;

export const Heading = ({
	level,
	children,
	className: outerClassName,
	...props
}: HeadingProps) => {
	const tag: `H${typeof level}` = `H${level}`;
	const className = [classNameByLevel[level], outerClassName]
		.filter(Boolean)
		.join(" ");
	return createElement(tag, { ...props, className }, children);
};

// Mobile-first: the base size is for small screens, `sm:` scales up.
const classNameByLevel = {
	1: `m-0 text-[1.8rem] leading-tight font-bold tracking-[-0.03em] text-balance sm:text-[2.2rem]`,
	2: `m-0 text-[1.4rem] leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[1.8rem]`,
	3: `m-0 text-[1.2rem] leading-snug font-semibold tracking-[-0.01em] sm:text-[1.6rem]`,
	4: `m-0 text-[1rem] leading-snug font-semibold sm:text-[1.4rem]`,
	5: `m-0 text-[0.9rem] leading-snug font-semibold sm:text-[1.2rem]`,
	6: `m-0 text-[0.85rem] leading-snug font-semibold sm:text-[1rem]`,
};
