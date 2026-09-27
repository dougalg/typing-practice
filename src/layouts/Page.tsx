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
					className="bg-accent text-on-accent shadow-accent/30 grid size-10 shrink-0 place-items-center rounded-xl shadow-md"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						strokeLinecap="round"
						className="size-6"
					>
						<rect x="2.5" y="6" width="19" height="12" rx="2.5" />
						<path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
					</svg>
				</span>
				<Heading level={1}>Typing Practice</Heading>
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
