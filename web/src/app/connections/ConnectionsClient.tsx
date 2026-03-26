"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { rupturApiBaseUrl } from "@/lib/config";
import {
  createBaileysInstance,
  createUazapiInstance,
  deleteBaileysInstance,
  connectBaileysInstance,
  connectUazapiInstance,
  getBaileysStatus,
  getUazapiStatus,
  listBaileysInstances,
  listChannelHealth,
  listUazapiInstances,
  resetBaileysInstance,
  runUazapiInstanceOperation,
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
  adminField01?: string;
  adminField02?: string;
  systemName?: string;
  msg_delay_min?: number;
  msg_delay_max?: number;
  raw?: Record<string, unknown>;
};

function pickListCandidates(input: Record<string, unknown>) {
  const root = input.uazapi;
  const rootObject = root && typeof root === "object" && !Array.isArray(root) ? (root as Record<string, unknown>) : null;
  const candidateLists: unknown[] = [
    input.instances,
    input.items,
    input.data,
    root,
    rootObject?.instances,
    rootObject?.items,
    rootObject?.data,
  ];
  return candidateLists.find(Array.isArray) as unknown[] | undefined;
}

function extractUazapiInstances(input: Record<string, unknown>): UazapiInstance[] {
  const root = input.uazapi;
  const pickNumber = (item: Record<string, unknown>) =>
    [item.number, item.owner, item.phone, item.msisdn, item.jid].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) as string | undefined;
  const normalize = (raw: unknown): UazapiInstance | null => {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const status =
      typeof item.status === "string"
        ? item.status
        : typeof item.connection === "string"
          ? item.connection
          : typeof item.state === "string"
            ? item.state
            : undefined;
    const identity =
      typeof item.name === "string"
        ? item.name
        : typeof item.instance === "string"
          ? item.instance
          : typeof item.id === "string"
            ? item.id
            : typeof item.instance_id === "string"
              ? item.instance_id
              : typeof item.instanceId === "string"
                ? item.instanceId
                : undefined;
    if (!identity) return null;
    const profileName =
      typeof item.profileName === "string"
        ? item.profileName
        : typeof item.pushName === "string"
          ? item.pushName
          : typeof item.wa_name === "string"
            ? item.wa_name
            : undefined;
    return {
      id: typeof item.id === "string" ? item.id : identity,
      name: identity,
      status,
      token: typeof item.token === "string" ? item.token : undefined,
      qrcode: typeof item.qrcode === "string" ? item.qrcode : undefined,
      paircode: typeof item.paircode === "string" ? item.paircode : typeof item.code === "string" ? item.code : undefined,
      number: pickNumber(item),
      profileName,
      adminField01: typeof item.adminField01 === "string" ? item.adminField01 : undefined,
      adminField02: typeof item.adminField02 === "string" ? item.adminField02 : undefined,
      systemName: typeof item.systemName === "string" ? item.systemName : undefined,
      msg_delay_min: typeof item.msg_delay_min === "number" ? item.msg_delay_min : undefined,
      msg_delay_max: typeof item.msg_delay_max === "number" ? item.msg_delay_max : undefined,
      raw: item,
    };
  };
  const normalizeList = (items: unknown[]) => items.map(normalize).filter((item): item is UazapiInstance => Boolean(item?.id || item?.name));

  const listCandidate = pickListCandidates(input);
  if (listCandidate) return normalizeList(listCandidate);

  if (root && typeof root === "object" && !Array.isArray(root)) {
    const instance = (root as Record<string, unknown>).instance;
    if (instance && typeof instance === "object") {
      const normalized = normalize(instance);
      return normalized ? [normalized] : [];
    }
  }
  return [];
}

function isUazapiConnected(status?: string) {
  const normalized = (status || "").toLowerCase().trim();
  if (!normalized) return false;
  if (["disconnected", "closed", "close", "offline", "loggedout"].some((token) => normalized.includes(token))) {
    return false;
  }
  return ["connected", "open", "online", "logged", "ready"].some((token) => normalized.includes(token));
}

function pickPreferredUazapiInstance(items: UazapiInstance[]) {
  return items.find((item) => isUazapiConnected(item.status)) || items.find((item) => item.qrcode || item.paircode) || items[0] || null;
}

function extractBaileysInstances(input: unknown): RupturBaileysInstance[] {
  const root = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  const items =
    (Array.isArray(input) ? input : null) ||
    (root && Array.isArray(root.items) ? root.items : null) ||
    (root && Array.isArray(root.instances) ? root.instances : null) ||
    (root && Array.isArray(root.data) ? root.data : null) ||
    null;
  if (!items) return [];
  const out: RupturBaileysInstance[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const instance =
      typeof item.instance === "string"
        ? item.instance
        : typeof item.id === "string"
          ? item.id
          : typeof item.name === "string"
            ? item.name
            : undefined;
    if (!instance) continue;
    const status =
      typeof item.connection === "string"
        ? item.connection
        : typeof item.status === "string"
          ? item.status
          : typeof item.state === "string"
            ? item.state
            : undefined;
    const hasQr = typeof item.hasQr === "boolean" ? item.hasQr : Boolean(item.qrcode || item.qr || item.qrCode);
    out.push({
      instance,
      instance_display: typeof item.instance_display === "string" ? item.instance_display : undefined,
      instance_canonical: typeof item.instance_canonical === "string" ? item.instance_canonical : undefined,
      instance_effective: typeof item.instance_effective === "string" ? item.instance_effective : undefined,
      number_canonical: typeof item.number_canonical === "string" ? item.number_canonical : undefined,
      number_whatsapp: typeof item.number_whatsapp === "string" ? item.number_whatsapp : undefined,
      number_display: typeof item.number_display === "string" ? item.number_display : undefined,
      number_mode: typeof item.number_mode === "string" ? item.number_mode : undefined,
      number_variants: Array.isArray(item.number_variants)
        ? item.number_variants.filter((value): value is string => typeof value === "string")
        : undefined,
      me_jid: typeof item.me_jid === "string" ? item.me_jid : undefined,
      profileName: typeof item.profileName === "string" ? item.profileName : undefined,
      systemName: typeof item.systemName === "string" ? item.systemName : undefined,
      adminField01: typeof item.adminField01 === "string" ? item.adminField01 : undefined,
      adminField02: typeof item.adminField02 === "string" ? item.adminField02 : undefined,
      browser: typeof item.browser === "string" ? item.browser : undefined,
      syncFullHistory: typeof item.syncFullHistory === "boolean" ? item.syncFullHistory : undefined,
      markOnlineOnConnect: typeof item.markOnlineOnConnect === "boolean" ? item.markOnlineOnConnect : undefined,
      connection: status,
      hasQr,
    });
  }
  return out;
}

function pickPreferredBaileysInstance(items: RupturBaileysInstance[]) {
  return (
    items.find((item) => ["open", "connected", "online"].includes((item.connection || "").toLowerCase())) ||
    items.find((item) => item.hasQr) ||
    items[0] ||
    null
  );
}

type UnifiedConnectionStatus = "connected" | "connecting" | "disconnected" | "unknown";

type UnifiedInstance = {
  id: string;
  displayId: string;
  hasUazapi: boolean;
  hasBaileys: boolean;
  baileysEffectiveId?: string;
  baileysDisplayNumber?: string;
  baileysTransportNumber?: string;
  baileysIdentityMode?: string;
  baileysMeJid?: string;
  baileysBrowser?: string;
  baileysSyncFullHistory?: boolean;
  baileysMarkOnlineOnConnect?: boolean;
  number?: string;
  profileName?: string;
  systemName?: string;
  adminField01?: string;
  adminField02?: string;
  uazapiStatus?: string;
  baileysStatus?: string;
  hasQr?: boolean;
  connectedSince?: string;
  lastUpdatedAt?: string;
  overallStatus: UnifiedConnectionStatus;
  tooltip: string;
};

function isBaileysConnected(status?: string) {
  return ["open", "connected", "online", "ready"].includes((status || "").toLowerCase().trim());
}

function normalizeConnectionStatus(status?: string, hasQr = false): UnifiedConnectionStatus {
  const normalized = (status || "").toLowerCase().trim();
  if (isUazapiConnected(status) || isBaileysConnected(status)) return "connected";
  if (hasQr || normalized.includes("connecting") || normalized.includes("pair")) return "connecting";
  if (
    ["disconnected", "close", "closed", "offline", "loggedout", "not_connected", "not ready", "not_ready"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "disconnected";
  }
  return "unknown";
}

function statusLabel(status: UnifiedConnectionStatus) {
  if (status === "connected") return "conectado";
  if (status === "connecting") return "conectando";
  if (status === "disconnected") return "desconectado";
  return "desconhecido";
}

function identityModeLabel(mode?: string) {
  if (mode === "legacy_without_ninth_digit") return "legado_sem_9";
  if (mode === "canonical_with_ninth_digit") return "canonico_com_9";
  return mode || "sem_dados";
}

function providerRoleLabel(provider: "uazapi" | "baileys") {
  return provider === "uazapi" ? "primario_mvp" : "contingencia";
}

function providerRoleHint(provider: "uazapi" | "baileys") {
  return provider === "uazapi"
    ? "Canal principal do MVP. Deve concentrar a operacao normal e o fluxo principal."
    : "Canal de contingencia e aprendizagem. Deve permanecer funcional sem ganhar peso de canal principal antes da hora.";
}

function normalizeBrazilWhatsappNumber(raw?: string) {
  const digits = String(raw || "").replace(/[^\d]/g, "");
  // RUP-2026-012: BR mobile numbers should display with 9th digit.
  if (digits.startsWith("55") && digits.length === 12 && ["6", "7", "8", "9"].includes(digits[4] || "")) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }
  return digits;
}

function extractPhoneFromInstanceId(instanceId?: string) {
  const value = (instanceId || "").trim();
  if (!value) return undefined;
  const exact = value.match(/^(?:inst-|chip-)?(\d{10,15})$/i);
  if (exact?.[1]) return normalizeBrazilWhatsappNumber(exact[1]);
  const inline = value.match(/(\d{10,15})/);
  return normalizeBrazilWhatsappNumber(inline?.[1]);
}

function canonicalizeBaileysInstanceId(raw?: string) {
  const value = (raw || "").trim();
  if (!value) return "";
  const phone = extractPhoneFromInstanceId(value);
  if (phone) return `inst-${phone}`;
  return value;
}

function publicBaileysInstanceId(
  item?: Partial<RupturBaileysInstance> | Partial<RupturBaileysStatus> | null,
) {
  if (!item) return "";
  const candidates = [item.instance_canonical, item.instance_display, item.instance];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = canonicalizeBaileysInstanceId(candidate);
    if (normalized) return normalized;
  }
  return "";
}

function effectiveBaileysInstanceId(
  item?: Partial<RupturBaileysInstance> | Partial<RupturBaileysStatus> | null,
) {
  if (!item) return "";
  const candidates = [item.instance_effective, item.instance];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim();
    if (normalized) return normalized;
  }
  return "";
}

function matchesBaileysInstanceId(
  item: Partial<RupturBaileysInstance> | Partial<RupturBaileysStatus> | null | undefined,
  rawId: string | null | undefined,
) {
  const target = canonicalizeBaileysInstanceId(rawId || "");
  if (!target) return false;
  return [publicBaileysInstanceId(item), canonicalizeBaileysInstanceId(effectiveBaileysInstanceId(item))]
    .filter(Boolean)
    .some((candidate) => candidate === target);
}

function pickKnownDate(raw?: Record<string, unknown>) {
  if (!raw) return undefined;
  const keys = [
    "connectedAt",
    "connected_at",
    "connectedSince",
    "connected_since",
    "connectionAt",
    "connection_at",
    "lastConnectionAt",
    "last_connection_at",
    "lastSeenAt",
    "last_seen_at",
    "updatedAt",
    "updated_at",
  ];
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function formatDateTime(value?: string) {
  if (!value) return "desconhecido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function randomToken(length = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)] || "x";
  }
  return out;
}

function makeOpaqueInstanceId(prefix: "uaz" | "bai") {
  const stamp = Date.now().toString(36).slice(-4);
  return `${prefix}-${stamp}${randomToken(6)}`;
}

type ProviderTab = "visualizacao" | "edicao" | "propriedades" | "configuracao";

function tabLabel(tab: ProviderTab) {
  if (tab === "visualizacao") return "visao";
  if (tab === "edicao") return "ajustes";
  if (tab === "configuracao") return "operacao";
  return "payload";
}

export default function ConnectionsClient() {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [baileysInstances, setBaileysInstances] = useState<RupturBaileysInstance[]>([]);
  const [health, setHealth] = useState<RupturChannelHealth[]>([]);
  const [provider, setProvider] = useState<"uazapi" | "baileys">("uazapi");
  const [createProvider, setCreateProvider] = useState<"uazapi" | "baileys">("uazapi");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [baileysStatus, setBaileysStatus] = useState<RupturBaileysStatus | null>(null);
  const [uazapiStatus, setUazapiStatus] = useState<UazapiInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedQrUrl, setFailedQrUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProviderTab>("visualizacao");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [opMessage, setOpMessage] = useState<string | null>(null);
  const [pairPhone, setPairPhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [createSystemName, setCreateSystemName] = useState("");
  const [createAdminField01, setCreateAdminField01] = useState("");
  const [createAdminField02, setCreateAdminField02] = useState("");
  const [createFingerprintProfile, setCreateFingerprintProfile] = useState("");
  const [createBrowser, setCreateBrowser] = useState("");
  const [createBaileysInstanceId, setCreateBaileysInstanceId] = useState("");
  const [createBaileysProfileName, setCreateBaileysProfileName] = useState("");
  const [createBaileysSystemName, setCreateBaileysSystemName] = useState("");
  const [createBaileysAdminField01, setCreateBaileysAdminField01] = useState("");
  const [createBaileysAdminField02, setCreateBaileysAdminField02] = useState("");
  const [createBaileysBrowser, setCreateBaileysBrowser] = useState("");
  const [createBaileysSyncFullHistory, setCreateBaileysSyncFullHistory] = useState(true);
  const [createBaileysMarkOnlineOnConnect, setCreateBaileysMarkOnlineOnConnect] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [editAdminField01, setEditAdminField01] = useState("");
  const [editAdminField02, setEditAdminField02] = useState("");
  const [delayMin, setDelayMin] = useState("1");
  const [delayMax, setDelayMax] = useState("3");
  const [presence, setPresence] = useState<"available" | "unavailable">("available");
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotIgnoreGroups, setChatbotIgnoreGroups] = useState(false);
  const [chatbotStopConversation, setChatbotStopConversation] = useState("");
  const [chatbotStopMinutes, setChatbotStopMinutes] = useState("0");
  const [chatbotStopWhenYouSendMsg, setChatbotStopWhenYouSendMsg] = useState("0");
  const [fieldsMapJson, setFieldsMapJson] = useState("{}");
  const [privacyJson, setPrivacyJson] = useState("{}");
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [propertiesJson, setPropertiesJson] = useState("{}");
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "uazapi" | "baileys" | "both">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UnifiedConnectionStatus>("all");

  const loadConnectionsData = useCallback(async () => {
    const [instanceResponse, healthResponse, baileysResponse] = await Promise.allSettled([
      listUazapiInstances(),
      listChannelHealth(),
      listBaileysInstances(),
    ]);

    const errors: string[] = [];
    let nextUazapiItems: UazapiInstance[] = [];
    let nextBaileysItems: RupturBaileysInstance[] = [];

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
      nextBaileysItems = extractBaileysInstances(baileysResponse.value);
      setBaileysInstances(nextBaileysItems);
    } else {
      errors.push(`baileys: ${baileysResponse.reason instanceof Error ? baileysResponse.reason.message : String(baileysResponse.reason)}`);
    }

    const uazapiLoaded = instanceResponse.status === "fulfilled";
    const baileysLoaded = baileysResponse.status === "fulfilled";
    const canAssertMissingInstance = uazapiLoaded && baileysLoaded;

    setError(errors.length ? errors.join(" | ") : null);
    // Preserve user context after refresh: keep current selection if it still exists in any provider.
    setSelectedInstanceId((current) => {
      const ids = new Set<string>();
      for (const item of nextUazapiItems) {
        if (item.name) ids.add(item.name);
      }
      for (const item of nextBaileysItems) {
        const publicId = publicBaileysInstanceId(item);
        const effectiveId = effectiveBaileysInstanceId(item);
        if (publicId) ids.add(publicId);
        if (effectiveId) ids.add(effectiveId);
      }
      // RUP-2026-010: keep current selection when refresh partially/fully fails.
      if (current) {
        if (ids.has(current)) return current;
        if (!canAssertMissingInstance) return current;
      }
      const preferredBaileys = pickPreferredBaileysInstance(nextBaileysItems);
      const preferred =
        pickPreferredUazapiInstance(nextUazapiItems)?.name ||
        publicBaileysInstanceId(preferredBaileys) ||
        effectiveBaileysInstanceId(preferredBaileys) ||
        null;
      return preferred || (canAssertMissingInstance ? null : current);
    });
  }, []);

  async function refresh() {
    setFailedQrUrl(null);
    await loadConnectionsData();
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadConnectionsData();
    })().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [loadConnectionsData]);

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
          raw: item as Record<string, unknown>,
        }),
      )
      .catch(() => setUazapiStatus(null));
  }, [provider, selectedInstanceId]);

  function switchProvider(next: "uazapi" | "baileys") {
    setProvider(next);
    setFailedQrUrl(null);
    setOpMessage(null);
    setActiveTab("visualizacao");
    setSelectedInstanceId((current) => {
      if (current) {
        const availableOnTarget =
          next === "uazapi"
            ? instances.some((item) => item.name === current)
            : baileysInstances.some((item) => matchesBaileysInstanceId(item, current));
        if (availableOnTarget) return current;
      }
      return next === "uazapi"
        ? pickPreferredUazapiInstance(instances)?.name || null
        : publicBaileysInstanceId(pickPreferredBaileysInstance(baileysInstances)) ||
            effectiveBaileysInstanceId(pickPreferredBaileysInstance(baileysInstances)) ||
            null;
    });
    if (next !== "baileys") setBaileysStatus(null);
    if (next !== "uazapi") setUazapiStatus(null);
  }

  function openCreateModal(nextProvider: "uazapi" | "baileys" = provider) {
    setCreateProvider(nextProvider);
    setShowCreateAdvanced(false);
    setShowCreateModal(true);
    setOpMessage(null);
    setError(null);
    setFailedQrUrl(null);
  }

  const unifiedInstances = useMemo(() => {
    // Canonical list for UI: merge UAZAPI + Baileys (+ health-only rows) by instance id
    // without implying equal business role in the MVP.
    type WorkingInstance = Omit<UnifiedInstance, "overallStatus" | "tooltip">;
    const map = new Map<string, WorkingInstance>();
    const ensure = (id: string) => {
      const key = id.trim();
      const existing = map.get(key);
      if (existing) return existing;
      const created: WorkingInstance = {
        id: key,
        displayId: key,
        hasUazapi: false,
        hasBaileys: false,
      };
      map.set(key, created);
      return created;
    };
    const applyLastUpdated = (item: WorkingInstance, value?: string) => {
      if (!value || !value.trim()) return;
      if (!item.lastUpdatedAt) {
        item.lastUpdatedAt = value;
        return;
      }
      const prev = new Date(item.lastUpdatedAt).getTime();
      const next = new Date(value).getTime();
      if (!Number.isNaN(next) && (Number.isNaN(prev) || next >= prev)) item.lastUpdatedAt = value;
    };

    for (const instance of instances) {
      const id = (instance.name || instance.id || "").trim();
      if (!id) continue;
      const item = ensure(id);
      item.hasUazapi = true;
      item.displayId = item.displayId || id;
      item.uazapiStatus = instance.status || item.uazapiStatus;
      item.number = normalizeBrazilWhatsappNumber(instance.number) || item.number;
      item.profileName = instance.profileName || item.profileName;
      item.systemName = instance.systemName || item.systemName;
      item.adminField01 = instance.adminField01 || item.adminField01;
      item.adminField02 = instance.adminField02 || item.adminField02;
      item.hasQr = item.hasQr || Boolean(instance.qrcode || instance.paircode);
      item.connectedSince = item.connectedSince || pickKnownDate(instance.raw);
      applyLastUpdated(item, pickKnownDate(instance.raw));
    }

    for (const instance of baileysInstances) {
      const id = publicBaileysInstanceId(instance) || effectiveBaileysInstanceId(instance);
      if (!id) continue;
      const item = ensure(id);
      item.hasBaileys = true;
      item.displayId = publicBaileysInstanceId(instance) || item.displayId || id;
      item.baileysEffectiveId = effectiveBaileysInstanceId(instance) || item.baileysEffectiveId;
      item.baileysDisplayNumber =
        item.baileysDisplayNumber ||
        normalizeBrazilWhatsappNumber(instance.number_display || instance.number_canonical || instance.number_whatsapp);
      item.baileysTransportNumber = item.baileysTransportNumber || instance.number_whatsapp;
      item.baileysIdentityMode = item.baileysIdentityMode || instance.number_mode;
      item.baileysMeJid = item.baileysMeJid || instance.me_jid;
      item.baileysBrowser = item.baileysBrowser || instance.browser;
      item.baileysSyncFullHistory = item.baileysSyncFullHistory ?? instance.syncFullHistory;
      item.baileysMarkOnlineOnConnect = item.baileysMarkOnlineOnConnect ?? instance.markOnlineOnConnect;
      item.baileysStatus = instance.connection || item.baileysStatus;
      item.number = item.number || item.baileysDisplayNumber || extractPhoneFromInstanceId(item.displayId);
      item.profileName = item.profileName || instance.profileName;
      item.systemName = item.systemName || instance.systemName;
      item.adminField01 = item.adminField01 || instance.adminField01;
      item.adminField02 = item.adminField02 || instance.adminField02;
      item.hasQr = item.hasQr || Boolean(instance.hasQr);
    }

    for (const item of health) {
      const providerKey = (item.provider || "").toLowerCase();
      const id =
        providerKey === "baileys"
          ? canonicalizeBaileysInstanceId(item.instance_id || "")
          : (item.instance_id || "").trim();
      if (!id) continue;
      const row = ensure(id);
      if (providerKey === "uazapi") {
        row.hasUazapi = true;
        row.uazapiStatus = row.uazapiStatus || item.status;
      }
      if (providerKey === "baileys") {
        row.hasBaileys = true;
        row.baileysEffectiveId = row.baileysEffectiveId || (item.instance_id || "").trim();
        row.baileysStatus = row.baileysStatus || item.status;
      }
      if (!row.connectedSince && normalizeConnectionStatus(item.status) === "connected") {
        row.connectedSince = item.updated_at;
      }
      applyLastUpdated(row, item.updated_at);
    }

    const output: UnifiedInstance[] = [];
    for (const item of map.values()) {
      // Consolidate provider statuses into one normalized status to simplify filtering/sorting.
      const uazapiNormalized = normalizeConnectionStatus(item.uazapiStatus, item.hasQr);
      const baileysNormalized = normalizeConnectionStatus(item.baileysStatus, item.hasQr);
      const overallStatus: UnifiedConnectionStatus =
        uazapiNormalized === "connected" || baileysNormalized === "connected"
          ? "connected"
          : uazapiNormalized === "connecting" || baileysNormalized === "connecting"
            ? "connecting"
            : uazapiNormalized === "disconnected" || baileysNormalized === "disconnected"
              ? "disconnected"
              : "unknown";
      const tooltip = [
        `Instancia: ${item.id}`,
        `Sessao Baileys: ${item.baileysEffectiveId || "sem_sessao"}`,
        `Provedores: ${item.hasUazapi ? "UAZAPI" : ""}${item.hasUazapi && item.hasBaileys ? " + " : ""}${item.hasBaileys ? "Baileys" : ""}`,
        `Status geral: ${statusLabel(overallStatus)}`,
        `Status UAZAPI: ${item.uazapiStatus || "sem_dados"}`,
        `Status Baileys: ${item.baileysStatus || "sem_dados"}`,
        `Numero exibido: ${item.number || "sem_numero"}`,
        `Numero WhatsApp: ${item.baileysTransportNumber || "sem_dados"}`,
        `Modo identidade: ${identityModeLabel(item.baileysIdentityMode)}`,
        `Me JID: ${item.baileysMeJid || "sem_dados"}`,
        `Browser Baileys: ${item.baileysBrowser || "sem_dados"}`,
        `SyncFullHistory: ${item.baileysSyncFullHistory === false ? "nao" : "sim"}`,
        `MarkOnlineOnConnect: ${item.baileysMarkOnlineOnConnect ? "sim" : "nao"}`,
        `Conectado desde: ${formatDateTime(item.connectedSince)}`,
        `Ultima atualizacao: ${formatDateTime(item.lastUpdatedAt)}`,
      ].join("\n");
      output.push({ ...item, overallStatus, tooltip });
    }

    return output.sort((a, b) => {
      const statusRank: Record<UnifiedConnectionStatus, number> = {
        connected: 0,
        connecting: 1,
        disconnected: 2,
        unknown: 3,
      };
      const byStatus = statusRank[a.overallStatus] - statusRank[b.overallStatus];
      if (byStatus !== 0) return byStatus;
      return a.id.localeCompare(b.id);
    });
  }, [instances, baileysInstances, health]);

  const filteredInstances = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return unifiedInstances.filter((item) => {
      if (providerFilter === "uazapi" && !item.hasUazapi) return false;
      if (providerFilter === "baileys" && !item.hasBaileys) return false;
      if (providerFilter === "both" && !(item.hasUazapi && item.hasBaileys)) return false;
      if (statusFilter !== "all" && item.overallStatus !== statusFilter) return false;
      if (!query) return true;
      return [
        item.id,
        item.displayId,
        item.number,
        item.baileysDisplayNumber,
        item.baileysTransportNumber,
        item.baileysMeJid,
        item.profileName,
        item.systemName,
        item.adminField01,
        item.adminField02,
      ]
        .concat(item.baileysEffectiveId || "")
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [providerFilter, searchQuery, statusFilter, unifiedInstances]);

  const summary = useMemo(() => {
    const connected = unifiedInstances.filter((item) => item.overallStatus === "connected").length;
    return {
      total: unifiedInstances.length,
      connected,
      monitored: new Set(health.map((item) => `${item.provider}:${item.instance_id}`)).size,
    };
  }, [health, unifiedInstances]);

  const selectedUazapiInstance = useMemo(
    () => instances.find((instance) => (instance.name || null) === selectedInstanceId) || null,
    [instances, selectedInstanceId],
  );
  const selectedBaileysInstance = useMemo(
    () => baileysInstances.find((instance) => matchesBaileysInstanceId(instance, selectedInstanceId)) || null,
    [baileysInstances, selectedInstanceId],
  );
  const selectedBaileysTargetId = useMemo(
    () => (selectedBaileysInstance ? publicBaileysInstanceId(selectedBaileysInstance) || effectiveBaileysInstanceId(selectedBaileysInstance) || null : null),
    [selectedBaileysInstance],
  );
  const selectedUnifiedInstance = useMemo(
    () => unifiedInstances.find((instance) => instance.id === selectedInstanceId) || null,
    [selectedInstanceId, unifiedInstances],
  );
  const selectedUazapiDetails = uazapiStatus || selectedUazapiInstance;
  const canManageSelectedBaileys = Boolean(selectedBaileysTargetId);

  useEffect(() => {
    if (provider !== "baileys") return;
    if (!selectedBaileysTargetId) {
      setBaileysStatus(null);
      return;
    }
    void getBaileysStatus(selectedBaileysTargetId)
      .then((item) => setBaileysStatus(item))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [provider, selectedBaileysTargetId]);

  useEffect(() => {
    // Keep operational tabs usable by forcing the active provider to one that exists for the selected instance.
    if (!selectedUnifiedInstance) return;
    if (provider === "uazapi" && !selectedUnifiedInstance.hasUazapi && selectedUnifiedInstance.hasBaileys) {
      setProvider("baileys");
      return;
    }
    if (provider === "baileys" && !selectedUnifiedInstance.hasBaileys && selectedUnifiedInstance.hasUazapi) {
      setProvider("uazapi");
    }
  }, [activeTab, provider, selectedUnifiedInstance]);

  useEffect(() => {
    if (provider !== "uazapi") return;
    setRenameValue(selectedUazapiDetails?.name || "");
    setEditAdminField01(selectedUazapiDetails?.adminField01 || "");
    setEditAdminField02(selectedUazapiDetails?.adminField02 || "");
    setDelayMin(String(selectedUazapiDetails?.msg_delay_min ?? 1));
    setDelayMax(String(selectedUazapiDetails?.msg_delay_max ?? 3));
    setPropertiesJson(JSON.stringify(selectedUazapiDetails?.raw || selectedUazapiDetails || {}, null, 2));
  }, [provider, selectedUazapiDetails]);

  useEffect(() => {
    if (provider !== "baileys") return;
    setPropertiesJson(JSON.stringify(selectedBaileysInstance || baileysStatus || {}, null, 2));
  }, [provider, selectedBaileysInstance, baileysStatus]);

  useEffect(() => {
    if (!showCreateModal) return;
    if (createProvider === "uazapi" && !createName.trim()) {
      setCreateName(makeOpaqueInstanceId("uaz"));
    }
    if (createProvider === "baileys" && !createBaileysInstanceId.trim()) {
      setCreateBaileysInstanceId(makeOpaqueInstanceId("bai"));
    }
  }, [showCreateModal, createProvider, createName, createBaileysInstanceId]);

  async function runBusy<T>(label: string, action: () => Promise<T>) {
    setBusy(label);
    setError(null);
    setOpMessage(null);
    try {
      const result = await action();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setBusy(null);
    }
  }

  async function handleUazapiConnectQr() {
    if (!selectedInstanceId) return;
    await runBusy("connect-qr", async () => {
      const item = await connectUazapiInstance(selectedInstanceId);
      setUazapiStatus({
        id: item.id || selectedInstanceId,
        name: selectedInstanceId,
        status: item.status,
        qrcode: item.qrcode,
        paircode: item.paircode,
        number: item.number || item.owner,
        profileName: item.profileName,
        raw: item as Record<string, unknown>,
      });
      setOpMessage("Conexao por QR acionada.");
      await refresh();
    });
  }

  async function handleUazapiConnectCode() {
    if (!selectedInstanceId) return;
    const phone = pairPhone.trim();
    if (!/^\d{10,15}$/.test(phone)) {
      setError("Informe telefone para pareamento com 10-15 digitos (ex: 5511999999999).");
      return;
    }
    await runBusy("connect-code", async () => {
      const item = await connectUazapiInstance(selectedInstanceId, phone);
      setUazapiStatus({
        id: item.id || selectedInstanceId,
        name: selectedInstanceId,
        status: item.status,
        qrcode: item.qrcode,
        paircode: item.paircode,
        number: item.number || item.owner,
        profileName: item.profileName,
        raw: item as Record<string, unknown>,
      });
      setOpMessage("Conexao por codigo de pareamento acionada.");
      await refresh();
    });
  }

  async function handleBaileysConnectQr() {
    const targetInstance = selectedBaileysTargetId || selectedInstanceId;
    if (!targetInstance) return;
    await runBusy("baileys-connect-qr", async () => {
      const item = await connectBaileysInstance(targetInstance);
      setBaileysStatus(item);
      setOpMessage("QR de conexao Baileys acionado.");
      await refresh();
    });
  }

  async function handleBaileysReset() {
    const targetInstance = selectedBaileysTargetId || selectedInstanceId;
    if (!targetInstance) return;
    if (!window.confirm(`Resetar a sessao Baileys de ${targetInstance}? Isso vai exigir novo QR.`)) return;
    await runBusy("baileys-reset", async () => {
      const item = await resetBaileysInstance(targetInstance);
      setBaileysStatus(item);
      setOpMessage("Sessao Baileys resetada. Gere ou escaneie o novo QR.");
      await refresh();
    });
  }

  async function handleCreateUazapi() {
    const name = createName.trim();
    if (!name) {
      setError("Nome da instancia e obrigatorio.");
      return;
    }
    await runBusy("create-uazapi", async () => {
      // The panel should leave creation already in pairing mode so the operator
      // does not need to bounce between "create" and "connect" manually.
      await createUazapiInstance({
        name,
        systemName: createSystemName.trim() || undefined,
        adminField01: createAdminField01.trim() || undefined,
        adminField02: createAdminField02.trim() || undefined,
        fingerprintProfile: createFingerprintProfile.trim() || undefined,
        browser: createBrowser.trim() || undefined,
      });
      const item = await connectUazapiInstance(name);
      setUazapiStatus({
        id: item.id || name,
        name,
        status: item.status,
        qrcode: item.qrcode,
        paircode: item.paircode,
        number: item.number || item.owner,
        profileName: item.profileName,
        raw: item as Record<string, unknown>,
      });
      setOpMessage(`Instancia ${name} criada e colocada em modo de conexao.`);
      setCreateName("");
      setCreateSystemName("");
      setCreateAdminField01("");
      setCreateAdminField02("");
      setCreateFingerprintProfile("");
      setCreateBrowser("");
      setSelectedInstanceId(name);
      setProvider("uazapi");
      setActiveTab("visualizacao");
      setShowCreateAdvanced(false);
      setShowCreateModal(false);
      await refresh();
    });
  }

  async function handleCreateBaileys() {
    const instance = canonicalizeBaileysInstanceId(createBaileysInstanceId.trim());
    if (!instance) {
      setError("Informe o ID da instancia Baileys.");
      return;
    }
    await runBusy("create-baileys", async () => {
      // Expose only fields that are either official Baileys SocketConfig options
      // or operational metadata that the Ruptur can persist and surface.
      let item = await createBaileysInstance({
        instance,
        profileName: createBaileysProfileName.trim() || undefined,
        systemName: createBaileysSystemName.trim() || undefined,
        adminField01: createBaileysAdminField01.trim() || undefined,
        adminField02: createBaileysAdminField02.trim() || undefined,
        browser: createBaileysBrowser.trim() || undefined,
        syncFullHistory: createBaileysSyncFullHistory,
        markOnlineOnConnect: createBaileysMarkOnlineOnConnect,
      });
      if (!item.qrcode && item.status !== "connected") {
        item = await connectBaileysInstance(instance);
      }
      setBaileysStatus(item);
      setOpMessage(`Instancia Baileys ${instance} criada e colocada em modo de conexao.`);
      setCreateBaileysInstanceId("");
      setCreateBaileysProfileName("");
      setCreateBaileysSystemName("");
      setCreateBaileysAdminField01("");
      setCreateBaileysAdminField02("");
      setCreateBaileysBrowser("");
      setCreateBaileysSyncFullHistory(true);
      setCreateBaileysMarkOnlineOnConnect(false);
      setSelectedInstanceId(instance);
      setProvider("baileys");
      setActiveTab("visualizacao");
      setShowCreateAdvanced(false);
      setShowCreateModal(false);
      await refresh();
    });
  }

  async function handleDeleteBaileys() {
    const targetInstance = selectedBaileysTargetId || selectedInstanceId;
    if (!targetInstance) return;
    const ok = window.confirm(
      `Excluir permanentemente a instancia ${targetInstance}? Isso remove auth, QR, cache de retry e qualquer sessao anterior.`,
    );
    if (!ok) return;
    await runBusy("delete-baileys", async () => {
      await deleteBaileysInstance(targetInstance);
      setBaileysStatus(null);
      setOpMessage("Instancia Baileys excluida com limpeza completa de sessao e cache.");
      setSelectedInstanceId(null);
      await refresh();
    });
  }

  async function handleRenameUazapi() {
    if (!selectedInstanceId) return;
    const name = renameValue.trim();
    if (!name) {
      setError("Novo nome da instancia e obrigatorio.");
      return;
    }
    await runBusy("rename-uazapi", async () => {
      await runUazapiInstanceOperation("update_instance_name", {
        instance: selectedInstanceId,
        payload: { name },
      });
      setOpMessage("Nome da instancia atualizado.");
      await refresh();
      setSelectedInstanceId(name);
    });
  }

  async function handleUpdateAdminFields() {
    if (!selectedUazapiDetails?.id) {
      setError("Instancia sem ID para atualizar campos administrativos.");
      return;
    }
    await runBusy("admin-fields", async () => {
      await runUazapiInstanceOperation("update_admin_fields", {
        payload: {
          id: selectedUazapiDetails.id,
          adminField01: editAdminField01,
          adminField02: editAdminField02,
        },
      });
      setOpMessage("Campos administrativos atualizados.");
      await refresh();
    });
  }

  async function handleLoadPrivacy() {
    if (!selectedInstanceId) return;
    await runBusy("load-privacy", async () => {
      const data = await runUazapiInstanceOperation("get_privacy", { instance: selectedInstanceId });
      setPrivacyJson(JSON.stringify(data, null, 2));
      setOpMessage("Privacidade carregada.");
    });
  }

  async function handleSavePrivacy() {
    if (!selectedInstanceId) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(privacyJson) as Record<string, unknown>;
    } catch {
      setError("JSON de privacidade invalido.");
      return;
    }
    await runBusy("save-privacy", async () => {
      await runUazapiInstanceOperation("set_privacy", { instance: selectedInstanceId, payload: parsed });
      setOpMessage("Privacidade atualizada.");
    });
  }

  async function handleLoadProxy() {
    if (!selectedInstanceId) return;
    await runBusy("load-proxy", async () => {
      const data = await runUazapiInstanceOperation("get_proxy", { instance: selectedInstanceId });
      const proxy = data.proxy;
      if (proxy && typeof proxy === "object") {
        const p = proxy as Record<string, unknown>;
        setProxyEnabled(Boolean(p.enable));
        setProxyUrl(typeof p.proxy_url === "string" ? p.proxy_url : "");
      }
      setOpMessage("Proxy carregado.");
    });
  }

  async function handleSaveProxy() {
    if (!selectedInstanceId) return;
    await runBusy("save-proxy", async () => {
      await runUazapiInstanceOperation("set_proxy", {
        instance: selectedInstanceId,
        payload: {
          enable: proxyEnabled,
          proxy_url: proxyUrl.trim() || undefined,
        },
      });
      setOpMessage("Proxy atualizado.");
    });
  }

  async function handleDeleteProxy() {
    if (!selectedInstanceId) return;
    await runBusy("delete-proxy", async () => {
      await runUazapiInstanceOperation("delete_proxy", { instance: selectedInstanceId });
      setProxyEnabled(false);
      setProxyUrl("");
      setOpMessage("Proxy removido.");
    });
  }

  async function handleSaveDelaySettings() {
    if (!selectedInstanceId) return;
    const min = Number(delayMin);
    const max = Number(delayMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
      setError("Delay minimo e maximo devem ser numeros >= 0.");
      return;
    }
    await runBusy("delay-settings", async () => {
      await runUazapiInstanceOperation("update_delay_settings", {
        instance: selectedInstanceId,
        payload: { msg_delay_min: Math.floor(min), msg_delay_max: Math.floor(max) },
      });
      setOpMessage("Delay de mensagens atualizado.");
      await refresh();
    });
  }

  async function handleSaveChatbotSettings() {
    if (!selectedInstanceId) return;
    const stopMinutes = Number(chatbotStopMinutes || "0");
    const stopWhenYouSendMsg = Number(chatbotStopWhenYouSendMsg || "0");
    if (
      chatbotEnabled &&
      !window.confirm(
        "Habilitar chatbot nativo da UAZAPI nesta instancia? Isso pode competir com o assistente da <🛟Ruptur /> se a ownership nao estiver isolada.",
      )
    ) {
      return;
    }
    await runBusy("chatbot-settings", async () => {
      await runUazapiInstanceOperation("update_chatbot_settings", {
        instance: selectedInstanceId,
        payload: {
          chatbot_enabled: chatbotEnabled,
          chatbot_ignoreGroups: chatbotIgnoreGroups,
          chatbot_stopConversation: chatbotStopConversation || "",
          chatbot_stopMinutes: Number.isFinite(stopMinutes) ? Math.floor(stopMinutes) : 0,
          chatbot_stopWhenYouSendMsg: Number.isFinite(stopWhenYouSendMsg) ? Math.floor(stopWhenYouSendMsg) : 0,
        },
      });
      setOpMessage("Configuracao de chatbot atualizada.");
    });
  }

  async function handleSaveFieldsMap() {
    if (!selectedInstanceId) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(fieldsMapJson) as Record<string, unknown>;
    } catch {
      setError("JSON de fields map invalido.");
      return;
    }
    await runBusy("fields-map", async () => {
      await runUazapiInstanceOperation("update_fields_map", {
        instance: selectedInstanceId,
        payload: parsed,
      });
      setOpMessage("Fields map atualizado.");
    });
  }

  async function handleSetPresence() {
    if (!selectedInstanceId) return;
    await runBusy("presence", async () => {
      await runUazapiInstanceOperation("set_presence", {
        instance: selectedInstanceId,
        payload: { presence },
      });
      setOpMessage("Presenca da instancia atualizada.");
    });
  }

  async function handleDisconnectUazapi() {
    if (!selectedInstanceId) return;
    await runBusy("disconnect", async () => {
      await runUazapiInstanceOperation("disconnect", { instance: selectedInstanceId });
      setOpMessage("Instancia desconectada.");
      await refresh();
    });
  }

  async function handleDeleteUazapi() {
    if (!selectedInstanceId) return;
    const ok = window.confirm(`Excluir permanentemente a instancia ${selectedInstanceId}?`);
    if (!ok) return;
    await runBusy("delete-instance", async () => {
      await runUazapiInstanceOperation("delete_instance", { instance: selectedInstanceId });
      setOpMessage("Instancia excluida.");
      setSelectedInstanceId(null);
      await refresh();
    });
  }

  const qrUrl =
    provider === "uazapi"
      ? selectedUazapiDetails?.qrcode || (selectedInstanceId
        ? `${rupturApiBaseUrl()}/integrations/uazapi/qrcode.png?instance=${encodeURIComponent(selectedInstanceId)}`
        : null)
      : baileysStatus?.qrcode || (selectedBaileysTargetId
        ? `${rupturApiBaseUrl()}/integrations/baileys/qrcode.png?instance=${encodeURIComponent(selectedBaileysTargetId)}`
        : null);
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
            <p className="mt-2 text-xs text-zinc-400">No MVP, UAZAPI e canal primario. Baileys fica pronta para contingencia e virada futura.</p>
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
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Instancias</h2>
              <p className="text-sm text-zinc-400">Lista unificada com pesquisa, filtros, status e dados conhecidos de UAZAPI/Baileys, sem confundir papel no MVP.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar instancia, numero ou perfil"
                className="min-w-[16rem] flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 outline-none"
              />
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as "all" | "uazapi" | "baileys" | "both")}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 outline-none"
                title="Filtrar por provedor"
              >
                <option value="all">todos</option>
                <option value="uazapi">uazapi</option>
                <option value="baileys">baileys</option>
                <option value="both">nas duas</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | UnifiedConnectionStatus)}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 outline-none"
                title="Filtrar por status"
              >
                <option value="all">todos status</option>
                <option value="connected">conectado</option>
                <option value="connecting">conectando</option>
                <option value="disconnected">desconectado</option>
                <option value="unknown">desconhecido</option>
              </select>
              <button
                type="button"
                onClick={refresh}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                title="Atualizar lista e status das instancias"
              >
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => openCreateModal(provider)}
                className="rounded-full border border-sky-300/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20"
                title="Criar uma nova instancia no provedor ativo"
              >
                Criar instancia
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {filteredInstances.length ? (
              filteredInstances.map((instance) => (
                <article
                  key={instance.id}
                  className={[
                    "rounded-[24px] border bg-black/20 p-4 transition",
                    selectedInstanceId === instance.id
                      ? "border-sky-300/30"
                      : instance.overallStatus === "connected"
                        ? "border-emerald-300/20"
                        : instance.overallStatus === "connecting"
                          ? "border-amber-300/20"
                          : instance.overallStatus === "disconnected"
                            ? "border-red-300/20"
                            : "border-white/10",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFailedQrUrl(null);
                      setOpMessage(null);
                      setActiveTab("visualizacao");
                      setSelectedInstanceId(instance.id);
                      if (provider === "uazapi" && !instance.hasUazapi && instance.hasBaileys) setProvider("baileys");
                      if (provider === "baileys" && !instance.hasBaileys && instance.hasUazapi) setProvider("uazapi");
                    }}
                    className="w-full text-left"
                    title={instance.tooltip}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="text-xl font-semibold tracking-[-0.04em] text-white">
                          {instance.number || instance.baileysDisplayNumber || "sem_numero"}
                        </div>
                        <div className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {instance.displayId || instance.id}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {instance.hasUazapi ? (
                            <span className="rounded-full border border-sky-300/30 bg-sky-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100" title="Instancia existente na UAZAPI">
                              UAZAPI
                            </span>
                          ) : null}
                          {instance.hasUazapi ? (
                            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100" title={providerRoleHint("uazapi")}>
                              {providerRoleLabel("uazapi")}
                            </span>
                          ) : null}
                          {instance.hasBaileys ? (
                            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100" title="Instancia existente no Baileys">
                              BAILEYS
                            </span>
                          ) : null}
                          {instance.hasBaileys ? (
                            <span className="rounded-full border border-amber-300/20 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100" title={providerRoleHint("baileys")}>
                              {providerRoleLabel("baileys")}
                            </span>
                          ) : null}
                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]",
                              instance.overallStatus === "connected"
                                ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                                : instance.overallStatus === "connecting"
                                  ? "border-amber-300/30 bg-amber-500/10 text-amber-100"
                                  : instance.overallStatus === "disconnected"
                                    ? "border-red-300/30 bg-red-500/10 text-red-100"
                                    : "border-white/20 bg-white/5 text-zinc-300",
                            ].join(" ")}
                          >
                            {statusLabel(instance.overallStatus)}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-300">
                          {instance.profileName || "sem perfil"}
                        </div>
                        <div className="text-xs text-zinc-400">
                          UAZAPI: {instance.uazapiStatus || "sem_dados"} | Baileys: {instance.baileysStatus || "sem_dados"}
                        </div>
                        {instance.profileName || instance.systemName ? (
                          <div className="text-xs text-zinc-500">
                            {instance.systemName ? `Sistema: ${instance.systemName}` : "Sistema: sem_dados"}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right text-[11px] text-zinc-300">
                        <div>desde {formatDateTime(instance.connectedSince)}</div>
                        <div className="mt-1 text-zinc-500">att {formatDateTime(instance.lastUpdatedAt)}</div>
                      </div>
                    </div>
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-zinc-400">
                Nenhuma instancia encontrada para os filtros atuais.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Painel operacional</h2>
          <p className="mt-1 text-sm text-zinc-400">Acoes diretas para lifecycle, conexao e ajuste fino da instancia selecionada.</p>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">provider ativo</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => switchProvider("uazapi")}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition",
                  provider === "uazapi" ? "border-sky-300/40 bg-sky-500/10 text-sky-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                ].join(" ")}
                title="Usar operacoes da UAZAPI para esta instancia"
              >
                UAZAPI
              </button>
              <button
                type="button"
                onClick={() => switchProvider("baileys")}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition",
                  provider === "baileys" ? "border-amber-300/40 bg-amber-500/10 text-amber-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                ].join(" ")}
                title="Usar operacoes do Baileys para esta instancia"
              >
                BAILEYS
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
              {provider === "uazapi" ? "Papel ativo: canal primario do MVP." : "Papel ativo: contingencia estrategica e camada de aprendizado."}
            </div>
            <div className="mt-5 text-xs uppercase tracking-[0.25em] text-zinc-500">instancia selecionada</div>
            <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
              {selectedUnifiedInstance?.number || selectedInstanceId || "nenhuma"}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {selectedInstanceId || "sem_instancia"}
            </div>
            {selectedUnifiedInstance ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">papel no mvp</div>
                  <div className="mt-2">{selectedUnifiedInstance.hasUazapi ? "uazapi primario" : "baileys contingencia"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">status geral</div>
                  <div className="mt-2">{statusLabel(selectedUnifiedInstance.overallStatus)}</div>
                </div>
                {selectedUnifiedInstance.hasBaileys ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300 sm:col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">identidade whatsapp</div>
                    <div className="mt-2">Numero WhatsApp: {selectedUnifiedInstance.baileysTransportNumber || "sem_dados"}</div>
                    <div className="mt-1">Modo identidade: {identityModeLabel(selectedUnifiedInstance.baileysIdentityMode)}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedInstanceId ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void (provider === "uazapi" ? handleUazapiConnectQr() : handleBaileysConnectQr())}
                  disabled={busy !== null || (provider === "baileys" && !canManageSelectedBaileys)}
                  className="rounded-full border border-sky-300/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20 disabled:opacity-50"
                  title="Gerar ou renovar QR da instancia selecionada"
                >
                  Abrir QR
                </button>
                {provider === "baileys" ? (
                  <button
                    type="button"
                    onClick={() => void handleBaileysReset()}
                    disabled={busy !== null || !canManageSelectedBaileys}
                    className="rounded-full border border-amber-300/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    Resetar sessao
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void (provider === "uazapi" ? handleDeleteUazapi() : handleDeleteBaileys())}
                  disabled={busy !== null || (provider === "baileys" && !canManageSelectedBaileys)}
                  className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50"
                  title="Excluir a instancia selecionada com limpeza do que o provedor suportar"
                >
                  Excluir instancia
                </button>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {(["visualizacao", "edicao", "configuracao", "propriedades"] as ProviderTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition",
                    activeTab === tab ? "border-sky-300/40 bg-sky-500/10 text-sky-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  {tabLabel(tab)}
                </button>
              ))}
            </div>

            {opMessage ? <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{opMessage}</div> : null}
            {busy ? <div className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Executando: {busy}</div> : null}

            {activeTab === "visualizacao" ? (
              <div className="mt-4 space-y-4">
                <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">status</div>
                <div className="text-sm text-zinc-200">
                  {provider === "uazapi" ? selectedUazapiDetails?.status || "sem_status" : baileysStatus?.status || selectedBaileysInstance?.connection || "sem_status"}
                </div>
                {provider === "uazapi" ? (
                  <>
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">numero</div>
                    <div className="text-sm text-zinc-200">{selectedUazapiDetails?.number || "sem_numero"}</div>
                    <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">codigo de conexao</div>
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                      {selectedUazapiDetails?.paircode || "sem_codigo_disponivel"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUazapiConnectQr()}
                        disabled={!selectedInstanceId || busy !== null}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        Conectar via QR
                      </button>
                      <input
                        value={pairPhone}
                        onChange={(e) => setPairPhone(e.target.value)}
                        placeholder="Telefone para codigo"
                        className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void handleUazapiConnectCode()}
                        disabled={!selectedInstanceId || busy !== null}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        Conectar por codigo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 text-sm text-zinc-200">
                      <div>
                        <span className="text-zinc-500">Numero exibido:</span>{" "}
                        {selectedBaileysInstance?.number_display || baileysStatus?.number_display || selectedUnifiedInstance?.number || "sem_numero"}
                      </div>
                      <div>
                        <span className="text-zinc-500">Numero WhatsApp:</span>{" "}
                        {selectedBaileysInstance?.number_whatsapp || baileysStatus?.number_whatsapp || selectedUnifiedInstance?.baileysTransportNumber || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">Modo de identidade:</span>{" "}
                        {identityModeLabel(selectedBaileysInstance?.number_mode || baileysStatus?.number_mode || selectedUnifiedInstance?.baileysIdentityMode)}
                      </div>
                      <div className="break-all">
                        <span className="text-zinc-500">Me JID:</span>{" "}
                        {selectedBaileysInstance?.me_jid || baileysStatus?.me_jid || selectedUnifiedInstance?.baileysMeJid || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">Perfil:</span>{" "}
                        {selectedBaileysInstance?.profileName || baileysStatus?.profileName || selectedUnifiedInstance?.profileName || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">SystemName:</span>{" "}
                        {selectedBaileysInstance?.systemName || baileysStatus?.systemName || selectedUnifiedInstance?.systemName || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">AdminField01:</span>{" "}
                        {selectedBaileysInstance?.adminField01 || baileysStatus?.adminField01 || selectedUnifiedInstance?.adminField01 || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">AdminField02:</span>{" "}
                        {selectedBaileysInstance?.adminField02 || baileysStatus?.adminField02 || selectedUnifiedInstance?.adminField02 || "sem_dados"}
                      </div>
                      <div>
                        <span className="text-zinc-500">Browser:</span>{" "}
                        {selectedBaileysInstance?.browser || baileysStatus?.browser || selectedUnifiedInstance?.baileysBrowser || "padrao"}
                      </div>
                      <div>
                        <span className="text-zinc-500">SyncFullHistory:</span>{" "}
                        {(selectedBaileysInstance?.syncFullHistory ?? baileysStatus?.syncFullHistory ?? selectedUnifiedInstance?.baileysSyncFullHistory ?? true) ? "sim" : "nao"}
                      </div>
                      <div>
                        <span className="text-zinc-500">MarkOnlineOnConnect:</span>{" "}
                        {(selectedBaileysInstance?.markOnlineOnConnect ?? baileysStatus?.markOnlineOnConnect ?? selectedUnifiedInstance?.baileysMarkOnlineOnConnect ?? false) ? "sim" : "nao"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
                      A interface continua usando o numero BR com 9. O transporte responde automaticamente no identificador real devolvido pelo WhatsApp.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleBaileysConnectQr()}
                        disabled={!canManageSelectedBaileys || busy !== null}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                      >
                        Gerar/Atualizar QR
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBaileysReset()}
                        disabled={!canManageSelectedBaileys || busy !== null}
                        className="rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Resetar sessao
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBaileys()}
                        disabled={!canManageSelectedBaileys || busy !== null}
                        className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Excluir instancia
                      </button>
                    </div>
                  </>
                )}
                {selectedInstanceId ? (
                  <div>
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
                          QR indisponivel no momento.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "edicao" ? (
              <div className="mt-4 space-y-3">
                {provider === "uazapi" ? (
                  <>
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Novo nome da instancia" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    <button type="button" onClick={() => void handleRenameUazapi()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Atualizar nome
                    </button>
                    <input value={editAdminField01} onChange={(e) => setEditAdminField01(e.target.value)} placeholder="AdminField01" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    <input value={editAdminField02} onChange={(e) => setEditAdminField02(e.target.value)} placeholder="AdminField02" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    <button type="button" onClick={() => void handleUpdateAdminFields()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Atualizar campos administrativos
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-zinc-400">
                    Metadados Baileys seguem enxutos no MVP. O fluxo principal fica em criar, conectar, resetar e excluir sem aumentar complexidade desnecessaria.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "propriedades" ? (
              <div className="mt-4 space-y-3">
                <textarea value={propertiesJson} onChange={(e) => setPropertiesJson(e.target.value)} rows={10} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-200 outline-none" />
                {provider === "uazapi" ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleLoadPrivacy()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50">Carregar privacidade</button>
                      <button type="button" onClick={() => void handleLoadProxy()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50">Carregar proxy</button>
                    </div>
                    <textarea value={privacyJson} onChange={(e) => setPrivacyJson(e.target.value)} rows={7} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-200 outline-none" />
                    <button type="button" onClick={() => void handleSavePrivacy()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Salvar privacidade (JSON)
                    </button>
                    <label className="flex items-center gap-2 text-sm text-zinc-200">
                      <input type="checkbox" checked={proxyEnabled} onChange={(e) => setProxyEnabled(e.target.checked)} />
                      Proxy habilitado
                    </label>
                    <input value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="http://usuario:senha@ip:porta" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleSaveProxy()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">Salvar proxy</button>
                      <button type="button" onClick={() => void handleDeleteProxy()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50">Remover proxy</button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-zinc-400">
                    Propriedades da instancia Baileys sao limitadas ao estado retornado pelo gateway.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "configuracao" ? (
              <div className="mt-4 space-y-3">
                {provider === "uazapi" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={delayMin} onChange={(e) => setDelayMin(e.target.value)} placeholder="Delay min" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                      <input value={delayMax} onChange={(e) => setDelayMax(e.target.value)} placeholder="Delay max" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    </div>
                    <button type="button" onClick={() => void handleSaveDelaySettings()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Salvar delay de fila
                    </button>
                    <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      {"Ownership: se a <🛟Ruptur /> for a dona do assistente nesta instancia, mantenha o chatbot nativo da UAZAPI desligado ou isolado. Nao deixe os dois responderem no mesmo fluxo."}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={chatbotEnabled} onChange={(e) => setChatbotEnabled(e.target.checked)} />Chatbot habilitado</label>
                    <label className="flex items-center gap-2 text-sm text-zinc-200"><input type="checkbox" checked={chatbotIgnoreGroups} onChange={(e) => setChatbotIgnoreGroups(e.target.checked)} />Ignorar grupos</label>
                    <input value={chatbotStopConversation} onChange={(e) => setChatbotStopConversation(e.target.value)} placeholder="Palavra para parar conversa" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={chatbotStopMinutes} onChange={(e) => setChatbotStopMinutes(e.target.value)} placeholder="stopMinutes" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                      <input value={chatbotStopWhenYouSendMsg} onChange={(e) => setChatbotStopWhenYouSendMsg(e.target.value)} placeholder="stopWhenYouSendMsg" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none" />
                    </div>
                    <button type="button" onClick={() => void handleSaveChatbotSettings()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Salvar chatbot nativo da UAZAPI
                    </button>
                    <textarea value={fieldsMapJson} onChange={(e) => setFieldsMapJson(e.target.value)} rows={5} placeholder='{"lead_field01":"origem","lead_field02":"segmento"}' className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-200 outline-none" />
                    <button type="button" onClick={() => void handleSaveFieldsMap()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">
                      Salvar fields map
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={presence} onChange={(e) => setPresence(e.target.value as "available" | "unavailable")} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-zinc-200 outline-none">
                        <option value="available">available</option>
                        <option value="unavailable">unavailable</option>
                      </select>
                      <button type="button" onClick={() => void handleSetPresence()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-50">Atualizar presenca</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleDisconnectUazapi()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-amber-300/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/10 disabled:opacity-50">Desconectar instancia</button>
                      <button type="button" onClick={() => void handleDeleteUazapi()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50">Excluir instancia</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-zinc-400">
                      O gateway Baileys agora permite criar, resetar e excluir instancias com limpeza completa de auth e cache. A interface continua escondendo a complexidade operacional do usuario final.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleBaileysReset()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-amber-300/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/10 disabled:opacity-50">Resetar sessao</button>
                      <button type="button" onClick={() => void handleDeleteBaileys()} disabled={!selectedInstanceId || busy !== null} className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:bg-red-500/10 disabled:opacity-50">Excluir instancia</button>
                    </div>
                  </>
                )}
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#120d0b]/80 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#17120f] shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-[#d2ab93]">Nova instancia</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">criar e colocar em modo de conexao</div>
                <p className="mt-2 text-sm text-[#d8c2b4]">
                  Primeiro criamos a instancia no provider certo. Em seguida, o sistema ja deixa o QR ou o pareamento pronto para operar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Fechar
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateProvider("uazapi")}
                  className={[
                    "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                    createProvider === "uazapi" ? "border-sky-300/40 bg-sky-500/10 text-sky-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  UAZAPI
                </button>
                <button
                  type="button"
                  onClick={() => setCreateProvider("baileys")}
                  className={[
                    "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                    createProvider === "baileys" ? "border-amber-300/40 bg-amber-500/10 text-amber-100" : "border-white/10 text-zinc-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  BAILEYS
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">papel do provider</div>
                  <div className="mt-2">
                    {createProvider === "uazapi"
                      ? "UAZAPI segue como canal principal do MVP. A criacao ja prepara a operacao normal."
                      : "Baileys fica em contingencia. Aqui o foco e criar rapido, abrir QR e recuperar sessao quando necessario."}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">id interno</div>
                  <div className="mt-2 break-all font-mono text-xs text-zinc-100">
                    {createProvider === "uazapi" ? createName || "gerando..." : createBaileysInstanceId || "gerando..."}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        createProvider === "uazapi"
                          ? setCreateName(makeOpaqueInstanceId("uaz"))
                          : setCreateBaileysInstanceId(makeOpaqueInstanceId("bai"))
                      }
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                    >
                      Regenerar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateAdvanced((current) => !current)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                    >
                      {showCreateAdvanced ? "Ocultar avancado" : "Editar avancado"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                {createProvider === "uazapi" ? (
                  <div>
                    {"O numero do WhatsApp entra depois do QR. Antes disso, a <🛟Ruptur /> trabalha so com o identificador interno e com os metadados operacionais minimos."}
                  </div>
                ) : (
                  <div>
                    O gateway Baileys usa ID interno opaco por padrao. O numero real e a identidade do WhatsApp so aparecem depois do pareamento e da leitura de `me.id`.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {createProvider === "uazapi" ? (
                  <>
                    <input value={createSystemName} onChange={(e) => setCreateSystemName(e.target.value)} placeholder="SystemName ou dono operacional (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                    {showCreateAdvanced ? (
                      <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="ID interno da instancia" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        <input value={createBrowser} onChange={(e) => setCreateBrowser(e.target.value)} placeholder="browser (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input value={createAdminField01} onChange={(e) => setCreateAdminField01(e.target.value)} placeholder="AdminField01 (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                          <input value={createAdminField02} onChange={(e) => setCreateAdminField02(e.target.value)} placeholder="AdminField02 (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        </div>
                        <input value={createFingerprintProfile} onChange={(e) => setCreateFingerprintProfile(e.target.value)} placeholder="fingerprintProfile (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleCreateUazapi()} disabled={busy !== null} className="rounded-full border border-sky-300/30 bg-sky-500/10 px-5 py-2.5 text-sm text-sky-100 hover:bg-sky-500/20 disabled:opacity-50">
                        Criar e abrir conexao
                      </button>
                      <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={createBaileysProfileName} onChange={(e) => setCreateBaileysProfileName(e.target.value)} placeholder="Perfil operacional (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                      <input value={createBaileysSystemName} onChange={(e) => setCreateBaileysSystemName(e.target.value)} placeholder="SystemName ou dono operacional (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                        <input type="checkbox" checked={createBaileysSyncFullHistory} onChange={(e) => setCreateBaileysSyncFullHistory(e.target.checked)} />
                        SyncFullHistory
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
                        <input type="checkbox" checked={createBaileysMarkOnlineOnConnect} onChange={(e) => setCreateBaileysMarkOnlineOnConnect(e.target.checked)} />
                        MarkOnlineOnConnect
                      </label>
                    </div>
                    {showCreateAdvanced ? (
                      <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <input value={createBaileysInstanceId} onChange={(e) => setCreateBaileysInstanceId(e.target.value)} placeholder="ID interno da instancia Baileys" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        <input value={createBaileysBrowser} onChange={(e) => setCreateBaileysBrowser(e.target.value)} placeholder="browser (opcional, ex.: Mac OS|Desktop|14.4.1)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input value={createBaileysAdminField01} onChange={(e) => setCreateBaileysAdminField01(e.target.value)} placeholder="AdminField01 (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                          <input value={createBaileysAdminField02} onChange={(e) => setCreateBaileysAdminField02(e.target.value)} placeholder="AdminField02 (opcional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200 outline-none" />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleCreateBaileys()} disabled={busy !== null} className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-2.5 text-sm text-amber-100 hover:bg-amber-500/20 disabled:opacity-50">
                        Criar e abrir conexao
                      </button>
                      <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-200 hover:bg-white/5">
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
