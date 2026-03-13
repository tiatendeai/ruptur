"use client";

import { useEffect, useMemo, useState } from "react";
import { listChannelHealth, type RupturChannelHealth } from "@/lib/ruptur";

const LANES = [
  { key: "unknown", title: "Preparacao" },
  { key: "connecting", title: "Aquecendo" },
  { key: "open", title: "Maturado" },
  { key: "disconnected", title: "Risco" },
] as const;

function laneFor(item: RupturChannelHealth) {
  const status = item.status.toLowerCase();
  if (status.includes("open")) return "open";
  if (status.includes("connect")) return "connecting";
  if (status.includes("disconnect")) return "disconnected";
  return "unknown";
}

export default function WarmupClient() {
  const [items, setItems] = useState<RupturChannelHealth[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      setItems(await listChannelHealth());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, []);

  const lanes = useMemo(() => {
    const grouped = new Map<string, RupturChannelHealth[]>();
    for (const lane of LANES) grouped.set(lane.key, []);
    for (const item of items) {
      grouped.get(laneFor(item))?.push(item);
    }
    return grouped;
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(39,39,42,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Warmup</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Aquecimento e maturacao do parque de numeros.</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Aqui a ideia e operar estilo kanban: ver o que esta em aquecimento, o que esta maduro e o que entrou em
              zona de risco para intervencao.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            Atualizar
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {LANES.map((lane) => {
          const laneItems = lanes.get(lane.key) || [];
          return (
            <div key={lane.key} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{lane.title}</h2>
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">{laneItems.length} itens</div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {laneItems.length ? (
                  laneItems.map((item) => (
                    <article key={`${item.provider}:${item.instance_id}`} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-medium">{item.instance_id}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {item.provider} • {item.status}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Healthscore</span>
                        <span className="rounded-full bg-white/10 px-3 py-1">{item.score}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-zinc-400">
                    Nenhum item nesta coluna ainda.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
