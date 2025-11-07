import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Keyboard, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import WebcamViewer from "../components/WebcamViewer";
import { useLessonProgress } from "../context/LessonProgressContext";
import {
	calculateProgressPercentage,
	getLessonStepLabel,
	nameToLetters,
	sanitizeNameInput,
} from "../utils/aslLessonUtils";
import { ASLDetectorDebugAPI, disposeASLModel, initASLModel } from "../services/aslDetector";
import { useASLLetterDetection } from "../hooks/useASLLetterDetection";
import { getASLLetterMedia } from "../data/aslLetterImages";

const DETECTION_THRESHOLD = 0.9;
const HOLD_DURATION_MS = 1_200;

const StatusBadge = ({ tone = "neutral", children }) => {
	const toneClasses = {
		neutral: "bg-surface-muted text-foreground-subtle",
		success: "bg-success-soft text-success-strong",
		warn: "bg-warning-soft text-warning-strong",
		danger: "bg-destructive-soft text-destructive",
		info: "bg-accent-soft text-accent",
	};

	return (
		<span
			className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone] ?? toneClasses.neutral}`}
		>
			{children}
		</span>
	);
};

const LessonHeader = ({ title, subtitle, points, progress }) => (
	<header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div className="min-w-0 space-y-1">
			<button
				type="button"
				onClick={subtitle.onBack}
				className="inline-flex items-center gap-2 rounded-xl border border-border-soft px-3 py-2 text-sm font-semibold text-foreground hover:border-accent hover:bg-surface-hover"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to lessons
			</button>
			<h1 className="text-2xl font-semibold text-foreground">{title}</h1>
			<p className="text-sm text-foreground-subtle max-w-2xl">{subtitle.text}</p>
		</div>
		<div className="flex w-full flex-col gap-3 lg:max-w-xs">
			<div className="inline-flex items-center gap-2 self-end rounded-full border border-border-soft bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground-subtle">
				<Sparkles className="h-4 w-4 text-accent" />
				<span>{points} pts on completion</span>
			</div>
			<div className="flex flex-col gap-1">
				<ProgressBar value={progress} />
				<span className="text-right text-xs font-medium text-foreground-subtle">
					{progress}% complete
				</span>
			</div>
		</div>
	</header>
);

const CompletionCard = ({ name, letters, onRestart, onExit }) => (
	<div className="flex flex-col items-center gap-6 text-center">
		<div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
			<CheckCircle2 className="h-8 w-8" />
		</div>
		<div className="max-w-xl space-y-2">
			<h2 className="text-xl font-semibold text-foreground">You signed your name!</h2>
			<p className="text-sm text-foreground-subtle">
				Great work. Keep practising with new names or revisit this lesson any time. You spelled{" "}
				<span className="font-semibold text-foreground">{name}</span> in ASL.
			</p>
		</div>
		<ul className="flex flex-wrap justify-center gap-3">
			{letters.map((letter, index) => {
				const media = getASLLetterMedia(letter);
				return (
					<li
						key={`${letter}-${index}`}
						className="flex w-24 flex-col items-center gap-2 rounded-2xl border border-border-soft bg-surface-muted p-3"
					>
						<div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-strong">
							{media ? (
								<img
									src={media.src}
									alt={media.alt}
									className="max-h-full max-w-full object-contain"
									loading="lazy"
								/>
							) : (
								<div className="grid h-full place-items-center text-lg font-semibold text-foreground-muted">
									{letter}
								</div>
							)}
						</div>
						<span className="text-sm font-semibold text-foreground">{letter}</span>
					</li>
				);
			})}
		</ul>
		<div className="flex flex-wrap justify-center gap-3">
			<button
				type="button"
				onClick={onRestart}
				className="inline-flex items-center gap-2 rounded-xl border border-border-soft px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:bg-surface-hover"
			>
				<RefreshCw className="h-4 w-4" />
				Try another name
			</button>
			<button
				type="button"
				onClick={onExit}
				className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-strong"
			>
				Back to lessons
			</button>
		</div>
	</div>
);

function NameInputScreen({ value, onChange, onSubmit, error, isBusy }) {
	return (
		<form onSubmit={onSubmit} className="space-y-6">
			<div className="space-y-2">
				<label className="block text-sm font-medium text-foreground" htmlFor="asl-name-input">
					Your name
				</label>
				<input
					id="asl-name-input"
					type="text"
					autoComplete="name"
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder="Type any name using A-Z letters"
					className={`w-full rounded-xl border px-4 py-2 text-base outline-none transition ${
						error
							? "border-destructive text-destructive ring-2 ring-destructive/30"
							: "border-border-soft bg-surface-strong text-foreground focus:border-accent focus:ring-2 focus:ring-accent-soft"
					}`}
				/>
				<p className="text-xs text-foreground-subtle">
					We&apos;ll remove spaces and special characters so you can focus on each letter.
				</p>
				{error ? <p className="text-xs text-destructive">{error}</p> : null}
			</div>
			<button
				type="submit"
				disabled={isBusy}
				className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-border"
			>
				{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
				Start lesson
			</button>
		</form>
	);
}

function DetectionFeedback({ status, predictedLetter, targetLetter, confidence, threshold }) {
	if (status === "matched") {
		return (
			<StatusBadge tone="success">
				Matched {targetLetter} at {(confidence * 100).toFixed(0)}% confidence
			</StatusBadge>
		);
	}
	if (status === "error") {
		return <StatusBadge tone="danger">Detection temporarily unavailable</StatusBadge>;
	}
	if (status === "detecting" && predictedLetter) {
		return (
			<StatusBadge tone="info">
				Seeing {predictedLetter} ({(confidence * 100).toFixed(0)}% – need {Math.round(threshold * 100)}%)
			</StatusBadge>
		);
	}
	if (status === "detecting") {
		return <StatusBadge tone="neutral">Detecting handshape… keep signing {targetLetter}</StatusBadge>;
	}
	return <StatusBadge tone="neutral">Waiting for camera</StatusBadge>;
}

function DetectionDebugNotice() {
	return (
		<div className="flex items-center gap-2 rounded-xl border border-dashed border-border-soft bg-surface-muted px-3 py-2 text-xs text-foreground-subtle">
			<Keyboard className="h-4 w-4 text-accent" />
			<span>
				Debug mode: press the highlighted letter on your keyboard to simulate a detection while we
				wire in the production model.
			</span>
		</div>
	);
}

export default function SpellYourNameLesson({ lesson, onExit }) {
	const { startLesson, setLessonProgress, completeLesson } = useLessonProgress();

	const [phase, setPhase] = useState("entry"); // entry | lesson | complete
	const [nameInput, setNameInput] = useState("");
	const [validationError, setValidationError] = useState("");
	const [sessionName, setSessionName] = useState("");
	const [letters, setLetters] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [letterResults, setLetterResults] = useState([]);
	const [stepCompleted, setStepCompleted] = useState(false);
	const [modelStatus, setModelStatus] = useState("idle"); // idle | loading | ready | error
	const [modelError, setModelError] = useState(null);
	const [cameraStatus, setCameraStatus] = useState("idle");
	const [cameraError, setCameraError] = useState(null);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);

	const videoRef = useRef(null);

	const totalLetters = letters.length;
	const currentLetter = letters[currentIndex] ?? null;
	const progress = useMemo(
		() => calculateProgressPercentage(letterResults.length, totalLetters),
		[letterResults.length, totalLetters],
	);

	const detection = useASLLetterDetection({
		videoRef,
		targetLetter: currentLetter,
		enabled:
			phase === "lesson" &&
			modelStatus === "ready" &&
			cameraStatus === "ready" &&
			!stepCompleted &&
			Boolean(currentLetter),
		threshold: DETECTION_THRESHOLD,
		holdDurationMs: HOLD_DURATION_MS,
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.aslDetectorDebug = ASLDetectorDebugAPI;
		}
		return () => {
			if (typeof window !== "undefined") {
				delete window.aslDetectorDebug;
			}
		};
	}, []);

	useEffect(() => {
		return () => {
			disposeASLModel();
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		if (phase === "lesson") {
			setModelStatus("loading");
			initASLModel()
				.then(() => {
					if (!cancelled) {
						setModelStatus("ready");
					}
				})
				.catch((error) => {
					if (!cancelled) {
						setModelStatus("error");
						setModelError(error);
					}
				});
		} else {
			setModelStatus("idle");
			setModelError(null);
		}
		return () => {
			cancelled = true;
		};
	}, [phase]);

	useEffect(() => {
		if (
			phase !== "lesson" ||
			!currentLetter ||
			detection.status !== "matched" ||
			stepCompleted ||
			totalLetters === 0
		) {
			return;
		}

		setLetterResults((prev) => {
			if (prev.some((item) => item.index === currentIndex)) {
				return prev;
			}
			const next = [
				...prev,
				{
					index: currentIndex,
					letter: currentLetter,
					confidence: detection.confidence,
					matchedAt: new Date().toISOString(),
				},
			];
			const nextProgress = calculateProgressPercentage(next.length, totalLetters);
			setLessonProgress(lesson.id, nextProgress);
			return next;
		});
		setStepCompleted(true);
	}, [
		phase,
		currentLetter,
		currentIndex,
		detection.status,
		detection.confidence,
		stepCompleted,
		totalLetters,
		lesson.id,
		setLessonProgress,
	]);

	useEffect(() => {
		if (phase !== "lesson") {
			setIsCameraEnabled(false);
			return;
		}
		setIsCameraEnabled(true);
	}, [phase]);

	const handleNameSubmit = (event) => {
		event.preventDefault();
		const sanitized = sanitizeNameInput(nameInput);
		if (!sanitized) {
			setValidationError("Please enter at least one letter (A-Z).");
			return;
		}
		const letterArray = nameToLetters(sanitized);
		if (letterArray.length === 0) {
			setValidationError("Only letters A-Z are supported for now.");
			return;
		}
		setValidationError("");
		setSessionName(sanitized);
		setLetters(letterArray);
		setCurrentIndex(0);
		setLetterResults([]);
		setStepCompleted(false);
		setCameraError(null);
		setPhase("lesson");
		startLesson(lesson.id);
		setLessonProgress(lesson.id, 0);
	};

	const handleNextStep = () => {
		if (!letters.length) {
			return;
		}
		const isLastStep = currentIndex >= letters.length - 1;
		if (isLastStep) {
			detection.reset();
			setLessonProgress(lesson.id, 100);
			completeLesson(lesson.id, { points: lesson.points ?? 0 });
			setPhase("complete");
			setIsCameraEnabled(false);
			return;
		}
		const nextIndex = currentIndex + 1;
		setCurrentIndex(nextIndex);
		setStepCompleted(false);
		detection.reset();
	};

	const handleRestart = () => {
		setPhase("entry");
		setLetters([]);
		setLetterResults([]);
		setStepCompleted(false);
		setCurrentIndex(0);
		setSessionName("");
		setModelStatus("idle");
		setModelError(null);
		setCameraStatus("idle");
		setCameraError(null);
		setIsCameraEnabled(false);
		setLessonProgress(lesson.id, 0);
		detection.reset();
	};

	const handleCameraRetry = () => {
		setCameraError(null);
		setIsCameraEnabled(false);
		setTimeout(() => {
			setIsCameraEnabled(true);
		}, 10);
	};

	const lessonSubtitle = {
		text: "Spell out each letter of your name using the ASL handshape. Hold each sign steady until the detector confirms it.",
		onBack: onExit,
	};

	return (
		<div className="mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 xl:max-w-5xl">
			<Card className="w-full space-y-6 p-4 sm:p-6">
				<LessonHeader
					title={lesson.title}
					subtitle={lessonSubtitle}
					points={lesson.points ?? 0}
					progress={phase === "lesson" ? progress : phase === "complete" ? 100 : 0}
				/>

				{phase === "entry" ? (
					<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
						<div className="space-y-4">
							<h2 className="text-xl font-semibold text-foreground">
								Type your name to get personalised prompts
							</h2>
							<p className="text-sm text-foreground-subtle">
								We will create a letter-by-letter path using the ASL manual alphabet. You&apos;ll
								sign each letter with live feedback from your webcam.
							</p>
							<NameInputScreen
								value={nameInput}
								onChange={setNameInput}
								onSubmit={handleNameSubmit}
								error={validationError}
								isBusy={false}
							/>
							<DetectionDebugNotice />
						</div>
						<div className="flex items-center justify-center rounded-2xl border border-dashed border-border-soft bg-surface-muted p-6 text-sm text-foreground-subtle">
							<div className="max-w-xs space-y-2">
								<p className="font-semibold text-foreground">Tips</p>
								<ul className="list-disc space-y-2 pl-4">
									<li>Use plenty of light so the camera can see your hand clearly.</li>
									<li>Hold your hand in the frame at shoulder height.</li>
									<li>A tripod or resting your elbow on a table can reduce motion blur.</li>
								</ul>
							</div>
						</div>
					</div>
				) : null}

				{phase === "lesson" ? (
					<div className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
							<div className="space-y-4">
								<div className="space-y-1">
									<p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
										{getLessonStepLabel(currentIndex, totalLetters)}
									</p>
									<h2 className="text-xl font-semibold text-foreground">
										Sign the letter <span className="text-accent">{currentLetter}</span>
									</h2>
									<p className="text-sm text-foreground-subtle">
										Match the reference handshape and keep it steady in front of your webcam until the
										detector reaches {Math.round(DETECTION_THRESHOLD * 100)}% confidence.
									</p>
								</div>

								<div className="flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-border-soft bg-surface-strong">
									{getASLLetterMedia(currentLetter) ? (
										<img
											key={currentLetter}
											src={getASLLetterMedia(currentLetter).src}
											alt={getASLLetterMedia(currentLetter).alt}
											className="max-h-full max-w-full object-contain"
										/>
									) : (
										<div className="grid h-full w-full place-items-center text-5xl font-bold text-foreground-muted">
											{currentLetter}
										</div>
									)}
								</div>

								<div className="flex flex-col gap-3">
									<DetectionFeedback
										status={
											modelStatus === "error"
												? "error"
												: cameraStatus === "error"
													? "error"
													: detection.status
										}
										predictedLetter={detection.letter}
										targetLetter={currentLetter}
										confidence={detection.confidence}
										threshold={DETECTION_THRESHOLD}
									/>
									{modelStatus === "loading" ? (
										<div className="inline-flex items-center gap-2 text-xs text-foreground-subtle">
											<Loader2 className="h-4 w-4 animate-spin text-accent" />
											Loading the detection model…
										</div>
									) : null}
									{modelStatus === "error" ? (
										<p className="text-xs text-destructive">
											{modelError?.message ??
												"We could not start the detection model. Refresh the page and try again."}
										</p>
									) : null}
									{cameraStatus === "error" ? (
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-xs text-destructive">
												{cameraError?.message ??
													"We could not access your camera. Check your permissions and try again."}
											</p>
											<button
												type="button"
												onClick={handleCameraRetry}
												className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
											>
												Retry camera
											</button>
										</div>
									) : null}
								</div>
							</div>

							<WebcamViewer
								ref={videoRef}
								isActive={isCameraEnabled}
								onStatusChange={setCameraStatus}
								onError={(error) => setCameraError(error)}
								label="Your camera"
							/>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface-muted px-4 py-3 text-sm text-foreground-subtle">
							<span>
								Hold the sign steady for {Math.round(HOLD_DURATION_MS / 1000)} second
								{HOLD_DURATION_MS >= 2000 ? "s" : ""} once you see the confidence climb above{" "}
								{Math.round(DETECTION_THRESHOLD * 100)}%.
							</span>
							<DetectionDebugNotice />
						</div>

						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleNextStep}
								disabled={!stepCompleted}
								className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-border"
							>
								{currentIndex >= letters.length - 1 ? "Finish lesson" : "Next letter"}
							</button>
						</div>
					</div>
				) : null}

				{phase === "complete" ? (
					<CompletionCard
						name={sessionName}
						letters={letters}
						onRestart={handleRestart}
						onExit={onExit}
					/>
				) : null}
			</Card>
		</div>
	);
}
