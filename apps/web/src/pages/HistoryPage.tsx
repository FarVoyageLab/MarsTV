import { useCallback, useEffect, useState } from "react";
import type { PlayRecord } from "@marstv/core";
import { ContinueWatchingRow } from "@marstv/ui";

export function HistoryPage() {
  const [records, setRecords] = useState<PlayRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/storage/history")
      .then((r) => r.json())
      .then((data) => setRecords(data.records ?? []))
      .catch(() => setRecords([]));
  }, []);

  const handleRemove = useCallback((source: string, id: string) => {
    fetch(`/api/storage/history?source=${source}&id=${id}`, { method: "DELETE" })
      .then(() => setRecords((prev) => (prev ?? []).filter((r) => !(r.source === source && r.id === id))))
      .catch(() => {});
  }, []);

  if (records === null) {
    return <div className="flex flex-1 items-center justify-center"><div className="h-8 w-48 animate-pulse rounded bg-surface/40" /></div>;
  }

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
      <ContinueWatchingRow items={records} onRemove={handleRemove} />
    </div>
  );
}
