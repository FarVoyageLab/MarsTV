import { createApiClient, searchCms } from "@marstv/api";
import { loadSources, type VideoItem } from "@marstv/core";
import { SearchBox, VideoCard } from "@marstv/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const api = createApiClient("");

export function HomePage() {
  const [sources] = useState(() => loadSources());
  const [featured, setFeatured] = useState<
    { source: string; items: VideoItem[] }[]
  >([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (sources.length === 0) return;
    Promise.allSettled(
      sources.slice(0, 6).map(async (s) => {
        const { list } = await searchCms(api, s.key, "", 1);
        return { source: s.key, items: list.slice(0, 8) };
      }),
    ).then((results) => {
      setFeatured(
        results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((r) => r.items.length > 0),
      );
    });
  }, [sources]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Glowing Orb Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/20 blur-[120px] pointer-events-none opacity-60" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-gradient-to-b from-primary/10 to-transparent blur-[80px] pointer-events-none" />

      <div className="mx-auto w-full max-w-7xl flex-1 px-6 md:px-10 relative z-10">
        {/* ═══ Hero — search is the star ═══ */}
        <section className="flex flex-col items-center pt-32 pb-24 md:pt-48 md:pb-32">
          <h1 className="mb-8 text-center text-6xl font-black tracking-tighter md:text-8xl lg:text-9xl uppercase text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50 drop-shadow-2xl">
            Mars<span className="text-primary">TV</span>
          </h1>

          {/* Technical metadata readout */}
          <div className="mb-12 flex gap-6 font-mono text-[10px] tracking-[0.3em] text-primary/70 uppercase border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md">
            <span>SYSTEM: ONLINE</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {sources.length > 0
                ? `SOURCES_ACTIVE: ${sources.length}`
                : "SOURCES_ACTIVE: 0"}
            </span>
            <span>•</span>
            <span>UPLINK: SECURE</span>
          </div>

          {/* Search — cinematic, wide */}
          <div className="w-full max-w-3xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative">
              <SearchBox
                size="lg"
                onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
              />
            </div>
          </div>
        </section>

        {/* ═══ Content ═══ */}
        <div className="pb-24">
          {featured.length > 0 ? (
            featured.map((group, gi) => (
              <section
                key={group.source}
                className="mb-24 relative"
                style={{ animation: `fade-up 0.5s ease-out ${gi * 0.1}s both` }}
              >
                {/* Section header — technical-readout style */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end gap-4 border-b border-white/[0.05] pb-4">
                  <h2 className="font-mono text-sm font-semibold tracking-[0.15em] text-foreground/80 uppercase">
                    <span className="text-primary/60 mr-2">SOURCE //</span>
                    {group.source}
                  </h2>
                  <div className="hidden sm:flex flex-1" />
                  <div className="font-mono text-[10px] tracking-[0.2em] text-dim-foreground/40 uppercase">
                    // {group.items.length} DATABANKS RETRIEVED
                  </div>
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {group.items.map((v) => (
                    <VideoCard
                      key={`${group.source}:${v.id}`}
                      item={v}
                      hideSourceBadge
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <section className="flex flex-col items-center py-32 text-center border border-white/[0.02] bg-white/[0.01] backdrop-blur-sm">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(255,94,0,0.1)] relative">
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" />
                <span className="font-mono text-[10px] tracking-[0.3em] text-primary/80 uppercase">
                  idle
                </span>
              </div>
              <p className="font-mono text-[12px] tracking-[0.2em] text-foreground/60 uppercase mb-4">
                AWAITING_SOURCE_CONFIGURATION
              </p>
              <p className="max-w-md text-sm leading-relaxed text-dim-foreground/50 font-mono">
                &gt; NO ACTIVE SIGNAL DETECTED. PLEASE CONFIGURE CMS SOURCES IN
                ENVIRONMENT TO INITIATE DATA TRANSFER.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
