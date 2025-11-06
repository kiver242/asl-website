import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";
import { ChevronRight, Image as ImageIcon } from "lucide-react";

export default function LessonCard({ lesson, onContinue }) {
	return (
		<Card className="flex items-center gap-4 p-4">
			<div className="grid h-40 w-40 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-strong">
				{lesson.imageUrl ? (
					<img
						src={lesson.imageUrl}
						alt="cover"
						className="h-full w-full object-cover"
					/>
				) : (
					<ImageIcon className="h-7 w-7 text-foreground-dim" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-3">
					<h3 className="truncate text-lg font-semibold text-foreground">
						{lesson.title}
					</h3>
					<span className="whitespace-nowrap text-xs text-foreground-subtle">
						{lesson.units} units
					</span>
				</div>

				<div className="mt-3 flex items-center gap-3">
					<ProgressBar value={lesson.progress} />
					<span className="w-10 text-right text-xs text-foreground-subtle">
						{lesson.progress}%
					</span>
				</div>

				<button
					onClick={() => onContinue?.(lesson)}
					className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent"
				>
					Continue <ChevronRight className="h-4 w-4" />
				</button>
			</div>
		</Card>
	);
}
