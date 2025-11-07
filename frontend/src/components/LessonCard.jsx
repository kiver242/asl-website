import Card from "./ui/Card";
import ProgressBar from "./ui/ProgressBar";
import { ChevronRight, Image as ImageIcon, Sparkles } from "lucide-react";

const formatQuestionLabel = (count) => {
	if (!count) {
		return "No questions yet";
	}
	return `${count} ${count === 1 ? "question" : "questions"}`;
};

export default function LessonCard({
	lesson,
	progress = 0,
	actionLabel = "Start",
	onAction,
}) {
	const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
	const questionCount = lesson.questionCount ?? lesson.questions?.length ?? 0;
	const points = lesson.points ?? 0;
	const statusLabel = safeProgress >= 100 ? "Completed" : `${safeProgress}% complete`;

	return (
		<Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
			<div className="grid h-32 w-full place-items-center overflow-hidden rounded-xl bg-surface-strong sm:h-36 sm:w-36 md:h-40 md:w-40">
				{lesson.imageUrl ? (
					<img src={lesson.imageUrl} alt="" className="h-full w-full object-cover" />
				) : (
					<ImageIcon className="h-8 w-8 text-foreground-dim" />
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="truncate text-lg font-semibold text-foreground">
							{lesson.title}
						</h3>
						<p className="text-sm text-foreground-subtle">{statusLabel}</p>
					</div>
					<div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground-subtle">
						<Sparkles className="h-4 w-4 text-accent" />
						<span>{points} pts</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="grow">
						<ProgressBar value={safeProgress} />
					</div>
					<span className="text-xs font-medium text-foreground-subtle">
						{formatQuestionLabel(questionCount)}
					</span>
				</div>

				<div className="flex justify-start pt-8">
					<button
						type="button"
						onClick={() => onAction?.(lesson)}
						className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-strong"
					>
						{actionLabel} <ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>
		</Card>
	);
}
