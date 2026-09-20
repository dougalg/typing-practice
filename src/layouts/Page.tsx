import type { ReactElement } from "react";
import { Heading } from "../components/Heading";

type PageLayoutProps = {
	main: ReactElement;
	sidebar: ReactElement;
};

export const PageLayout = ({ main, sidebar }: PageLayoutProps) => {
	return (
		<>
			<Heading level={1}>Typing Practice</Heading>
			<main className="grid grid-cols-12 gap-4">
				<div className="col-span-9">{main}</div>
				<div className="col-span-3">{sidebar}</div>
			</main>
		</>
	);
};
