import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

export interface HeroSlide {
  id: string;
  title: string;
  badge: string;
  rating: string;
  year: string;
  duration: string;
  genre: string;
  gradient: string;
  detailId?: string;
  source?: string;
}

interface HeroBannerProps {
  slides: HeroSlide[];
  autoPlayInterval?: number;
}

export function HeroBanner({ slides, autoPlayInterval = 5000 }: HeroBannerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();

  const goTo = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [slides.length, autoPlayInterval]);

  if (slides.length === 0) return null;

  const slide = slides[activeIdx];
  if (!slide) return null;

  return (
    <div className="hero-banner">
      <div className="hero-bg" style={{ background: slide.gradient }} />
      <div className="hero-gradient" />
      <div className="hero-info">
        <div className="hero-badge">{slide.badge}</div>
        <h1>{slide.title}</h1>
        <div className="hero-meta">
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>★ {slide.rating}</span>
          <span>{slide.year}</span>
          <span>·</span>
          <span>{slide.duration}</span>
          <span>·</span>
          <span>{slide.genre}</span>
        </div>
        <div className="hero-actions">
          <button
            className="btn-cinema btn-cinema-primary"
            onClick={() => {
              if (slide.source && slide.detailId) {
                navigate(`/detail/${slide.source}/${slide.detailId}`);
              }
            }}
          >
            ▶ 立即播放
          </button>
          <button
            className="btn-cinema btn-cinema-secondary"
            onClick={() => {
              if (slide.source && slide.detailId) {
                navigate(`/detail/${slide.source}/${slide.detailId}`);
              }
            }}
          >
            ℹ 详情
          </button>
        </div>
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`hero-dot${i === activeIdx ? " active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
