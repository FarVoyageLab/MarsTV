import type { ReactNode } from "react";

export function SettingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
