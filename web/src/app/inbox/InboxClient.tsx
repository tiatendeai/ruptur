"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RupturLead, RupturMessage, RupturStage } from "@/lib/ruptur";
import { listLeads, listMessages, listStages, sendConversationText, updateLead } from "@/lib/ruptur";

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

const DEFAULT_STATUS_FILTER = "all";

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("qual")) return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  if (normalized.includes("cont")) return "border-sky-400/20 bg-sky-500/10 text-sky-200";
  if (normalized.includes("perd") || normalized.includes("lost")) return "border-red-400/20 bg-red-500/10 text-red-200";
  return "border-white/10 bg-white/10 text-zinc-200";
}

export default function InboxClient() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [stages, setStages] = useState<RupturStage[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RupturMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [draftName, setDraftName] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const stageOptions = useMemo(() => {
    const keys = new Set<string>();
    const items = stages.filter((stage) => {
      if (keys.has(stage.key)) return false;
      keys.add(stage.key);
      return true;
    });
    return items;
  }, [stages]);

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const lead of leads) {
      byStatus.set(lead.status, (byStatus.get(lead.status) || 0) + 1);
    }
    return {
      total: leads.length,
      withConversation: leads.filter((lead) => lead.conversation_id).length,
      byStatus,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== DEFAULT_STATUS_FILTER && lead.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const term = query.trim().toLowerCase();
      return [lead.name || "", lead.phone || "", lead.last_message_body || ""].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [leads, query, statusFilter]);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadItems, stageItems] = await Promise.all([listLeads(), listStages()]);
      setLeads(leadItems);
      setStages(stageItems);
      setSelectedLeadId((current) => {
        if (current && leadItems.some((lead) => lead.id === current)) return current;
        return leadItems[0]?.id || null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMessages = useCallback(async (conversationId: string) => {
    setError(null);
    try {
      const items = await listMessages(conversationId);
      setMessages(items.reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    if (!selected) {
      setDraftName("");
      setDraftStatus("");
      return;
    }
    setDraftName(selected.name || "");
    setDraftStatus(selected.status || "");
  }, [selected]);

  useEffect(() => {
    if (!selected?.conversation_id) {
      setMessages([]);
      return;
    }
    void refreshMessages(selected.conversation_id);
  }, [selected?.conversation_id, refreshMessages]);

  async function onSend() {
    if (!selected?.conversation_id) return;
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setText("");
    try {
      await sendConversationText(selected.conversation_id, value);
      await Promise.all([refreshMessages(selected.conversation_id), refreshLeads()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setText(value);
    } finally {
      setSending(false);
    }
  }

  async function onSaveLead() {
    if (!selected) return;
    setSavingLead(true);
    setError(null);
    try {
      await updateLead(selected.id, {
        name: draftName.trim() || selected.name || undefined,
        status: draftStatus || selected.status,
      });
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingLead(false);
    }
  }

  const statusChoices = useMemo(() => {
    const items = stageOptions.map((stage) => stage.key);
    if (!items.includes(draftStatus) && draftStatus) items.unshift(draftStatus);
    return Array.from(new Set(items));
  }, [draftStatus, stageOptions]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(96,165,250,0.18),rgba(24,24,27,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.35em] text-sky-200/70">MyChat</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inbox operacional para acompanhar e intervir na mensageria.</h1>
            <p className="mt-2 text-sm text-zinc-300">
              O objetivo aqui e substituir a dependencia da interface nativa do provider. O operador precisa filtrar
              leads, enxergar o contexto do pipeline, responder e ajustar status sem sair do cockpit.
            </p>
          </div>

          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Leads</div>
              <div className="mt-2 text-2xl font-semibold">{counts.total}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Conversas ativas</div>
              <div className="mt-2 text-2xl font-semibold">{counts.withConversation}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Estagios</div>
              <div className="mt-2 text-2xl font-semibold">{stageOptions.length}</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Fila de conversas</h2>
              <p className="text-sm text-zinc-400">Busca, filtro por estagio e leitura rapida da ultima mensagem.</p>
            </div>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
              onClick={() => void refreshLeads()}
              type="button"
            >
              Atualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-white/20"
              placeholder="Buscar por nome, telefone ou mensagem"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter(DEFAULT_STATUS_FILTER)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs",
                  statusFilter === DEFAULT_STATUS_FILTER ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-zinc-400",
                ].join(" ")}
              >
                Todos <span className="ml-1 text-zinc-500">{counts.total}</span>
              </button>
              {stageOptions.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setStatusFilter(stage.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs",
                    statusFilter === stage.key ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-zinc-400",
                  ].join(" ")}
                >
                  {stage.name} <span className="ml-1 text-zinc-500">{counts.byStatus.get(stage.key) || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-[68dvh] overflow-auto pr-1">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-zinc-400">
                Carregando conversas...
              </div>
            ) : filteredLeads.length ? (
              <ul className="space-y-2">
                {filteredLeads.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={[
                        "w-full rounded-[24px] border px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5",
                        selectedLeadId === lead.id ? "border-sky-300/30 bg-sky-400/10" : "border-white/10 bg-black/20",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{lead.name || lead.phone || "Sem nome"}</div>
                          <div className="mt-1 truncate text-xs text-zinc-500">{lead.phone || "telefone_indefinido"}</div>
                        </div>
                        <div className={["rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]", statusTone(lead.status)].join(" ")}>
                          {lead.status}
                        </div>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="line-clamp-2 text-xs text-zinc-400">{lead.last_message_body || "Sem ultima mensagem"}</div>
                        <div className="shrink-0 text-[10px] text-zinc-500">{fmtTime(lead.last_message_at || lead.updated_at)}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-zinc-400">
                Nenhum lead bate com o filtro atual.
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">{selected?.name || selected?.phone || "Selecione uma conversa"}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                <span>{selected?.phone || "sem_telefone"}</span>
                {selected?.status ? <span className="rounded-full border border-white/10 px-2 py-0.5">{selected.status}</span> : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
              onClick={() => selected?.conversation_id && void refreshMessages(selected.conversation_id)}
              disabled={!selected?.conversation_id}
            >
              Atualizar chat
            </button>
          </div>

          <div className="max-h-[62dvh] overflow-auto py-4">
            {!selected?.conversation_id ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Este lead ainda nao tem conversa aberta.
              </div>
            ) : messages.length ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={message.direction === "out" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={[
                        "max-w-[82%] rounded-[24px] border px-4 py-3 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
                        message.direction === "out"
                          ? "border-sky-400/20 bg-sky-500/10"
                          : "border-white/10 bg-black/20",
                      ].join(" ")}
                    >
                      <div className="whitespace-pre-wrap leading-6">{message.body || "—"}</div>
                      <div className="mt-2 text-right text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        {message.direction === "out" ? "saida" : "entrada"} • {fmtTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Sem mensagens ainda.
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex gap-2">
              <textarea
                className="min-h-24 w-full rounded-[24px] border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-white/20"
                placeholder="Digite para responder manualmente pela conta conectada..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                disabled={!selected?.conversation_id || sending}
              />
              <button
                type="button"
                className="rounded-[24px] bg-sky-500 px-5 text-sm font-medium text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void onSend()}
                disabled={!selected?.conversation_id || sending}
              >
                {sending ? "Enviando..." : "Responder"}
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Contexto do lead</h2>
          <p className="mt-1 text-sm text-zinc-400">Edicao rapida para intervir no pipeline sem sair da conversa.</p>

          {selected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ultima atividade</div>
                <div className="mt-2 text-sm text-zinc-200">{fmtTime(selected.last_message_at || selected.updated_at) || "Sem atividade"}</div>
              </div>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Nome do lead</div>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white/20"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Nome exibido no cockpit"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Estagio atual</div>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white/20"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                >
                  {statusChoices.map((status) => {
                    const stage = stageOptions.find((item) => item.key === status);
                    return (
                      <option key={status} value={status}>
                        {stage?.name || status}
                      </option>
                    );
                  })}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void onSaveLead()}
                disabled={savingLead || !selected}
                className="w-full rounded-[24px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {savingLead ? "Salvando..." : "Salvar contexto"}
              </button>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Resumo rapido</div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Telefone</dt>
                    <dd className="text-right">{selected.phone || "sem_telefone"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Conversa</dt>
                    <dd className="text-right">{selected.conversation_id ? "aberta" : "nao iniciada"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Mensageria</dt>
                    <dd className="text-right">{selected.last_message_body ? "ativa" : "sem historico"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-zinc-400">
              Selecione um lead para editar status, nome e acompanhar o contexto.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
