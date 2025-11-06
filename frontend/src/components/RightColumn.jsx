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
		<div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-zinc-200">
			<Icon className="h-4 w-4" />
			<span className="text-xs/4 uppercase tracking-wide text-zinc-400">{label}</span>
			<span className="text-sm font-semibold">{value}</span>
		</div>
	);
}

function LoginCard() {
	return (
		<Card className="p-5">
			<h3 className="text-lg font-semibold text-zinc-100">Welcome back!</h3>
			<p className="text-sm text-zinc-400 mt-1">Create a profile to save progress</p>
			<div className="mt-4 flex gap-2">
				<button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
					<LogIn className="h-4 w-4" /> Sign in
				</button>
				<button className="flex-1 inline-flex items-center justify-center rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800/60">
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
			<div className="h-12 w-12 rounded-2xl bg-zinc-800 grid place-items-center shrink-0">
				<Icon className="h-6 w-6 text-emerald-400" />
			</div>
			<div>
				<h4 className="font-semibold text-zinc-100">{mood.title}</h4>
				<p className="text-sm text-zinc-400 mt-1">{mood.text}</p>
			</div>
		</Card>
	);
}

export default function RightColumn({ streak, points, className = "" }) {
	return (
		<aside
			className={`flex min-h-0 flex-col bg-zinc-950/95 border-zinc-800/60 backdrop-blur p-4 ${className}`}
		>
			<div className="mb-3 flex items-center gap-2">
				<StatPill icon={Flame} label="Streak" value={streak} />
				<StatPill icon={Star} label="Points" value={points} />
			</div>

			<div className="flex-1 overflow-y-auto space-y-3 pr-1">
				<LoginCard />
				<MoodCard didStudyToday={streak > 0} />
			</div>

			<div className="mt-3 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500 flex items-center gap-3">
				<a href="#" className="hover:text-zinc-300">
					About
				</a>
				<span>•</span>
				<a href="#" className="hover:text-zinc-300">
					Privacy
				</a>
			</div>
		</aside>
	);
}
