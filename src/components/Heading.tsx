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
	const className = `${classNameByLevel[level]} ${outerClassName}`;
	return createElement(tag, { ...props, className }, children);
};

const classNameByLevel = {
	1: `m-0 text-[2.2rem] tracking-[-0.03em] sm:text-[1.8rem]`,
	2: `m-0 text-[1.8rem] tracking-[-0.03em] sm:text-[1.4rem]`,
	3: `m-0 text-[1.6rem] tracking-[-0.03em] sm:text-[1.2rem]`,
	4: `m-0 text-[1.4rem] tracking-[-0.03em] sm:text-[1rem]`,
	5: `m-0 text-[1.2rem] tracking-[-0.03em] sm:text-[0.8rem]`,
	6: `m-0 text-[1rem] tracking-[-0.03em] sm:text-[0.6rem]`,
};
