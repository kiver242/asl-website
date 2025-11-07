import { useEffect, useRef, useState } from "react";
import { predictLetterFromFrame } from "../services/aslDetector";

const DEFAULT_THRESHOLD = 0.85;
const DEFAULT_HOLD_DURATION_MS = 1_000;

const getNow = () => {
	if (typeof performance !== "undefined" && typeof performance.now === "function") {
		return performance.now();
	}
	return Date.now();
};

export function useASLLetterDetection({
	videoRef,
	targetLetter,
	enabled,
	threshold = DEFAULT_THRESHOLD,
	holdDurationMs = DEFAULT_HOLD_DURATION_MS,
}) {
	const rafRef = useRef(null);
	const stableSinceRef = useRef(null);
	const [state, setState] = useState({
		status: "idle",
		letter: null,
		confidence: 0,
		error: null,
	});

	useEffect(() => {
		stableSinceRef.current = null;
		setState((prev) => ({
			...prev,
			status: enabled ? "detecting" : "idle",
			letter: null,
			confidence: 0,
			error: null,
		}));
	}, [enabled, targetLetter]);

	useEffect(() => {
		if (!enabled) {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			return;
		}

		let cancelled = false;
		const listen = async () => {
			const videoElement = videoRef.current;
			if (!videoElement || videoElement.readyState < 2) {
				if (!cancelled) {
					rafRef.current = requestAnimationFrame(listen);
				}
				return;
			}

			try {
				const prediction = await predictLetterFromFrame(videoElement, { targetLetter });
				const predictedLetter = prediction.letter?.toUpperCase() ?? null;
				const targetConfidence =
					typeof prediction.targetConfidence === "number" ? prediction.targetConfidence : null;
				const overallConfidence =
					typeof prediction.confidence === "number" ? prediction.confidence : 0;
				const effectiveConfidence = targetConfidence ?? overallConfidence;

				setState((prev) => ({
					...prev,
					status: prev.status === "matched" ? prev.status : "detecting",
					letter: predictedLetter,
					confidence: effectiveConfidence,
					error: null,
				}));

				if (
					targetLetter &&
					typeof targetConfidence === "number" &&
					targetConfidence >= threshold
				) {
					if (!stableSinceRef.current) {
						stableSinceRef.current = getNow();
					}
					const elapsed = getNow() - stableSinceRef.current;
					if (elapsed >= holdDurationMs) {
						setState({
							status: "matched",
							letter: targetLetter,
							confidence: targetConfidence,
							error: null,
						});
						return;
					}
				} else {
					stableSinceRef.current = null;
				}
			} catch (error) {
				setState({
					status: "error",
					letter: null,
					confidence: 0,
					error,
				});
				return;
			}

			if (!cancelled) {
				rafRef.current = requestAnimationFrame(listen);
			}
		};

		rafRef.current = requestAnimationFrame(listen);

		return () => {
			cancelled = true;
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			stableSinceRef.current = null;
		};
	}, [enabled, holdDurationMs, targetLetter, threshold, videoRef]);

	const reset = () => {
		stableSinceRef.current = null;
		setState({
			status: enabled ? "detecting" : "idle",
			letter: null,
			confidence: 0,
			error: null,
		});
	};

	return {
		status: state.status,
		letter: state.letter,
		confidence: state.confidence,
		error: state.error,
		reset,
	};
}
