// HeroMars — the hero visual for the home page.
//
// Static orbit track (orange back / white front arcs baked in from logo.svg)
// with two animated satellites traveling along the ellipse via CSS
// `offset-path`. Back satellite sits BEFORE Mars in the DOM so the planet
// occludes it during the upper sweep; front satellite sits AFTER Mars so it
// rides in front during the lower sweep. Staggered by half a cycle for a
// single continuous orbit illusion.
export function HeroMars({
	className,
	ariaLabel = "MarsTV",
}: {
	className?: string;
	ariaLabel?: string;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			className={className}
			role="img"
			aria-label={ariaLabel}
		>
			<defs>
				<linearGradient id="hm-mars-grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#FF7A00" />
					<stop offset="100%" stopColor="#E52E71" />
				</linearGradient>

				<linearGradient id="hm-glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
					<stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
				</linearGradient>

				<radialGradient id="hm-sat-grad" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
					<stop offset="30%" stopColor="#FFD9A8" stopOpacity="0.95" />
					<stop offset="70%" stopColor="#FF7A00" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
				</radialGradient>

				<filter id="hm-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="18" result="blur" />
					<feComposite in="SourceGraphic" in2="blur" operator="over" />
				</filter>
			</defs>

			<g transform="translate(256, 256)">
				{/* Static orbit track — thin faint full ellipse, tilted -20deg */}
				<ellipse
					cx="0"
					cy="0"
					rx="225"
					ry="67.5"
					fill="none"
					stroke="rgba(255, 255, 255, 0.1)"
					strokeWidth="4.5"
					transform="rotate(-20)"
				/>

				{/* BACK LAYER — everything drawn here will be occluded by Mars in the
				    middle portion of the orbit. */}
				<g transform="rotate(-20)">
					{/* Static orange highlight — full ellipse underneath, so the
					    upper half reads as a continuous back arc (logo.svg heritage)
					    with no seam at the 3/9 o'clock junction. The lower half is
					    covered below by the white front highlight. */}
					<ellipse
						cx="0"
						cy="0"
						rx="225"
						ry="67.5"
						fill="none"
						stroke="#FF7A00"
						strokeWidth="4.5"
						strokeOpacity="0.45"
					/>
					{/* Back satellite — orbits the upper (far) half.
					    Travels 0 → end of back arc in first 3s, then hides for 3s
					    while the front satellite takes over. */}
					<circle
						className="hero-sat hero-sat-back"
						r="11"
						fill="url(#hm-sat-grad)"
					/>
				</g>

				{/* Mars body — sits between back layer (behind) and front layer (front) */}
				<circle
					cx="0"
					cy="0"
					r="120"
					fill="url(#hm-mars-grad)"
					filter="url(#hm-glow)"
				/>

				{/* FRONT LAYER — drawn after Mars so everything here rides on top. */}
				<g transform="rotate(-20)">
					{/* Front satellite — orbits the lower (near) half.
					    Hidden for first 3s, then travels 0 → end of front arc during
					    the second half of the cycle. */}
					<circle
						className="hero-sat hero-sat-front"
						r="11"
						fill="url(#hm-sat-grad)"
					/>
					{/* Static white highlight on the front half (logo.svg heritage) */}
					<path
						d="M 225 0 A 225 67.5 0 0 1 -225 0"
						fill="none"
						stroke="rgba(255, 255, 255, 0.85)"
						strokeWidth="5.5"
						strokeLinecap="round"
					/>
				</g>

				{/* Glass play button — static on top of the planet */}
				<path
					d="M -15 -37.5 Q -15 -52.5 0 -45 L 45 -18 Q 60 -9 60 0 Q 60 9 45 18 L 0 45 Q -15 52.5 -15 37.5 Z"
					fill="url(#hm-glass-grad)"
					stroke="rgba(255, 255, 255, 0.7)"
					strokeWidth="4"
					filter="drop-shadow(0px 12px 24px rgba(0,0,0,0.5))"
				/>
			</g>
		</svg>
	);
}
