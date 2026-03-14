"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RupturLabel, RupturLead, RupturMessage, RupturSavedView, RupturStage } from "@/lib/ruptur";
import {
  assignLead,
  createSavedView,
  listLabels,
  listLeads,
  listMessages,
  listSavedViews,
  listStages,
  sendConversationText,
  setLeadLabels,
  updateLeadAutomationState,
  updateLead,
} from "@/lib/ruptur";

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

function hoursSince(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return (Date.now() - ts) / 1000 / 60 / 60;
}

function queueState(lead: RupturLead) {
  if (lead.paused) return "paused";
  if (lead.manual_override) return "manual";
  if (!lead.conversation_id) return "no_conversation";
  if (lead.last_message_direction === "in") return "awaiting_us";
  if (lead.last_message_direction === "out") return "awaiting_contact";
  return "active";
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("qual")) return "border-emerald-700/15 bg-emerald-50 text-emerald-900";
  if (normalized.includes("cont")) return "border-sky-700/15 bg-sky-50 text-sky-900";
  if (normalized.includes("perd") || normalized.includes("lost")) return "border-red-700/15 bg-red-50 text-red-900";
  return "border-black/10 bg-[#f4ede2] text-zinc-700";
}

const DEFAULT_STATUS_FILTER = "all";
const DEFAULT_QUEUE_FILTER = "all";

const QUEUE_FILTERS = [
  { key: "all", label: "Tudo", description: "fila completa" },
  { key: "paused", label: "Pausados", description: "automacao bloqueada" },
  { key: "manual", label: "Manual", description: "humano assumiu a conversa" },
  { key: "awaiting_us", label: "Responder", description: "ultimo toque veio do lead" },
  { key: "awaiting_contact", label: "Aguardando", description: "ultimo toque saiu da equipe" },
  { key: "no_conversation", label: "Sem conversa", description: "lead sem chat ativo" },
];

export default function InboxClient() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [stages, setStages] = useState<RupturStage[]>([]);
  const [labels, setLabels] = useState<RupturLabel[]>([]);
  const [savedViews, setSavedViews] = useState<RupturSavedView[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RupturMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [queueFilter, setQueueFilter] = useState(DEFAULT_QUEUE_FILTER);
  const [draftName, setDraftName] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftOwnerName, setDraftOwnerName] = useState("");
  const [draftOwnerTeam, setDraftOwnerTeam] = useState("");
  const [draftLabels, setDraftLabels] = useState<string[]>([]);
  const [draftPaused, setDraftPaused] = useState(false);
  const [draftManualOverride, setDraftManualOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);

  const selected = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const stageOptions = useMemo(() => {
    const keys = new Set<string>();
    return stages.filter((stage) => {
      if (keys.has(stage.key)) return false;
      keys.add(stage.key);
      return true;
    });
  }, [stages]);

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byQueue = new Map<string, number>();
    for (const lead of leads) {
      byStatus.set(lead.status, (byStatus.get(lead.status) || 0) + 1);
      const queue = queueState(lead);
      byQueue.set(queue, (byQueue.get(queue) || 0) + 1);
    }
    return {
      total: leads.length,
      withConversation: leads.filter((lead) => lead.conversation_id).length,
      byStatus,
      byQueue,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== DEFAULT_STATUS_FILTER && lead.status !== statusFilter) return false;
      if (queueFilter !== DEFAULT_QUEUE_FILTER && queueState(lead) !== queueFilter) return false;
      if (!query.trim()) return true;
      const term = query.trim().toLowerCase();
      return [lead.name || "", lead.phone || "", lead.last_message_body || ""].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [leads, query, queueFilter, statusFilter]);

  const selectedStage = useMemo(
    () => stageOptions.find((stage) => stage.key === (selected?.status || draftStatus)),
    [draftStatus, selected?.status, stageOptions],
  );

  const leadsByStage = useMemo(() => {
    return stageOptions.map((stage) => ({
      stage,
      items: filteredLeads.filter((lead) => lead.status === stage.key).slice(0, 4),
      total: filteredLeads.filter((lead) => lead.status === stage.key).length,
    }));
  }, [filteredLeads, stageOptions]);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadItems, stageItems, labelItems, viewItems] = await Promise.all([
        listLeads(),
        listStages(),
        listLabels(),
        listSavedViews("inbox"),
      ]);
      setLeads(leadItems);
      setStages(stageItems);
      setLabels(labelItems);
      setSavedViews(viewItems);
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
    setDraftOwnerName(selected.assignee_name || "");
    setDraftOwnerTeam(selected.assignee_team || "");
    setDraftLabels(selected.labels || []);
    setDraftPaused(Boolean(selected.paused));
    setDraftManualOverride(Boolean(selected.manual_override));
  }, [selected]);

  useEffect(() => {
    if (!selected?.conversation_id) {
      setMessages([]);
      return;
    }
    void refreshMessages(selected.conversation_id);
  }, [selected?.conversation_id, refreshMessages]);

  useEffect(() => {
    const node = messagesContainerRef.current;
    if (!node) return;
    const conversationChanged = previousConversationIdRef.current !== (selected?.conversation_id || null);
    previousConversationIdRef.current = selected?.conversation_id || null;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    if (conversationChanged || nearBottom) {
      node.scrollTop = node.scrollHeight;
      setShowScrollToBottom(false);
    }
  }, [messages, selected?.conversation_id]);

  function handleMessagesScroll() {
    const node = messagesContainerRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    setShowScrollToBottom(!nearBottom);
  }

  function scrollMessagesToBottom() {
    const node = messagesContainerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    setShowScrollToBottom(false);
  }

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
      await assignLead(selected.id, {
        owner_name: draftOwnerName.trim() || undefined,
        team: draftOwnerTeam.trim() || undefined,
      });
      await setLeadLabels(selected.id, draftLabels);
      await updateLeadAutomationState(selected.id, {
        paused: draftPaused,
        manual_override: draftManualOverride,
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

  function applySavedView(view: RupturSavedView) {
    setStatusFilter(view.definition.statusFilter || DEFAULT_STATUS_FILTER);
    setQueueFilter(view.definition.queueFilter || DEFAULT_QUEUE_FILTER);
    setQuery(view.definition.query || "");
  }

  async function onCreateSavedView() {
    const name = window.prompt("Nome da view salva");
    if (!name?.trim()) return;
    try {
      await createSavedView({
        scope: "inbox",
        name: name.trim(),
        definition: {
          statusFilter,
          queueFilter,
          query,
        },
        position: savedViews.length * 10 + 10,
        is_shared: true,
      });
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleDraftLabel(labelName: string) {
    setDraftLabels((current) =>
      current.includes(labelName) ? current.filter((item) => item !== labelName) : [...current, labelName],
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#f5ecdf] text-zinc-950">
        <div className="grid gap-px lg:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="bg-[#f5ecdf] px-5 py-5 sm:px-6 sm:py-6">
            <div className="text-[11px] uppercase tracking-[0.38em] text-[#9d4e31]">MyChat</div>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.9] tracking-[-0.07em] sm:text-[3.5rem]">
              conversa, fila e pipeline no mesmo campo de visao.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
              inspirado no Chatwoot, mas focado no nosso uso: fila viva, leitura de prioridade e acoes de CRM sem
              enterrar a conversa.
            </p>
          </div>

          <div className="grid gap-px bg-black/10 sm:grid-cols-3 lg:grid-cols-1">
            <div className="bg-[#eadcca] px-5 py-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">leads</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{counts.total}</div>
            </div>
            <div className="bg-[#9d4e31] px-5 py-4 text-[#fff8f1]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-200">conversas ativas</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{counts.withConversation}</div>
            </div>
            <div className="bg-[#eadcca] px-5 py-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">estagios visiveis</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{stageOptions.length}</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[22px] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_14px_40px_rgba(70,43,31,0.06)]">
        <div className="border-b border-black/10 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-zinc-500">queue control</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">controle de fila com leitura de prioridade</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {QUEUE_FILTERS.map((filter) => {
                const total = filter.key === "all" ? counts.total : counts.byQueue.get(filter.key) || 0;
                const active = queueFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setQueueFilter(filter.key)}
                    className={[
                      "rounded-[18px] border px-4 py-3 text-left transition",
                      active
                        ? "border-[#9d4e31]/30 bg-[#fbefe4] shadow-[0_10px_24px_rgba(70,43,31,0.08)]"
                        : "border-black/10 bg-[#fcfaf5] hover:bg-[#f7efe4]",
                    ].join(" ")}
                  >
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{filter.description}</div>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <span className="text-base font-semibold tracking-[-0.03em]">{filter.label}</span>
                      <span className="text-2xl font-semibold tracking-[-0.06em]">{total}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {savedViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => applySavedView(view)}
                className="rounded-full border border-black/10 bg-[#fcfaf5] px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-[#f6efe4]"
              >
                {view.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void onCreateSavedView()}
              className="rounded-full border border-[#9d4e31]/25 bg-[#fbefe4] px-3 py-1.5 text-xs text-[#8f492e] transition hover:bg-[#f5e2d3]"
            >
              Salvar leitura atual
            </button>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-4">
          <div className="grid min-w-[980px] grid-cols-4 gap-3">
            {leadsByStage.map(({ stage, items, total }) => (
              <section key={stage.key} className="rounded-[22px] border border-black/10 bg-[#fcfaf5] p-3">
                <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">pipeline</div>
                    <div className="mt-2 text-lg font-semibold tracking-[-0.04em]">{stage.name}</div>
                  </div>
                  <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-zinc-700">{total}</div>
                </div>

                <div className="mt-3 space-y-2">
                  {items.length ? (
                    items.map((lead) => {
                      const waiting = queueState(lead) === "awaiting_us";
                      const stale = (hoursSince(lead.last_message_at) || 0) > 12;
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={[
                            "w-full rounded-[18px] border p-3 text-left transition",
                            selectedLeadId === lead.id
                              ? "border-[#9d4e31]/25 bg-[#fff4e9]"
                              : "border-black/10 bg-white hover:bg-[#fffaf2]",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{lead.name || lead.phone || "Sem nome"}</div>
                              <div className="mt-1 truncate text-xs text-zinc-500">{lead.phone || "telefone_indefinido"}</div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {lead.paused ? (
                                <span className="rounded-full bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">pausado</span>
                              ) : null}
                              {lead.manual_override ? (
                                <span className="rounded-full bg-[#d9875f] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">manual</span>
                              ) : null}
                              {waiting ? (
                                <span className="rounded-full bg-[#9d4e31] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">agir</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 line-clamp-2 text-xs text-zinc-500">{lead.last_message_body || "Sem ultima mensagem"}</div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                            <span>{fmtTime(lead.last_message_at || lead.updated_at) || "sem data"}</span>
                            {stale ? <span>frio</span> : <span>quente</span>}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-black/10 bg-white px-3 py-4 text-sm text-zinc-500">
                      Nenhum lead nesta leitura.
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
        <aside className="rounded-[26px] border border-black/10 bg-white p-4 shadow-[0_14px_40px_rgba(70,43,31,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Fila detalhada</h2>
              <p className="text-sm text-zinc-500">busca, recorte e leitura rapida da ultima interacao.</p>
            </div>
            <button
              className="rounded-full border border-black/10 px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4]"
              onClick={() => void refreshLeads()}
              type="button"
            >
              Atualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-[18px] border border-black/10 bg-[#fcfaf5] px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-[#9d4e31]/40"
              placeholder="Buscar por nome, telefone ou mensagem"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter(DEFAULT_STATUS_FILTER)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  statusFilter === DEFAULT_STATUS_FILTER
                    ? "border-[#9d4e31]/30 bg-[#f7ebe1] text-[#8f492e]"
                    : "border-black/10 text-zinc-500 hover:bg-[#f6efe4]",
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
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    statusFilter === stage.key
                      ? "border-[#9d4e31]/30 bg-[#f7ebe1] text-[#8f492e]"
                      : "border-black/10 text-zinc-500 hover:bg-[#f6efe4]",
                  ].join(" ")}
                >
                  {stage.name} <span className="ml-1 text-zinc-500">{counts.byStatus.get(stage.key) || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-[68dvh] overflow-auto pr-1">
            {loading ? (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-[#fcfaf5] p-5 text-sm text-zinc-500">
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
                        "w-full rounded-[20px] border px-4 py-3 text-left transition",
                        selectedLeadId === lead.id
                          ? "border-[#9d4e31]/25 bg-[#fbf1e7] shadow-[0_10px_25px_rgba(70,43,31,0.08)]"
                          : "border-black/10 bg-[#fffdf9] hover:border-black/15 hover:bg-[#fcf7ef]",
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
                        <div className="line-clamp-2 text-xs text-zinc-500">{lead.last_message_body || "Sem ultima mensagem"}</div>
                        <div className="shrink-0 text-[10px] text-zinc-500">{fmtTime(lead.last_message_at || lead.updated_at)}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-[#fcfaf5] p-5 text-sm text-zinc-500">
                Nenhum lead bate com o filtro atual.
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-[26px] border border-black/10 bg-[#f8f2e8] p-4 shadow-[0_14px_40px_rgba(70,43,31,0.06)]">
          <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#9d4e31]">janela de intervencao</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {selected?.name || selected?.phone || "Selecione uma conversa"}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{selected?.phone || "sem_telefone"}</span>
                {selected?.status ? <span className="rounded-full border border-black/10 bg-white px-2 py-0.5">{selected.status}</span> : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4] disabled:opacity-50"
              onClick={() => selected?.conversation_id && void refreshMessages(selected.conversation_id)}
              disabled={!selected?.conversation_id}
            >
              Atualizar chat
            </button>
          </div>

          <div className="relative">
          <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="max-h-[62dvh] overflow-auto py-4">
            {!selected?.conversation_id ? (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-white/70 p-6 text-sm text-zinc-500">
                Este lead ainda nao tem conversa aberta.
              </div>
            ) : messages.length ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={message.direction === "out" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={[
                        "max-w-[82%] rounded-[20px] border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.12)]",
                        message.direction === "out" ? "border-[#9d4e31]/20 bg-[#fff4e9]" : "border-black/10 bg-white",
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
              <div className="rounded-[20px] border border-dashed border-black/10 bg-white/70 p-6 text-sm text-zinc-500">
                Sem mensagens ainda.
              </div>
            )}
          </div>
            {selected?.conversation_id && showScrollToBottom ? (
              <button
                type="button"
                onClick={scrollMessagesToBottom}
                className="absolute bottom-4 right-3 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition hover:bg-[#f6efe4]"
              >
                Ir para o fim
              </button>
            ) : null}
          </div>

          <div className="border-t border-black/10 pt-4">
            <div className="flex gap-2">
              <textarea
                className="min-h-24 w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#9d4e31]/40"
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
                className="rounded-[20px] bg-[#9d4e31] px-5 text-sm font-medium text-[#fff8f1] transition hover:bg-[#b35b3a] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void onSend()}
                disabled={!selected?.conversation_id || sending}
              >
                {sending ? "Enviando..." : "Responder"}
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-[26px] border border-black/10 bg-[#201714] p-4 text-[#fff7ef] shadow-[0_14px_40px_rgba(70,43,31,0.12)]">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Contexto do lead</h2>
          <p className="mt-1 text-sm text-zinc-400">edicao rapida para intervir no pipeline sem sair da conversa.</p>

          {selected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ultima atividade</div>
                <div className="mt-2 text-sm text-zinc-200">{fmtTime(selected.last_message_at || selected.updated_at) || "Sem atividade"}</div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Leitura atual</div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">{selectedStage?.name || selected?.status || "Sem estagio"}</div>
                <p className="mt-2 text-sm text-zinc-400">
                  ajuste nome e estagio aqui para reposicionar o lead sem quebrar o fluxo de resposta.
                </p>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Leitura de fila</div>
                <div className="mt-2 text-sm text-zinc-200">
                  {queueState(selected) === "paused"
                    ? "automacao pausada; nenhuma resposta automatica deve sair."
                    : queueState(selected) === "manual"
                      ? "intervencao humana ativa; o agente deve ficar suprimido."
                      : queueState(selected) === "awaiting_us"
                    ? "ultima mensagem veio do lead; merece resposta."
                    : queueState(selected) === "awaiting_contact"
                      ? "equipe ja respondeu; aguardando retorno."
                      : queueState(selected) === "no_conversation"
                        ? "lead ainda sem conversa aberta."
                        : "conversa em andamento."}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Guard rails</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-300">Pausar automacao</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d9875f]"
                      checked={draftPaused}
                      onChange={(e) => setDraftPaused(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-300">Intervencao manual</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d9875f]"
                      checked={draftManualOverride}
                      onChange={(e) => setDraftManualOverride(e.target.checked)}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Responsavel</div>
                <div className="mt-2 text-sm text-zinc-200">
                  {selected.assignee_name || "sem owner"} {selected.assignee_team ? `• ${selected.assignee_team}` : ""}
                </div>
              </div>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Nome do lead</div>
                <input
                  className="w-full rounded-[18px] border border-white/10 bg-[#2a211e] px-4 py-3 text-sm outline-none focus:border-[#d9875f]/40"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Nome exibido no cockpit"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Estagio atual</div>
                <select
                  className="w-full rounded-[18px] border border-white/10 bg-[#2a211e] px-4 py-3 text-sm outline-none focus:border-[#d9875f]/40"
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

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Owner</div>
                <input
                  className="w-full rounded-[18px] border border-white/10 bg-[#2a211e] px-4 py-3 text-sm outline-none focus:border-[#d9875f]/40"
                  value={draftOwnerName}
                  onChange={(e) => setDraftOwnerName(e.target.value)}
                  placeholder="quem responde por este lead"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Time</div>
                <input
                  className="w-full rounded-[18px] border border-white/10 bg-[#2a211e] px-4 py-3 text-sm outline-none focus:border-[#d9875f]/40"
                  value={draftOwnerTeam}
                  onChange={(e) => setDraftOwnerTeam(e.target.value)}
                  placeholder="closer, sdr, inbound..."
                />
              </label>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-zinc-500">Labels</div>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const active = draftLabels.includes(label.key);
                    return (
                      <button
                        key={label.key}
                        type="button"
                        onClick={() => toggleDraftLabel(label.key)}
                        className={[
                          "rounded-full border px-3 py-1.5 text-xs transition",
                          active
                            ? "border-[#d9875f]/30 bg-[#d9875f]/14 text-[#ffe0cf]"
                            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]",
                        ].join(" ")}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void onSaveLead()}
                disabled={savingLead || !selected}
                className="w-full rounded-[20px] border border-[#d9875f]/30 bg-[#d9875f]/14 px-4 py-3 text-sm font-medium text-[#ffe0cf] hover:bg-[#d9875f]/22 disabled:opacity-50"
              >
                {savingLead ? "Salvando..." : "Salvar contexto"}
              </button>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
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
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Automacao</dt>
                    <dd className="text-right">
                      {selected.paused ? "pausada" : selected.manual_override ? "manual" : "liberada"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-white/15 bg-white/[0.04] p-5 text-sm text-zinc-400">
              Selecione um lead para editar status, nome e acompanhar o contexto.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
