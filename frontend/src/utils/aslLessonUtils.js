const LETTER_ONLY_PATTERN = /[^A-Z]/g;

export const sanitizeNameInput = (rawValue) => {
	if (!rawValue || typeof rawValue !== "string") {
		return "";
	}
	const trimmed = rawValue.trim().toUpperCase();
	return trimmed.replace(LETTER_ONLY_PATTERN, "");
};

export const nameToLetters = (rawValue) => {
	const sanitized = sanitizeNameInput(rawValue);
	return sanitized.split("").filter(Boolean);
};

export const calculateProgressPercentage = (completedSteps, totalSteps) => {
	if (!totalSteps || totalSteps <= 0) {
		return 0;
	}
	const safeCompleted = Math.max(0, Math.min(completedSteps, totalSteps));
	return Math.round((safeCompleted / totalSteps) * 100);
};

export const getLessonStepLabel = (index, total) => {
	if (!total || total <= 0) {
		return "No letters yet";
	}
	return `Letter ${index + 1} of ${total}`;
};
