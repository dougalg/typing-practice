import type { MouseEventHandler } from "react";

export interface SavedTextItemProps {
	id: number;
	text: string;
	dateCreated: Date;
	dateModified: Date;
	numberOfLoads: number;
	numberOfCompletes: number;
	onLoadRequest: MouseEventHandler;
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
	dateStyle: "medium",
});

export const SavedTextItem = (props: SavedTextItemProps) => {
	return (
		<div>
			<p className="line-clamp-3">{props.text}</p>
			<p>Last Practiced On: </p>
			<p>{dateFormatter.format(props.dateCreated)}</p>
			<button onClick={props.onLoadRequest}>Load</button>
		</div>
	);
};
