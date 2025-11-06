export default function ProgressBar({ value = 0 }) {
	const clamped = Math.min(100, Math.max(0, value));
	return (
		<div className="h-2 w-full overflow-hidden rounded-full bg-surface-strong">
			<div className="h-full bg-accent" style={{ width: `${clamped}%` }} />
		</div>
	);
}
