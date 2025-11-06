import { Routes, Route, Navigate } from "react-router-dom";
import { User, BookOpen, Trophy } from "lucide-react";

// Components
import Sidebar from "./components/Sidebar";
import RightColumn from "./components/RightColumn";

// Pages
import AchievementsPage from "./pages/AchievementsPage";
import LessonsPage from "./pages/LessonsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";

function App() {
	const navItems = [
		{ key: "profile", label: "Profile", icon: User, to: "/profile" },
		{ key: "lessons", label: "Lessons", icon: BookOpen, to: "/lessons" },
		{ key: "achievements", label: "Achievements", icon: Trophy, to: "/achievements" },
	];

	return (
		<div className="bg-background text-foreground">
			<div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)_clamp(12rem,24vw,20rem)]">
				<Sidebar
					items={navItems}
					className="w-full border-b border-border lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r"
				/>

				<main className="order-2 flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:order-0">
					<Routes>
						<Route path="/" element={<Navigate to="/lessons" replace />} />
						<Route path="/profile" element={<ProfilePage />} />
						<Route path="/lessons" element={<LessonsPage />} />
						<Route path="/achievements" element={<AchievementsPage />} />
						<Route path="/login" element={<LoginPage />} />
					</Routes>
				</main>

				<RightColumn
					streak={0}
					points={41}
					className="order-3 border-t border-border lg:order-0 lg:sticky lg:top-0 lg:h-screen lg:border-t-0 lg:border-l"
				/>
			</div>
		</div>
	);
}

export default App;
