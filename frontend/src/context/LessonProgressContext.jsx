/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

const STORAGE_KEY = "asl-lesson-progress";

const defaultState = {
	lessons: {},
	points: 0,
	streak: {
		current: 0,
		lastCompletedDate: null,
	},
};

const LessonProgressContext = createContext(null);

const clampProgress = (progress) => Math.min(100, Math.max(0, Math.round(progress)));

const getToday = () => {
	const now = new Date();
	const offsetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return offsetDate.toISOString().split("T")[0];
};

const dayDifference = (laterDate, earlierDate) => {
	if (!laterDate || !earlierDate) {
		return null;
	}
	const later = new Date(laterDate);
	const earlier = new Date(earlierDate);
	const diff = Math.floor((later - earlier) / (1000 * 60 * 60 * 24));
	return Number.isNaN(diff) ? null : diff;
};

const loadInitialState = () => {
	if (typeof window === "undefined") {
		return defaultState;
	}
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return defaultState;
		}
		const parsed = JSON.parse(stored);
		return {
			lessons: parsed.lessons ?? {},
			points: parsed.points ?? 0,
			streak: {
				current: parsed.streak?.current ?? 0,
				lastCompletedDate: parsed.streak?.lastCompletedDate ?? null,
			},
		};
	} catch {
		return defaultState;
	}
};

export function LessonProgressProvider({ children }) {
	const [state, setState] = useState(() => loadInitialState());

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [state]);

	const setLessonProgress = useCallback((lessonId, progress) => {
		const normalized = clampProgress(progress);
		setState((prev) => {
			const existing = prev.lessons[lessonId] ?? {};
			if (existing.progress === normalized) {
				return prev;
			}
			return {
				...prev,
				lessons: {
					...prev.lessons,
					[lessonId]: {
						...existing,
						progress: normalized,
					},
				},
			};
		});
	}, []);

	const startLesson = useCallback((lessonId) => {
		setState((prev) => {
			const existing = prev.lessons[lessonId] ?? {};
			if (existing.progress === 0) {
				return prev;
			}
			return {
				...prev,
				lessons: {
					...prev.lessons,
					[lessonId]: {
						...existing,
						progress: 0,
					},
				},
			};
		});
	}, []);

	const completeLesson = useCallback((lessonId, { points = 0 } = {}) => {
		setState((prev) => {
			const today = getToday();
			const existingLesson = prev.lessons[lessonId] ?? {};
			const alreadyCompletedToday = existingLesson.completedOn === today;

			let updatedPoints = prev.points;
			if (!alreadyCompletedToday) {
				updatedPoints += points;
			}

			let updatedStreak = prev.streak.current;
			let updatedLastCompleted = prev.streak.lastCompletedDate;
			if (!alreadyCompletedToday) {
				if (!updatedLastCompleted) {
					updatedStreak = 1;
				} else {
					const diff = dayDifference(today, updatedLastCompleted);
					if (diff === 0) {
						updatedStreak = prev.streak.current;
					} else if (diff === 1) {
						updatedStreak = prev.streak.current + 1;
					} else {
						updatedStreak = 1;
					}
				}
				updatedLastCompleted = today;
			}

			return {
				points: updatedPoints,
				streak: {
					current: updatedStreak,
					lastCompletedDate: updatedLastCompleted,
				},
				lessons: {
					...prev.lessons,
					[lessonId]: {
						...existingLesson,
						progress: 100,
						completedOn: today,
					},
				},
			};
		});
	}, []);

	const value = useMemo(
		() => ({
			lessons: state.lessons,
			points: state.points,
			streak: state.streak,
			setLessonProgress,
			completeLesson,
			startLesson,
		}),
		[state, setLessonProgress, completeLesson, startLesson]
	);

	return (
		<LessonProgressContext.Provider value={value}>
			{children}
		</LessonProgressContext.Provider>
	);
}

export function useLessonProgress() {
	const context = useContext(LessonProgressContext);
	if (!context) {
		throw new Error("useLessonProgress must be used within a LessonProgressProvider");
	}
	return context;
}
