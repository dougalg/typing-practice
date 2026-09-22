import { SavedTextItem } from "../components/SavedTextItem";
import { Heading } from "../components/Heading";
import { useHistory } from "../features/savedItems/history";
import type { SavedText } from "../types";

export interface SidebarProps {
	onLoadRequest: (item: SavedText) => void;
	/** Set by App when a history write failed; shown as an alert. */
	saveError?: boolean;
}

const HEADING_ID = "practice-history-heading";

export const Sidebar = ({ onLoadRequest, saveError }: SidebarProps) => {
	const state = useHistory();

	return (
		<section
			aria-labelledby={HEADING_ID}
			className="rounded-[14px] border border-slate-300/40 p-5 pb-6"
		>
			<Heading id={HEADING_ID} level={2}>
				Practice History
			</Heading>

			{state.status === "error" && (
				<p role="alert">Practice history could not be loaded.</p>
			)}
			{saveError && (
				<p role="alert">
					Your practice history could not be saved. You can keep practicing.
				</p>
			)}

			{state.status === "ready" && state.entries.length === 0 && (
				<p>No practice history yet. Texts you practice will appear here.</p>
			)}

			{state.status === "ready" && state.entries.length > 0 && (
				<ul className="flex flex-col gap-2">
					{state.entries.map((item) => (
						<li key={item.id}>
							<SavedTextItem
								{...item}
								onLoadRequest={() => onLoadRequest(item)}
							/>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
