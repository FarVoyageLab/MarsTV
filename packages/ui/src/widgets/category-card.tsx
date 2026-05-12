interface CategoryCardProps {
  label: string;
  gradient: string;
  onClick: () => void;
}

export function CategoryCard({ label, gradient, onClick }: CategoryCardProps) {
  return (
    <div className="cat-card" onClick={onClick}>
      <div className="cat-bg" style={{ background: gradient }} />
      <div className="cat-gradient-overlay" />
      <span className="cat-label">{label}</span>
    </div>
  );
}
