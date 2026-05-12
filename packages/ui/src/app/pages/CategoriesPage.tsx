import { useNavigate } from "react-router";

const CATEGORIES = [
	{ id: "action", label: "🎬 动作", gradient: "linear-gradient(135deg, oklch(50% 0.18 15), oklch(30% 0.12 30))" },
	{ id: "scifi", label: "🚀 科幻", gradient: "linear-gradient(135deg, oklch(45% 0.14 200), oklch(28% 0.09 240))" },
	{ id: "comedy", label: "😂 喜剧", gradient: "linear-gradient(135deg, oklch(40% 0.13 340), oklch(25% 0.08 10))" },
	{ id: "drama", label: "🎭 剧情", gradient: "linear-gradient(135deg, oklch(48% 0.1 160), oklch(30% 0.07 180))" },
	{ id: "horror", label: "👻 恐怖", gradient: "linear-gradient(135deg, oklch(42% 0.05 260), oklch(26% 0.04 280))" },
	{ id: "adventure", label: "🏕️ 冒险", gradient: "linear-gradient(135deg, oklch(55% 0.12 80), oklch(32% 0.08 100))" },
	{ id: "romance", label: "💕 爱情", gradient: "linear-gradient(135deg, oklch(50% 0.16 330), oklch(28% 0.1 350))" },
	{ id: "mystery", label: "🕵️ 悬疑", gradient: "linear-gradient(135deg, oklch(38% 0.12 190), oklch(22% 0.08 210))" },
	{ id: "anime", label: "🎌 动漫", gradient: "linear-gradient(135deg, oklch(45% 0.09 100), oklch(28% 0.06 120))" },
	{ id: "documentary", label: "📽️ 纪录", gradient: "linear-gradient(135deg, oklch(40% 0.04 280), oklch(24% 0.03 300))" },
	{ id: "music", label: "🎵 音乐", gradient: "linear-gradient(135deg, oklch(48% 0.11 50), oklch(30% 0.08 70))" },
	{ id: "other", label: "🎲 其他", gradient: "linear-gradient(135deg, oklch(35% 0.15 25), oklch(20% 0.1 40))" },
] as const;

export function CategoriesPage() {
	const navigate = useNavigate();
	return (
		<div>
			<div className="section-header"><h2>全部分类</h2></div>
			<div className="cat-grid">
				{CATEGORIES.map((cat) => (
					<div key={cat.id} className="cat-card" onClick={() => navigate(`/search?q=${encodeURIComponent(cat.label)}`)}>
						<div className="cat-bg" style={{ background: cat.gradient }} />
						<div className="cat-gradient-overlay" />
						<span className="cat-label">{cat.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}

