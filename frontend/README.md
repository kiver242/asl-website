# ASL Tutor Frontend

This React + Vite app powers the Duolingo-style ASL tutor. Lesson 1 now guides learners through spelling their own name using the ASL manual alphabet, live webcam feedback, and a pluggable detection service.

## Quick start

Install dependencies and launch the dev server:

```shell
npm install
npm run dev
```

Visit `http://localhost:5173` to try the lesson in your browser.

## Lesson 1 · Spell Your Name in ASL

- Enter any name using the letters A–Z; we automatically strip spaces and punctuation.
- The app turns on your webcam, shows the ASL handshape for each letter, and waits until the detector reports a confident match before unlocking the next step.
- Images for the reference alphabet are sourced from Wikimedia Commons (CC BY-SA 4.0). See `src/data/aslLetterImages.js` for the full mapping and attribution.

### Detection model (MVP placeholder)

The detection layer lives in `src/services/aslDetector.js`. Right now it exposes the production-ready interface but runs in a keyboard-driven debug mode so we can swap in a real handshape classifier later:

- Press the matching letter key while the webcam view is active to simulate a detection above threshold.
- Developers can also call `window.aslDetectorDebug.setPrediction(letter, confidence)` from the console to test different scenarios.

To integrate an actual hand pose model, replace the logic inside `predictLetterFromFrame(videoElement)` and adjust `initASLModel()` as needed; the lesson UI will continue to poll the same API.

### Camera tips / fallbacks

- Learners see friendly permission messaging plus retry actions if the webcam is unavailable.
- The detector only runs once the camera is ready and the model has loaded, and it requires a steady match for one second by default (`HOLD_DURATION_MS` in `SpellYourNameLesson.jsx`).

## Testing

Minimal unit tests cover name sanitisation and progress math:

```shell
npm test
```

Add additional tests under `src/**/__tests__` as the detection pipeline evolves.

## Connecting to backend APIs

The Vite proxy (`vite.config.js`) forwards `/api/*` requests to the backend during development, so frontend code can call `/api/...` without worrying about CORS.
