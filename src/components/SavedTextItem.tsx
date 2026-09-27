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
		<div className="border-ink bg-paper flex h-full flex-col gap-2 border-3 p-4">
			<p id={previewId} className="m-0 line-clamp-3 font-bold wrap-break-word">
				{props.text}
			</p>
			<p className="text-muted m-0 text-sm">
				Last practiced: {dateFormatter.format(props.dateModified)}
			</p>
			<p className="text-muted m-0 text-sm">
				Practiced {props.numberOfCompletes}{" "}
				{props.numberOfCompletes === 1 ? "time" : "times"}
			</p>
			<button
				id={loadId}
				aria-labelledby={`${loadId} ${previewId}`}
				className="pixel-btn mt-auto self-start"
				onClick={props.onLoadRequest}
			>
				Load
			</button>
		</div>
	);
};
