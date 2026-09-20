import { SavedTextItem } from "../components/SavedTextItem";
import { useLiveQuery } from "dexie-react-hooks";
import { savedTextsDb, type SavedText } from "../features/savedItems/db";
import { Heading } from "../components/Heading";

export interface SidebarProps {
	onLoadRequest: (item: SavedText) => void;
}

export const Sidebar = ({ onLoadRequest }: SidebarProps) => {
	const savedTexts = useLiveQuery(() =>
		savedTextsDb.savedTexts.limit(5).toArray(),
	);
	return (
		<section className="rounded-[14px] border border-slate-300/40 p-5 pb-6">
			<Heading level={2}>Saved Texts</Heading>
			<div className="flex flex-col gap-2">
				{savedTexts &&
					savedTexts.map((item) => (
						<SavedTextItem
							{...item}
							onLoadRequest={() => onLoadRequest(item)}
						/>
					))}
			</div>
		</section>
	);
};
