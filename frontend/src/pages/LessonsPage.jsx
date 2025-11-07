import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import LessonCard from "../components/LessonCard";
import lessons from "../../data/lessons.json";
import { useLessonProgress } from "../context/LessonProgressContext";

const getQuestionCount = (lesson) => {
	if (Array.isArray(lesson.questions) && lesson.questions.length > 0) {
		return lesson.questions.length;
	}
	return lesson.questionCount ?? 0;
};

export default function LessonsPage() {
	const navigate = useNavigate();
	const { lessons: lessonState } = useLessonProgress();

	const lessonsWithProgress = useMemo(
		() =>
			lessons.map((lesson) => {
				const stored = lessonState[lesson.id] ?? { progress: 0 };
				const progress = stored.progress ?? 0;
				return {
					...lesson,
					progress,
					questionCount: getQuestionCount(lesson),
				};
			}),
		[lessonState],
	);

	const handleOpenLesson = (lesson) => {
		navigate(`/lessons/${lesson.id}`);
	};

	return (
		<div className="px-6 pt-6 pb-24 sm:px-8">
			<div className="mb-6">
				<h1 className="text-2xl font-extrabold tracking-tight text-foreground">
					Your Lessons
				</h1>
				<p className="text-sm text-foreground-subtle">
					Pick up where you left off or explore new lessons!
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6">
				{lessonsWithProgress.map((lesson) => {
					const progress = lesson.progress ?? 0;
					const actionLabel =
						progress <= 0 ? "Start" : progress >= 100 ? "Review" : "Continue";
					return (
						<LessonCard
							key={lesson.id}
							lesson={lesson}
							progress={progress}
							actionLabel={actionLabel}
							onAction={handleOpenLesson}
						/>
					);
				})}
			</div>
		</div>
	);
}
