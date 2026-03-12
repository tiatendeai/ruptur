"use client";

import { useEffect, useState } from "react";
import { rupturApiBaseUrl } from "@/lib/config";

type LeadScore = { lead_id: string; score: number; updated_at: string };
type ChannelHealth = { provider: string; instance_id: string; score: number; status: string; updated_at: string };

async function fetchJson(path: string) {
  const res = await fetch(`${rupturApiBaseUrl()}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function MetricsPage() {
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [channels, setChannels] = useState<ChannelHealth[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ls = await fetchJson("/growth/leadscores?limit=50");
        const ch = await fetchJson("/growth/channels/health?limit=50");
        setLeadScores(ls.items || []);
        setChannels(ch.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Métricas</h1>
        <p className="text-sm text-zinc-400">Leadscore, “mão levantada” e healthscore por canal/instância.</p>
      </div>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Leadscore (top recentes)</div>
          <div className="mt-2 space-y-1 text-xs text-zinc-300">
            {leadScores.length ? (
              leadScores.map((i) => (
                <div key={i.lead_id} className="flex items-center justify-between">
                  <div className="truncate">{i.lead_id}</div>
                  <div className="rounded bg-white/10 px-2 py-0.5">{i.score}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-400">Sem dados ainda.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Healthscore de canal</div>
          <div className="mt-2 space-y-1 text-xs text-zinc-300">
            {channels.length ? (
              channels.map((c) => (
                <div key={`${c.provider}:${c.instance_id}`} className="flex items-center justify-between gap-2">
                  <div className="truncate">
                    {c.provider}:{c.instance_id} <span className="text-zinc-400">({c.status})</span>
                  </div>
                  <div className="rounded bg-white/10 px-2 py-0.5">{c.score}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-400">Sem dados ainda.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

