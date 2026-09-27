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
	const className = `${classNameByLevel[level]} ${outerClassName ?? ""}`;
	return createElement(tag, { ...props, className }, children);
};

// Press Start 2P is drawn on an 8px grid, so sizes stay on multiples of 8px
// where possible to keep the pixels crisp.
const classNameByLevel = {
	1: `m-0 font-pixel text-2xl leading-tight font-normal sm:text-[2rem]`,
	2: `m-0 font-pixel text-base leading-snug font-normal uppercase`,
	3: `m-0 font-pixel text-sm leading-snug font-normal`,
	4: `m-0 font-pixel text-xs leading-snug font-normal`,
	5: `m-0 font-mono text-base font-bold`,
	6: `m-0 font-mono text-sm font-bold`,
};
