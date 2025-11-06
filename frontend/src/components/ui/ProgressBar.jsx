export default function ProgressBar({ value = 0 }) {
	const clamped = Math.min(100, Math.max(0, value));
	return (
		<div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
			<div className="h-full bg-emerald-500" style={{ width: `${clamped}%` }} />
		</div>
	);
}
