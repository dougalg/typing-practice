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
			<Heading
				level={1}
				className="mb-8 [text-shadow:4px_4px_0_var(--color-coin)]"
			>
				Typing Practice
			</Heading>
			<main className="flex flex-col gap-8">
				{main}
				{sidebar}
			</main>
		</>
	);
};
