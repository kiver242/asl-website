import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertCircle, CameraOff, Loader2 } from "lucide-react";

const cx = (...classes) =>
	classes
		.flatMap((value) => {
			if (typeof value === "string") {
				return value.split(" ");
			}
			if (Array.isArray(value)) {
				return value;
			}
			if (typeof value === "object" && value !== null) {
				return Object.entries(value)
					.filter(([, condition]) => Boolean(condition))
					.map(([className]) => className);
			}
			return [];
		})
		.filter(Boolean)
		.join(" ");

const stopStream = (stream) => {
	if (!stream) {
		return;
	}
	stream.getTracks().forEach((track) => track.stop());
};

const CAMERA_START_TIMEOUT_MS = 10_000;
const HAVE_CURRENT_DATA_STATE = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_CURRENT_DATA : 2;

const createCameraError = (message, originalError) => {
	const error = new Error(message);
	if (originalError instanceof Error) {
		error.name = originalError.name;
		error.cause = originalError;
	}
	return error;
};

const mapCameraError = (error) => {
	if (error instanceof Error) {
		switch (error.name) {
			case "NotAllowedError":
			case "PermissionDeniedError":
				return createCameraError("Camera access was blocked. Please allow permissions and try again.", error);
			case "NotFoundError":
			case "DevicesNotFoundError":
				return createCameraError("We couldn't detect a camera on this device.", error);
			case "NotReadableError":
			case "TrackStartError":
				return createCameraError(
					"We couldn't start the camera. It may be busy or in use by another application.",
					error,
				);
			case "OverconstrainedError":
				return createCameraError(
					"This camera doesn't support the requested video configuration. Try adjusting your settings or use a different device.",
					error,
				);
			case "TimeoutError":
				return createCameraError(
					"We couldn't start the camera in time. Check that no other app is using it and try again.",
					error,
				);
			default:
		}
		if (error.message?.toLowerCase().includes("timeout")) {
			return createCameraError(
				"We couldn't start the camera in time. Check that no other app is using it and try again.",
				error,
			);
		}
		return error;
	}
	if (typeof error === "string" && error.trim().length > 0) {
		return createCameraError(error, null);
	}
	return createCameraError(
		"We couldn't access your camera. Check your browser permissions and try again.",
		error instanceof Error ? error : null,
	);
};

const createPlaybackMonitor = (videoElement, { onReady, onError }) => {
	if (!videoElement) {
		return null;
	}

	if (videoElement.readyState >= HAVE_CURRENT_DATA_STATE) {
		onReady();
		return null;
	}

	let timeoutId;
	let isSettled = false;
	let handleReady;
	let handleFailure;

	const cleanup = () => {
		clearTimeout(timeoutId);
		if (handleReady) {
			videoElement.removeEventListener("loadeddata", handleReady);
			videoElement.removeEventListener("canplay", handleReady);
			videoElement.removeEventListener("canplaythrough", handleReady);
		}
		if (handleFailure) {
			videoElement.removeEventListener("error", handleFailure);
			videoElement.removeEventListener("stalled", handleFailure);
			videoElement.removeEventListener("abort", handleFailure);
		}
	};

	const settle = (callback) => (event) => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		cleanup();
		callback(event);
	};

	handleReady = settle(() => {
		onReady();
	});

	handleFailure = settle((event) => {
		const fromEvent =
			event instanceof Event && "error" in event
				? event.error
				: event instanceof Error
					? event
					: new Error("Camera stream could not start.");
		onError(fromEvent);
	});

	timeoutId = setTimeout(() => {
		handleFailure(new Error("Timed out while starting the camera."));
	}, CAMERA_START_TIMEOUT_MS);

	videoElement.addEventListener("loadeddata", handleReady, { once: true });
	videoElement.addEventListener("canplay", handleReady, { once: true });
	videoElement.addEventListener("canplaythrough", handleReady, { once: true });
	videoElement.addEventListener("error", handleFailure, { once: true });
	videoElement.addEventListener("stalled", handleFailure, { once: true });
	videoElement.addEventListener("abort", handleFailure, { once: true });

	return () => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		cleanup();
	};
};

const WebcamViewer = forwardRef(function WebcamViewer(
	{
		isActive = false,
		className,
		onStatusChange,
		onReady,
		onError,
		label = "Webcam preview",
	},
	externalRef,
) {
	const videoRef = useRef(null);
	const streamRef = useRef(null);
	const playbackMonitorRef = useRef(null);
	const [status, setStatus] = useState("idle"); // idle | starting | ready | error
	const [error, setError] = useState(null);

	useImperativeHandle(externalRef, () => videoRef.current);

	useEffect(() => {
		onStatusChange?.(status);
	}, [status, onStatusChange]);

	useEffect(() => {
		return () => {
			stopStream(streamRef.current);
			streamRef.current = null;
		};
	}, []);

	useEffect(() => {
		const videoElement = videoRef.current;
		if (!isActive) {
			setStatus("idle");
			setError(null);
			if (playbackMonitorRef.current) {
				playbackMonitorRef.current();
				playbackMonitorRef.current = null;
			}
			stopStream(streamRef.current);
			streamRef.current = null;
			if (videoElement) {
				videoElement.srcObject = null;
			}
			return;
		}

		if (!navigator.mediaDevices?.getUserMedia) {
			const err = new Error(
				"Camera API is not available in this browser. Please try a different device.",
			);
			setStatus("error");
			setError(err);
			onError?.(err);
			return;
		}

		let cancelled = false;
		const fail = (rawError) => {
			if (cancelled) {
				return;
			}
			const friendlyError = mapCameraError(rawError);
			if (playbackMonitorRef.current) {
				playbackMonitorRef.current();
				playbackMonitorRef.current = null;
			}
			stopStream(streamRef.current);
			streamRef.current = null;
			if (videoElement) {
				videoElement.srcObject = null;
			}
			setStatus("error");
			setError(friendlyError);
			onError?.(friendlyError);
		};

		const start = async () => {
			let stream;
			try {
				setStatus("starting");
				setError(null);
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: "user",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
					audio: false,
				});
				if (cancelled) {
					stopStream(stream);
					return;
				}
				streamRef.current = stream;
				if (videoElement) {
					videoElement.srcObject = stream;
					if (playbackMonitorRef.current) {
						playbackMonitorRef.current();
						playbackMonitorRef.current = null;
					}
					const monitorCleanup = createPlaybackMonitor(videoElement, {
						onReady: () => {
							if (cancelled) {
								return;
							}
							setStatus("ready");
							setError(null);
							onReady?.(videoElement);
						},
						onError: (monitorError) => {
							fail(monitorError);
						},
					});
					if (monitorCleanup) {
						playbackMonitorRef.current = monitorCleanup;
					}
					const playPromise = videoElement.play();
					if (playPromise && typeof playPromise.catch === "function") {
						playPromise.catch((playError) => {
							fail(playError);
						});
					}
				} else {
					fail(new Error("Camera preview element is not available."));
				}
			} catch (err) {
				if (cancelled) {
					if (stream) {
						stopStream(stream);
					}
					return;
				}
				if (stream) {
					stopStream(stream);
				}
				fail(err);
			}
		};

		start();

		return () => {
			cancelled = true;
			if (playbackMonitorRef.current) {
				playbackMonitorRef.current();
				playbackMonitorRef.current = null;
			}
			stopStream(streamRef.current);
			streamRef.current = null;
			if (videoElement) {
				videoElement.srcObject = null;
			}
		};
	}, [isActive, onReady, onError]);

	return (
		<div className={cx("relative flex flex-col gap-2", className)}>
			<div className="flex items-center justify-between text-sm font-medium text-foreground-subtle">
				<span>{label}</span>
				<span className="text-xs uppercase tracking-wide">
					{status === "ready" && "Live"}
					{status === "starting" && "Starting"}
					{status === "idle" && "Idle"}
					{status === "error" && "Unavailable"}
				</span>
			</div>
			<div
				className={cx("relative aspect-video w-full overflow-hidden rounded-2xl border", {
					"border-destructive/60 bg-destructive/10": status === "error",
					"border-border-soft": status !== "error",
				})}
			>
				<video
					ref={videoRef}
					className={cx("h-full w-full object-cover", {
						"opacity-0": status !== "ready",
						"opacity-100 transition-opacity duration-300": status === "ready",
					})}
					playsInline
					muted
					autoPlay
					aria-label={label}
				/>

				{status !== "ready" ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-muted/80 text-center">
						{status === "starting" ? (
							<>
								<Loader2 className="h-8 w-8 animate-spin text-accent" />
								<p className="max-w-xs text-sm text-foreground-subtle">
									Starting your camera. Please allow access if prompted.
								</p>
							</>
						) : null}
						{status === "idle" ? (
							<>
								<CameraOff className="h-8 w-8 text-foreground-muted" />
								<p className="max-w-xs text-sm text-foreground-subtle">
									Enable the webcam when you are ready to practise.
								</p>
							</>
						) : null}
						{status === "error" ? (
							<>
								<AlertCircle className="h-8 w-8 text-destructive" />
								<p className="max-w-xs text-sm text-destructive">
									{error?.message ??
										"We could not access your camera. Check your browser permissions and try again."}
								</p>
							</>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
});

export default WebcamViewer;
