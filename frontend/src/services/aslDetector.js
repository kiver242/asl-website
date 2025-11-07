const DEFAULT_CONFIDENCE = 0.05;
const DEFAULT_DURATION_MS = 1200;

let isInitialized = false;
let debugPrediction = null;
let keyboardListenerRegistered = false;

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

export async function initASLModel({ enableKeyboardDebug = true } = {}) {
	if (isInitialized) {
		return;
	}
	isInitialized = true;
	if (typeof window !== "undefined" && enableKeyboardDebug && !keyboardListenerRegistered) {
		window.addEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = true;
	}
}

export function disposeASLModel() {
	if (typeof window !== "undefined" && keyboardListenerRegistered) {
		window.removeEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = false;
	}
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

export async function predictLetterFromFrame(videoElement) {
	if (!isInitialized) {
		throw new Error("ASL model has not been initialised. Call initASLModel() first.");
	}
	if (!videoElement) {
		return { letter: null, confidence: 0 };
	}

	const debug = getActiveDebugPrediction();
	if (debug) {
		return { letter: debug.letter, confidence: debug.confidence };
	}

	// Placeholder implementation: real handshape classification should be wired here.
	// Returning null keeps the UI in detecting mode until a debug prediction is provided.
	return { letter: null, confidence: DEFAULT_CONFIDENCE };
}

export const ASLDetectorDebugAPI = {
	setPrediction: setDebugPrediction,
};
