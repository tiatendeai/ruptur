"use client";

import { useEffect, useMemo, useState } from "react";
import { listLeads, listStages, type RupturLead, type RupturStage, updateLead } from "@/lib/ruptur";

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PipelinePage() {
  const [stages, setStages] = useState<RupturStage[]>([]);
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [stageItems, leadItems] = await Promise.all([listStages(), listLeads()]);
      setStages(stageItems);
      setLeads(leadItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stageMap = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      leads: leads.filter((lead) => lead.status === stage.key),
    }));
  }, [leads, stages]);

  async function moveLead(leadId: string, nextStatus: string) {
    setSavingId(leadId);
    setError(null);
    try {
      await updateLead(leadId, { status: nextStatus });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(24,24,27,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Pipeline</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Kanban operacional do funil com acao direta sobre o lead.</h1>
            <p className="mt-2 text-sm text-zinc-300">
              O foco aqui e sair do placeholder e permitir movimentacao rapida entre estagios, mantendo o cockpit de
              CRM e mensageria alinhados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            Atualizar pipeline
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      {loading ? (
        <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-zinc-400">
          Carregando estagios e leads...
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-4">
          {stageMap.map((stage, index) => {
            const nextStage = stageMap[index + 1];
            const prevStage = stageMap[index - 1];

            return (
              <article key={stage.key} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{stage.name}</div>
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">{stage.key}</div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                    {stage.leads.length}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {stage.leads.length ? (
                    stage.leads.map((lead) => (
                      <div key={lead.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{lead.name || lead.phone || "Sem nome"}</div>
                            <div className="mt-1 text-xs text-zinc-500">{lead.phone || "telefone_indefinido"}</div>
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            {fmtTime(lead.last_message_at || lead.updated_at)}
                          </div>
                        </div>

                        <div className="mt-3 line-clamp-3 text-sm text-zinc-300">
                          {lead.last_message_body || "Sem ultima mensagem registrada."}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            disabled={!prevStage || savingId === lead.id}
                            onClick={() => prevStage && void moveLead(lead.id, prevStage.key)}
                            className="flex-1 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            disabled={!nextStage || savingId === lead.id}
                            onClick={() => nextStage && void moveLead(lead.id, nextStage.key)}
                            className="flex-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-40"
                          >
                            Avancar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-zinc-400">
                      Sem leads neste estagio.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
