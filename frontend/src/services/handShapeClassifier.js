const fingerIndices = {
	thumb: [1, 2, 3, 4],
	index: [5, 6, 7, 8],
	middle: [9, 10, 11, 12],
	ring: [13, 14, 15, 16],
	pinky: [17, 18, 19, 20],
};

const clamp = (value, min = 0, max = 1) => {
	if (Number.isNaN(value)) {
		return min;
	}
	return value < min ? min : value > max ? max : value;
};

const distance3d = (a, b) => {
	if (!a || !b) {
		return 0;
	}
	const dx = (a.x ?? 0) - (b.x ?? 0);
	const dy = (a.y ?? 0) - (b.y ?? 0);
	const dz = (a.z ?? 0) - (b.z ?? 0);
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const angleBetween = (a, b, c) => {
	if (!a || !b || !c) {
		return Math.PI;
	}
	const ab = {
		x: (a.x ?? 0) - (b.x ?? 0),
		y: (a.y ?? 0) - (b.y ?? 0),
		z: (a.z ?? 0) - (b.z ?? 0),
	};
	const cb = {
		x: (c.x ?? 0) - (b.x ?? 0),
		y: (c.y ?? 0) - (b.y ?? 0),
		z: (c.z ?? 0) - (b.z ?? 0),
	};
	const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
	const magAb = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
	const magCb = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);
	if (magAb === 0 || magCb === 0) {
		return Math.PI;
	}
	const cosine = clamp(dot / (magAb * magCb), -1, 1);
	return Math.acos(cosine);
};

const computeFingerState = (landmarks, indices, scale, { isThumb = false } = {}) => {
	const [mcpIndex, pipIndex, dipIndex, tipIndex] = indices;
	const mcp = landmarks[mcpIndex];
	const pip = landmarks[pipIndex];
	const dip = landmarks[dipIndex];
	const tip = landmarks[tipIndex];

	const anglePip = angleBetween(mcp, pip, dip);
	const angleDip = angleBetween(pip, dip, tip);
	const straightness = clamp(
		1 -
			(Math.abs(anglePip - Math.PI) + Math.abs(angleDip - Math.PI)) / (Math.PI * 2),
		0,
		1,
	);

	const vertical = ((mcp?.y ?? 0) - (tip?.y ?? 0)) / scale;
	const horizontal = ((tip?.x ?? 0) - (mcp?.x ?? 0)) / scale;
	const depth = ((mcp?.z ?? 0) - (tip?.z ?? 0)) / scale;
	const tipPalm = distance3d(tip, landmarks[0]) / scale;

	let state;
	if (isThumb) {
		if (straightness > 0.75 && Math.abs(horizontal) > 0.12) {
			state = "extended";
		} else if (straightness > 0.55) {
			state = "half";
		} else {
			state = "curled";
		}
	} else if (straightness > 0.75 && vertical > 0.28) {
		state = "extended";
	} else if (straightness > 0.55 && vertical > 0.12) {
		state = "half";
	} else {
		state = "curled";
	}

	return {
		state,
		straightness,
		vertical,
		horizontal,
		depth,
		tipPalm,
		tip,
		mcp,
		pip,
		dip,
	};
};

const computeHandFeatures = (landmarks) => {
	const wrist = landmarks[0];
	const indexMcp = landmarks[5];
	const middleMcp = landmarks[9];
	const ringMcp = landmarks[13];
	const pinkyMcp = landmarks[17];

	const palmLength = distance3d(wrist, middleMcp);
	const palmWidth = distance3d(indexMcp, pinkyMcp);
	const scale = Math.max(palmLength, palmWidth, 1e-3);

	const thumb = computeFingerState(landmarks, fingerIndices.thumb, scale, { isThumb: true });
	const index = computeFingerState(landmarks, fingerIndices.index, scale);
	const middle = computeFingerState(landmarks, fingerIndices.middle, scale);
	const ring = computeFingerState(landmarks, fingerIndices.ring, scale);
	const pinky = computeFingerState(landmarks, fingerIndices.pinky, scale);

	const palmCenter = {
		x: ((wrist?.x ?? 0) + (indexMcp?.x ?? 0) + (middleMcp?.x ?? 0) + (ringMcp?.x ?? 0) + (pinkyMcp?.x ?? 0)) / 5,
		y: ((wrist?.y ?? 0) + (indexMcp?.y ?? 0) + (middleMcp?.y ?? 0) + (ringMcp?.y ?? 0) + (pinkyMcp?.y ?? 0)) / 5,
		z: ((wrist?.z ?? 0) + (indexMcp?.z ?? 0) + (middleMcp?.z ?? 0) + (ringMcp?.z ?? 0) + (pinkyMcp?.z ?? 0)) / 5,
	};

	const indexMiddleSeparation = distance3d(landmarks[8], landmarks[12]) / scale;
	const middleRingSeparation = distance3d(landmarks[12], landmarks[16]) / scale;
	const ringPinkySeparation = distance3d(landmarks[16], landmarks[20]) / scale;

	const thumbIndexTipDistance = distance3d(landmarks[4], landmarks[8]) / scale;
	const thumbMiddleTipDistance = distance3d(landmarks[4], landmarks[12]) / scale;
	const thumbRingTipDistance = distance3d(landmarks[4], landmarks[16]) / scale;
	const thumbPinkyTipDistance = distance3d(landmarks[4], landmarks[20]) / scale;
	const indexThumbBaseDistance = distance3d(landmarks[4], indexMcp) / scale;

	const fingerExtensionCount = [index, middle, ring, pinky].filter(
		(data) => data.state === "extended",
	).length;
	const fingerHalfCount = [index, middle, ring, pinky].filter(
		(data) => data.state === "half",
	).length;
	const curledCount = [index, middle, ring, pinky].filter(
		(data) => data.state === "curled",
	).length;

	const thumbOut = thumb.horizontal < -0.12;
	const thumbAcrossPalm = thumb.horizontal >= -0.15 && thumb.horizontal <= 0.18;
	const thumbBetweenIndexMiddle =
		thumb.horizontal > -0.1 &&
		thumb.horizontal < 0.15 &&
		(thumb.tip?.y ?? 1) < Math.max(landmarks[8]?.y ?? 1, landmarks[12]?.y ?? 1);

	return {
		landmarks,
		scale,
		palmWidth,
		palmCenter,
		states: { thumb, index, middle, ring, pinky },
		indexMiddleSeparation,
		middleRingSeparation,
		ringPinkySeparation,
		thumbIndexTipDistance,
		thumbMiddleTipDistance,
		thumbRingTipDistance,
		thumbPinkyTipDistance,
		indexThumbBaseDistance,
		fingerExtensionCount,
		fingerHalfCount,
		curledCount,
		thumbOut,
		thumbAcrossPalm,
		thumbBetweenIndexMiddle,
		indexTipPalmDistance: index.tipPalm,
		middleTipPalmDistance: middle.tipPalm,
		ringTipPalmDistance: ring.tipPalm,
		pinkyTipPalmDistance: pinky.tipPalm,
		thumbTipPalmDistance: thumb.tipPalm,
		indexTip: landmarks[8],
		middleTip: landmarks[12],
		ringTip: landmarks[16],
		pinkyTip: landmarks[20],
		thumbTip: landmarks[4],
		indexMcp,
		middleMcp,
		ringMcp,
		pinkyMcp,
		wrist,
	};
};

const matchState = (fingerState, expected) => {
	if (!fingerState) {
		return 0;
	}
	if (expected === "extended") {
		if (fingerState.state === "extended") {
			return 1;
		}
		return fingerState.state === "half" ? 0.6 : 0;
	}
	if (expected === "half") {
		if (fingerState.state === "half") {
			return 1;
		}
		return fingerState.state === "extended" ? 0.6 : 0.4;
	}
	if (expected === "curled") {
		if (fingerState.state === "curled") {
			return 1;
		}
		return fingerState.state === "half" ? 0.5 : 0;
	}
	return 0;
};

const lessThanScore = (value, threshold, slack = 0.05) => {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (value <= threshold) {
		return 1;
	}
	if (value <= threshold + slack) {
		return 0.5;
	}
	return 0;
};

const greaterThanScore = (value, threshold, slack = 0.05) => {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (value >= threshold) {
		return 1;
	}
	if (value >= threshold - slack) {
		return 0.5;
	}
	return 0;
};

const closenessScore = (value, target, tolerance = 0.05) => {
	if (!Number.isFinite(value)) {
		return 0;
	}
	const diff = Math.abs(value - target);
	if (diff <= tolerance) {
		return 1;
	}
	if (diff <= tolerance * 2) {
		return 0.5;
	}
	return 0;
};

const scoreFromConditions = (conditions) => {
	if (!Array.isArray(conditions) || conditions.length === 0) {
		return 0;
	}
	let total = 0;
	for (const condition of conditions) {
		const value = typeof condition === "function" ? condition() : condition;
		if (typeof value === "number") {
			total += clamp(value, 0, 1);
		} else if (value) {
			total += 1;
		}
	}
	return clamp(total / conditions.length, 0, 1);
};

const LETTER_SCORERS = {
	A: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => Math.max(matchState(f.states.thumb, "half"), matchState(f.states.thumb, "extended")),
			() => (f.thumbOut ? 1 : 0.2),
			() => lessThanScore(f.thumbIndexTipDistance, 0.6, 0.2),
			() => greaterThanScore(f.indexTipPalmDistance, 0.3, 0.15),
		]),
	B: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "extended"),
			() => matchState(f.states.pinky, "extended"),
			() => matchState(f.states.thumb, "curled"),
			() => lessThanScore(f.indexMiddleSeparation, 0.22, 0.08),
			() => lessThanScore(f.middleRingSeparation, 0.22, 0.08),
			() => lessThanScore(f.ringPinkySeparation, 0.24, 0.1),
		]),
	C: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "half"),
			() => matchState(f.states.middle, "half"),
			() => matchState(f.states.ring, "half"),
			() => matchState(f.states.pinky, "half"),
			() => matchState(f.states.thumb, "half"),
			() => closenessScore(f.thumbIndexTipDistance, 0.45, 0.2),
			() => closenessScore(f.indexTipPalmDistance, 0.55, 0.2),
		]),
	D: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => lessThanScore(f.thumbIndexTipDistance, 0.25, 0.12),
			() => lessThanScore(f.indexMiddleSeparation, 0.25, 0.1),
			() => greaterThanScore(f.states.index.vertical, 0.28, 0.1),
		]),
	E: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => matchState(f.states.thumb, "curled"),
			() => lessThanScore(f.indexTipPalmDistance, 0.4, 0.12),
			() => lessThanScore(f.thumbIndexTipDistance, 0.35, 0.12),
		]),
	F: (f) =>
		scoreFromConditions([
			() =>
				Math.max(
					matchState(f.states.index, "half"),
					matchState(f.states.index, "extended"),
				),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "extended"),
			() => matchState(f.states.pinky, "extended"),
			() => lessThanScore(f.thumbIndexTipDistance, 0.18, 0.08),
			() => lessThanScore(f.middleRingSeparation, 0.2, 0.1),
		]),
	G: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "half"),
					matchState(f.states.thumb, "extended"),
				),
			() => greaterThanScore(Math.abs(f.states.index.horizontal), 0.15, 0.05),
			() => lessThanScore(Math.abs(f.states.index.vertical), 0.25, 0.1),
			() => (f.states.index.horizontal < 0 ? 1 : 0.2),
		]),
	H: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => matchState(f.states.thumb, "half"),
			() => lessThanScore(Math.abs(f.states.index.vertical), 0.25, 0.1),
			() =>
				f.states.index.horizontal < -0.05 && f.states.middle.horizontal < -0.05
					? 1
					: 0.3,
		]),
	I: (f) =>
		scoreFromConditions([
			() => matchState(f.states.pinky, "extended"),
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.thumb, "curled"),
		]),
	J: (f) =>
		scoreFromConditions([
			() => matchState(f.states.pinky, "extended"),
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.thumb, "curled"),
			() => lessThanScore(Math.abs(f.states.pinky.vertical), 0.35, 0.15),
		]),
	K: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "half"),
					matchState(f.states.thumb, "extended"),
				),
			() => (f.thumbBetweenIndexMiddle ? 1 : 0.3),
			() => lessThanScore(f.indexMiddleSeparation, 0.28, 0.1),
			() => greaterThanScore(f.states.index.vertical, 0.28, 0.08),
		]),
	L: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "extended"),
					matchState(f.states.thumb, "half"),
				),
			() => greaterThanScore(f.states.index.vertical, 0.35, 0.1),
			() => greaterThanScore(Math.abs(f.states.thumb.horizontal), 0.15, 0.05),
		]),
	M: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => matchState(f.states.thumb, "half"),
			() => (f.thumbAcrossPalm ? 1 : 0.3),
			() => ((f.thumbTip?.y ?? 1) > (f.middleTip?.y ?? 1) ? 1 : 0.2),
			() => ((f.thumbTip?.y ?? 1) > (f.ringTip?.y ?? 1) ? 1 : 0.2),
		]),
	N: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => matchState(f.states.thumb, "half"),
			() => (f.thumbAcrossPalm ? 1 : 0.3),
			() =>
				((f.thumbTip?.y ?? 1) > (f.middleTip?.y ?? 1) &&
					(f.thumbTip?.y ?? 1) < (f.ringTip?.y ?? 1))
					? 1
					: 0.2,
		]),
	O: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "half"),
			() => matchState(f.states.middle, "half"),
			() => matchState(f.states.ring, "half"),
			() => matchState(f.states.pinky, "half"),
			() => matchState(f.states.thumb, "half"),
			() => closenessScore(f.thumbIndexTipDistance, 0.32, 0.12),
			() => closenessScore(f.thumbPinkyTipDistance, 0.32, 0.15),
		]),
	P: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "half"),
					matchState(f.states.thumb, "extended"),
				),
			() => (f.thumbBetweenIndexMiddle ? 1 : 0.3),
			() => (f.states.index.vertical < 0 ? 1 : 0.2),
			() => (f.states.middle.vertical < 0 ? 1 : 0.2),
		]),
	Q: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "half"),
					matchState(f.states.thumb, "extended"),
				),
			() => (f.states.index.vertical < 0 ? 1 : 0.2),
			() => (f.states.index.horizontal < -0.05 ? 1 : 0.2),
		]),
	R: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => lessThanScore(f.indexMiddleSeparation, 0.15, 0.05),
			() => greaterThanScore(f.states.index.vertical, 0.3, 0.08),
		]),
	S: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => matchState(f.states.thumb, "curled"),
			() => lessThanScore(f.thumbIndexTipDistance, 0.42, 0.12),
			() => ((f.thumbTip?.y ?? 1) < (f.indexTip?.y ?? 1) ? 1 : 0.2),
		]),
	T: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() =>
				Math.max(
					matchState(f.states.thumb, "half"),
					matchState(f.states.thumb, "curled"),
				),
			() => (f.thumbBetweenIndexMiddle ? 1 : 0.3),
			() => lessThanScore(f.thumbIndexTipDistance, 0.35, 0.1),
		]),
	U: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => lessThanScore(f.indexMiddleSeparation, 0.18, 0.05),
			() => (f.thumbAcrossPalm ? 1 : 0.4),
		]),
	V: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => greaterThanScore(f.indexMiddleSeparation, 0.22, 0.06),
			() => (f.thumbAcrossPalm ? 1 : 0.4),
		]),
	W: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "extended"),
			() => matchState(f.states.ring, "extended"),
			() => matchState(f.states.pinky, "curled"),
			() => greaterThanScore(f.middleRingSeparation, 0.2, 0.06),
			() => (f.thumbAcrossPalm ? 1 : 0.4),
		]),
	X: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "half"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => (f.thumbAcrossPalm ? 1 : 0.4),
			() => lessThanScore(f.indexMiddleSeparation, 0.2, 0.06),
		]),
	Y: (f) =>
		scoreFromConditions([
			() => matchState(f.states.thumb, "extended"),
			() => matchState(f.states.pinky, "extended"),
			() => matchState(f.states.index, "curled"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
		]),
	Z: (f) =>
		scoreFromConditions([
			() => matchState(f.states.index, "extended"),
			() => matchState(f.states.middle, "curled"),
			() => matchState(f.states.ring, "curled"),
			() => matchState(f.states.pinky, "curled"),
			() => greaterThanScore(Math.abs(f.states.index.horizontal), 0.05, 0.05),
		]),
};

export const HAND_SUPPORTED_LETTERS = Object.keys(LETTER_SCORERS);

export function classifyHand(landmarks, { handednessScore = 1 } = {}) {
	if (!Array.isArray(landmarks) || landmarks.length < 21) {
		return {
			bestLetter: null,
			bestScore: 0,
			scores: {},
		};
	}

	const features = computeHandFeatures(landmarks);
	const weight = clamp(0.6 + 0.4 * (handednessScore ?? 1), 0, 1);

	const scores = {};
	let bestLetter = null;
	let bestScore = 0;

	for (const [letter, scorer] of Object.entries(LETTER_SCORERS)) {
		const base = clamp(scorer(features), 0, 1);
		const finalScore = clamp(base * weight, 0, 1);
		scores[letter] = finalScore;
		if (finalScore > bestScore) {
			bestScore = finalScore;
			bestLetter = letter;
		}
	}

	return {
		bestLetter,
		bestScore,
		scores,
	};
}
