"use client";

import { useEffect, useMemo, useState } from "react";
import { listChannelHealth, listUazapiInstances, type RupturChannelHealth } from "@/lib/ruptur";

type UazapiInstance = {
  name?: string;
  status?: string;
  token?: string;
  qrcode?: string;
  number?: string;
};

function safeArray(input: unknown): UazapiInstance[] {
  if (!Array.isArray(input)) return [];
  return input as UazapiInstance[];
}

export default function ConnectionsClient() {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [health, setHealth] = useState<RupturChannelHealth[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const [instanceResponse, healthResponse] = await Promise.all([listUazapiInstances(), listChannelHealth()]);
      setInstances(safeArray(instanceResponse.instances));
      setHealth(healthResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, []);

  const summary = useMemo(() => {
    const connected = instances.filter((item) => (item.status || "").toLowerCase().includes("open")).length;
    return { total: instances.length, connected, monitored: health.length };
  }, [instances, health]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(39,39,42,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-sky-200/70">Conexoes</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contas conectadas e estado operacional do canal.</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Essa area precisa substituir a falta de painel visual das contas ligadas por API. O foco aqui e ver
              status, numero, healthscore e decidir quando intervir.
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Instancias</div>
              <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Conectadas</div>
              <div className="mt-2 text-2xl font-semibold">{summary.connected}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Health</div>
              <div className="mt-2 text-2xl font-semibold">{summary.monitored}</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Instancias UAZAPI</h2>
              <p className="text-sm text-zinc-400">Lista de numeros e conexoes que o cockpit consegue ver hoje.</p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Atualizar
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {instances.length ? (
              instances.map((instance, index) => (
                <article key={`${instance.name || "inst"}-${index}`} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-medium">{instance.name || `Instancia ${index + 1}`}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {instance.status || "status_indefinido"}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                      {instance.number || "sem_numero"}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Nenhuma instancia visivel agora. Isso pode indicar token ausente, UAZAPI sem retorno ou nenhuma conta
                conectada.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Healthscore do canal</h2>
          <p className="mt-1 text-sm text-zinc-400">Base do warmup, maturacao e contingencia operacional.</p>
          <div className="mt-5 space-y-3">
            {health.length ? (
              health.map((item) => (
                <div key={`${item.provider}-${item.instance_id}`} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{item.instance_id}</div>
                      <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {item.provider} • {item.status}
                      </div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-sm">{item.score}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Sem healthscore ainda. Quando isso entrar, essa area vira o painel de aquecimento e risco.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
