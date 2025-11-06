import LessonCard from "../components/LessonCard";

import lessons from "../../data/lessons.json";

export default function LessonsPage() {
	const handleContinue = (lesson) => {
		console.log("Continue lesson:", lesson.id);
	};

	return (
		<div className="px-6 pt-6 pb-24">
			<div className="mb-4">
				<h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
					Your Lessons
				</h1>
				<p className="text-zinc-400 text-sm">
					Pick up where you left off or explore new lessons!
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4">
				{lessons.map((lesson) => (
					<LessonCard key={lesson.id} lesson={lesson} onContinue={handleContinue} />
				))}
			</div>
		</div>
	);
}
