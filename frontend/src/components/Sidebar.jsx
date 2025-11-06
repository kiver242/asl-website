import { NavLink } from "react-router-dom";

export default function Sidebar({ items, className = "" }) {
	return (
		<aside
			className={`flex min-h-0 flex-col bg-zinc-950/95 border-zinc-800/60 backdrop-blur ${className}`}
		>
			{/* Logo */}
			<div className="flex h-16 items-center border-b border-zinc-800/60 px-5">
				<div className="flex items-center gap-2">
					<span className="text-lg font-bold text-zinc-100">Placeholder</span>
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
								? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
								: "text-zinc-300 hover:bg-zinc-800/60 border border-transparent")
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
