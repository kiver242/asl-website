import { Hands } from "@mediapipe/hands";
import { classifyHand } from "./handShapeClassifier";

const DEFAULT_CONFIDENCE = 0.05;
const DEFAULT_DURATION_MS = 1200;
const WEBGL_CONTEXT_NAMES = ["webgl2", "webgl", "experimental-webgl"];
const CPU_FALLBACK_ERROR_PATTERNS = [
	/failed to create webgl canvas context/i,
	/webgl.*context.*lost/i,
	/unable to create webgl/i,
];

let isInitialized = false;
let debugPrediction = null;
let keyboardListenerRegistered = false;
let hands = null;
let pendingHandsInference = null;
let cachedWebGLSupport = null;
let usingCpuInference = false;
let cpuFallbackWarningLogged = false;

const cancelPendingHandsInference = (error) => {
	if (!pendingHandsInference) {
		return;
	}
	const rejectionError =
		error instanceof Error ? error : new Error("Hands inference was cancelled.");
	try {
		if (typeof pendingHandsInference.reject === "function") {
			pendingHandsInference.reject(rejectionError);
		}
	} catch {
		// Ignore rejection errors.
	}
	pendingHandsInference = null;
};

const destroyHandsInstance = (error) => {
	cancelPendingHandsInference(
		error instanceof Error ? error : new Error("Hands instance has been disposed."),
	);
	if (!hands) {
		return;
	}
	try {
		if (typeof hands.close === "function") {
			hands.close();
		}
	} catch {
		// Ignore errors when closing the MediaPipe instance.
	}
	hands = null;
};

const now = () => {
	if (typeof performance !== "undefined" && typeof performance.now === "function") {
		return performance.now();
	}
	return Date.now();
};

const supportsWebGL = () => {
	if (cachedWebGLSupport !== null) {
		return cachedWebGLSupport;
	}

	if (typeof document === "undefined") {
		cachedWebGLSupport = false;
		return cachedWebGLSupport;
	}

	try {
		const canvas = document.createElement("canvas");
		cachedWebGLSupport = WEBGL_CONTEXT_NAMES.some((contextName) => {
			const context = canvas.getContext(contextName);
			if (!context) {
				return false;
			}
			if (typeof context.getParameter === "function") {
				// Access a parameter to ensure the context is valid.
				context.getParameter(context.VERSION);
			}
			return true;
		});
		if (typeof canvas.remove === "function") {
			canvas.remove();
		}
	} catch {
		cachedWebGLSupport = false;
	}

	return cachedWebGLSupport;
};

const logCpuFallbackWarning = (error) => {
	if (cpuFallbackWarningLogged || typeof console === "undefined" || typeof console.warn !== "function") {
		return;
	}
	cpuFallbackWarningLogged = true;
	console.warn(
		"[ASLDetector] Falling back to CPU inference because WebGL contexts are not available. Performance may be reduced.",
		error,
	);
};

const applyHandsOptions = (instance, overrides = {}) => {
	if (!instance) {
		return;
	}
	const baseOptions = {
		maxNumHands: 1,
		modelComplexity: usingCpuInference ? 0 : 1,
		selfieMode: true,
		minDetectionConfidence: 0.55,
		minTrackingConfidence: 0.5,
		useCpuInference: usingCpuInference,
	};
	instance.setOptions({ ...baseOptions, ...overrides });
};

const maybeFallbackToCpuInference = (error) => {
	if (!hands || usingCpuInference) {
		return false;
	}

	const message = typeof error?.message === "string" ? error.message : String(error ?? "");
	const shouldFallback = CPU_FALLBACK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
	if (!shouldFallback) {
		return false;
	}

	cachedWebGLSupport = false;
	destroyHandsInstance(error);

	try {
		hands = createHandsInstance({ forceCpu: true });
		logCpuFallbackWarning(error);
		return true;
	} catch {
		hands = null;
		usingCpuInference = false;
		return false;
	}
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

const createHandsInstance = ({ forceCpu = false } = {}) => {
	const instance = new Hands({
		locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
	});

	usingCpuInference = forceCpu || !supportsWebGL();
	applyHandsOptions(instance);
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

	destroyHandsInstance(new Error("ASL model disposed."));
	isInitialized = false;
	debugPrediction = null;
	usingCpuInference = false;
	cpuFallbackWarningLogged = false;
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

	const videoWidth = typeof videoElement.videoWidth === "number" ? videoElement.videoWidth : 0;
	const videoHeight = typeof videoElement.videoHeight === "number" ? videoElement.videoHeight : 0;
	if (videoWidth <= 0 || videoHeight <= 0) {
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
		const fallbackActivated = maybeFallbackToCpuInference(error);
		if (!fallbackActivated) {
			throw error;
		}
		results = await runHandsInference(videoElement);
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
