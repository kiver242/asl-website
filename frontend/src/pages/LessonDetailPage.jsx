import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Sparkles } from "lucide-react";
import lessonsData from "../../data/lessons.json";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import { useLessonProgress } from "../context/LessonProgressContext";
import SpellYourNameLesson from "./SpellYourNameLesson";

const getLessonById = (lessonId) =>
	lessonsData.find((lesson) => Number(lesson.id) === Number(lessonId));

const questionCountFor = (lesson) => {
	if (!lesson) {
		return 0;
	}
	if (Array.isArray(lesson.questions) && lesson.questions.length > 0) {
		return lesson.questions.length;
	}
	return lesson.questionCount ?? 0;
};

function TextQuestion({ question, value, onChange }) {
	return (
		<div className="space-y-4">
			<p className="text-base text-foreground-subtle">{question.prompt}</p>
			<div className="space-y-2">
				<label
					className="text-sm font-medium text-foreground-soft"
					htmlFor={question.id}
				>
					Your answer
				</label>
				<input
					id={question.id}
					type="text"
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder="Type here..."
					className="w-full rounded-xl border border-border-soft bg-surface-strong px-4 py-2 text-foreground outline-none ring-2 ring-transparent transition focus:border-accent focus:ring-accent-soft"
				/>
			</div>
		</div>
	);
}

function CameraQuestion({ question }) {
	return (
		<div className="space-y-4">
			<p className="text-base text-foreground-subtle">{question.prompt}</p>
			<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-soft bg-surface-muted/70 p-6 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-strong">
					<Camera className="h-7 w-7 text-accent" />
				</div>
				<p className="text-sm text-foreground-subtle">
					We&apos;ll guide you through each letter once camera tracking is ready. For
					now, walk through the motions and imagine spelling it out.
				</p>
			</div>
		</div>
	);
}

function MascotPanel() {
	return (
		<div className="flex items-center justify-end lg:self-center">
			<div className="grid h-60 w-60 place-items-center rounded-2xl bg-surface-strong text-sm font-medium text-foreground-muted">
				Mascot
			</div>
		</div>
	);
}

export default function LessonDetailPage() {
	const navigate = useNavigate();
	const { lessonId } = useParams();
	const lesson = useMemo(() => getLessonById(lessonId), [lessonId]);

	const {
		lessons: lessonState,
		startLesson,
		setLessonProgress,
		completeLesson,
	} = useLessonProgress();

	const savedLesson = lesson
		? lessonState[lesson.id] ?? { progress: 0 }
		: { progress: 0 };
	const questionCount = questionCountFor(lesson);

	const [responses, setResponses] = useState({});
	const [isComplete, setIsComplete] = useState(savedLesson.progress >= 100);
	const [currentIndex, setCurrentIndex] = useState(() => {
		if (!questionCount || savedLesson.progress >= 100) {
			return 0;
		}
		const derivedIndex = Math.floor((savedLesson.progress / 100) * questionCount);
		return Math.min(derivedIndex, Math.max(questionCount - 1, 0));
	});

	useEffect(() => {
		if (!lesson) {
			return;
		}
		if (questionCount === 0) {
			setLessonProgress(lesson.id, 100);
			setIsComplete(true);
		}
	}, [lesson, questionCount, setLessonProgress]);

	if (!lesson) {
		return (
			<div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
				<Card className="p-6">
					<h1 className="text-2xl font-semibold text-foreground">Lesson not found</h1>
					<p className="mt-3 text-sm text-foreground-subtle">
						The lesson you&apos;re looking for doesn&apos;t exist yet.
					</p>
					<button
						type="button"
						onClick={() => navigate("/lessons")}
						className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-strong"
					>
						<ArrowLeft className="h-4 w-4" /> Back to lessons
					</button>
				</Card>
			</div>
		);
	}

	if (lesson.kind === "spell-name") {
		return <SpellYourNameLesson lesson={lesson} onExit={() => navigate("/lessons")} />;
	}

	const progressValue = isComplete ? 100 : savedLesson.progress ?? 0;
	const questions = lesson.questions ?? [];
	const currentQuestion = questions[currentIndex];
	const pointsValue = lesson.points ?? 0;

	const handleExit = () => {
		navigate("/lessons");
	};

	const handleRestart = () => {
		startLesson(lesson.id);
		setIsComplete(false);
		setCurrentIndex(0);
		setResponses({});
	};

	const goToNextQuestion = () => {
		const nextIndex = currentIndex + 1;
		const nextProgress = Math.round((nextIndex / questionCount) * 100);
		setLessonProgress(lesson.id, nextProgress);
		setCurrentIndex(nextIndex);
	};

	const finishLesson = () => {
		completeLesson(lesson.id, { points: pointsValue });
		setIsComplete(true);
	};

	const handleNext = () => {
		if (!lesson || !questionCount) {
			return;
		}
		const isLastQuestion = currentIndex >= questionCount - 1;
		if (isLastQuestion) {
			finishLesson();
			return;
		}
		goToNextQuestion();
	};

	const answerValue = (question) => responses[question.id] ?? "";
	const updateAnswer = (questionId, value) => {
		setResponses((prev) => ({ ...prev, [questionId]: value }));
	};

	const canProceed =
		currentQuestion?.type === "text"
			? Boolean(answerValue(currentQuestion).trim())
			: true;

	return (
		<div className="mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 xl:max-w-5xl">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<button
					type="button"
					onClick={handleExit}
					className="inline-flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm font-semibold text-foreground hover:border-accent hover:bg-surface-hover"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to lessons
				</button>
				<div className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-muted px-3 py-1 text-sm text-foreground-subtle">
					<Sparkles className="h-4 w-4 text-accent" />
					<span>{pointsValue} pts on completion</span>
				</div>
			</div>

			<Card className="w-full space-y-6 p-4 sm:p-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						{/* <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
							Lesson {lesson.id}
						</p> */}
						<h1 className="mt-1 text-2xl font-semibold text-foreground">
							{lesson.title}
						</h1>
						{/* <p className="text-sm text-foreground-subtle">
							{questionCount} {questionCount === 1 ? "question" : "questions"}
						</p> */}
					</div>
					<div className="flex w-full min-w-0 flex-col gap-2 lg:max-w-xs">
						<div className="min-w-0">
							<ProgressBar value={progressValue} />
						</div>
						<span className="text-right text-xs font-medium text-foreground-subtle">
							{progressValue}% complete
						</span>
					</div>
				</header>

				{isComplete ? (
					<div className="flex flex-col items-center gap-6 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
							<CheckCircle2 className="h-8 w-8" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-foreground">
								Lesson complete!
							</h2>
							<p className="mt-2 text-sm text-foreground-subtle">
								Great job keeping up the streak. Come back tomorrow to keep it going.
							</p>
						</div>
						<div className="flex flex-wrap justify-center gap-3">
							<button
								type="button"
								onClick={handleRestart}
								className="inline-flex items-center gap-2 rounded-xl border border-border-soft px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:bg-surface-hover"
							>
								Restart lesson
							</button>
							<button
								type="button"
								onClick={handleExit}
								className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-strong"
							>
								Return to lessons
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{currentQuestion ? (
							<>
								<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)]">
									<div className="justify-evenly">
										<h2 className="text-xl font-semibold text-foreground">
											{currentQuestion.title}
										</h2>
										{currentQuestion.type === "text" ? (
											<TextQuestion
												question={currentQuestion}
												value={answerValue(currentQuestion)}
												onChange={(value) => updateAnswer(currentQuestion.id, value)}
											/>
										) : null}
										{currentQuestion.type === "camera" ? (
											<CameraQuestion question={currentQuestion} />
										) : null}
									</div>
									<MascotPanel />
								</div>
								<div className="flex justify-end gap-3">
									<button
										type="button"
										onClick={handleNext}
										disabled={!canProceed}
										className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-border"
									>
										{currentIndex >= questionCount - 1
											? "Finish lesson"
											: "Next question"}
									</button>
								</div>
							</>
						) : (
							<div className="space-y-4 text-center">
								<h2 className="text-xl font-semibold text-foreground">
									More questions coming soon
								</h2>
								<p className="text-sm text-foreground-subtle">
									This lesson is still being built. Check back later for new prompts!
								</p>
								<button
									type="button"
									onClick={handleExit}
									className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-strong"
								>
									Return to lessons
								</button>
							</div>
						)}
					</div>
				)}
			</Card>
		</div>
	);
}
