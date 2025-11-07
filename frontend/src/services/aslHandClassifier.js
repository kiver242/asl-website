const FINGER_INDICES = {
	thumb: { mcp: 1, pip: 2, dip: 3, tip: 4 },
	index: { mcp: 5, pip: 6, dip: 7, tip: 8 },
	middle: { mcp: 9, pip: 10, dip: 11, tip: 12 },
	ring: { mcp: 13, pip: 14, dip: 15, tip: 16 },
	pinky: { mcp: 17, pip: 18, dip: 19, tip: 20 },
};

const CURL_STATES = {
	extended: 0,
	half: 0.5,
	curled: 1,
};

const toVec3 = (point) => [
	point[0],
	point[1],
	point.length > 2 ? point[2] : 0,
];

const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

const magnitude = (vector) =>
	Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2) || 0.00001;

const normalized = (vector) => {
	const length = magnitude(vector) || 0.00001;
	return [vector[0] / length, vector[1] / length, vector[2] / length];
};

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const angleBetween = (a, b) => {
	const unitA = normalized(a);
	const unitB = normalized(b);
	const cosine = clamp(dot(unitA, unitB), -1, 1);
	return Math.acos(cosine) * (180 / Math.PI);
};

const getDirection = (vector) => {
	const [x, y] = vector;
	if (Math.abs(y) >= Math.abs(x) * 1.6) {
		return y < 0 ? "up" : "down";
	}
	if (Math.abs(x) >= Math.abs(y) * 1.6) {
		return x > 0 ? "right" : "left";
	}
	if (y < 0) {
		return x > 0 ? "up_right" : "up_left";
	}
	return x > 0 ? "down_right" : "down_left";
};

const curlFromAngles = (angleOne, angleTwo) => {
	const avg = (angleOne + angleTwo) / 2;
	if (avg <= 38) {
		return "extended";
	}
	if (avg <= 68) {
		return "half";
	}
	return "curled";
};

const fingerData = (landmarks, finger) => {
	const indices = FINGER_INDICES[finger];
	const mcp = toVec3(landmarks[indices.mcp]);
	const pip = toVec3(landmarks[indices.pip]);
	const dip = toVec3(landmarks[indices.dip]);
	const tip = toVec3(landmarks[indices.tip]);

	const angleOne = angleBetween(subtract(pip, mcp), subtract(dip, pip));
	const angleTwo = angleBetween(subtract(dip, pip), subtract(tip, dip));
	const curl = curlFromAngles(angleOne, angleTwo);
	const direction = getDirection(subtract(tip, mcp));

	const curlValue = CURL_STATES[curl];

	return {
		finger,
		curl,
		curlValue,
		direction,
		mcp,
		pip,
		dip,
		tip,
	};
};

const distance = (a, b) => magnitude(subtract(a, b));

const average = (values) => {
	if (!values.length) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const confidenceFromMatches = (scores) => clamp(average(scores), 0, 1);

const computeHandMetrics = (landmarks) => {
	const wrist = toVec3(landmarks[0]);
	const middleFingerTip = toVec3(landmarks[FINGER_INDICES.middle.tip]);
	const referenceLength = distance(wrist, middleFingerTip) || 0.00001;

	const fingerStates = {
		thumb: fingerData(landmarks, "thumb"),
		index: fingerData(landmarks, "index"),
		middle: fingerData(landmarks, "middle"),
		ring: fingerData(landmarks, "ring"),
		pinky: fingerData(landmarks, "pinky"),
	};

	const normalizedDistance = (pointA, pointB) =>
		distance(pointA, pointB) / referenceLength;

	const { thumb, index, middle, ring, pinky } = fingerStates;

	const separation = {
		indexMiddle: normalizedDistance(index.tip, middle.tip),
		middleRing: normalizedDistance(middle.tip, ring.tip),
		ringPinky: normalizedDistance(ring.tip, pinky.tip),
		indexThumb: normalizedDistance(index.tip, thumb.tip),
		middleThumb: normalizedDistance(middle.tip, thumb.tip),
		ringThumb: normalizedDistance(ring.tip, thumb.tip),
		pinkyThumb: normalizedDistance(pinky.tip, thumb.tip),
		indexThumbBase: normalizedDistance(index.mcp, thumb.tip),
		middleThumbBase: normalizedDistance(middle.mcp, thumb.tip),
		indexPinky: normalizedDistance(index.tip, pinky.tip),
	};

	const isRightHand = thumb.tip[0] < pinky.tip[0];

	return {
		fingers: fingerStates,
		separation,
		isRightHand,
		referenceLength,
	};
};

const fingerMatchesCurl = (finger, expected) => {
	if (Array.isArray(expected)) {
		return expected.includes(finger.curl) ? 1 : 0;
	}
	return finger.curl === expected ? 1 : 0;
};

const fingerMatchesDirection = (finger, allowedDirections) => {
	if (!allowedDirections.length) {
		return 1;
	}
	return allowedDirections.includes(finger.direction) ? 1 : 0;
};

const classifyStaticFingers = (metrics) => {
	const { fingers, separation } = metrics;
	const { thumb, index, middle, ring, pinky } = fingers;

	const curledCount = [index, middle, ring, pinky].filter(
		(item) => item.curl === "curled",
	).length;
	const extendedCount = [index, middle, ring, pinky].filter(
		(item) => item.curl === "extended",
	).length;
	const anyHalfCurl =
		index.curl === "half" ||
		middle.curl === "half" ||
		ring.curl === "half" ||
		pinky.curl === "half";

	// A, S, T, M, N, E (mainly fist family)
	if (curledCount === 4) {
		const thumbExtendedScore = fingerMatchesCurl(thumb, ["extended", "half"]);
		const thumbAcrossPalm = separation.indexThumb < 0.45;
		const thumbBetweenIndexMiddle =
			separation.indexThumbBase < 0.35 && separation.middleThumbBase < 0.35;

		if (thumbBetweenIndexMiddle && thumb.curl !== "curled") {
			const confidence = confidenceFromMatches([
				thumbExtendedScore,
				1 - separation.indexThumb,
			]);
			return { letter: "T", confidence: clamp(confidence, 0, 1) };
		}

		if (thumb.curl === "curled") {
			const confidence = confidenceFromMatches([
				1 - separation.indexThumb,
				1 - separation.middleThumb,
				1 - separation.ringThumb,
			]);
			return { letter: "S", confidence };
		}

		if (thumbAcrossPalm && thumb.curl !== "curled") {
			const confidence = confidenceFromMatches([
				thumbExtendedScore,
				1 - separation.indexThumb,
			]);
			if (separation.middleThumb < 0.4 && separation.ringThumb < 0.45) {
				return { letter: "M", confidence };
			}
			if (separation.middleThumb < 0.45) {
				return { letter: "N", confidence };
			}
			return { letter: "E", confidence: confidence * 0.7 };
		}

		const confidence = confidenceFromMatches([
			thumbExtendedScore,
			1 - separation.indexThumbBase,
		]);
		return { letter: "A", confidence };
	}

	// B, W, U/V, R, H, K, P
	if (extendedCount >= 2 && !anyHalfCurl) {
		if (extendedCount === 4 && thumb.curl === "curled") {
			const confidence = confidenceFromMatches([
				fingerMatchesDirection(index, ["up", "up_left", "up_right"]),
				fingerMatchesDirection(middle, ["up", "up_left", "up_right"]),
			]);
			return { letter: "B", confidence };
		}

		if (extendedCount === 3 && thumb.curl !== "curled") {
			const confidence = confidenceFromMatches([
				fingerMatchesDirection(index, ["up", "up_left", "up_right"]),
				fingerMatchesDirection(middle, ["up", "up_left", "up_right"]),
				fingerMatchesDirection(ring, ["up", "up_left", "up_right"]),
			]);
			return { letter: "W", confidence };
		}

		if (extendedCount === 2) {
			const extendedFingers = [index, middle].filter(
				(item) => item.curl === "extended",
			);
			if (extendedFingers.length === 2) {
				if (
					fingerMatchesDirection(index, ["up", "up_left", "up_right"]) &&
					fingerMatchesDirection(middle, ["up", "up_left", "up_right"])
				) {
					if (thumb.curl === "extended") {
						const separationScore = clamp(
							1 - Math.abs(separation.indexMiddle - 0.3),
							0,
							1,
						);
						if (separation.indexMiddle < 0.25) {
							return { letter: "U", confidence: separationScore };
						}
						return { letter: "V", confidence: separationScore };
					}

					if (thumb.curl !== "curled") {
						const confidence = confidenceFromMatches([
							1 - separation.indexMiddle,
							1 - separation.middleThumbBase,
						]);
						return { letter: "K", confidence };
					}

					const confidence = confidenceFromMatches([
						1 - separation.indexMiddle,
						0.6 + separation.indexThumb * 0.4,
					]);
					return { letter: "R", confidence };
				}

				if (
					fingerMatchesDirection(index, ["left", "right"]) &&
					fingerMatchesDirection(middle, ["left", "right"])
				) {
					const confidence = confidenceFromMatches([
						1 - separation.indexMiddle,
						1 - separation.middleThumb,
					]);
					if (thumb.direction === "down" || thumb.direction === "down_left" || thumb.direction === "down_right") {
						return { letter: "P", confidence };
					}
					return { letter: "H", confidence };
				}
			}
		}
	}

	// L, D, G, Q
	if (index.curl === "extended" && middle.curl !== "extended") {
		if (thumb.curl !== "curled") {
			const angleScore = fingerMatchesDirection(index, [
				"up",
				"up_left",
				"up_right",
			]);
			if (fingerMatchesDirection(thumb, ["left", "right", "down_left", "down_right"])) {
				const confidence = confidenceFromMatches([
					angleScore,
					1 - separation.indexThumb,
				]);
				return { letter: "L", confidence };
			}
		}

		if (thumb.curl !== "extended") {
			const confidence = confidenceFromMatches([
				1 - separation.indexThumb,
				1 - separation.middleThumb,
			]);
			return { letter: "D", confidence };
		}

		const horizontalScore = fingerMatchesDirection(index, ["left", "right"]);
		const thumbHorizontalScore = fingerMatchesDirection(thumb, ["left", "right"]);
		const confidence = confidenceFromMatches([
			horizontalScore,
			thumbHorizontalScore,
		]);
		if (thumb.direction === "down" || index.direction === "down") {
			return { letter: "Q", confidence };
		}
		return { letter: "G", confidence };
	}

	// X, Y, F, C, O, I, J, Z
	if (index.curl === "half" && middle.curl === "curled") {
		const confidence = confidenceFromMatches([
			1 - separation.indexThumbBase,
			fingerMatchesDirection(index, [
				"up",
				"up_left",
				"up_right",
				"left",
				"right",
			]),
		]);
		return { letter: "X", confidence };
	}

	if (thumb.curl === "extended" && pinky.curl === "extended") {
		const confidence = confidenceFromMatches([
			1 - separation.pinkyThumb,
			fingerMatchesDirection(thumb, ["left", "right"]),
		]);
		return { letter: "Y", confidence };
	}

	if (
		thumb.curl === "half" &&
		index.curl === "half" &&
		middle.curl === "extended" &&
		ring.curl === "extended" &&
		pinky.curl === "extended"
	) {
		const confidence = confidenceFromMatches([
			1 - separation.indexThumb,
			fingerMatchesDirection(index, ["up", "up_left", "up_right"]),
		]);
		return { letter: "F", confidence };
	}

	if (index.curl === "half" && middle.curl === "half" && ring.curl === "half" && pinky.curl === "half") {
		const circleScore = confidenceFromMatches([
			1 - Math.abs(separation.indexThumb - 0.35),
			1 - Math.abs(separation.middleThumb - 0.35),
		]);
		return { letter: "C", confidence: circleScore };
	}

	if (
		index.curl === "half" &&
		middle.curl === "half" &&
		ring.curl === "half" &&
		pinky.curl === "half" &&
		separation.indexThumb < 0.3 &&
		separation.middleThumb < 0.3
	) {
		const confidence = confidenceFromMatches([
			1 - separation.indexThumb,
			1 - separation.middleThumb,
		]);
		return { letter: "O", confidence };
	}

	if (pinky.curl === "extended" && index.curl !== "extended") {
		const confidence = confidenceFromMatches([
			1 - separation.pinkyThumb,
			fingerMatchesDirection(pinky, ["up", "up_left", "up_right"]),
		]);
		return { letter: "I", confidence };
	}

	const horizontalIndex =
		index.direction === "right" ||
		index.direction === "left" ||
		index.direction === "down_right" ||
		index.direction === "down_left" ||
		index.direction === "up_right" ||
		index.direction === "up_left";
	if (horizontalIndex && curledCount <= 2) {
		const confidence = confidenceFromMatches([
			1 - separation.indexThumb,
			1 - separation.indexMiddle,
		]);
		return { letter: "Z", confidence: confidence * 0.8 };
	}

	return null;
};

/**
 * Classify an ASL letter from the given hand landmarks.
 * @param {number[][]} landmarks
 * @returns {{ letter: string | null, confidence: number }}
 */
export function classifyHandPose(landmarks) {
	if (!Array.isArray(landmarks) || landmarks.length < 21) {
		return { letter: null, confidence: 0 };
	}

	const metrics = computeHandMetrics(landmarks);
	const result = classifyStaticFingers(metrics);

	if (!result) {
		return { letter: null, confidence: 0 };
	}

	const normalizedConfidence = clamp(result.confidence, 0, 1);
	if (normalizedConfidence <= 0) {
		return { letter: null, confidence: 0 };
	}

	return { letter: result.letter, confidence: normalizedConfidence };
}
