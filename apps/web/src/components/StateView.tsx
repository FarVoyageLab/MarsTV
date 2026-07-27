import type { ReactNode } from "react";
import { AlertTriangle, CloudOff, SearchX } from "lucide-react";

interface StateViewProps {
  kind: "empty" | "offline" | "error";
  title: string;
  description: string;
  action?: ReactNode;
}

export function StateView({ kind, title, description, action }: StateViewProps) {
  const Icon = kind === "empty" ? SearchX : kind === "offline" ? CloudOff : AlertTriangle;
  return (
    <section className="state-view" role={kind === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
