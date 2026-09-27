import type { ReactElement } from "react";
import { Heading } from "../components/Heading";

type PageLayoutProps = {
	main: ReactElement;
	sidebar: ReactElement;
};

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
			{/* minmax(0, …) lets columns shrink below their content's min width,
			    so long unbroken text wraps instead of overflowing the page. */}
			<div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
				<main className="min-w-0">{main}</main>
				<div className="min-w-0">
					{sidebar}
				</div>
			</div>
		</>
	);
};
