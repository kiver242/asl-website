import { NavLink } from "react-router-dom";

export default function Sidebar({ items, className = "" }) {
	return (
		<aside
			className={`flex min-h-0 flex-col bg-surface-overlay border-border backdrop-blur ${className}`}
		>
			{/* Logo */}
			<div className="flex h-16 items-center border-b border-border px-5">
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold text-foreground">Placeholder</span>
				</div>
			</div>

			{/* Nav buttons */}
			<nav className="flex flex-1 flex-col gap-2 px-3 py-4">
				{items.map((item) => (
					<NavLink
						key={item.key}
						to={item.to}
						className={({ isActive }) =>
							`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ` +
							(isActive
								? "bg-accent-soft border border-accent-border text-accent-muted"
								: "text-foreground-muted hover:bg-surface-hover border border-transparent")
						}
					>
						<item.icon className="h-5 w-5" />
						<span className="font-medium">{item.label}</span>
					</NavLink>
				))}
			</nav>
		</aside>
	);
}
