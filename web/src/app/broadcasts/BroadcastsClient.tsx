"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCampaign, listCampaigns, type RupturCampaign } from "@/lib/ruptur";

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BroadcastsClient() {
  const [campaigns, setCampaigns] = useState<RupturCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"one_to_one" | "group">("one_to_one");
  const [provider, setProvider] = useState<"uazapi" | "baileys">("uazapi");
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const summary = useMemo(() => {
    const oneToOne = campaigns.filter((item) => item.kind === "one_to_one").length;
    const group = campaigns.filter((item) => item.kind === "group").length;
    return { total: campaigns.length, oneToOne, group };
  }, [campaigns]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) return;

    setSaving(true);
    setError(null);
    try {
      await createCampaign({
        name: trimmedName,
        kind,
        provider_preference: provider,
        payload: { text: trimmedMessage },
      });
      setName("");
      setMessage("");
      setKind("one_to_one");
      setProvider("uazapi");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(39,39,42,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Campanhas</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Disparos estilo Mlabs, mas no fluxo do Ruptur.</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Cadastre campanhas 1:1 ou de grupo, acompanhe a fila de comunicação e mantenha a operação perto do
              CRM, do warmup e da intervenção manual.
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Total</div>
              <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">1:1</div>
              <div className="mt-2 text-2xl font-semibold">{summary.oneToOne}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Grupo</div>
              <div className="mt-2 text-2xl font-semibold">{summary.group}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={onSubmit} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Nova campanha</h2>
              <p className="text-sm text-zinc-400">Use isso para campanhas rápidas enquanto a camada de automação cresce.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Criar campanha"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-zinc-300">Nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Reativação de leads frios"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-zinc-600 focus:border-amber-300/40"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-zinc-300">Tipo</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as "one_to_one" | "group")}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-300/40"
              >
                <option value="one_to_one">1:1</option>
                <option value="group">Grupo</option>
              </select>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-zinc-300">Provedor</span>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                No MVP, campanhas novas devem nascer em UAZAPI. Baileys entra apenas quando a contingencia for deliberada.
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { key: "uazapi", label: "UAZAPI" },
                  { key: "baileys", label: "Baileys" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setProvider(item.key as "uazapi" | "baileys")}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm transition",
                      provider === item.key
                        ? "border-amber-300/50 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-zinc-300">Mensagem-base</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Oi {{nome}}, queria retomar nossa conversa..."
                rows={5}
                className="w-full rounded-[24px] border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-zinc-600 focus:border-amber-300/40"
              />
            </label>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        </form>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Leitura operacional</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              Campanhas 1:1 ficam ao lado do CRM e da inbox para facilitar intervenção manual.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              Campanhas de grupo ficam preparadas para plugar `sendflow_sources` e roteamento depois.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              `Warmup`, healthscore e fila ainda entram como próxima camada, sem travar o uso imediato.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Campanhas registradas</h2>
            <p className="text-sm text-zinc-400">Visão rápida do que já foi preparado para envio.</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            Atualizar
          </button>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">Carregando campanhas...</div>
          ) : campaigns.length ? (
            campaigns.map((campaign) => (
              <article key={campaign.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-medium">{campaign.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">
                      {campaign.kind === "group" ? "Grupo" : "1:1"} • {campaign.provider_preference}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                    {fmtDate(campaign.created_at)}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
              Nenhuma campanha cadastrada ainda. Use o formulário acima para criar a primeira.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
