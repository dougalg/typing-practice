import { SavedTextItem } from "../components/SavedTextItem";
import { Eyebrow, Panel } from "../components/Panel";
import { useHistory } from "../features/savedItems/history";
import type { SavedText } from "../types";

export interface SidebarProps {
	onLoadRequest: (item: SavedText) => void;
	/** Set by App when a history write failed; shown as an alert. */
	saveError?: boolean;
}

const HEADING_ID = "practice-history-heading";

const alertClassName =
	"bg-danger-soft text-danger m-0 mb-3 rounded-lg px-3 py-2 text-sm font-medium";

export const Sidebar = ({ onLoadRequest, saveError }: SidebarProps) => {
	const state = useHistory();

	return (
		<Panel aria-labelledby={HEADING_ID} className="sm:p-5">
			<Eyebrow id={HEADING_ID} className="mb-4">
				Practice History
			</Eyebrow>

			{state.status === "error" && (
				<p role="alert" className={alertClassName}>
					Practice history could not be loaded.
				</p>
			)}
			{saveError && (
				<p role="alert" className={alertClassName}>
					Your practice history could not be saved. You can keep practicing.
				</p>
			)}

			{state.status === "ready" && state.entries.length === 0 && (
				<p className="border-line-strong text-ink-muted m-0 rounded-xl border border-dashed px-4 py-6 text-center text-sm">
					No practice history yet. Texts you practice will appear here.
				</p>
			)}

			{state.status === "ready" && state.entries.length > 0 && (
				<ul className="m-0 -mr-2 flex max-h-[70vh] list-none flex-col gap-3 overflow-y-auto p-0 pr-2">
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
		</Panel>
	);
};
