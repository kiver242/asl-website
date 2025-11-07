import { describe, expect, it } from "vitest";
import {
	calculateProgressPercentage,
	getLessonStepLabel,
	nameToLetters,
	sanitizeNameInput,
} from "../aslLessonUtils";

describe("sanitizeNameInput", () => {
	it("removes spaces and non-letter characters while uppercasing", () => {
		expect(sanitizeNameInput("  Alex  ")).toBe("ALEX");
		expect(sanitizeNameInput("Mia-Rose")).toBe("MIAROSE");
		expect(sanitizeNameInput("j@ne!")).toBe("JNE");
	});

	it("returns empty string when input is falsy", () => {
		expect(sanitizeNameInput("")).toBe("");
		expect(sanitizeNameInput(null)).toBe("");
		expect(sanitizeNameInput(undefined)).toBe("");
	});
});

describe("nameToLetters", () => {
	it("splits sanitized names into an array of uppercase letters", () => {
		expect(nameToLetters("Kai")).toEqual(["K", "A", "I"]);
		expect(nameToLetters("o'connor")).toEqual(["O", "C", "O", "N", "N", "O", "R"]);
	});

	it("returns an empty array for invalid inputs", () => {
		expect(nameToLetters("")).toEqual([]);
		expect(nameToLetters("123")).toEqual([]);
	});
});

describe("calculateProgressPercentage", () => {
	it("returns 0 when total steps is zero", () => {
		expect(calculateProgressPercentage(2, 0)).toBe(0);
	});

	it("clamps progress between 0 and 100", () => {
		expect(calculateProgressPercentage(-1, 5)).toBe(0);
		expect(calculateProgressPercentage(10, 5)).toBe(100);
	});

	it("rounds to the nearest integer", () => {
		expect(calculateProgressPercentage(1, 3)).toBe(33);
		expect(calculateProgressPercentage(2, 3)).toBe(67);
	});
});

describe("getLessonStepLabel", () => {
	it("returns a friendly step label", () => {
		expect(getLessonStepLabel(0, 4)).toBe("Letter 1 of 4");
		expect(getLessonStepLabel(3, 4)).toBe("Letter 4 of 4");
	});

	it("handles missing totals", () => {
		expect(getLessonStepLabel(0, 0)).toBe("No letters yet");
	});
});
