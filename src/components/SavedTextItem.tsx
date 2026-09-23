import { useId, type MouseEventHandler } from "react";
import type { SavedText } from "../types";

export type SavedTextItemProps = Pick<
	SavedText,
	| "id"
	| "text"
	| "dateCreated"
	| "dateModified"
	| "numberOfLoads"
	| "numberOfCompletes"
> & {
	onLoadRequest: MouseEventHandler;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
	dateStyle: "medium",
});

export const SavedTextItem = (props: SavedTextItemProps) => {
	const previewId = useId();
	const loadId = useId();

	return (
		<div>
			<p id={previewId} className="line-clamp-3">
				{props.text}
			</p>
			<p>Last practiced: {dateFormatter.format(props.dateModified)}</p>
			<p>
				Practiced {props.numberOfCompletes}{" "}
				{props.numberOfCompletes === 1 ? "time" : "times"}
			</p>
			<button
				id={loadId}
				aria-labelledby={`${loadId} ${previewId}`}
				className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
				onClick={props.onLoadRequest}
			>
				Load
			</button>
		</div>
	);
};
