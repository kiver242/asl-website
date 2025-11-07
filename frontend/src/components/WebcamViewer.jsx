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
		const start = async () => {
			try {
				setStatus("starting");
				const stream = await navigator.mediaDevices.getUserMedia({
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
					await videoElement.play();
					setStatus("ready");
					onReady?.(videoElement);
				}
			} catch (err) {
				if (cancelled) {
					return;
				}
				setStatus("error");
				setError(err);
				onError?.(err);
			}
		};

		start();

		return () => {
			cancelled = true;
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
