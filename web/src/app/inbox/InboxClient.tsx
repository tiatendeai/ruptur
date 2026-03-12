"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RupturLead, RupturMessage } from "@/lib/ruptur";
import { listLeads, listMessages, sendConversationText } from "@/lib/ruptur";

function fmtTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function InboxClient() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RupturMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => leads.find((l) => l.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listLeads();
      setLeads(items);
      if (!selectedLeadId && items.length) setSelectedLeadId(items[0].id);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedLeadId]);

  const refreshMessages = useCallback(async (conversationId: string) => {
    setError(null);
    try {
      const items = await listMessages(conversationId);
      setMessages(items.reverse());
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
    }
  }, []);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    if (!selected?.conversation_id) {
      setMessages([]);
      return;
    }
    refreshMessages(selected.conversation_id);
  }, [selected?.conversation_id, refreshMessages]);

  async function onSend() {
    if (!selected?.conversation_id) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await sendConversationText(selected.conversation_id, t);
      await refreshMessages(selected.conversation_id);
      await refreshLeads();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-12">
      <div className="md:col-span-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <button
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
            onClick={refreshLeads}
            type="button"
          >
            Atualizar
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5">
          {loading ? (
            <div className="p-4 text-sm text-zinc-400">Carregando…</div>
          ) : leads.length ? (
            <ul className="max-h-[70dvh] overflow-auto p-1">
              {leads.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(l.id)}
                    className={[
                      "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5",
                      selectedLeadId === l.id ? "bg-white/10" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate font-medium">{l.name || l.phone || "Sem nome"}</div>
                      <div className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-zinc-200">
                        {l.status}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-400">
                      <div className="truncate">{l.last_message_body || "—"}</div>
                      <div className="shrink-0">{fmtTime(l.last_message_at || l.updated_at)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-zinc-400">Sem leads ainda. Envie uma mensagem para o WhatsApp.</div>
          )}
        </div>
      </div>

      <div className="md:col-span-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{selected?.name || selected?.phone || "Selecione um lead"}</div>
            <div className="text-xs text-zinc-400">{selected?.phone || ""}</div>
          </div>
          <button
            type="button"
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
            onClick={() => selected?.conversation_id && refreshMessages(selected.conversation_id)}
            disabled={!selected?.conversation_id}
          >
            Atualizar chat
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5">
          <div className="max-h-[62dvh] overflow-auto p-4">
            {!selected?.conversation_id ? (
              <div className="text-sm text-zinc-400">Este lead ainda não tem conversa.</div>
            ) : messages.length ? (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={m.direction === "out" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={[
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        m.direction === "out" ? "bg-indigo-500/20 border border-indigo-400/20" : "bg-white/10",
                      ].join(" ")}
                    >
                      <div className="whitespace-pre-wrap">{m.body || "—"}</div>
                      <div className="mt-1 text-right text-[10px] text-zinc-400">{fmtTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Sem mensagens ainda.</div>
            )}
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-white/20"
                placeholder="Digite e envie…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                disabled={!selected?.conversation_id}
              />
              <button
                type="button"
                className="rounded-lg bg-indigo-500/80 px-4 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                onClick={onSend}
                disabled={!selected?.conversation_id}
              >
                Enviar
              </button>
            </div>
            {error ? <div className="mt-2 text-xs text-red-300">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
