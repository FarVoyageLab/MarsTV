"use client";

import {
	type IStorage,
	type PlayRecord,
	localStorageBackend,
} from "@marstv/core";
import { useEffect, useState } from "react";

interface Snapshot {
	history: Map<string, PlayRecord>;
	favorites: Set<string>;
}

function makeKey(source: string, id: string): string {
	return `${source}:${id}`;
}

let cachedSnapshot: Snapshot | null = null;
let inFlight: Promise<Snapshot> | null = null;
const subscribers = new Set<() => void>();

async function loadSnapshot(storage: IStorage): Promise<Snapshot> {
	if (cachedSnapshot) return cachedSnapshot;
	if (inFlight) return inFlight;
	inFlight = (async () => {
		const [history, favorites] = await Promise.all([
			storage.listPlayRecords(),
			storage.listFavorites(),
		]);
		const snapshot: Snapshot = {
			history: new Map(history.map((r) => [makeKey(r.source, r.id), r])),
			favorites: new Set(favorites.map((f) => makeKey(f.source, f.id))),
		};
		cachedSnapshot = snapshot;
		inFlight = null;
		return snapshot;
	})();
	return inFlight;
}

function notify() {
	for (const fn of subscribers) fn();
}

if (typeof window !== "undefined") {
	window.addEventListener("storage", (e) => {
		if (e.key === "marstv:history" || e.key === "marstv:favorites") {
			cachedSnapshot = null;
			notify();
		}
	});
}

export function invalidateCardMarkers(): void {
	cachedSnapshot = null;
	notify();
}

interface CardMarkersProps {
	source: string;
	id: string;
	storage?: IStorage;
}

export function CardMarkers({ source, id, storage }: CardMarkersProps) {
	const store = storage ?? localStorageBackend;
	const [snapshot, setSnap] = useState<Snapshot | null>(null);

	useEffect(() => {
		let cancelled = false;
		const sync = () => {
			loadSnapshot(store).then((s) => {
				if (!cancelled) setSnap(s);
			});
		};
		sync();
		subscribers.add(sync);
		return () => {
			cancelled = true;
			subscribers.delete(sync);
		};
	}, [store]);

	if (!snapshot) return null;

	const key = makeKey(source, id);
	const history = snapshot.history.get(key);
	const favorited = snapshot.favorites.has(key);

	if (!history && !favorited) return null;

	const pct =
		history && history.durationSec > 0
			? Math.min(
					100,
					Math.floor((history.positionSec / history.durationSec) * 100),
				)
			: 0;

	return (
		<>
			{favorited ? (
				<span
					className="absolute left-2 top-2 inline-flex items-center justify-center rounded-full bg-danger/80 px-1.5 py-0.5 text-[10px] font-medium text-background shadow-md backdrop-blur-sm"
					title="已收藏"
				>
					❤
				</span>
			) : null}
			{history ? (
				<span
					className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4 text-[10px] text-foreground/90"
					title={`已看 ${pct}%`}
				>
					<span className="flex items-center justify-between gap-2">
						<span className="truncate">
							{history.lineName ?? `线路 ${history.lineIdx + 1}`} · 第{" "}
							{history.epIdx + 1} 集
						</span>
						{pct > 0 ? (
							<span className="shrink-0 text-primary">{pct}%</span>
						) : null}
					</span>
					{pct > 0 ? (
						<span className="mt-0.5 block h-0.5 w-full overflow-hidden rounded-full bg-white/20">
							<span
								className="block h-full bg-primary"
								style={{ width: `${pct}%` }}
							/>
						</span>
					) : null}
				</span>
			) : null}
		</>
	);
}
