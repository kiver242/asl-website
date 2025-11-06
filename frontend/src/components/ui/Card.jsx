export default function Card({ children, className = "" }) {
	return (
		<div className={`rounded-2xl bg-zinc-900/60 border border-zinc-800 s ${className}`}>
			{children}
		</div>
	);
}
