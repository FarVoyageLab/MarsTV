export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      <button
        className={`tag-chip${checked ? " active" : ""}`}
        onClick={() => onChange(!checked)}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}
