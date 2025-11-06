export default function Card({ children, className = "" }) {
	return (
		<div className={`rounded-2xl border border-border-strong bg-surface-card shadow-sm ${className}`}>
			{children}
		</div>
	);
}
