import { classifyHandPose } from "./aslHandClassifier";

const DEFAULT_CONFIDENCE = 0.05;
const DEFAULT_DURATION_MS = 1200;

let isInitialized = false;
let debugPrediction = null;
let keyboardListenerRegistered = false;
let modelLoadPromise = null;
let handposeModel = null;
let tf = null;
const clampConfidence = (value) => {
	if (Number.isNaN(value)) {
		return 0;
	}
	return Math.max(0, Math.min(1, value));
};

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

const ensureTensorFlow = async () => {
	if (tf) {
		return tf;
	}

	const [tfCore] = await Promise.all([
		import("@tensorflow/tfjs-core"),
		import("@tensorflow/tfjs-converter"),
		import("@tensorflow/tfjs-backend-webgl").catch(() => null),
		import("@tensorflow/tfjs-backend-cpu").catch(() => null),
	]);

	tf = tfCore;
	if (!tf) {
		throw new Error("Unable to initialise TensorFlow.js");
	}

	try {
		await tf.setBackend("webgl");
	} catch (error) {
		console.warn("[ASLDetector] Falling back to CPU backend:", error);
		await tf.setBackend("cpu");
	}
	await tf.ready();

	return tf;
};

const loadHandposeModel = async () => {
	if (handposeModel) {
		return handposeModel;
	}
	if (!modelLoadPromise) {
		modelLoadPromise = (async () => {
			await ensureTensorFlow();
			const handposeModule = await import("@tensorflow-models/handpose");
			const model = await handposeModule.load({
				maxContinuousChecks: 1,
				detectionConfidence: 0.65,
				iouThreshold: 0.3,
				scoreThreshold: 0.75,
			});
			handposeModel = model;
			return model;
		})();
	}
	return modelLoadPromise;
};

export async function initASLModel({ enableKeyboardDebug = true } = {}) {
	if (isInitialized) {
		await loadHandposeModel();
		return;
	}
	isInitialized = true;
	if (typeof window !== "undefined" && enableKeyboardDebug && !keyboardListenerRegistered) {
		window.addEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = true;
	}
	await loadHandposeModel();
}

export function disposeASLModel() {
	if (typeof window !== "undefined" && keyboardListenerRegistered) {
		window.removeEventListener("keydown", handleDebugKeydown);
		keyboardListenerRegistered = false;
	}
	if (handposeModel) {
		if (typeof handposeModel.dispose === "function") {
			handposeModel.dispose();
		}
		handposeModel = null;
	}
	modelLoadPromise = null;
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

	try {
		const model = await loadHandposeModel();
		const predictions = await model.estimateHands(videoElement, {
			flipHorizontal: true,
			staticImageMode: false,
		});

		if (!predictions?.length) {
			return { letter: null, confidence: 0 };
		}

		const { landmarks, handInViewConfidence = 1 } = predictions[0];
		const { letter, confidence } = classifyHandPose(landmarks);

		if (!letter) {
			return { letter: null, confidence: 0 };
		}

		const combinedConfidence = clampConfidence(confidence * handInViewConfidence);
		return { letter, confidence: combinedConfidence };
	} catch (error) {
		console.error("[ASLDetector] Failed to predict letter:", error);
		return { letter: null, confidence: DEFAULT_CONFIDENCE };
	}
}

export const ASLDetectorDebugAPI = {
	setPrediction: setDebugPrediction,
};
