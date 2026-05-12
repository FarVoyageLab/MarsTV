interface SourceButtonProps {
  name: string;
  quality?: string;
  color?: string;
  onClick: () => void;
}

export function SourceButton({
  name,
  quality,
  color = "oklch(62% 0.2 25)",
  onClick,
}: SourceButtonProps) {
  return (
    <button className="source-btn" onClick={onClick}>
      <span className="source-dot" style={{ background: color }} />
      {name}
      {quality && <span style={{ fontSize: 11, color: "var(--cinema-muted)", marginLeft: 4 }}>{quality}</span>}
    </button>
  );
}
