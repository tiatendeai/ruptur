"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { rupturApiBaseUrl } from "@/lib/config";
import {
  connectBaileysInstance,
  connectUazapiInstance,
  getBaileysStatus,
  getUazapiStatus,
  listBaileysInstances,
  listChannelHealth,
  listUazapiInstances,
  type RupturBaileysInstance,
  type RupturBaileysStatus,
  type RupturChannelHealth,
} from "@/lib/ruptur";

type UazapiInstance = {
  id?: string;
  name?: string;
  status?: string;
  token?: string;
  qrcode?: string;
  paircode?: string;
  number?: string;
  profileName?: string;
};

function extractUazapiInstances(input: Record<string, unknown>): UazapiInstance[] {
  const root = input.uazapi;
  const pickNumber = (item: Record<string, unknown>) =>
    [item.number, item.owner, item.phone, item.msisdn].find((value) => typeof value === "string" && value.trim().length > 0) as string | undefined;
  const normalize = (raw: unknown): UazapiInstance | null => {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const status = typeof item.status === "string" ? item.status : typeof item.connection === "string" ? item.connection : undefined;
    const name =
      typeof item.name === "string"
        ? item.name
        : typeof item.instance === "string"
          ? item.instance
          : typeof item.id === "string"
            ? item.id
            : undefined;
    return {
      id: typeof item.id === "string" ? item.id : name,
      name,
      status,
      token: typeof item.token === "string" ? item.token : undefined,
      qrcode: typeof item.qrcode === "string" ? item.qrcode : undefined,
      paircode: typeof item.paircode === "string" ? item.paircode : typeof item.code === "string" ? item.code : undefined,
      number: pickNumber(item),
      profileName: typeof item.profileName === "string" ? item.profileName : typeof item.pushName === "string" ? item.pushName : undefined,
    };
  };
  const normalizeList = (items: unknown[]) => items.map(normalize).filter((item): item is UazapiInstance => Boolean(item?.name));
  if (Array.isArray(input.instances)) return normalizeList(input.instances);
  if (Array.isArray(root)) return normalizeList(root);
  if (root && typeof root === "object" && Array.isArray((root as { instances?: unknown[] }).instances)) {
    return normalizeList((root as { instances?: unknown[] }).instances || []);
  }
  return [];
}

function isUazapiConnected(status?: string) {
  const normalized = (status || "").toLowerCase();
  return normalized === "connected" || normalized === "open" || normalized.includes("connected") || normalized.includes("open");
}

function pickPreferredUazapiInstance(items: UazapiInstance[]) {
  return items.find((item) => isUazapiConnected(item.status)) || items.find((item) => item.qrcode || item.paircode) || items[0] || null;
}

function pickPreferredBaileysInstance(items: RupturBaileysInstance[]) {
  return items.find((item) => (item.connection || "").toLowerCase() === "open") || items.find((item) => item.hasQr) || items[0] || null;
}

export default function ConnectionsClient() {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [baileysInstances, setBaileysInstances] = useState<RupturBaileysInstance[]>([]);
  const [health, setHealth] = useState<RupturChannelHealth[]>([]);
  const [provider, setProvider] = useState<"uazapi" | "baileys">("uazapi");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [baileysStatus, setBaileysStatus] = useState<RupturBaileysStatus | null>(null);
  const [uazapiStatus, setUazapiStatus] = useState<UazapiInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedQrUrl, setFailedQrUrl] = useState<string | null>(null);

  const loadConnectionsData = useCallback(async (activeProvider: "uazapi" | "baileys") => {
    const [instanceResponse, healthResponse, baileysResponse] = await Promise.allSettled([
      listUazapiInstances(),
      listChannelHealth(),
      listBaileysInstances(),
    ]);

    const errors: string[] = [];
    let nextUazapiItems = instances;
    let nextBaileysItems = baileysInstances;

    if (instanceResponse.status === "fulfilled") {
      nextUazapiItems = extractUazapiInstances(instanceResponse.value);
      setInstances(nextUazapiItems);
    } else {
      errors.push(`uazapi: ${instanceResponse.reason instanceof Error ? instanceResponse.reason.message : String(instanceResponse.reason)}`);
    }

    if (healthResponse.status === "fulfilled") {
      setHealth(healthResponse.value);
    } else {
      errors.push(`health: ${healthResponse.reason instanceof Error ? healthResponse.reason.message : String(healthResponse.reason)}`);
    }

    if (baileysResponse.status === "fulfilled") {
      nextBaileysItems = baileysResponse.value;
      setBaileysInstances(nextBaileysItems);
    } else {
      errors.push(`baileys: ${baileysResponse.reason instanceof Error ? baileysResponse.reason.message : String(baileysResponse.reason)}`);
    }

    setError(errors.length ? errors.join(" | ") : null);
    setSelectedInstanceId((current) => {
      if (activeProvider === "uazapi") {
        const currentStillExists = nextUazapiItems.some((item) => item.name === current);
        return currentStillExists ? current : pickPreferredUazapiInstance(nextUazapiItems)?.name || null;
      }
      const currentStillExists = nextBaileysItems.some((item) => item.instance === current);
      return currentStillExists ? current : pickPreferredBaileysInstance(nextBaileysItems)?.instance || null;
    });
  }, [baileysInstances, instances]);

  async function refresh() {
    setFailedQrUrl(null);
    await loadConnectionsData(provider);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadConnectionsData(provider);
    })().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [loadConnectionsData, provider]);

  useEffect(() => {
    if (provider !== "baileys" || !selectedInstanceId) return;
    void getBaileysStatus(selectedInstanceId)
      .then((item) => setBaileysStatus(item))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [provider, selectedInstanceId]);

  useEffect(() => {
    if (provider !== "uazapi" || !selectedInstanceId) return;
    void getUazapiStatus(selectedInstanceId)
      .then((item) =>
        setUazapiStatus({
          id: item.id || selectedInstanceId,
          name: selectedInstanceId,
          status: item.status,
          qrcode: item.qrcode,
          paircode: item.paircode,
          number: item.number || item.owner,
          profileName: item.profileName,
        }),
      )
      .catch(() => setUazapiStatus(null));
  }, [provider, selectedInstanceId]);

  function switchProvider(next: "uazapi" | "baileys") {
    setProvider(next);
    setFailedQrUrl(null);
    setSelectedInstanceId(
      next === "uazapi"
        ? pickPreferredUazapiInstance(instances)?.name || null
        : pickPreferredBaileysInstance(baileysInstances)?.instance || null,
    );
    if (next !== "baileys") setBaileysStatus(null);
    if (next !== "uazapi") setUazapiStatus(null);
  }

  const summary = useMemo(() => {
    const connected = instances.filter((item) => isUazapiConnected(item.status)).length;
    const baileysConnected = baileysInstances.filter((item) => (item.connection || "").toLowerCase() === "open").length;
    return {
      total: provider === "uazapi" ? instances.length : baileysInstances.length,
      connected: provider === "uazapi" ? connected : baileysConnected,
      monitored: health.length,
    };
  }, [instances, health, provider, baileysInstances]);

  const selectedUazapiInstance = useMemo(
    () => instances.find((instance) => (instance.name || null) === selectedInstanceId) || null,
    [instances, selectedInstanceId],
  );
  const selectedUazapiDetails = uazapiStatus || selectedUazapiInstance;

  const qrUrl =
    provider === "uazapi"
      ? selectedUazapiDetails?.qrcode || (selectedInstanceId
        ? `${rupturApiBaseUrl()}/integrations/uazapi/qrcode.png?instance=${encodeURIComponent(selectedInstanceId)}`
        : null)
      : selectedInstanceId
        ? `${rupturApiBaseUrl()}/integrations/baileys/qrcode.png?instance=${encodeURIComponent(selectedInstanceId)}`
        : null;
  const qrFailed = Boolean(qrUrl && failedQrUrl === qrUrl);

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
                  <button
                    type="button"
                    onClick={() => {
                      setFailedQrUrl(null);
                      setSelectedInstanceId(instance.name || null);
                    }}
                    className="w-full text-left"
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-medium">{instance.name || `Instancia ${index + 1}`}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {instance.status || "status_indefinido"}
                      </div>
                      {instance.profileName ? <div className="mt-2 text-sm text-zinc-400">{instance.profileName}</div> : null}
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
                  <button
                    type="button"
                    onClick={() => {
                      setFailedQrUrl(null);
                      setSelectedInstanceId(instance.instance || null);
                    }}
                    className="w-full text-left"
                  >
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
            {provider === "uazapi" ? (
              <>
                <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">status</div>
                <div className="mt-2 text-sm text-zinc-200">{selectedUazapiDetails?.status || "sem_status"}</div>
                <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">numero</div>
                <div className="mt-2 text-sm text-zinc-200">{selectedUazapiDetails?.number || "sem_numero"}</div>
                {selectedUazapiDetails?.profileName ? (
                  <>
                    <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">perfil</div>
                    <div className="mt-2 text-sm text-zinc-200">{selectedUazapiDetails.profileName}</div>
                  </>
                ) : null}
                <div className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">codigo de conexao</div>
                <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                  {selectedUazapiDetails?.paircode || "sem_codigo_disponivel"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectedInstanceId &&
                      void connectUazapiInstance(selectedInstanceId)
                        .then((item) =>
                          setUazapiStatus({
                            id: item.id || selectedInstanceId,
                            name: selectedInstanceId,
                            status: item.status,
                            qrcode: item.qrcode,
                            paircode: item.paircode,
                            number: item.number || item.owner,
                            profileName: item.profileName,
                          }),
                        )
                        .then(() => refresh())
                        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
                    }
                    disabled={!selectedInstanceId}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Gerar QR ou codigo
                  </button>
                </div>
              </>
            ) : null}
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
                  {qrUrl && !qrFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt={`QR ${selectedInstanceId}`}
                      src={qrUrl}
                      className="mx-auto max-h-64 w-full max-w-64 rounded-xl object-contain"
                      onError={() => setFailedQrUrl(qrUrl)}
                    />
                  ) : (
                    <div className="mx-auto flex min-h-64 max-w-64 items-center justify-center rounded-xl border border-dashed border-zinc-300/60 px-4 text-center text-sm text-zinc-500">
                      QR indisponivel no momento. Use o codigo de conexao acima ou atualize a instancia.
                    </div>
                  )}
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
