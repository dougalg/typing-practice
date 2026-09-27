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
			className="pixel-panel p-5 pb-6 sm:p-6"
		>
			<Heading id={HEADING_ID} level={2} className="mb-4">
				Practice History
			</Heading>

			{state.status === "error" && (
				<p role="alert" className="text-miss mb-3 font-bold">
					Practice history could not be loaded.
				</p>
			)}
			{saveError && (
				<p role="alert" className="text-miss mb-3 font-bold">
					Your practice history could not be saved. You can keep practicing.
				</p>
			)}

			{state.status === "ready" && state.entries.length === 0 && (
				<p className="text-muted">
					No practice history yet. Texts you practice will appear here.
				</p>
			)}

			{/* Explicit role: Safari drops list semantics when list-style is none. */}
			{state.status === "ready" && state.entries.length > 0 && (
				<ul role="list" className="grid gap-4 sm:grid-cols-2">
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
