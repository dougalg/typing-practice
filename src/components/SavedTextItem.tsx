import { useId, type MouseEventHandler } from "react";
import type { SavedText } from "../types";
import { Button } from "./Button";

export type SavedTextItemProps = Pick<
	SavedText,
	| "id"
	| "text"
	| "dateCreated"
	| "dateModified"
	| "numberOfLoads"
	| "numberOfCompletes"
> & {
	onLoadRequest: MouseEventHandler<HTMLButtonElement>;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
	dateStyle: "medium",
});

export const SavedTextItem = (props: SavedTextItemProps) => {
	const previewId = useId();
	const loadId = useId();

	return (
		<div className="border-line bg-surface-sunken min-w-0 border-3 p-4">
			<p
				id={previewId}
				className="text-ink m-0 line-clamp-3 leading-relaxed font-bold [overflow-wrap:anywhere]"
			>
				{props.text}
			</p>
			<div className="mt-3 flex items-end justify-between gap-3">
				<div className="text-ink-muted min-w-0 text-sm leading-relaxed">
					<p className="m-0">
						Last practiced: {dateFormatter.format(props.dateModified)}
					</p>
					<p className="m-0">
						Practiced {props.numberOfCompletes}{" "}
						{props.numberOfCompletes === 1 ? "time" : "times"}
					</p>
				</div>
				<Button
					id={loadId}
					aria-labelledby={`${loadId} ${previewId}`}
					variant="secondary"
					size="sm"
					onClick={props.onLoadRequest}
				>
					Load
				</Button>
			</div>
		</div>
	);
};
