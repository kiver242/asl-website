import { Hands } from "@mediapipe/hands";
import { classifyHand } from "./handShapeClassifier";

const DEFAULT_CONFIDENCE = 0.05;
const DEFAULT_DURATION_MS = 1200;

let isInitialized = false;
let debugPrediction = null;
let keyboardListenerRegistered = false;
let hands = null;
let pendingHandsInference = null;

const now = () => {
	if (typeof performance !== "undefined" && typeof performance.now === "function") {
		return performance.now();
	}
	return Date.now();
};

const normalizeLetter = (letter) => {
	if (!letter) {
		return null;
	}
	const upper = letter.toUpperCase();
	return upper >= "A" && upper <= "Z" ? upper : null;
};

const handleDebugKeydown = (event) => {
	const letter = normalizeLetter(event.key);
	if (!letter) {
		return;
	}
	setDebugPrediction(letter, 0.95);
};

const createHandsInstance = () => {
	const instance = new Hands({
		locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
	});
	instance.setOptions({
		maxNumHands: 1,
		modelComplexity: 1,
		selfieMode: true,
		minDetectionConfidence: 0.55,
		minTrackingConfidence: 0.5,
	});
	instance.onResults((results) => {
		if (pendingHandsInference) {
			pendingHandsInference.resolve(results);
			pendingHandsInference = null;
		}
	});
	return instance;
};

const selectHandFromResults = (results) => {
	const landmarksList = results?.multiHandLandmarks;
	const handednessList = results?.multiHandedness;
	if (!Array.isArray(landmarksList) || landmarksList.length === 0) {
		return null;
	}
	if (!Array.isArray(handednessList) || handednessList.length === 0) {
		return { landmarks: landmarksList[0], handedness: null };
	}

	let bestIndex = 0;
	let bestScore = -Infinity;

	for (let index = 0; index < landmarksList.length; index += 1) {
		const handed = handednessList[index];
		if (!handed) {
			if (bestScore === -Infinity) {
				bestIndex = index;
				bestScore = 0;
			}
			continue;
		}
		let score = handed.score ?? 0;
		if (typeof handed.label === "string" && handed.label.toLowerCase() === "right") {
			score += 1;
		}
		if (score > bestScore) {
			bestScore = score;
			bestIndex = index;
		}
	}

	return {
		landmarks: landmarksList[bestIndex],
		handedness: handednessList[bestIndex] ?? null,
	};
};

const runHandsInference = async (videoElement) => {
	if (!hands) {
		return null;
	}

	if (pendingHandsInference?.promise) {
		try {
			await pendingHandsInference.promise;
		} catch {
			// Ignore previous failure; we'll attempt a fresh inference.
		}
	}

	let resolveInference;
	let rejectInference;
	const promise = new Promise((resolve, reject) => {
		resolveInference = resolve;
		rejectInference = reject;
	});
	pendingHandsInference = { promise, resolve: resolveInference, reject: rejectInference };

	try {
		await hands.send({ image: videoElement });
	} catch (error) {
		if (pendingHandsInference) {
			pendingHandsInference.reject(error);
			pendingHandsInference = null;
		}
		throw error;
	}

	try {
		const results = await promise;
		return results;
	} finally {
		pendingHandsInference = null;
	}
};

export async function initASLModel({ enableKeyboardDebug = true } = {}) {
	if (isInitialized) {
		return;
	}

	isInitialized = true;

	if (typeof window === "undefined") {
		return;
	}

	try {
		hands = createHandsInstance();
	} catch (error) {
		isInitialized = false;
		throw error;
	}

	if (enableKeyboardDebug && !keyboardListenerRegistered) {
		window.addEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = true;
	}
}

export function disposeASLModel() {
	if (typeof window !== "undefined" && keyboardListenerRegistered) {
		window.removeEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = false;
	}

	if (hands) {
		try {
			hands.close();
		} catch {
			// Ignore errors when closing the MediaPipe instance.
		}
		hands = null;
	}

	pendingHandsInference = null;
	isInitialized = false;
	debugPrediction = null;
}

export function setDebugPrediction(letter, confidence = 0.99, durationMs = DEFAULT_DURATION_MS) {
	const normalized = normalizeLetter(letter);
	if (!normalized) {
		return;
	}
	debugPrediction = {
		letter: normalized,
		confidence: Math.max(0, Math.min(1, confidence)),
		expiresAt: now() + Math.max(durationMs, 0),
	};
}

const getActiveDebugPrediction = () => {
	if (!debugPrediction) {
		return null;
	}
	if (now() > debugPrediction.expiresAt) {
		debugPrediction = null;
		return null;
	}
	return debugPrediction;
};

export async function predictLetterFromFrame(videoElement, options = {}) {
	if (!isInitialized) {
		throw new Error("ASL model has not been initialised. Call initASLModel() first.");
	}

	if (!videoElement) {
		return { letter: null, confidence: 0, targetConfidence: 0, scores: {} };
	}

	const debug = getActiveDebugPrediction();
	if (debug) {
		return {
			letter: debug.letter,
			confidence: debug.confidence,
			targetConfidence: debug.confidence,
			scores: { [debug.letter]: debug.confidence },
		};
	}

	if (!hands) {
		return { letter: null, confidence: 0, targetConfidence: 0, scores: {} };
	}

	let results;
	try {
		results = await runHandsInference(videoElement);
	} catch (error) {
		throw error;
	}

	if (!results) {
		return { letter: null, confidence: 0, targetConfidence: 0, scores: {} };
	}

	const selection = selectHandFromResults(results);
	if (!selection) {
		return { letter: null, confidence: 0, targetConfidence: 0, scores: {} };
	}

	const { landmarks, handedness } = selection;
	const handednessScore = handedness?.score ?? 1;

	const classification = classifyHand(landmarks, { handednessScore });
	const scores = classification.scores ?? {};
	const bestLetter = classification.bestLetter ?? null;
	const bestScore = classification.bestScore ?? 0;

	const targetLetter = options?.targetLetter ? normalizeLetter(options.targetLetter) : null;
	const targetConfidence =
		targetLetter && scores[targetLetter] !== undefined
			? scores[targetLetter]
			: targetLetter
				? 0
				: undefined;

	return {
		letter: bestLetter,
		confidence: Math.max(bestScore, bestLetter ? bestScore : DEFAULT_CONFIDENCE),
		targetConfidence,
		scores,
	};
}

export const ASLDetectorDebugAPI = {
	setPrediction: setDebugPrediction,
};
