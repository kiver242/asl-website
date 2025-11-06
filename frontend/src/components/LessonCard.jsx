import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";
import { ChevronRight, Image as ImageIcon } from "lucide-react";

export default function LessonCard({ lesson, onContinue }) {
	return (
		<Card className="p-4 flex items-center gap-4">
			<div className="h-40 w-40 rounded-xl bg-zinc-800 grid place-items-center overflow-hidden">
				{lesson.imageUrl ? (
					<img
						src={lesson.imageUrl}
						alt="cover"
						className="h-full w-full object-cover"
					/>
				) : (
					<ImageIcon className="h-7 w-7 text-zinc-500" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-zinc-100 text-lg font-semibold truncate">
						{lesson.title}
					</h3>
					<span className="text-xs text-zinc-400 whitespace-nowrap">
						{lesson.units} units
					</span>
				</div>

				<div className="mt-3 flex items-center gap-3">
					<ProgressBar value={lesson.progress} />
					<span className="text-xs text-zinc-400 w-10 text-right">
						{lesson.progress}%
					</span>
				</div>

				<button
					onClick={() => onContinue?.(lesson)}
					className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
				>
					Continue <ChevronRight className="h-4 w-4" />
				</button>
			</div>
		</Card>
	);
}
