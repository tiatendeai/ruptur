"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RupturContactProfile, RupturLead, RupturMessage, RupturSavedView } from "@/lib/ruptur";
import {
  assignLead,
  createSavedView,
  listContactProfiles,
  listLabels,
  listLeads,
  listMessages,
  listSavedViews,
  sendConversationText,
  setLeadLabels,
  updateLeadAutomationState,
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
      (previous.items[previous.items.length - 1]?.kind || "text") === (message.kind || "text") &&
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

function deliveryLabel(status?: RupturMessage["delivery_status"]) {
  if (status === "read") return "lida";
  if (status === "delivered") return "entregue";
  if (status === "sent") return "enviada";
  if (status === "failed") return "falhou";
  return "status indefinido";
}

function deliveryTone(status?: RupturMessage["delivery_status"]) {
  if (status === "read") return "border-emerald-700/15 bg-emerald-50 text-emerald-900";
  if (status === "delivered") return "border-sky-700/15 bg-sky-50 text-sky-900";
  if (status === "sent") return "border-black/10 bg-[#f4ede2] text-zinc-700";
  if (status === "failed") return "border-red-700/15 bg-red-50 text-red-800";
  return "border-black/10 bg-[#f4ede2] text-zinc-700";
}

function isMediaKind(kind?: RupturMessage["kind"]) {
  return kind && kind !== "text" && kind !== "link" && kind !== "unknown";
}

function MessageBubbleBody({ message }: { message: RupturMessage }) {
  const kind = message.kind || "text";
  const fileLabel = message.file_name || message.media_url || "arquivo";

  if (kind === "image" && message.media_url) {
    return (
      <div className="space-y-2">
        <a href={message.media_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[16px] border border-black/10">
          <img src={message.media_url} alt={message.caption || message.file_name || "imagem"} className="max-h-72 w-full object-cover" loading="lazy" />
        </a>
        {message.caption ? <div className="whitespace-pre-wrap leading-6">{linkifyText(message.caption)}</div> : null}
      </div>
    );
  }

  if ((kind === "audio" || kind === "ptt") && message.media_url) {
    return (
      <div className="space-y-2">
        <div className="rounded-[16px] border border-black/10 bg-black/[0.03] px-3 py-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {kind === "ptt" ? "audio / ptt" : "audio"}
          </div>
          <audio controls preload="none" className="w-full">
            <source src={message.media_url} type={message.mime_type || "audio/mpeg"} />
          </audio>
        </div>
        {message.body ? <div className="whitespace-pre-wrap leading-6">{linkifyText(message.body)}</div> : null}
      </div>
    );
  }

  if (kind === "video" && message.media_url) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-[16px] border border-black/10 bg-black">
          <video controls preload="metadata" className="max-h-80 w-full">
            <source src={message.media_url} type={message.mime_type || "video/mp4"} />
          </video>
        </div>
        {message.caption ? <div className="whitespace-pre-wrap leading-6">{linkifyText(message.caption)}</div> : null}
      </div>
    );
  }

  if (kind === "document" && message.media_url) {
    return (
      <div className="space-y-2">
        <a
          href={message.media_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[16px] border border-black/10 bg-black/[0.03] px-4 py-3 transition hover:bg-black/[0.05]"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">documento</div>
            <div className="mt-1 text-sm font-medium">{fileLabel}</div>
          </div>
          <div className="text-xs text-[#8f492e]">abrir</div>
        </a>
        {message.caption ? <div className="whitespace-pre-wrap leading-6">{linkifyText(message.caption)}</div> : null}
      </div>
    );
  }

  if (kind === "sticker") {
    return (
      <div className="rounded-[16px] border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-zinc-600">
        figurinha recebida
      </div>
    );
  }

  return <div className="whitespace-pre-wrap leading-6">{linkifyText(message.body || message.caption || "—")}</div>;
}

const DEFAULT_QUEUE_FILTER = "all";
const BRAND_ACTIVE = "border-[#9d4e31]/25 bg-[#4a2316] text-[#fff1e8]";
const BRAND_BUTTON = "border-[#9d4e31]/25 bg-[#8f492e] text-[#fff1e8] hover:bg-[#7f4129]";
const BRAND_GHOST = "border-[#9d4e31]/20 bg-[#1b1412] text-[#f0d9ca] hover:bg-[#241915]";

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
  const [savingContext, setSavingContext] = useState(false);
  const [leads, setLeads] = useState<RupturLead[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ key: string; name: string; color: string }[]>([]);
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
  const [assigneeNameDraft, setAssigneeNameDraft] = useState("");
  const [assigneeTeamDraft, setAssigneeTeamDraft] = useState("");
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
      [message.body || "", message.caption || "", message.file_name || "", message.sender || ""].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [messageQuery, messages]);

  const messageBlocks = useMemo(() => buildMessageBlocks(visibleMessages), [visibleMessages]);
  const selectedPhone = normalizePhone(selectedContact?.phone);
  const waLink = selectedPhone ? `https://wa.me/${selectedPhone}` : null;
  const needsReplyCount = counts.byQueue.get("awaiting_us") || 0;
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
    const results = await Promise.allSettled([listLeads(), listSavedViews("inbox"), listLabels()]);
    const [leadItems, viewItems, labelItems] = results;
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

    if (labelItems.status === "fulfilled") {
      setAvailableLabels(labelItems.value);
    } else {
      errors.push(`labels: ${labelItems.reason instanceof Error ? labelItems.reason.message : String(labelItems.reason)}`);
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

  useEffect(() => {
    setAssigneeNameDraft(selected?.assignee_name || "");
    setAssigneeTeamDraft(selected?.assignee_team || "");
  }, [selected?.assignee_name, selected?.assignee_team, selectedLeadId]);

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

  async function toggleLeadLabel(labelKey: string) {
    if (!selected) return;
    const current = new Set(selected.labels || []);
    if (current.has(labelKey)) current.delete(labelKey);
    else current.add(labelKey);
    setSavingContext(true);
    setError(null);
    try {
      await setLeadLabels(selected.id, Array.from(current));
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingContext(false);
    }
  }

  async function saveAssignment() {
    if (!selected) return;
    setSavingContext(true);
    setError(null);
    try {
      await assignLead(selected.id, {
        owner_name: assigneeNameDraft.trim() || undefined,
        team: assigneeTeamDraft.trim() || undefined,
      });
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingContext(false);
    }
  }

  async function setAutomationState(input: { paused?: boolean; manual_override?: boolean }) {
    if (!selected) return;
    setSavingContext(true);
    setError(null);
    try {
      await updateLeadAutomationState(selected.id, input);
      await refreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingContext(false);
    }
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
    <div className="space-y-3 text-zinc-100">
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#17120f] shadow-[0_28px_80px_rgba(40,22,15,0.28)]">
        <div className="border-b border-white/10 bg-[linear-gradient(180deg,#201713_0%,#17120f_100%)] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-[#d2ab93]">MyChat</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#fff7f1]">conversa em operacao</div>
              <div className="mt-2 max-w-2xl text-sm text-[#d8c2b4]">
                atendimento, contexto e decisao no mesmo fluxo, sem virar um produto paralelo ao restante do ecossistema.
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-[#e8d4c7]">
                <span className="rounded-full border border-white/10 bg-[#241915] px-3 py-1.5">uazapi primaria no mvp</span>
                <span className="rounded-full border border-white/10 bg-[#241915] px-3 py-1.5">contingencia pronta</span>
                <span className="rounded-full border border-white/10 bg-[#241915] px-3 py-1.5">um contato por linha</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "contatos", value: counts.total },
                { label: "com conversa", value: counts.withConversation },
                { label: "pedindo resposta", value: needsReplyCount },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] border border-white/10 bg-[#241915] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-[#c6a896]">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#fff7f1]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUEUE_FILTERS.map((filter) => {
              const total = filter.key === "all" ? counts.total : counts.byQueue.get(filter.key) || 0;
              const active = queueFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQueueFilter(filter.key)}
                  className={[
                    "rounded-full border px-3 py-2 text-xs transition",
                    active ? BRAND_ACTIVE : "border-white/10 bg-[#241915] text-[#d8c2b4] hover:bg-[#2b1d18]",
                  ].join(" ")}
                >
                  {filter.label} <span className="ml-1 text-[#b78d79]">{total}</span>
                </button>
              );
            })}
            {savedViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => applySavedView(view)}
                className="rounded-full border border-white/10 bg-[#241915] px-3 py-2 text-xs text-[#d8c2b4] transition hover:bg-[#2b1d18]"
              >
                {view.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void onCreateSavedView()}
              className={`rounded-full border px-3 py-2 text-xs transition ${BRAND_GHOST}`}
            >
              salvar view
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[18px] border border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
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
                mobilePane === item.key ? BRAND_ACTIVE : "border-white/10 bg-[#111b21] text-[#d8c2b4]",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        <aside
          className={[
            "rounded-[26px] border border-white/10 bg-[#111b21] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.22)]",
            mobilePane === "list" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#e9edef]">Fila consolidada</h2>
              <p className="text-sm text-[#8696a0]">um contato por linha, com identidade consolidada.</p>
            </div>
            <button
              className={`rounded-full border px-4 py-2 text-sm transition ${BRAND_GHOST}`}
              onClick={() => void refreshLeads()}
              type="button"
            >
              Atualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-[18px] border border-white/10 bg-[#0b141a] px-4 py-3 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
              placeholder="Buscar por nome, telefone ou mensagem"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[68dvh] overflow-auto pr-1">
            {loading ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0b141a] p-5 text-sm text-[#8696a0]">
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
                            ? "border-[#9d4e31]/25 bg-[#1f1714] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                            : "border-white/10 bg-[#0b141a] hover:border-white/15 hover:bg-[#101a20]",
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
                              <div className="truncate text-sm font-medium text-[#e9edef]">{contact.name || contact.phone || "Sem nome"}</div>
                              <div className="mt-1 truncate text-xs text-[#8696a0]">{contact.phone || "telefone_indefinido"}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {pinnedContacts[contact.key] ? (
                              <span className="rounded-full bg-[#4a2316] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#fff1e8]">
                                pin
                              </span>
                            ) : null}
                            {lead.paused ? (
                              <span className="rounded-full bg-zinc-700 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                                pausado
                              </span>
                            ) : lead.manual_override ? (
                              <span className="rounded-full bg-[#7a4b2f] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                                manual
                              </span>
                            ) : lead.queue_state === "awaiting_us" ? (
                              <span className="rounded-full bg-[#25d366] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#042b14]">
                                responder
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-xs text-[#aebac1]">{contact.lastMessageBody || "Sem ultima mensagem"}</div>
                            {notesByContact[contact.key] ? (
                              <div className="mt-2 line-clamp-1 rounded-full bg-[#1f1714] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[#e8c1aa]">
                                nota interna ativa
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#6a7c85]">
                              <span>{contact.lastMessageDirection === "out" ? "saida" : "entrada"}</span>
                              <span>{fmtRelative(contact.lastMessageAt || lead.updated_at)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-[10px] text-[#6a7c85]">{fmtTime(contact.lastMessageAt || lead.updated_at)}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0b141a] p-5 text-sm text-[#8696a0]">
                Nenhum lead bate com o filtro atual.
              </div>
            )}
          </div>
        </aside>

        <section
          className={[
            "rounded-[26px] border border-white/10 bg-[#0b141a] p-4 shadow-[0_22px_56px_rgba(0,0,0,0.22)]",
            mobilePane === "chat" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ContactAvatar
                name={selectedContact?.name}
                phone={selectedContact?.phone}
                imageUrl={profileImages[normalizePhone(selectedContact?.phone) || ""]}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em]"
              />
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-[#d2ab93]">atendimento em linha</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#e9edef]">
                  {selectedContact?.name || selectedContact?.phone || "Selecione uma conversa"}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#8696a0]">
                  <span>{selectedContact?.phone || "sem_telefone"}</span>
                  {selectedContact && selectedContact.leads.length > 1 ? (
                    <span className="rounded-full border border-white/10 bg-[#111b21] px-2 py-0.5">
                      {selectedContact.leads.length} registros unidos
                    </span>
                  ) : null}
                  {selected?.queue_state ? (
                    <span className={["rounded-full border px-2 py-0.5", queueTone(selected.queue_state)].join(" ")}>
                      {selected.queue_state}
                    </span>
                  ) : null}
                  {selectedContact?.labels.length ? (
                    <span className="rounded-full border border-white/10 bg-[#111b21] px-2 py-0.5 text-[#aebac1]">
                      {selectedContact.labels.length} labels
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition xl:hidden ${BRAND_GHOST}`}
                onClick={() => setMobilePane("list")}
              >
                Voltar
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition disabled:opacity-50 ${BRAND_GHOST}`}
                onClick={() => selectedContact?.conversationIds.length && void refreshMessages(selectedContact.conversationIds)}
                disabled={!selectedContact?.conversationIds.length}
              >
                Atualizar chat
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition disabled:opacity-50 ${BRAND_GHOST}`}
                onClick={() => void copySelectedPhone()}
                disabled={!selectedPhone}
              >
                Copiar numero
              </button>
              {selectedContact ? (
                <button
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm transition ${BRAND_GHOST}`}
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
                  className="rounded-full border border-[#25d366]/20 bg-[#103529] px-4 py-2 text-sm text-[#d7ffe7] transition hover:bg-[#12402f]"
                >
                  Abrir no WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition xl:hidden ${BRAND_GHOST}`}
                onClick={() => setMobilePane("context")}
              >
                Contato
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-[16px] border border-white/10 bg-[#111b21] px-4 py-2.5 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
                placeholder="Buscar dentro da conversa"
                value={messageQuery}
                onChange={(e) => setMessageQuery(e.target.value)}
              />
              {quickReplies.slice(0, 3).map((reply, index) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setText((current) => (current ? `${current}\n${reply}` : reply))}
                  className={[
                    "rounded-full border border-white/10 bg-[#111b21] px-3 py-2 text-xs text-[#d8c2b4] transition hover:bg-[#17232a]",
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
            className="mt-4 max-h-[62dvh] overflow-auto rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,#182229_0%,#111b21_38%,#0b141a_100%)] px-3 py-4"
          >
            {!selectedContact?.conversationIds.length ? (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#111b21] p-6 text-sm text-[#8696a0]">
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
                          <span className="rounded-full border border-white/10 bg-[#1f2c34] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#aebac1]">
                            {dayLabel}
                          </span>
                        </div>
                      ) : null}
                      <div className={block.direction === "out" ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={[
                            "max-w-[82%] rounded-[20px] border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.12)]",
                            block.direction === "out"
                              ? "border-[#25d366]/20 bg-[#005c4b] text-[#e9edef]"
                              : "border-white/10 bg-[#202c33] text-[#e9edef]",
                          ].join(" ")}
                        >
                          {block.direction === "in" ? (
                            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#7d8a91]">
                              {block.sender || selectedContact?.name || selectedContact?.phone || "contato"}
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            {block.items.map((message) => (
                              <div key={message.id} className="space-y-2">
                                <MessageBubbleBody message={message} />
                                {message.direction === "out" ? (
                                  <div className="flex justify-end">
                                    <span
                                      className={[
                                        "rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em]",
                                        deliveryTone(message.delivery_status),
                                      ].join(" ")}
                                    >
                                      {deliveryLabel(message.delivery_status)}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-right text-[10px] uppercase tracking-[0.2em] text-[#93a1a8]">
                            {block.direction === "out" ? "saida" : "entrada"}
                            {isMediaKind(block.items[block.items.length - 1]?.kind) ? " • mídia" : ""}
                            {" • "}
                            {fmtTime(block.items[block.items.length - 1]?.created_at || block.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#111b21] p-6 text-sm text-[#8696a0]">
                {messageQuery.trim() ? "Nenhuma mensagem bate com a busca atual." : "Sem mensagens ainda."}
              </div>
            )}
          </div>
            {selectedContact?.conversationIds.length && showScrollToBottom ? (
              <button
                type="button"
                onClick={scrollMessagesToBottom}
                className={`absolute bottom-4 right-3 rounded-full border px-3 py-2 text-xs font-medium shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition ${BRAND_GHOST}`}
              >
                Ir para o fim
              </button>
            ) : null}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickReplies.slice(0, 4).map((reply) => (
                <button
                  key={`composer-${reply}`}
                  type="button"
                  onClick={() => setText(reply)}
                  className="rounded-full border border-white/10 bg-[#111b21] px-3 py-1.5 text-xs text-[#d8c2b4] transition hover:bg-[#17232a]"
                >
                  usar modelo
                </button>
              ))}
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#111b21] p-3 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              <div className="flex gap-2">
                <textarea
                  className="min-h-24 w-full rounded-[20px] border border-white/10 bg-[#0b141a] px-4 py-3 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
                  placeholder="Digite sua resposta..."
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
                  className="rounded-[20px] bg-[#9d4e31] px-5 text-sm font-medium text-[#fff7ee] transition hover:bg-[#8a442a] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void onSend()}
                  disabled={!selected?.conversation_id || sending}
                >
                  {sending ? "Enviando..." : "Responder"}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#8696a0]">
                <span>`Enter` envia, `Shift + Enter` quebra linha.</span>
                <span>{text.trim().length} caracteres</span>
              </div>
            </div>
          </div>
        </section>

        <aside
          className={[
            "rounded-[26px] border border-white/10 bg-[#111b21] p-4 text-[#e9edef] shadow-[0_20px_50px_rgba(0,0,0,0.22)]",
            mobilePane === "context" ? "block" : "hidden xl:block",
          ].join(" ")}
        >
          <div className="mb-4 xl:hidden">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm transition ${BRAND_GHOST}`}
              onClick={() => setMobilePane("chat")}
            >
              Voltar ao chat
            </button>
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#e9edef]">Contexto operacional</h2>
          <p className="mt-1 text-sm text-[#8696a0]">contato, ownership e acoes de decisao.</p>

          {selected ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Ultima atividade</div>
                <div className="mt-2 text-sm text-[#d9e6eb]">{fmtTime(selected.last_message_at || selected.updated_at) || "Sem atividade"}</div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Contato consolidado</div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#e9edef]">
                  {selectedContact?.name || selected.phone || "Sem nome"}
                </div>
                <p className="mt-2 text-sm text-[#8696a0]">{selectedContact?.phone || "sem_telefone"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[#25d366]/20 bg-[#103529] px-3 py-1.5 text-xs text-[#d7ffe7] transition hover:bg-[#12402f]"
                    >
                      abrir no WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copySelectedPhone()}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${BRAND_GHOST}`}
                  >
                    copiar numero
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Estado operacional</div>
                <div className="mt-2 text-sm text-[#d9e6eb]">
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
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    disabled={savingContext}
                    onClick={() => void setAutomationState({ paused: !selected.paused })}
                    className="rounded-[16px] border border-white/10 bg-[#1f2c34] px-4 py-3 text-left text-sm text-[#e9edef] transition hover:bg-[#24333c] disabled:opacity-50"
                  >
                    {selected.paused ? "Retomar automacao" : "Pausar automacao"}
                  </button>
                  <button
                    type="button"
                    disabled={savingContext}
                    onClick={() => void setAutomationState({ manual_override: !selected.manual_override })}
                    className="rounded-[16px] border border-white/10 bg-[#1f2c34] px-4 py-3 text-left text-sm text-[#e9edef] transition hover:bg-[#24333c] disabled:opacity-50"
                  >
                    {selected.manual_override ? "Liberar atendimento automatico" : "Assumir atendimento manual"}
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Responsavel e time</div>
                <div className="mt-3 grid gap-3">
                  <input
                    value={assigneeNameDraft}
                    onChange={(e) => setAssigneeNameDraft(e.target.value)}
                    placeholder="nome do responsavel"
                    className="w-full rounded-[16px] border border-white/10 bg-[#111b21] px-4 py-3 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
                  />
                  <input
                    value={assigneeTeamDraft}
                    onChange={(e) => setAssigneeTeamDraft(e.target.value)}
                    placeholder="time ou squad"
                    className="w-full rounded-[16px] border border-white/10 bg-[#111b21] px-4 py-3 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
                  />
                  <button
                    type="button"
                    disabled={savingContext}
                    onClick={() => void saveAssignment()}
                    className="rounded-[16px] border border-[#9d4e31]/25 bg-[#8f492e] px-4 py-3 text-sm font-medium text-[#fff1e8] transition hover:bg-[#7f4129] disabled:opacity-50"
                  >
                    Salvar responsavel
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Nota interna</div>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="anote contexto, objeções, próximos passos, tom da conversa..."
                  className="mt-3 min-h-28 w-full rounded-[18px] border border-white/10 bg-[#111b21] px-4 py-3 text-sm text-[#e9edef] outline-none placeholder:text-[#6a7c85] focus:border-[#9d4e31]/30"
                />
                <button
                  type="button"
                  onClick={saveDraftNote}
                  className="mt-3 w-full rounded-[18px] border border-[#9d4e31]/25 bg-[#8f492e] px-4 py-3 text-sm font-medium text-[#fff1e8] transition hover:bg-[#7f4129]"
                >
                  Salvar nota do contato
                </button>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-[#0b141a] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-[#6a7c85]">Labels operacionais</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableLabels.length ? (
                    availableLabels.map((label) => {
                      const active = (selected.labels || []).includes(label.key);
                      return (
                        <button
                          key={label.key}
                          type="button"
                          disabled={savingContext}
                          onClick={() => void toggleLeadLabel(label.key)}
                          className={[
                            "rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-50",
                            active ? BRAND_ACTIVE : "border-white/10 bg-[#111b21] text-[#d8c2b4] hover:bg-[#17232a]",
                          ].join(" ")}
                        >
                          {label.name}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-[#8696a0]">nenhuma label carregada</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-white/15 bg-[#0b141a] p-5 text-sm text-[#8696a0]">
              Selecione uma conversa para acompanhar o contexto do inbox.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
