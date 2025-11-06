import LessonCard from "../components/LessonCard";

import lessons from "../../data/lessons.json";

export default function LessonsPage() {
	const handleContinue = (lesson) => {
		console.log("Continue lesson:", lesson.id);
	};

	return (
		<div className="px-10 pt-2 pb-24">
			<div className="mb-4">
				<h1 className="text-2xl font-extrabold tracking-tight text-foreground">
					Your Lessons
				</h1>
				<p className="text-sm text-foreground-subtle">
					Pick up where you left off or explore new lessons!
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 pt-4">
				{lessons.map((lesson) => (
					<LessonCard key={lesson.id} lesson={lesson} onContinue={handleContinue} />
				))}
			</div>
		</div>
	);
}
