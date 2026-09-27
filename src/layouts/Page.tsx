import type { ReactElement } from "react";
import { Heading } from "../components/Heading";

type PageLayoutProps = {
	main: ReactElement;
	sidebar: ReactElement;
};

/** A single column at every width: the practice area, then history below it. */
export const PageLayout = ({ main, sidebar }: PageLayoutProps) => {
	return (
		<>
			<header className="mb-8 flex items-center gap-3">
				<span
					aria-hidden="true"
					className="border-line bg-accent text-on-accent grid size-11 shrink-0 place-items-center border-3 shadow-[3px_3px_0_var(--color-line)]"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="square"
						className="size-6"
					>
						<rect x="2.5" y="6" width="19" height="12" />
						<path d="M6 10h1M9.5 10h1M13.5 10h1M17 10h1M8 14h8" />
					</svg>
				</span>
				<Heading
					level={1}
					className="[text-shadow:4px_4px_0_var(--color-coin)]"
				>
					Typing Practice
				</Heading>
			</header>
			{/* min-w-0 lets each item shrink below its content's min width, so
			    long unbroken text wraps instead of overflowing the page. */}
			<div className="flex flex-col gap-6">
				<main className="min-w-0">{main}</main>
				<div className="min-w-0">{sidebar}</div>
			</div>
		</>
	);
};
