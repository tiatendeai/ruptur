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
  last_message_direction?: "in" | "out" | null;
  labels?: string[];
  assignee_name?: string | null;
  assignee_team?: string | null;
  paused?: boolean;
  manual_override?: boolean;
  queue_state?: "paused" | "manual" | "no_conversation" | "awaiting_us" | "awaiting_contact" | "active";
};

export type RupturLabel = {
  key: string;
  name: string;
  color: string;
};

export type RupturSavedView = {
  id: string;
  scope: string;
  name: string;
  definition: Record<string, string>;
  position: number;
  is_shared: boolean;
};

export type RupturQueueSummaryItem = {
  key: "paused" | "manual" | "no_conversation" | "awaiting_us" | "awaiting_contact" | "active";
  total: number;
};

export type RupturMessage = {
  id: string;
  external_id: string;
  direction: "in" | "out";
  sender?: string | null;
  body?: string | null;
  created_at: string;
};

export type RupturChannelHealth = {
  provider: string;
  instance_id: string;
  score: number;
  status: string;
  updated_at: string;
};

export type RupturBaileysInstance = {
  instance?: string;
  connection?: string;
  hasQr?: boolean;
};

export type RupturBaileysStatus = {
  id?: string;
  status?: string;
  qrcode?: string;
};

export type RupturUazapiStatus = {
  id?: string;
  status?: string;
  qrcode?: string;
  paircode?: string;
  number?: string;
  owner?: string;
  profileName?: string;
};

export type RupturCampaign = {
  id: string;
  name: string;
  kind: string;
  provider_preference: string;
  created_at: string;
};

export type RupturStage = {
  key: string;
  name: string;
  position: number;
  is_terminal: boolean;
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
  return (data.stages || []) as RupturStage[];
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

export async function updateLead(
  leadId: string,
  input: {
    name?: string;
    status?: string;
  },
) {
  const data = await apiFetch(`/crm/leads/${leadId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data as { ok: boolean };
}

export async function listLabels() {
  const data = await apiFetch("/crm/labels");
  return (data.labels || []) as RupturLabel[];
}

export async function setLeadLabels(leadId: string, labels: string[]) {
  const data = await apiFetch(`/crm/leads/${leadId}/labels`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ labels }),
  });
  return data as { ok: boolean };
}

export async function assignLead(
  leadId: string,
  input: {
    owner_name?: string;
    team?: string;
  },
) {
  const data = await apiFetch(`/crm/leads/${leadId}/assign`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data as { ok: boolean };
}

export async function updateLeadAutomationState(
  leadId: string,
  input: {
    paused?: boolean;
    manual_override?: boolean;
  },
) {
  const data = await apiFetch(`/crm/leads/${leadId}/automation`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data as { ok: boolean };
}

export async function listSavedViews(scope = "inbox") {
  const data = await apiFetch(`/crm/views?scope=${encodeURIComponent(scope)}`);
  return (data.views || []) as RupturSavedView[];
}

export async function createSavedView(input: {
  scope?: string;
  name: string;
  definition: Record<string, string>;
  position?: number;
  is_shared?: boolean;
}) {
  const data = await apiFetch("/crm/views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data as { ok: boolean; id: string };
}

export async function getQueueSummary() {
  const data = await apiFetch("/crm/queues/summary");
  return (data.items || []) as RupturQueueSummaryItem[];
}

export async function listUazapiInstances() {
  const data = await apiFetch("/integrations/uazapi/instances");
  return data as { ok?: boolean; instances?: unknown[] } & Record<string, unknown>;
}

export async function getUazapiStatus(instance?: string) {
  const sp = new URLSearchParams();
  if (instance) sp.set("instance", instance);
  const data = await apiFetch(`/integrations/uazapi/status${sp.toString() ? `?${sp.toString()}` : ""}`);
  return (data.uazapi?.instance || data.uazapi || {}) as RupturUazapiStatus;
}

export async function connectUazapiInstance(instance?: string, phone?: string) {
  const sp = new URLSearchParams();
  if (instance) sp.set("instance", instance);
  const data = await apiFetch(`/integrations/uazapi/connect${sp.toString() ? `?${sp.toString()}` : ""}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(phone ? { phone } : {}),
  });
  return (data.uazapi?.instance || data.uazapi || {}) as RupturUazapiStatus;
}

export async function listBaileysInstances() {
  const data = await apiFetch("/integrations/baileys/instances");
  return (data.items || []) as RupturBaileysInstance[];
}

export async function getBaileysStatus(instance?: string) {
  const sp = new URLSearchParams();
  if (instance) sp.set("instance", instance);
  const data = await apiFetch(`/integrations/baileys/status${sp.toString() ? `?${sp.toString()}` : ""}`);
  return (data.instance || {}) as RupturBaileysStatus;
}

export async function connectBaileysInstance(instance?: string) {
  const sp = new URLSearchParams();
  if (instance) sp.set("instance", instance);
  const data = await apiFetch(`/integrations/baileys/connect${sp.toString() ? `?${sp.toString()}` : ""}`, {
    method: "POST",
  });
  return (data.instance || {}) as RupturBaileysStatus;
}

export async function listChannelHealth() {
  const data = await apiFetch("/growth/channels/health?limit=100");
  return (data.items || []) as RupturChannelHealth[];
}

export async function listCampaigns() {
  const data = await apiFetch("/growth/campaigns?limit=100");
  return (data.items || []) as RupturCampaign[];
}

export async function createCampaign(input: {
  name: string;
  kind: "one_to_one" | "group";
  provider_preference: "auto" | "uazapi" | "baileys";
  payload: Record<string, unknown>;
}) {
  const data = await apiFetch("/growth/campaigns", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return data as { ok: boolean; id: string };
}

export async function getQueuesSummary() {
  const data = await apiFetch("/crm/queues/summary");
  if (!data.summary) return { total: 0, by_queue: {}, with_conversation: 0 };
  return data.summary as {
    total: number;
    by_queue: Record<string, number>;
    with_conversation: number;
  };
}
