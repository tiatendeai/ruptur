"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RupturContactProfile, RupturLead, RupturMessage, RupturSavedView } from "@/lib/ruptur";
import {
  createSavedView,
  listContactProfiles,
  listLeads,
  listMessages,
  listSavedViews,
  sendConversationText,
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

function fmtRelative(value?: string | null) {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.round(diff / 1000 / 60);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function fmtDayLabel(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizePhone(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  return digits || null;
}

function avatarLabel(name?: string | null, phone?: string | null) {
  const source = (name || phone || "?").trim();
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function compareLeadFreshness(a: RupturLead, b: RupturLead) {
  const aTs = new Date(a.last_message_at || a.updated_at || 0).getTime();
  const bTs = new Date(b.last_message_at || b.updated_at || 0).getTime();
  return bTs - aTs;
}

function compareMessages(a: RupturMessage, b: RupturMessage) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

type InboxContact = {
  key: string;
  primaryLead: RupturLead;
  leads: RupturLead[];
  conversationIds: string[];
  phone: string | null;
  name: string | null;
  labels: string[];
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastMessageDirection: "in" | "out" | null;
};

type MessageBlock = {
  key: string;
  direction: "in" | "out";
  sender: string | null;
  createdAt: string;
  items: RupturMessage[];
};

function buildContacts(leads: RupturLead[]) {
  const groups = new Map<string, RupturLead[]>();

  for (const lead of leads) {
    const key = normalizePhone(lead.phone) || lead.conversation_id || lead.id;
    const current = groups.get(key) || [];
    current.push(lead);
    groups.set(key, current);
  }

  const contacts: InboxContact[] = [];
  for (const [key, items] of groups.entries()) {
    const sorted = [...items].sort(compareLeadFreshness);
    const withConversation = sorted.find((item) => item.conversation_id);
    const named = sorted.find((item) => item.name?.trim());
    const primaryLead = withConversation || named || sorted[0];
    const labelSet = new Set<string>();
    const conversationIds = new Set<string>();

    for (const item of sorted) {
      for (const label of item.labels || []) labelSet.add(label);
      if (item.conversation_id) conversationIds.add(item.conversation_id);
    }

    contacts.push({
      key,
      primaryLead,
      leads: sorted,
      conversationIds: Array.from(conversationIds),
      phone: primaryLead.phone || sorted.find((item) => item.phone)?.phone || null,
      name: primaryLead.name || sorted.find((item) => item.name?.trim())?.name || null,
      labels: Array.from(labelSet),
      lastMessageAt: primaryLead.last_message_at || null,
      lastMessageBody: primaryLead.last_message_body || null,
      lastMessageDirection: primaryLead.last_message_direction || null,
    });
  }

  return contacts.sort((a, b) => compareLeadFreshness(a.primaryLead, b.primaryLead));
}

function buildMessageBlocks(items: RupturMessage[]) {
  const blocks: MessageBlock[] = [];

  for (const message of items) {
    const previous = blocks[blocks.length - 1];
    const previousTs = previous
      ? new Date(previous.items[previous.items.length - 1]?.created_at || previous.createdAt).getTime()
      : 0;
    const currentTs = new Date(message.created_at).getTime();
    const canMerge =
      previous &&
      previous.direction === message.direction &&
      (previous.sender || null) === (message.sender || null) &&
      currentTs - previousTs < 1000 * 60 * 10;

    if (canMerge) {
      previous.items.push(message);
      continue;
    }

    blocks.push({
      key: message.id,
      direction: message.direction,
      sender: message.sender || null,
      createdAt: message.created_at,
      items: [message],
    });
  }

  return blocks;
}

function ContactAvatar({
  name,
  phone,
  imageUrl,
  className,
}: {
  name?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  className: string;
}) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name || phone || "Contato"} className={`${className} object-cover`} loading="lazy" />;
  }

  return (
    <div className={`${className} bg-[#eadcca] text-xs font-semibold uppercase tracking-[0.16em] text-[#8f492e]`}>
      {avatarLabel(name, phone)}
    </div>
  );
}

function queueTone(queue?: RupturLead["queue_state"]) {
  if (queue === "paused") return "border-zinc-700/15 bg-zinc-100 text-zinc-800";
  if (queue === "manual") return "border-amber-700/15 bg-amber-50 text-amber-900";
  if (queue === "awaiting_us") return "border-[#9d4e31]/20 bg-[#fbefe4] text-[#8f492e]";
  if (queue === "awaiting_contact") return "border-sky-700/15 bg-sky-50 text-sky-900";
  if (queue === "no_conversation") return "border-black/10 bg-[#f4ede2] text-zinc-700";
  return "border-emerald-700/15 bg-emerald-50 text-emerald-900";
}

function linkifyText(value?: string | null) {
  const text = value || "—";
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-[#8f492e] underline decoration-[#d5a88e] underline-offset-2"
        >
          {part}
        </a>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

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
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [savedViews, setSavedViews] = useState<RupturSavedView[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RupturMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState(DEFAULT_QUEUE_FILTER);
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "context">("list");
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});
  const [pinnedContacts, setPinnedContacts] = useState<Record<string, boolean>>({});
  const [notesByContact, setNotesByContact] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const contacts = useMemo(() => buildContacts(leads), [leads]);
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.primaryLead.id === selectedLeadId) || null,
    [contacts, selectedLeadId],
  );
  const selected = selectedContact?.primaryLead || null;

  const counts = useMemo(() => {
    const localByQueue = new Map<string, number>();
    for (const contact of contacts) {
      const lead = contact.primaryLead;
      const queueKey = lead.queue_state || "active";
      localByQueue.set(queueKey, (localByQueue.get(queueKey) || 0) + 1);
    }
    return {
      total: contacts.length,
      withConversation: contacts.filter((contact) => contact.conversationIds.length > 0).length,
      byQueue: localByQueue,
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const lead = contact.primaryLead;
      if (queueFilter !== DEFAULT_QUEUE_FILTER && lead.queue_state !== queueFilter) return false;
      if (!query.trim()) return true;
      const term = query.trim().toLowerCase();
      return [contact.name || "", contact.phone || "", contact.lastMessageBody || ""].some((value) =>
        value.toLowerCase().includes(term),
      );
    }).sort((a, b) => {
      const aPinned = pinnedContacts[a.key] ? 1 : 0;
      const bPinned = pinnedContacts[b.key] ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return compareLeadFreshness(a.primaryLead, b.primaryLead);
    });
  }, [contacts, pinnedContacts, query, queueFilter]);

  const visibleMessages = useMemo(() => {
    if (!messageQuery.trim()) return messages;
    const term = messageQuery.trim().toLowerCase();
    return messages.filter((message) =>
      [message.body || "", message.sender || ""].some((value) => value.toLowerCase().includes(term)),
    );
  }, [messageQuery, messages]);

  const messageBlocks = useMemo(() => buildMessageBlocks(visibleMessages), [visibleMessages]);
  const selectedPhone = normalizePhone(selectedContact?.phone);
  const waLink = selectedPhone ? `https://wa.me/${selectedPhone}` : null;
  const quickReplies = useMemo(
    () => [
      "Oi, vi sua mensagem e vou seguir por aqui.",
      "Recebi seu contato. Ja estou verificando e volto em instantes.",
      "Perfeito. Pode me confirmar seu objetivo para eu te responder com mais precisao?",
      "Se preferir, posso continuar esse atendimento por aqui e te atualizar em tempo real.",
      "Posso te mandar os proximos passos agora, por aqui mesmo.",
    ],
    [],
  );
  const selectedNote = selectedContact ? notesByContact[selectedContact.key] || "" : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawPinned = window.localStorage.getItem("ruptur-mychat-pinned");
      const rawNotes = window.localStorage.getItem("ruptur-mychat-notes");
      if (rawPinned) setPinnedContacts(JSON.parse(rawPinned) as Record<string, boolean>);
      if (rawNotes) setNotesByContact(JSON.parse(rawNotes) as Record<string, string>);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ruptur-mychat-pinned", JSON.stringify(pinnedContacts));
  }, [pinnedContacts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ruptur-mychat-notes", JSON.stringify(notesByContact));
  }, [notesByContact]);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([listLeads(), listSavedViews("inbox")]);
    const [leadItems, viewItems] = results;
    const errors: string[] = [];

    if (leadItems.status === "fulfilled") {
      setLeads(leadItems.value);
      setSelectedLeadId((current) => {
        const nextContacts = buildContacts(leadItems.value);
        if (current && nextContacts.some((contact) => contact.primaryLead.id === current)) return current;
        return nextContacts[0]?.primaryLead.id || null;
      });
    } else {
      errors.push(`leads: ${leadItems.reason instanceof Error ? leadItems.reason.message : String(leadItems.reason)}`);
    }

    if (viewItems.status === "fulfilled") {
      setSavedViews(viewItems.value);
    } else {
      errors.push(`views: ${viewItems.reason instanceof Error ? viewItems.reason.message : String(viewItems.reason)}`);
    }

    setError(errors.length ? errors.join(" | ") : null);
    setLoading(false);
  }, []);

  const refreshMessages = useCallback(async (conversationIds: string[]) => {
    setError(null);
    try {
      const results = await Promise.all(conversationIds.map((conversationId) => listMessages(conversationId)));
      const deduped = new Map<string, RupturMessage>();
      for (const batch of results) {
        for (const item of batch) {
          deduped.set(item.external_id || item.id, item);
        }
      }
      setMessages(Array.from(deduped.values()).sort(compareMessages));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    const candidates = [
      ...filteredContacts.slice(0, 40).map((contact) => normalizePhone(contact.phone)).filter(Boolean),
      normalizePhone(selectedContact?.phone),
    ].filter(Boolean) as string[];

    const pending = candidates.filter((phone) => !profileImages[phone]);
    if (!pending.length) return;

    let cancelled = false;
    void listContactProfiles(pending).then((items: RupturContactProfile[]) => {
      if (cancelled || !items.length) return;
      setProfileImages((current) => {
        const next = { ...current };
        for (const item of items) {
          const key = normalizePhone(item.number);
          if (key && item.imageUrl) next[key] = item.imageUrl;
        }
        return next;
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [filteredContacts, profileImages, selectedContact]);

  useEffect(() => {
    if (!selectedContact?.conversationIds.length) {
      setMessages([]);
      return;
    }
    void refreshMessages(selectedContact.conversationIds);
  }, [refreshMessages, selectedContact]);

  useEffect(() => {
    const node = messagesContainerRef.current;
    if (!node) return;
    const conversationKey = selectedContact?.conversationIds.join("|") || null;
    const conversationChanged = previousConversationIdRef.current !== conversationKey;
    previousConversationIdRef.current = conversationKey;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    if (conversationChanged || nearBottom) {
      node.scrollTop = node.scrollHeight;
      setShowScrollToBottom(false);
    }
  }, [messages, selectedContact]);

  useEffect(() => {
    if (selectedLeadId) setMobilePane("chat");
  }, [selectedLeadId]);

  useEffect(() => {
    setDraftNote(selectedNote);
  }, [selectedNote]);

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

  async function copySelectedPhone() {
    if (!selectedPhone || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(selectedPhone);
    } catch {}
  }

  function togglePinned(contactKey: string) {
    setPinnedContacts((current) => ({
      ...current,
      [contactKey]: !current[contactKey],
    }));
  }

  function saveDraftNote() {
    if (!selectedContact) return;
    setNotesByContact((current) => ({
      ...current,
      [selectedContact.key]: draftNote.trim(),
    }));
  }

  async function onSend() {
    if (!selected?.conversation_id) return;
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setText("");
    try {
      await sendConversationText(selected.conversation_id, value);
      await Promise.all([refreshMessages(selectedContact?.conversationIds || [selected.conversation_id]), refreshLeads()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setText(value);
    } finally {
      setSending(false);
    }
  }

  function applySavedView(view: RupturSavedView) {
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

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[radial-gradient(circle_at_top_left,#fff3df_0%,#f4e7d5_38%,#ead9c6_100%)] text-zinc-950 shadow-[0_24px_60px_rgba(118,74,47,0.10)]">
        <div className="grid gap-px lg:grid-cols-[minmax(0,1.35fr)_420px]">
          <div className="bg-transparent px-5 py-5 sm:px-6 sm:py-6">
            <div className="text-[11px] uppercase tracking-[0.38em] text-[#9d4e31]">MyChat</div>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[0.9] tracking-[-0.07em] sm:text-[3.5rem]">
              inbox premium para conversar, priorizar e fechar sem ruído.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
              leitura forte de WhatsApp, com contexto vivo, contatos priorizados e uma bancada melhor para resposta manual.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5">contatos consolidados</span>
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5">notas internas</span>
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5">pinos operacionais</span>
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5">respostas rápidas</span>
            </div>
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
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">na fila agora</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{filteredContacts.length}</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[22px] border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_14px_40px_rgba(70,43,31,0.06)]">
        <div className="border-b border-black/10 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-zinc-500">inbox control</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">recorte rapido da operacao de conversa</div>
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)_320px]">
        <div className="flex gap-2 xl:hidden">
          {[
            { key: "list", label: "Conversas" },
            { key: "chat", label: "Chat" },
            { key: "context", label: "Contato" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMobilePane(item.key as "list" | "chat" | "context")}
              className={[
                "flex-1 rounded-[18px] border px-3 py-3 text-sm font-medium transition",
                mobilePane === item.key
                  ? "border-[#9d4e31]/30 bg-[#fbefe4] text-[#8f492e]"
                  : "border-black/10 bg-white text-zinc-600",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <aside
          className={[
            "rounded-[26px] border border-[#d7c2ad] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4ea_100%)] p-4 shadow-[0_18px_48px_rgba(70,43,31,0.08)]",
            mobilePane === "list" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
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

            <div className="rounded-[18px] border border-black/10 bg-[#fcfaf5] px-4 py-3 text-xs text-zinc-500">
              contatos unificados por telefone, com avatar, ultima direcao de mensagem e estado operacional.
            </div>

            <div className="flex flex-wrap gap-2">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    queueFilter === filter.key
                      ? "border-[#9d4e31]/30 bg-[#f7ebe1] text-[#8f492e]"
                      : "border-black/10 text-zinc-500 hover:bg-[#f6efe4]",
                  ].join(" ")}
                >
                  {filter.label}{" "}
                  <span className="ml-1 text-zinc-500">
                    {filter.key === "all" ? counts.total : counts.byQueue.get(filter.key) || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-h-[68dvh] overflow-auto pr-1">
            {loading ? (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-[#fcfaf5] p-5 text-sm text-zinc-500">
                Carregando conversas...
              </div>
            ) : filteredContacts.length ? (
              <ul className="space-y-2">
                {filteredContacts.map((contact) => {
                  const lead = contact.primaryLead;
                  return (
                    <li key={contact.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setMobilePane("chat");
                        }}
                        className={[
                          "w-full rounded-[20px] border px-4 py-3 text-left transition",
                          selectedLeadId === lead.id
                            ? "border-[#9d4e31]/25 bg-[#fbf1e7] shadow-[0_10px_25px_rgba(70,43,31,0.08)]"
                            : "border-black/10 bg-[#fffdf9] hover:border-black/15 hover:bg-[#fcf7ef]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <ContactAvatar
                              name={contact.name}
                              phone={contact.phone}
                              imageUrl={profileImages[normalizePhone(contact.phone) || ""]}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{contact.name || contact.phone || "Sem nome"}</div>
                              <div className="mt-1 truncate text-xs text-zinc-500">{contact.phone || "telefone_indefinido"}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {pinnedContacts[contact.key] ? (
                              <span className="rounded-full bg-[#221815] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#fff7ef]">
                                pin
                              </span>
                            ) : null}
                            {lead.paused ? (
                              <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                                pausado
                              </span>
                            ) : lead.manual_override ? (
                              <span className="rounded-full bg-[#d9875f] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                                manual
                              </span>
                            ) : lead.queue_state === "awaiting_us" ? (
                              <span className="rounded-full bg-[#9d4e31] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                                responder
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-xs text-zinc-500">{contact.lastMessageBody || "Sem ultima mensagem"}</div>
                            {notesByContact[contact.key] ? (
                              <div className="mt-2 line-clamp-1 rounded-full bg-[#f5e4d3] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8f492e]">
                                nota interna ativa
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                              <span>{contact.lastMessageDirection === "out" ? "saida" : "entrada"}</span>
                              <span>{fmtRelative(contact.lastMessageAt || lead.updated_at)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-[10px] text-zinc-500">{fmtTime(contact.lastMessageAt || lead.updated_at)}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-[#fcfaf5] p-5 text-sm text-zinc-500">
                Nenhum lead bate com o filtro atual.
              </div>
            )}
          </div>
        </aside>

        <section
          className={[
            "rounded-[26px] border border-[#d7c2ad] bg-[radial-gradient(circle_at_top,#fff9ef_0%,#f4e7d8_34%,#eadbc8_100%)] p-4 shadow-[0_18px_48px_rgba(70,43,31,0.08)]",
            mobilePane === "chat" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ContactAvatar
                name={selectedContact?.name}
                phone={selectedContact?.phone}
                imageUrl={profileImages[normalizePhone(selectedContact?.phone) || ""]}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em]"
              />
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-[#9d4e31]">conversa ativa</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  {selectedContact?.name || selectedContact?.phone || "Selecione uma conversa"}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>{selectedContact?.phone || "sem_telefone"}</span>
                  {selectedContact && selectedContact.leads.length > 1 ? (
                    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5">
                      {selectedContact.leads.length} registros unidos
                    </span>
                  ) : null}
                  {selected?.queue_state ? (
                    <span className={["rounded-full border px-2 py-0.5", queueTone(selected.queue_state)].join(" ")}>
                      {selected.queue_state}
                    </span>
                  ) : null}
                  {selectedContact?.labels.length ? (
                    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5">
                      {selectedContact.labels.length} labels
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4] xl:hidden"
                onClick={() => setMobilePane("list")}
              >
                Voltar
              </button>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4] disabled:opacity-50"
                onClick={() => selectedContact?.conversationIds.length && void refreshMessages(selectedContact.conversationIds)}
                disabled={!selectedContact?.conversationIds.length}
              >
                Atualizar chat
              </button>
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4] disabled:opacity-50"
                onClick={() => void copySelectedPhone()}
                disabled={!selectedPhone}
              >
                Copiar numero
              </button>
              {selectedContact ? (
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4]"
                  onClick={() => togglePinned(selectedContact.key)}
                >
                  {pinnedContacts[selectedContact.key] ? "Desafixar" : "Fixar"}
                </button>
              ) : null}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4]"
                >
                  Abrir no WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-[#f6efe4] xl:hidden"
                onClick={() => setMobilePane("context")}
              >
                Contato
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-[16px] border border-black/10 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-zinc-400 focus:border-[#9d4e31]/40"
                placeholder="Buscar dentro da conversa"
                value={messageQuery}
                onChange={(e) => setMessageQuery(e.target.value)}
              />
              {quickReplies.map((reply, index) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setText((current) => (current ? `${current}\n${reply}` : reply))}
                  className={[
                    "rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-zinc-600 transition hover:bg-[#f6efe4]",
                    index > 1 ? "hidden lg:inline-flex" : "",
                  ].join(" ")}
                >
                  + resposta rapida
                </button>
              ))}
            </div>
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="mt-4 max-h-[62dvh] overflow-auto rounded-[24px] border border-[#d8c4b1] bg-[radial-gradient(circle_at_top,#fffdf9_0%,#f7ecde_36%,#efe0ce_100%)] px-3 py-4"
          >
            {!selectedContact?.conversationIds.length ? (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-white/70 p-6 text-sm text-zinc-500">
                Este lead ainda nao tem conversa aberta.
              </div>
            ) : messages.length ? (
              <div className="space-y-3">
                {messageBlocks.map((block, index) => {
                  const dayLabel = fmtDayLabel(block.createdAt);
                  const previousDayLabel = index > 0 ? fmtDayLabel(messageBlocks[index - 1]?.createdAt) : null;
                  return (
                    <div key={block.key}>
                      {dayLabel && dayLabel !== previousDayLabel ? (
                        <div className="mb-3 flex items-center justify-center">
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                            {dayLabel}
                          </span>
                        </div>
                      ) : null}
                      <div className={block.direction === "out" ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={[
                            "max-w-[82%] rounded-[20px] border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.12)]",
                            block.direction === "out" ? "border-[#9d4e31]/20 bg-[#fff4e9]" : "border-black/10 bg-white",
                          ].join(" ")}
                        >
                          {block.direction === "in" ? (
                            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                              {block.sender || selectedContact?.name || selectedContact?.phone || "contato"}
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            {block.items.map((message) => (
                              <div key={message.id} className="whitespace-pre-wrap leading-6">
                                {linkifyText(message.body)}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-right text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            {block.direction === "out" ? "saida" : "entrada"} •{" "}
                            {fmtTime(block.items[block.items.length - 1]?.created_at || block.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-white/70 p-6 text-sm text-zinc-500">
                {messageQuery.trim() ? "Nenhuma mensagem bate com a busca atual." : "Sem mensagens ainda."}
              </div>
            )}
          </div>
            {selectedContact?.conversationIds.length && showScrollToBottom ? (
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
            <div className="mb-3 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={`composer-${reply}`}
                  type="button"
                  onClick={() => setText(reply)}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-[#f6efe4]"
                >
                  usar modelo
                </button>
              ))}
            </div>
            <div className="rounded-[24px] border border-[#dcc8b5] bg-white/80 p-3 shadow-[0_14px_30px_rgba(70,43,31,0.08)]">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <span className="rounded-full bg-[#f5e8da] px-2.5 py-1 text-[#8f492e]">resposta manual</span>
              <span className="rounded-full bg-[#f0eee9] px-2.5 py-1 text-zinc-600">contexto contínuo</span>
              <span className="rounded-full bg-[#eef4ea] px-2.5 py-1 text-emerald-700">whatsapp-ready</span>
            </div>
            <div className="flex gap-2">
              <textarea
                className="min-h-24 w-full rounded-[20px] border border-black/10 bg-[#fffdfa] px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#9d4e31]/40"
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
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
              <span>`Enter` envia, `Shift + Enter` quebra linha.</span>
              <span>{text.trim().length} caracteres</span>
            </div>
            </div>
          </div>
        </section>

        <aside
          className={[
            "rounded-[26px] border border-[#33231c] bg-[linear-gradient(180deg,#241916_0%,#1a1210_100%)] p-4 text-[#fff7ef] shadow-[0_20px_50px_rgba(24,15,11,0.30)]",
            mobilePane === "context" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
          <div className="mb-4 xl:hidden">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.12]"
              onClick={() => setMobilePane("chat")}
            >
              Voltar ao chat
            </button>
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Contexto da conversa</h2>
          <p className="mt-1 text-sm text-zinc-400">painel de leitura do inbox, sem editar CRM ou pipeline aqui.</p>

          {selected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Ultima atividade</div>
                <div className="mt-2 text-sm text-zinc-200">{fmtTime(selected.last_message_at || selected.updated_at) || "Sem atividade"}</div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Contato consolidado</div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                  {selectedContact?.name || selected.phone || "Sem nome"}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{selectedContact?.phone || "sem_telefone"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/[0.12]"
                    >
                      abrir no WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copySelectedPhone()}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/[0.12]"
                  >
                    copiar numero
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Estado operacional</div>
                <div className="mt-2 text-sm text-zinc-200">
                  {selected.queue_state === "paused"
                    ? "automacao pausada; nenhuma resposta automatica deve sair."
                    : selected.queue_state === "manual"
                      ? "intervencao humana ativa; o agente deve ficar suprimido."
                      : selected.queue_state === "awaiting_us"
                    ? "ultima mensagem veio do lead; merece resposta."
                    : selected.queue_state === "awaiting_contact"
                      ? "equipe ja respondeu; aguardando retorno."
                      : selected.queue_state === "no_conversation"
                        ? "lead ainda sem conversa aberta."
                        : "conversa em andamento."}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Resumo rapido</div>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Telefone</dt>
                    <dd className="text-right">{selectedContact?.phone || selected.phone || "sem_telefone"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Registros unidos</dt>
                    <dd className="text-right">{selectedContact?.leads.length || 1}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Conversas ativas</dt>
                    <dd className="text-right">{selectedContact?.conversationIds.length || 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Mensagens carregadas</dt>
                    <dd className="text-right">{messages.length}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Automacao</dt>
                    <dd className="text-right">
                      {selected.paused ? "pausada" : selected.manual_override ? "manual" : "liberada"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-400">Responsavel</dt>
                    <dd className="text-right">
                      {selected.assignee_name || "sem owner"} {selected.assignee_team ? `• ${selected.assignee_team}` : ""}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Nota interna</div>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="anote contexto, objeções, próximos passos, tom da conversa..."
                  className="mt-3 min-h-28 w-full rounded-[18px] border border-white/10 bg-[#2a1d19] px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#d9875f]/40"
                />
                <button
                  type="button"
                  onClick={saveDraftNote}
                  className="mt-3 w-full rounded-[18px] border border-[#d9875f]/30 bg-[#d9875f]/14 px-4 py-3 text-sm font-medium text-[#ffe0cf] transition hover:bg-[#d9875f]/22"
                >
                  Salvar nota do contato
                </button>
              </div>

              {selectedContact?.labels.length ? (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">Labels do contato</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedContact.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-white/15 bg-white/[0.04] p-5 text-sm text-zinc-400">
              Selecione uma conversa para acompanhar o contexto do inbox.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
