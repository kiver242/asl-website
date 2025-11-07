import { useMemo } from "react";
import {
	Flame,
	Star,
	LogIn,
	PartyPopper,
	Frown,
	Meh,
	CloudRain,
	Sun,
	Smile,
} from "lucide-react";
import Card from "./ui/Card";
import moodsData from "../../data/moods.json";

const moodIcons = {
	Frown,
	Meh,
	CloudRain,
	Sun,
	Smile,
};

function StatPill({ icon: Icon, label, value }) {
	return (
		<div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-muted px-3 py-1 text-foreground-soft">
			<Icon className="h-4 w-4" />
			<span className="text-xs/4 uppercase tracking-wide text-foreground-subtle">{label}</span>
			<span className="text-sm font-semibold">{value}</span>
		</div>
	);
}

function LoginCard() {
	return (
		<Card className="p-5">
			<h3 className="text-lg font-semibold text-foreground">Welcome back!</h3>
			<p className="mt-1 text-sm text-foreground-subtle">Create a profile to save progress</p>
			<div className="mt-4 flex gap-2">
				<button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent">
					<LogIn className="h-4 w-4" /> Sign in
				</button>
				<button className="flex-1 inline-flex items-center justify-center rounded-xl border border-border-strong px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover">
					Create account
				</button>
			</div>
		</Card>
	);
}

function MoodCard({ didStudyToday }) {
	const mood = useMemo(() => {
		if (didStudyToday) {
			return {
				icon: PartyPopper,
				title: "Great job!",
				text: "You kept your streak alive. Keep the momentum going.",
			};
		}
		const fallback = moodsData[0];
		const randomMood =
			moodsData[Math.floor(Math.random() * moodsData.length)] ?? fallback;
		const IconComponent = moodIcons[randomMood.icon] ?? Smile;
		return {
			...randomMood,
			icon: IconComponent,
		};
	}, [didStudyToday]);

	const Icon = mood.icon;
	return (
		<Card className="p-5 flex items-start gap-3">
			<div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-strong">
				<Icon className="h-6 w-6 text-accent-emphasis" />
			</div>
			<div>
				<h4 className="font-semibold text-foreground">{mood.title}</h4>
				<p className="mt-1 text-sm text-foreground-subtle">{mood.text}</p>
			</div>
		</Card>
	);
}

export default function RightColumn({ streak, points, className = "" }) {
	const safeStreak = Number.isFinite(streak) && streak > 0 ? streak : 0;
	const safePoints = Number.isFinite(points) && points > 0 ? points : 0;
	const formattedPoints = Intl.NumberFormat().format(safePoints);

	return (
		<aside
			className={`flex min-h-0 flex-col bg-surface-overlay border-border backdrop-blur p-4 ${className}`}
		>
			<div className="mb-3 flex items-center gap-2">
				<StatPill icon={Flame} label="Streak" value={safeStreak} />
				<StatPill icon={Star} label="Points" value={formattedPoints} />
			</div>

			<div className="flex-1 overflow-y-auto space-y-3 pr-1">
				<LoginCard />
				<MoodCard didStudyToday={safeStreak > 0} />
			</div>

			<div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-foreground-dim">
				<a href="#" className="hover:text-foreground-muted">
					About
				</a>
				<span>•</span>
				<a href="#" className="hover:text-foreground-muted">
					Privacy
				</a>
			</div>
		</aside>
	);
}
