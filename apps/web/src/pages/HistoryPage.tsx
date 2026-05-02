import { createApiClient } from "@marstv/api";
import { ContinueWatchingRow } from "@marstv/ui";
import { useEffect, useState } from "react";
import type { PlayRecord } from "@marstv/api";
import { useNavigate } from "react-router";

const api = createApiClient("");

export function HistoryPage() {
  const [records, setRecords] = useState<PlayRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/storage/history")
      .then((r) => r.json())
      .then((data) => setRecords(data.records ?? []))
      .catch(() => setRecords([]));
  }, []);

  if (records.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <div className="text-5xl">🕐</div>
        <h1 className="text-2xl font-semibold">观看历史</h1>
        <p className="text-sm text-muted-foreground">暂无观看记录</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-semibold">观看历史</h1>
      <ContinueWatchingRow records={records} onNavigate={(href) => navigate(href)} />
    </div>
  );
}
