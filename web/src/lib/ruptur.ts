import { rupturApiBaseUrl } from "./config";

export type RupturLead = {
  id: string;
  phone?: string | null;
  name?: string | null;
  status: string;
  updated_at: string;
  conversation_id?: string | null;
  last_message_at?: string | null;
  last_message_body?: string | null;
};

export type RupturMessage = {
  id: string;
  external_id: string;
  direction: "in" | "out";
  sender?: string | null;
  body?: string | null;
  created_at: string;
};

async function apiFetch(path: string, init?: RequestInit) {
  const base = rupturApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function listLeads(params?: { status?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  const q = sp.toString();
  const data = await apiFetch(`/crm/leads${q ? `?${q}` : ""}`);
  return (data.leads || []) as RupturLead[];
}

export async function listStages() {
  const data = await apiFetch("/crm/stages");
  return (data.stages || []) as { key: string; name: string; position: number; is_terminal: boolean }[];
}

export async function listMessages(conversationId: string) {
  const data = await apiFetch(`/crm/conversations/${conversationId}/messages?limit=80`);
  return (data.messages || []) as RupturMessage[];
}

export async function sendConversationText(conversationId: string, text: string) {
  const data = await apiFetch(`/crm/conversations/${conversationId}/send/text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return data as { ok: boolean };
}

export async function listUazapiInstances() {
  const data = await apiFetch("/integrations/uazapi/instances");
  return data as { ok?: boolean; instances?: unknown[] } & Record<string, unknown>;
}
