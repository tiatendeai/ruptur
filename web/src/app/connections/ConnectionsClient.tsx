"use client";

import { useEffect, useMemo, useState } from "react";
import { rupturApiBaseUrl } from "@/lib/config";
import { connectBaileysInstance, getBaileysStatus, listBaileysInstances, listChannelHealth, listUazapiInstances, type RupturBaileysInstance, type RupturBaileysStatus, type RupturChannelHealth } from "@/lib/ruptur";

type UazapiInstance = {
  name?: string;
  status?: string;
  token?: string;
  qrcode?: string;
  number?: string;
};

function extractUazapiInstances(input: Record<string, unknown>): UazapiInstance[] {
  const root = input.uazapi;
  if (Array.isArray(input.instances)) return input.instances as UazapiInstance[];
  if (Array.isArray(root)) return root as UazapiInstance[];
  if (root && typeof root === "object" && Array.isArray((root as { instances?: unknown[] }).instances)) {
    return ((root as { instances?: unknown[] }).instances || []) as UazapiInstance[];
  }
  return [];
}

export default function ConnectionsClient() {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [baileysInstances, setBaileysInstances] = useState<RupturBaileysInstance[]>([]);
  const [health, setHealth] = useState<RupturChannelHealth[]>([]);
  const [provider, setProvider] = useState<"uazapi" | "baileys">("uazapi");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [baileysStatus, setBaileysStatus] = useState<RupturBaileysStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      const [instanceResponse, healthResponse, baileysResponse] = await Promise.all([
        listUazapiInstances(),
        listChannelHealth(),
        listBaileysInstances(),
      ]);
      const uazapiItems = extractUazapiInstances(instanceResponse);
      setInstances(uazapiItems);
      setBaileysInstances(baileysResponse);
      setHealth(healthResponse);
      setSelectedInstanceId((current) => {
        if (provider === "uazapi") return current || uazapiItems[0]?.name || null;
        return current || baileysResponse[0]?.instance || null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listUazapiInstances(), listChannelHealth(), listBaileysInstances()])
      .then(([instanceResponse, healthResponse, baileysResponse]) => {
        if (cancelled) return;
        const uazapiItems = extractUazapiInstances(instanceResponse);
        setError(null);
        setInstances(uazapiItems);
        setBaileysInstances(baileysResponse);
        setHealth(healthResponse);
        setSelectedInstanceId((current) => {
          if (provider === "uazapi") return current || uazapiItems[0]?.name || null;
          return current || baileysResponse[0]?.instance || null;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    if (provider !== "baileys" || !selectedInstanceId) return;
    void getBaileysStatus(selectedInstanceId)
      .then((item) => setBaileysStatus(item))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [provider, selectedInstanceId]);

  function switchProvider(next: "uazapi" | "baileys") {
    setProvider(next);
    setSelectedInstanceId(next === "uazapi" ? instances[0]?.name || null : baileysInstances[0]?.instance || null);
    if (next !== "baileys") setBaileysStatus(null);
  }

  const summary = useMemo(() => {
    const connected = instances.filter((item) => (item.status || "").toLowerCase().includes("open")).length;
    const baileysConnected = baileysInstances.filter((item) => (item.connection || "").toLowerCase() === "open").length;
    return {
      total: provider === "uazapi" ? instances.length : baileysInstances.length,
      connected: provider === "uazapi" ? connected : baileysConnected,
      monitored: health.length,
    };
  }, [instances, health, provider, baileysInstances]);

  const qrUrl =
    provider === "uazapi"
      ? selectedInstanceId
        ? `${rupturApiBaseUrl()}/integrations/uazapi/qrcode.png?instance=${encodeURIComponent(selectedInstanceId)}`
        : null
      : selectedInstanceId
        ? `${rupturApiBaseUrl()}/integrations/baileys/qrcode.png?instance=${encodeURIComponent(selectedInstanceId)}`
        : null;

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Instancias</h2>
              <p className="text-sm text-zinc-400">Troque entre UAZAPI e Baileys e inspecione o estado real das conexoes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => switchProvider("uazapi")}
                className={[
                  "rounded-full border px-4 py-2 text-sm transition",
                  provider === "uazapi" ? "border-sky-300/30 bg-sky-500/10 text-sky-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                ].join(" ")}
              >
                UAZAPI
              </button>
              <button
                type="button"
                onClick={() => switchProvider("baileys")}
                className={[
                  "rounded-full border px-4 py-2 text-sm transition",
                  provider === "baileys" ? "border-amber-300/30 bg-amber-500/10 text-amber-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                ].join(" ")}
              >
                Baileys
              </button>
              <button
                type="button"
                onClick={refresh}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {(provider === "uazapi" ? instances.length : baileysInstances.length) ? (
              provider === "uazapi"
                ? instances.map((instance, index) => (
                <article
                  key={`${instance.name || "inst"}-${index}`}
                  className={[
                    "rounded-[24px] border bg-black/20 p-4 transition",
                    selectedInstanceId === (instance.name || null) ? "border-sky-300/30" : "border-white/10",
                  ].join(" ")}
                >
                  <button type="button" onClick={() => setSelectedInstanceId(instance.name || null)} className="w-full text-left">
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
                  </button>
                </article>
              ))
                : baileysInstances.map((instance, index) => (
                <article
                  key={`${instance.instance || "baileys"}-${index}`}
                  className={[
                    "rounded-[24px] border bg-black/20 p-4 transition",
                    selectedInstanceId === (instance.instance || null) ? "border-amber-300/30" : "border-white/10",
                  ].join(" ")}
                >
                  <button type="button" onClick={() => setSelectedInstanceId(instance.instance || null)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-medium">{instance.instance || `Instancia ${index + 1}`}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
                          {instance.connection || "status_indefinido"}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                        {instance.hasQr ? "tem_qr" : "sem_qr"}
                      </div>
                    </div>
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Nenhuma instancia visivel agora. Isso pode indicar token ausente, integracao sem retorno ou nenhuma conta conectada.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Painel operacional</h2>
          <p className="mt-1 text-sm text-zinc-400">Status, QR e proximo passo por provider.</p>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">provider ativo</div>
            <div className="mt-2 text-lg font-medium">{provider === "uazapi" ? "UAZAPI" : "Baileys"}</div>
            <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">instancia selecionada</div>
            <div className="mt-2 text-sm text-zinc-200">{selectedInstanceId || "nenhuma"}</div>
            {provider === "baileys" ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">status</div>
                <div className="mt-2 text-sm text-zinc-200">
                  {baileysStatus?.status || "sem_status"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectedInstanceId && void connectBaileysInstance(selectedInstanceId).then(setBaileysStatus).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
                    disabled={!selectedInstanceId}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Gerar QR
                  </button>
                  <div className="rounded-full border border-dashed border-white/10 px-4 py-2 text-sm text-zinc-500">
                    Reset de sessao depende do gateway Baileys
                  </div>
                </div>
              </div>
            ) : null}
            {selectedInstanceId ? (
              <div className="mt-5">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">qr code</div>
                <div className="mt-3 rounded-[20px] border border-white/10 bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`QR ${selectedInstanceId}`}
                    src={qrUrl || ""}
                    className="mx-auto max-h-64 w-full max-w-64 rounded-xl object-contain"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <h3 className="mt-6 text-lg font-semibold">Healthscore do canal</h3>
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
