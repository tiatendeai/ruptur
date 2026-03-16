import express from "express";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import pino from "pino";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  proto,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const baseAuthDir = process.env.BAILEYS_AUTH_DIR || "/data/auth";
const logLevel = process.env.BAILEYS_LOG_LEVEL || "info";
const forwardWebhookUrl = String(process.env.BAILEYS_FORWARD_WEBHOOK_URL || "").trim();

const bulkMinDelayMs = Number.parseInt(process.env.BAILEYS_BULK_MIN_DELAY_MS || "1200", 10);
const bulkMaxDelayMs = Number.parseInt(process.env.BAILEYS_BULK_MAX_DELAY_MS || "3500", 10);
const outboundGuardWindowMs = Number.parseInt(process.env.BAILEYS_OUTBOUND_GUARD_WINDOW_MS || "60000", 10);
const outboundGuardMaxPerWindow = Number.parseInt(process.env.BAILEYS_OUTBOUND_GUARD_MAX || "10", 10);
const textPresenceMs = Number.parseInt(process.env.BAILEYS_TEXT_PRESENCE_MS || "1200", 10);
const audioPresenceMs = Number.parseInt(process.env.BAILEYS_AUDIO_PRESENCE_MS || "1800", 10);
const forwardGroupMessages = String(process.env.BAILEYS_FORWARD_GROUP_MESSAGES || "false").trim().toLowerCase() === "true";
const forwardStatusMessages = String(process.env.BAILEYS_FORWARD_STATUS_MESSAGES || "false").trim().toLowerCase() === "true";
const sentMessageCacheLimit = Number.parseInt(process.env.BAILEYS_SENT_MESSAGE_CACHE_LIMIT || "4000", 10);
const sentMessageTtlMs = Number.parseInt(process.env.BAILEYS_SENT_MESSAGE_TTL_MS || "1209600000", 10);
const sentMessageStoreRoot = String(process.env.BAILEYS_SENT_MESSAGE_STORE_DIR || path.join(path.dirname(baseAuthDir), "sent-messages")).trim();
const eagerStartDefaultInstance = String(process.env.BAILEYS_EAGER_START_DEFAULT || "false").trim().toLowerCase() === "true";
const lazyStartDefaultInstance = String(process.env.BAILEYS_LAZY_START_DEFAULT || "false").trim().toLowerCase() === "true";
const bootNamedInstances = String(process.env.BAILEYS_BOOT_NAMED_INSTANCES || "true").trim().toLowerCase() !== "false";
const instanceMetaFileName = "instance-meta.json";


const logger = pino({ level: logLevel });

const instances = new Map(); // instanceId -> {id, authDir, socket, lastConnection, lastQr, startPromise, resetting, deleting, meta}

const require = createRequire(import.meta.url);
let baileysHelper = null;
try {
  // Optional dependency: improves interactive/button rendering by adding required nodes.
  // If not installed, we keep our legacy implementations.
  baileysHelper = require("baileys_helper");
  logger.info("baileys_helper carregado (interactive/buttons helper).");
} catch {
  // ignore
}

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});

const jobs = new Map(); // jobId -> {status,total,sent,failed,createdAt,startedAt,finishedAt,errors}
let bulkQueue = []; // [{jobId, instanceId, jid, text}]
let bulkWorkerRunning = false;
const outboundGuard = new Map(); // `${instanceId}:${jid}` -> [timestamps]
const sentMessages = new Map(); // `${instanceId}:${messageId}` -> { message, ts }

function jidUserPart(value) {
  return String(value || "").split("@", 1)[0].split(":", 1)[0];
}

function extractMessageText(message = {}) {
  if (!message || typeof message !== "object") return null;
  if (typeof message.conversation === "string" && message.conversation.trim()) return message.conversation.trim();
  if (typeof message.extendedTextMessage?.text === "string" && message.extendedTextMessage.text.trim()) {
    return message.extendedTextMessage.text.trim();
  }
  if (typeof message.imageMessage?.caption === "string" && message.imageMessage.caption.trim()) {
    return message.imageMessage.caption.trim();
  }
  if (typeof message.videoMessage?.caption === "string" && message.videoMessage.caption.trim()) {
    return message.videoMessage.caption.trim();
  }
  if (typeof message.buttonsResponseMessage?.selectedDisplayText === "string") {
    return message.buttonsResponseMessage.selectedDisplayText.trim();
  }
  if (typeof message.listResponseMessage?.title === "string") {
    return message.listResponseMessage.title.trim();
  }
  const nested = [
    message.ephemeralMessage?.message,
    message.viewOnceMessage?.message,
    message.viewOnceMessageV2?.message,
    message.viewOnceMessageV2Extension?.message,
    message.documentWithCaptionMessage?.message,
    message.protocolMessage?.editedMessage,
  ];
  for (const item of nested) {
    if (!item || typeof item !== "object") continue;
    const text = extractMessageText(item);
    if (text) return text;
  }
  return null;
}

async function forwardWebhook(payload) {
  if (!forwardWebhookUrl) return;
  const startedAt = Date.now();
  try {
    const resp = await fetch(forwardWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      logger.warn(
        {
          status: resp.status,
          latencyMs: Date.now() - startedAt,
          forwardWebhookUrl,
          instance: payload?.instance,
          chatid: payload?.data?.chatid,
          messageid: payload?.data?.messageid,
        },
        "Falha ao encaminhar webhook para o Ruptur.",
      );
    } else {
      logger.info(
        {
          status: resp.status,
          latencyMs: Date.now() - startedAt,
          instance: payload?.instance,
          chatid: payload?.data?.chatid,
          messageid: payload?.data?.messageid,
        },
        "Webhook encaminhado para o Ruptur.",
      );
    }
  } catch (err) {
    logger.warn({ err, latencyMs: Date.now() - startedAt, forwardWebhookUrl }, "Erro ao encaminhar webhook para o Ruptur.");
  }
}

function sanitizeInstanceId(value) {
  const v = String(value || "").trim();
  if (!v) return "default";
  if (v.length > 64) return v.slice(0, 64);
  // Keep it filesystem-safe-ish
  return v.replace(/[^a-z0-9._-]/gi, "_");
}

function getInstanceId(req) {
  const header = req.header?.("x-instance-id");
  const query = req.query?.instance;
  const body = req.body?.instance;
  return sanitizeInstanceId(header || query || body || "default");
}

function getOrCreateInstance(instanceId) {
  const id = sanitizeInstanceId(instanceId);
  const existing = instances.get(id);
  if (existing) return existing;
  const authDir = id === "default" ? baseAuthDir : path.join(baseAuthDir, id);
  const inst = {
    id,
    authDir,
    socket: null,
    lastConnection: { status: "starting" },
    lastQr: null,
    startPromise: null,
    deleting: false,
    meta: null,
  };
  instances.set(id, inst);
  return inst;
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function canonicalizeBrNumber(value) {
  const digits = normalizeDigits(value);
  // BR mobile canonical form: 55 + DDD + 9 + 8 digits.
  // Keep fixed-line numbers unchanged.
  if (digits.startsWith("55") && digits.length === 12 && ["6", "7", "8", "9"].includes(digits[4])) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }
  return digits;
}

function canonicalPhone(value) {
  return canonicalizeBrNumber(jidUserPart(value));
}

function rawPhone(value) {
  return normalizeDigits(jidUserPart(value));
}

function jidDomain(value) {
  const v = String(value || "").trim();
  const at = v.indexOf("@");
  if (at === -1) return "";
  return v.slice(at + 1).toLowerCase();
}

function canonicalJid(value) {
  const v = String(value || "").trim();
  if (!v || /\s/.test(v)) return null;
  if (v === "status@broadcast" || v.includes("@g.us")) return v;
  if (v.includes("@")) {
    const domain = jidDomain(v);
    // RUP-2026-007: @lid and channel/newsletter IDs are not phone-addressable JIDs.
    if (domain === "lid" || domain === "newsletter" || domain === "broadcast") return null;
    // RUP-2026-007: canonicalize only direct WhatsApp user JIDs.
    if (domain && domain !== "s.whatsapp.net" && domain !== "c.us") return null;
  }
  const phone = canonicalPhone(v);
  if (!phone) return null;
  return `${phone}@s.whatsapp.net`;
}

function directUserJid(value) {
  const v = String(value || "").trim();
  if (!v || /\s/.test(v)) return null;
  if (v === "status@broadcast" || v.includes("@g.us")) return v;
  if (v.includes("@")) {
    const domain = jidDomain(v);
    if (domain === "lid" || domain === "newsletter" || domain === "broadcast") return null;
    if (domain && domain !== "s.whatsapp.net" && domain !== "c.us") return null;
  }
  const phone = rawPhone(v);
  if (!phone) return null;
  return `${phone}@s.whatsapp.net`;
}

function identityFromJid(jid) {
  const meJid = String(jid || "").trim();
  // The connected session tells us how WhatsApp currently identifies this
  // account. Keep that value as transport truth and derive the BR-canonical
  // number only for display/business layers.
  const waPhonePreferred = rawPhone(meJid);
  const waPhoneCanonical = canonicalizeBrNumber(waPhonePreferred);
  const waPhoneDisplay = waPhoneCanonical || waPhonePreferred || "";
  const waPhoneMode =
    waPhonePreferred && waPhoneCanonical && waPhonePreferred !== waPhoneCanonical
      ? "legacy_without_ninth_digit"
      : waPhonePreferred
        ? "canonical_with_ninth_digit"
        : undefined;
  const waPhoneVariants = [...new Set([waPhonePreferred, waPhoneCanonical].filter(Boolean))];
  return {
    meJid,
    waPhonePreferred,
    waPhoneCanonical,
    waPhoneDisplay,
    waPhoneMode,
    waPhoneVariants,
  };
}

function instanceIdentity(inst) {
  const identity = identityFromJid(inst?.socket?.user?.id || inst?.lastConnection?.meJid || "");
  return {
    me_jid: identity.meJid || undefined,
    number_whatsapp: identity.waPhonePreferred || undefined,
    number_canonical: identity.waPhoneCanonical || undefined,
    number_display: identity.waPhoneDisplay || undefined,
    number_mode: identity.waPhoneMode,
    number_variants: identity.waPhoneVariants.length ? identity.waPhoneVariants : undefined,
    ...summarizeInstanceMeta(inst?.meta),
  };
}

function normalizeRecipient(value) {
  const v = String(value || "").trim();
  if (!v || /\s/.test(v)) return null;
  if (v.includes("@")) return directUserJid(v) || v;
  const canonical = canonicalJid(v);
  if (canonical) return canonical;
  return `${v}@s.whatsapp.net`;
}

function brVariants(number) {
  const digits = canonicalPhone(number);
  if (!digits.startsWith("55")) return [digits];
  // 55 + DDD(2) + subscriber
  if (digits.length === 13 && digits[4] === "9") {
    // canonical mobile (with 9) + legacy variant (without 9).
    return [digits, `${digits.slice(0, 4)}${digits.slice(5)}`];
  }
  if (digits.length === 12 && ["6", "7", "8", "9"].includes(digits[4])) {
    // best effort for raw legacy mobile number.
    return [`${digits.slice(0, 4)}9${digits.slice(4)}`, digits];
  }
  return [digits];
}

async function resolveJid(inst, raw) {
  const v = String(raw || "").trim();
  if (!v || /\s/.test(v)) return null;
  // Explicit JIDs returned by WhatsApp should win over local BR 9-digit
  // canonicalization. Rewriting them can create duplicate threads or failed
  // deliveries for legacy Brazilian accounts.
  if (v.includes("@")) return directUserJid(v) || v;
  if (!inst?.socket) return normalizeRecipient(v);

  // Prefer provider confirmation (handles BR 9-digit inconsistencies).
  for (const candidate of brVariants(v)) {
    if (!candidate) continue;
    try {
      const r = await inst.socket.onWhatsApp(candidate);
      const item = Array.isArray(r) && r.length ? r[0] : null;
      if (item?.exists && item?.jid) return item.jid;
    } catch {
      // ignore and try next variant
    }
  }

  return normalizeRecipient(v);
}

function clampInt(value, min, max) {
  const n = Number.parseInt(String(value || ""), 10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function guardOutbound(instanceId, jid) {
  const key = `${instanceId}:${jid}`;
  const now = Date.now();
  const recent = (outboundGuard.get(key) || []).filter((ts) => now - ts < outboundGuardWindowMs);
  if (recent.length >= outboundGuardMaxPerWindow) {
    const earliest = recent[0] || now;
    const retryAfterMs = Math.max(500, outboundGuardWindowMs - (now - earliest));
    return { ok: false, retryAfterMs, count: recent.length };
  }
  recent.push(now);
  outboundGuard.set(key, recent);
  return { ok: true, retryAfterMs: 0, count: recent.length };
}

function decodeMaybeBase64File(file) {
  const f = String(file || "").trim();
  if (!f) return null;
  if (/^https?:\/\//i.test(f)) return { kind: "url", value: f };
  const m = f.match(/^data:([^;]+);base64,(.*)$/i);
  if (m) return { kind: "buffer", value: Buffer.from(m[2], "base64"), mimetype: m[1] };
  if (/^[a-z0-9+/=\r\n]+$/i.test(f) && f.length > 64) return { kind: "buffer", value: Buffer.from(f, "base64") };
  return null;
}

function isDefaultInstance(instanceId) {
  return sanitizeInstanceId(instanceId) === "default";
}

function shouldLazyStartInstance(instanceId) {
  return !isDefaultInstance(instanceId) || lazyStartDefaultInstance;
}

function instanceMetaPath(instanceId) {
  const id = sanitizeInstanceId(instanceId);
  const authDir = id === "default" ? baseAuthDir : path.join(baseAuthDir, id);
  return path.join(authDir, instanceMetaFileName);
}

function sanitizeMetaText(value, limit = 120) {
  const text = String(value || "").trim();
  return text ? text.slice(0, limit) : "";
}

function parseOptionalBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on", "sim"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "nao", "não"].includes(normalized)) return false;
  return fallback;
}

function normalizeInstanceMeta(raw = {}) {
  return {
    profileName: sanitizeMetaText(raw.profileName, 120),
    systemName: sanitizeMetaText(raw.systemName, 120),
    adminField01: sanitizeMetaText(raw.adminField01, 120),
    adminField02: sanitizeMetaText(raw.adminField02, 120),
    browser: sanitizeMetaText(raw.browser, 120),
    syncFullHistory: parseOptionalBoolean(raw.syncFullHistory, true),
    markOnlineOnConnect: parseOptionalBoolean(raw.markOnlineOnConnect, false),
  };
}

function summarizeInstanceMeta(meta = {}) {
  const normalized = normalizeInstanceMeta(meta);
  return {
    profileName: normalized.profileName || undefined,
    systemName: normalized.systemName || undefined,
    adminField01: normalized.adminField01 || undefined,
    adminField02: normalized.adminField02 || undefined,
    browser: normalized.browser || undefined,
    syncFullHistory: normalized.syncFullHistory,
    markOnlineOnConnect: normalized.markOnlineOnConnect,
  };
}

function socketBrowserFromMeta(meta = {}) {
  const raw = sanitizeMetaText(meta.browser, 120);
  if (!raw) return Browsers.macOS("Desktop");
  const parts = raw
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length >= 3) return [parts[0], parts[1], parts[2]];
  if (parts.length === 2) return [parts[0], parts[1], "1.0.0"];
  return [parts[0], "Desktop", "1.0.0"];
}

async function loadInstanceMeta(instanceId) {
  try {
    const content = await fs.readFile(instanceMetaPath(instanceId), "utf8");
    return normalizeInstanceMeta(JSON.parse(content));
  } catch {
    return normalizeInstanceMeta();
  }
}

async function ensureInstanceMeta(inst, seed = null) {
  if (!inst.meta) inst.meta = await loadInstanceMeta(inst.id);
  if (seed && typeof seed === "object") inst.meta = normalizeInstanceMeta({ ...inst.meta, ...seed });
  return inst.meta;
}

async function saveInstanceMeta(inst, raw = null) {
  const next = await ensureInstanceMeta(inst, raw || {});
  await fs.mkdir(inst.authDir, { recursive: true });
  await fs.writeFile(instanceMetaPath(inst.id), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

async function instanceExists(instanceId) {
  const id = sanitizeInstanceId(instanceId);
  if (instances.has(id)) return true;
  try {
    const stat = await fs.stat(path.dirname(instanceMetaPath(id)));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function safeStoreKey(value) {
  return String(value || "").replace(/[^a-z0-9._-]/gi, "_");
}

function sentMessageKey(instanceId, messageId) {
  if (!instanceId || !messageId) return "";
  return `${instanceId}:${messageId}`;
}

function sentMessageStoreDir(instanceId) {
  return path.join(sentMessageStoreRoot, safeStoreKey(instanceId || "default"));
}

function sentMessageStorePath(instanceId, messageId) {
  return path.join(sentMessageStoreDir(instanceId), `${safeStoreKey(messageId)}.json`);
}

function purgeSentMessages(instanceId) {
  const prefix = `${instanceId}:`;
  for (const key of sentMessages.keys()) {
    if (key.startsWith(prefix)) sentMessages.delete(key);
  }
}

function pruneSentMessages() {
  while (sentMessages.size > sentMessageCacheLimit) {
    const oldestKey = sentMessages.keys().next().value;
    if (!oldestKey) break;
    sentMessages.delete(oldestKey);
  }
}

function serializeStoredMessage(value) {
  return JSON.stringify(value, (_key, current) => {
    if (Buffer.isBuffer(current)) {
      return { __type: "buffer", data: current.toString("base64") };
    }
    if (current instanceof Uint8Array) {
      return { __type: "uint8array", data: Buffer.from(current).toString("base64") };
    }
    return current;
  });
}

function deserializeStoredMessage(value) {
  return JSON.parse(value, (_key, current) => {
    if (!current || typeof current !== "object") return current;
    if (current.__type === "buffer" || current.__type === "uint8array") {
      return Buffer.from(String(current.data || ""), "base64");
    }
    return current;
  });
}

async function prunePersistedSentMessages(instanceId) {
  const dir = sentMessageStoreDir(instanceId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const filePath = path.join(dir, entry.name);
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch {
        continue;
      }
      if (sentMessageTtlMs > 0 && now - stats.mtimeMs > sentMessageTtlMs) {
        await fs.rm(filePath, { force: true });
        continue;
      }
      files.push({ filePath, mtimeMs: stats.mtimeMs });
    }
    if (files.length <= sentMessageCacheLimit) return;
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const item of files.slice(0, files.length - sentMessageCacheLimit)) {
      await fs.rm(item.filePath, { force: true });
    }
  } catch (err) {
    if (err?.code !== "ENOENT") {
      logger.warn({ err, instance: instanceId }, "Falha ao podar cache persistido de mensagens.");
    }
  }
}

async function persistSentMessage(inst, envelope) {
  const messageId = envelope?.key?.id;
  const message = envelope?.message;
  if (!inst?.id || !messageId || !message) return;
  const payload = { ts: Date.now(), message };
  try {
    const dir = sentMessageStoreDir(inst.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(sentMessageStorePath(inst.id, messageId), serializeStoredMessage(payload), "utf8");
    void prunePersistedSentMessages(inst.id);
  } catch (err) {
    logger.warn({ err, instance: inst.id, messageId }, "Falha ao persistir mensagem outbound para retry.");
  }
}

function rememberSentMessage(inst, envelope) {
  const messageId = envelope?.key?.id;
  const message = envelope?.message;
  if (!inst?.id || !messageId || !message) return;
  // RUP-2026-013: companion devices may request a resend when they receive
  // a placeholder in self-chat. Keep outbound messages retrievable by getMessage.
  sentMessages.set(sentMessageKey(inst.id, messageId), {
    message,
    ts: Date.now(),
  });
  pruneSentMessages();
  void persistSentMessage(inst, envelope);
}

async function getPersistedMessage(inst, key) {
  const messageId = key?.id;
  if (!inst?.id || !messageId) return undefined;
  try {
    const filePath = sentMessageStorePath(inst.id, messageId);
    const raw = await fs.readFile(filePath, "utf8");
    const stored = deserializeStoredMessage(raw);
    if (!stored?.message) return undefined;
    if (sentMessageTtlMs > 0 && typeof stored.ts === "number" && Date.now() - stored.ts > sentMessageTtlMs) {
      await fs.rm(filePath, { force: true });
      return undefined;
    }
    sentMessages.set(sentMessageKey(inst.id, messageId), {
      message: stored.message,
      ts: typeof stored.ts === "number" ? stored.ts : Date.now(),
    });
    pruneSentMessages();
    return stored.message;
  } catch (err) {
    if (err?.code !== "ENOENT") {
      logger.warn({ err, instance: inst?.id, messageId }, "Falha ao carregar mensagem persistida para retry.");
    }
    return undefined;
  }
}

async function getCachedMessage(inst, key) {
  const lookupKey = sentMessageKey(inst?.id, key?.id);
  if (!lookupKey) return undefined;
  const cached = sentMessages.get(lookupKey);
  if (cached?.message) {
    logger.info({ instance: inst?.id, messageId: key?.id, found: true, source: "memory" }, "Baileys getMessage lookup");
    return cached.message;
  }
  const persisted = await getPersistedMessage(inst, key);
  logger.info({ instance: inst?.id, messageId: key?.id, found: Boolean(persisted), source: persisted ? "disk" : "miss" }, "Baileys getMessage lookup");
  return persisted;
}

async function sendAndRemember(inst, jid, content, options) {
  const result = await inst.socket.sendMessage(jid, content, options);
  rememberSentMessage(inst, result);
  return result;
}

async function relayAndRemember(inst, jid, envelope, options) {
  await inst.socket.relayMessage(jid, envelope.message, options);
  rememberSentMessage(inst, envelope);
  return envelope;
}

async function qrPngDataUrl() {
  // Deprecated: kept for backward-compat of older code paths.
  return null;
}

function randomDelayMs(minMs, maxMs) {
  const min = Math.max(0, minMs);
  const max = Math.max(min, maxMs);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withPresence(inst, jid, presence, delayMs, fn) {
  // RUP-2026-008: standardize typing/recording presence before assistant sends.
  const normalizedDelay = Math.max(0, Math.min(5000, Number.parseInt(String(delayMs || 0), 10) || 0));
  try {
    if (presence) {
      await inst.socket.sendPresenceUpdate(presence, jid);
      if (normalizedDelay > 0) await sleep(normalizedDelay);
    }
    return await fn();
  } finally {
    if (presence) {
      try {
        await inst.socket.sendPresenceUpdate("paused", jid);
      } catch {
        // ignore presence-finalization errors
      }
    }
  }
}

async function waitForOpen(inst, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (inst.lastConnection?.connection === "open") return true;
    await sleep(250);
  }
  return inst.lastConnection?.connection === "open";
}

async function waitForQrOrOpen(inst, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (inst.lastConnection?.hasQr) return true;
    if (inst.lastConnection?.connection === "open") return true;
    await sleep(200);
  }
  return Boolean(inst.lastConnection?.hasQr || inst.lastConnection?.connection === "open");
}

async function removeInstanceFiles(inst, { auth = false, sent = false } = {}) {
  if (sent) {
    purgeSentMessages(inst.id);
    try {
      await fs.rm(sentMessageStoreDir(inst.id), { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err, instance: inst.id }, "Falha ao limpar cache persistido de mensagens da instancia.");
    }
  }
  if (auth) {
    try {
      await fs.rm(inst.authDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err, instance: inst.id }, "Falha ao limpar auth da instancia.");
    }
  }
}

function purgeInstanceRuntime(inst) {
  if (!inst?.id) return;
  const prefix = `${inst.id}:`;
  for (const key of outboundGuard.keys()) {
    if (key.startsWith(prefix)) outboundGuard.delete(key);
  }
  bulkQueue = bulkQueue.filter((item) => item.instanceId !== inst.id);
}

async function resetInstanceSession(inst, { restart = true, logout = true, deleting = false } = {}) {
  inst.deleting = Boolean(deleting);
  inst.resetting = true;
  const socket = inst.socket;
  inst.socket = null;
  inst.startPromise = null;
  inst.lastQr = null;
  inst.lastConnection = {
    ...(inst.lastConnection || {}),
    connection: "close",
    hasQr: false,
    status: "resetting",
  };

  if (socket) {
    if (logout) {
      try {
        // Evolution API also hardened reconnect/logout by clearing stale crypto
        // material. We explicitly log out before removing local auth.
        await socket.logout();
      } catch (err) {
        logger.warn({ err, instance: inst.id }, "Falha ao executar logout da instancia antes do reset.");
      }
    }
    try {
      socket.ws?.close?.();
    } catch {
      // ignore
    }
    try {
      socket.end?.(new Error("instance_reset"));
    } catch {
      // ignore
    }
  }

  await removeInstanceFiles(inst, { auth: true, sent: true });

  inst.lastConnection = {
    connection: "close",
    hasQr: false,
    status: restart ? "restarting" : "reset",
  };
  inst.resetting = false;

  if (restart) {
    inst.deleting = false;
    await ensureStarted(inst.id);
  }
}

async function createInstanceSession(instanceId) {
  const inst = getOrCreateInstance(instanceId);
  await ensureStarted(inst.id);
  return inst;
}

async function deleteInstanceSession(instanceId, { logout = true } = {}) {
  const inst = getOrCreateInstance(instanceId);
  await resetInstanceSession(inst, { restart: false, logout, deleting: true });
  purgeInstanceRuntime(inst);
  instances.delete(inst.id);
  return inst;
}

async function runBulkWorker() {
  if (bulkWorkerRunning) return;
  bulkWorkerRunning = true;
  try {
    while (bulkQueue.length) {
      const item = bulkQueue.shift();
      if (!item) break;

      const job = jobs.get(item.jobId);
      if (!job) continue;
      if (job.status === "canceled") continue;
      if (job.status === "queued") {
        job.status = "running";
        job.startedAt = new Date().toISOString();
      }

      const inst = instances.get(item.instanceId);
      if (!inst?.socket) {
        job.failed += 1;
        job.errors.push({ jid: item.jid, error: "not_ready" });
        continue;
      }

      try {
        await sendAndRemember(inst, item.jid, { text: item.text });
        job.sent += 1;
      } catch (err) {
        job.failed += 1;
        job.errors.push({ jid: item.jid, error: "send_failed" });
        logger.warn({ err, jid: item.jid }, "Bulk send failed");
      }

      await sleep(randomDelayMs(bulkMinDelayMs, bulkMaxDelayMs));

      if (job.sent + job.failed >= job.total) {
        job.status = "done";
        job.finishedAt = new Date().toISOString();
      }
    }
  } finally {
    bulkWorkerRunning = false;
  }
}

async function ensureStarted(instanceId) {
  const inst = getOrCreateInstance(instanceId);
  if (inst.socket) return inst;
  if (inst.startPromise) {
    await inst.startPromise;
    return inst;
  }
  inst.startPromise = startWhatsApp(inst).finally(() => {
    inst.startPromise = null;
  });
  await inst.startPromise;
  return inst;
}

async function startWhatsApp(inst) {
  await fs.mkdir(inst.authDir, { recursive: true });
  await fs.mkdir(sentMessageStoreDir(inst.id), { recursive: true });
  void prunePersistedSentMessages(inst.id);
  await ensureInstanceMeta(inst);
  const { state, saveCreds } = await useMultiFileAuthState(inst.authDir);
  if (state?.creds?.me?.id) {
    inst.lastConnection = {
      ...(inst.lastConnection || {}),
      meJid: state.creds.me.id,
    };
  }
  const { version } = await fetchLatestBaileysVersion();

  inst.socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    version,
    // SocketConfig fields supported by the official Baileys runtime and exposed
    // in the Ruptur panel for Baileys instance creation.
    browser: socketBrowserFromMeta(inst.meta),
    markOnlineOnConnect: Boolean(inst.meta?.markOnlineOnConnect),
    syncFullHistory: inst.meta?.syncFullHistory !== false,
    getMessage: async (key) => getCachedMessage(inst, key),
  });

  inst.socket.ev.on("creds.update", saveCreds);

  inst.socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    const next = { ...(inst.lastConnection || {}) };
    if (typeof connection === "string") next.connection = connection;
    if (lastDisconnect !== undefined) next.lastDisconnect = lastDisconnect;
    if (inst.socket?.user?.id) next.meJid = inst.socket.user.id;
    if (qr) next.hasQr = true;
    else if (typeof connection === "string") next.hasQr = false;
    inst.lastConnection = next;

    if (qr) {
      inst.lastQr = qr;
      logger.info({ instance: inst.id }, "QR code recebido. Escaneie no WhatsApp do celular.");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      const shouldReconnect = !inst.resetting && !inst.deleting && !loggedOut;
      logger.warn({ instance: inst.id, code }, "Conexão fechada.");
      inst.socket = null;
      inst.lastQr = null;
      if (loggedOut) {
        // Mirrors the reconnect hardening seen in Evolution: when WA invalidates
        // the companion, drop stale local auth/key material before the next QR.
        void removeInstanceFiles(inst, { auth: true, sent: true });
      }
      if (shouldReconnect) ensureStarted(inst.id).catch((err) => logger.error({ err }, "Falha ao reconectar"));
    }

    if (connection === "open") {
      logger.info({ instance: inst.id }, "WhatsApp conectado (Baileys).");
    }
  });

  inst.socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const item of messages || []) {
      const remoteJid = item?.key?.remoteJid;
      if (!remoteJid) continue;
      // RUP-2026-010: avoid flooding backend with group/status traffic by default.
      if (!forwardGroupMessages && remoteJid.includes("@g.us")) continue;
      if (!forwardStatusMessages && remoteJid === "status@broadcast") continue;
      const senderRaw = item?.key?.participant || remoteJid;
      const fromMe = Boolean(item?.key?.fromMe);
      const meJid = inst?.socket?.user?.id || "";
      const chatCanonical = canonicalJid(remoteJid) || remoteJid;
      const senderCanonical = canonicalJid(senderRaw) || senderRaw;
      const payload = {
        event: "message",
        instance: inst.id,
        meJid,
        data: {
          messageid: item?.key?.id || crypto.randomUUID(),
          chatid: chatCanonical,
          wa_chatid: remoteJid,
          chatid_canonical: chatCanonical,
          sender: senderCanonical,
          wa_sender: senderRaw,
          sender_canonical: senderCanonical,
          meJid,
          senderName: item?.pushName || "",
          text: extractMessageText(item?.message || {}),
          fromMe,
        },
      };
      await forwardWebhook(payload);
    }
  });
}

async function bootstrapNamedInstancesOnStartup() {
  if (!bootNamedInstances) return;
  try {
    const entries = await fs.readdir(baseAuthDir, { withFileTypes: true });
    const instanceIds = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("inst-") && !entry.name.includes(".bak-"))
      .map((entry) => sanitizeInstanceId(entry.name))
      .filter((instanceId) => instanceId && instanceId !== "default");
    if (!instanceIds.length) return;
    logger.info({ instances: instanceIds }, "Bootstrapping named Baileys instances.");
    const results = await Promise.allSettled(instanceIds.map((instanceId) => ensureStarted(instanceId)));
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        logger.error({ err: result.reason, instance: instanceIds[index] }, "Falha ao iniciar instancia nomeada no boot.");
      }
    }
  } catch (err) {
    if (err?.code !== "ENOENT") {
      logger.error({ err }, "Falha ao listar diretorios de auth para boot das instancias nomeadas.");
    }
  }
}

const app = express();
app.use(express.json({ limit: "15mb" }));

app.get("/health", (_req, res) => {
  const summary = [...instances.values()].map((i) => ({
    instance: i.id,
    connection: i.lastConnection?.connection || "unknown",
    hasQr: Boolean(i.lastConnection?.hasQr),
    ...instanceIdentity(i),
  }));
  res.json({ ok: true, service: "ruptur-baileys", instances: summary });
});

// uazapi-ish endpoints (subset)
app.get("/instance/status", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  if (!(await instanceExists(instanceId))) {
    return res.status(404).json({ ok: false, error: "instance_not_found" });
  }
  const inst = getOrCreateInstance(instanceId);
  await ensureInstanceMeta(inst);
  if (!inst.socket && !inst.startPromise && shouldLazyStartInstance(instanceId)) {
    // Status for a known instance can resume the socket, but it must not create
    // a brand-new companion just because the UI inspected another provider row.
    ensureStarted(instanceId).catch((err) => logger.error({ err, instance: instanceId }, "Falha ao iniciar instance"));
  }

  const status =
    inst.lastConnection.connection === "open"
      ? "connected"
      : inst.lastConnection.hasQr
        ? "connecting"
        : inst.lastConnection.connection === "close"
          ? "disconnected"
          : "unknown";

  try {
    return res.json({
      ok: true,
      instance: {
        id: inst.id,
        status,
        ...instanceIdentity(inst),
        qrcode: inst.lastQr ? await (async () => {
          const png = await QRCode.toBuffer(inst.lastQr, { type: "png", margin: 1, scale: 8 });
          return `data:image/png;base64,${png.toString("base64")}`;
        })() : "",
      },
    });
  } catch (_err) {
    return res.json({ ok: true, instance: { id: inst.id, status, qrcode: "" } });
  }
});

app.post("/instance/connect", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  try {
    const inst = await ensureStarted(instanceId);
    // Pairing UX is much better when connect waits briefly for QR emission
    // instead of immediately returning "unknown" while the socket is still
    // negotiating the initial multi-device registration.
    await waitForQrOrOpen(inst, 5000);
  } catch (err) {
    logger.error({ err, instance: instanceId }, "Falha ao iniciar instance");
  }
  // In Baileys, "connect" is just: have a QR available when not logged-in.
  return app._router.handle({ ..._req, url: "/instance/status", method: "GET" }, res, () => {});
});

app.post("/instance", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  try {
    const inst = getOrCreateInstance(instanceId);
    await saveInstanceMeta(inst, _req.body || {});
    await createInstanceSession(instanceId);
    await waitForQrOrOpen(inst, 5000);
  } catch (err) {
    logger.error({ err, instance: instanceId }, "Falha ao criar instance");
    return res.status(502).json({ ok: false, error: "instance_create_failed" });
  }
  return app._router.handle({ ..._req, url: "/instance/status", method: "GET" }, res, () => {});
});

app.post("/instance/reset", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  const inst = getOrCreateInstance(instanceId);
  try {
    await resetInstanceSession(inst, { restart: true, logout: true });
  } catch (err) {
    logger.error({ err, instance: instanceId }, "Falha ao resetar instance");
    return res.status(502).json({ ok: false, error: "instance_reset_failed" });
  }
  return app._router.handle({ ..._req, url: "/instance/status", method: "GET" }, res, () => {});
});

app.delete("/instance", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  try {
    await deleteInstanceSession(instanceId, { logout: true });
  } catch (err) {
    logger.error({ err, instance: instanceId }, "Falha ao excluir instance");
    return res.status(502).json({ ok: false, error: "instance_delete_failed" });
  }
  return res.json({
    ok: true,
    instance: {
      id: sanitizeInstanceId(instanceId),
      status: "deleted",
      deleted: true,
    },
  });
});

app.post("/chat/details", async (req, res) => {
  const instanceId = getInstanceId(req);
  const number = String(req.body?.number || "").trim();
  const preview = Boolean(req.body?.preview);

  if (!number || /\s/.test(number)) return res.status(400).json({ ok: false, error: "number_invalid" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  try {
    const jid = await resolveJid(inst, number);
    if (!jid) return res.status(400).json({ ok: false, error: "number_invalid" });

    let image = "";
    try {
      image = await inst.socket.profilePictureUrl(jid, preview ? "preview" : "image");
    } catch {
      try {
        image = await inst.socket.profilePictureUrl(jid, "image");
      } catch {
        image = "";
      }
    }

    return res.json({
      ok: true,
      wa_chatid: jid,
      imagePreview: preview ? image : "",
      image: preview ? "" : image,
    });
  } catch (err) {
    logger.error({ err }, "Falha ao buscar detalhes do contato");
    return res.status(502).json({ ok: false, error: "chat_details_failed" });
  }
});

app.post("/send/presence", async (req, res) => {
  const instanceId = getInstanceId(req);
  const number = String(req.body?.number || "").trim();
  const presence = String(req.body?.presence || "").trim(); // composing | recording | paused
  const delay = clampInt(req.body?.delay, 0, 30000) ?? 10000;

  if (!number || /\s/.test(number)) return res.status(400).json({ ok: false, error: "number_invalid" });
  if (!presence) return res.status(400).json({ ok: false, error: "presence_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  const jid = await resolveJid(inst, number);
  if (!jid) return res.status(400).json({ ok: false, error: "number_invalid" });

  const allowed = new Set(["composing", "recording", "paused"]);
  if (!allowed.has(presence)) return res.status(400).json({ ok: false, error: "presence_invalid" });

  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < delay) {
      await inst.socket.sendPresenceUpdate(presence, jid);
      await sleep(10_000);
    }
    await inst.socket.sendPresenceUpdate("paused", jid);
    return res.json({ ok: true, response: "Chat presence sent successfully" });
  } catch (err) {
    logger.error({ err }, "Falha ao enviar presence");
    return res.status(502).json({ ok: false, error: "presence_failed" });
  }
});

app.get("/qr.png", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  if (!(await instanceExists(instanceId))) {
    return res.status(404).json({ ok: false, error: "instance_not_found" });
  }
  const inst = getOrCreateInstance(instanceId);
  await ensureInstanceMeta(inst);
  if (!inst.socket && !inst.startPromise && shouldLazyStartInstance(instanceId)) {
    ensureStarted(instanceId).catch((err) => logger.error({ err, instance: instanceId }, "Falha ao iniciar instance"));
  }
  if (!inst.lastQr) return res.status(404).json({ ok: false, error: "qr_not_available" });
  try {
    const png = await QRCode.toBuffer(inst.lastQr, { type: "png", margin: 1, scale: 8 });
    res.setHeader("content-type", "image/png");
    return res.status(200).send(png);
  } catch (_err) {
    return res.status(500).json({ ok: false, error: "qr_generate_failed" });
  }
});

app.post("/send/text", async (req, res) => {
  const instanceId = getInstanceId(req);
  const to = String(req.body?.to ?? req.body?.number ?? "").trim();
  const text = String(req.body?.text || "").trim();

  if (!to || /\s/.test(to)) return res.status(400).json({ ok: false, error: "to_invalid" });
  if (!text) return res.status(400).json({ ok: false, error: "text_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  try {
    const jid = await resolveJid(inst, to);
    if (!jid) return res.status(400).json({ ok: false, error: "to_invalid" });
    const gate = guardOutbound(inst.id, jid);
    if (!gate.ok) {
      logger.warn({ instance: inst.id, jid, count: gate.count, retryAfterMs: gate.retryAfterMs }, "Outbound guard bloqueou envio de texto.");
      return res.status(429).json({ ok: false, error: "rate_limited", retry_after_ms: gate.retryAfterMs });
    }
    const r = await withPresence(inst, jid, "composing", textPresenceMs, async () => sendAndRemember(inst, jid, { text }));
    return res.json({ ok: true, instance: inst.id, result: r });
  } catch (err) {
    logger.error({ err }, "Falha ao enviar mensagem");
    return res.status(502).json({ ok: false, error: "send_failed" });
  }
});

app.post("/send/bulk/text", async (req, res) => {
  const instanceId = getInstanceId(req);
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : null;
  const text = String(req.body?.text || "").trim();
  if (!numbers || !numbers.length) return res.status(400).json({ ok: false, error: "numbers_required" });
  if (!text) return res.status(400).json({ ok: false, error: "text_required" });

  const normalized = numbers
    .map((n) => String(n || "").trim())
    .filter((n) => n && !/\s/.test(n))
    .map((n) => normalizeRecipient(n))
    .filter(Boolean);

  if (!normalized.length) return res.status(400).json({ ok: false, error: "numbers_invalid" });

  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    id: jobId,
    status: "queued",
    total: normalized.length,
    sent: 0,
    failed: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    errors: [],
  });

  bulkQueue = bulkQueue.concat(normalized.map((jid) => ({ jobId, instanceId, jid, text })));
  runBulkWorker().catch((err) => logger.error({ err }, "Bulk worker crashed"));

  return res.json({
    ok: true,
    instance: instanceId,
    jobId,
    queued: normalized.length,
    delayMs: { min: bulkMinDelayMs, max: bulkMaxDelayMs },
  });
});

app.get("/jobs/:id", (req, res) => {
  const job = jobs.get(String(req.params.id || ""));
  if (!job) return res.status(404).json({ ok: false, error: "not_found" });
  return res.json({ ok: true, job });
});

app.post("/jobs/:id/cancel", (req, res) => {
  const job = jobs.get(String(req.params.id || ""));
  if (!job) return res.status(404).json({ ok: false, error: "not_found" });
  job.status = "canceled";
  job.finishedAt = new Date().toISOString();
  bulkQueue = bulkQueue.filter((i) => i.jobId !== job.id);
  return res.json({ ok: true, job });
});

app.post("/send/menu", async (req, res) => {
  const instanceId = getInstanceId(req);
  // Compatibility with uazapi `/send/menu` for:
  // - type=button: quick reply, url, call, copy
  // - type=list: sections/rows (single select)
  const number = String(req.body?.number || "").trim();
  const type = String(req.body?.type || "").trim();
  const text = String(req.body?.text || "").trim();
  const footerText = String(req.body?.footerText || "").trim();
  const listButton = String(req.body?.listButton || "").trim();
  const choicesRaw = Array.isArray(req.body?.choices) ? req.body.choices : [];

  if (!number || /\s/.test(number)) return res.status(400).json({ ok: false, error: "number_invalid" });
  if (!type) return res.status(400).json({ ok: false, error: "type_required" });
  if (!text) return res.status(400).json({ ok: false, error: "text_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });

  const jid = await resolveJid(inst, number);
  if (!jid) return res.status(400).json({ ok: false, error: "number_invalid" });

  const choiceStrings = choicesRaw.map((c) => String(c || "").trim()).filter(Boolean);
  if (!choiceStrings.length) return res.status(400).json({ ok: false, error: "choices_required" });

  try {
    if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

    if (type === "button") {
      const parsed = choiceStrings
        .map((c) => {
          const [labelRaw, rightRaw] = c.split("|", 2);
          const label = String(labelRaw || "").trim();
          const right = String(rightRaw || "").trim();
          if (!label) return null;

          if (!right) return { kind: "quick_reply", label, id: label };

          const lower = right.toLowerCase();
          if (lower.startsWith("url:")) {
            const url = right.slice(4).trim();
            if (!/^https?:\/\//i.test(url)) return null;
            return { kind: "cta_url", label, url };
          }
          if (/^https?:\/\//i.test(right)) return { kind: "cta_url", label, url: right };
          if (lower.startsWith("call:")) {
            const phone = right.slice(5).trim();
            if (!phone) return null;
            return { kind: "cta_call", label, phone };
          }
          if (lower.startsWith("copy:")) {
            const code = right.slice(5).trim();
            if (!code) return null;
            return { kind: "cta_copy", label, code };
          }
          return { kind: "quick_reply", label, id: right || label };
        })
        .filter(Boolean);

      if (!parsed.length) return res.status(400).json({ ok: false, error: "no_valid_buttons" });

      const firstUrl = parsed.find((p) => p.kind === "cta_url")?.url;
      const bodyText = firstUrl ? `${text}\n\n${firstUrl}` : text;

      const buttons = parsed.map((p, idx) => {
        if (p.kind === "cta_url") {
          return {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              id: `cta_${idx + 1}`,
              display_text: p.label,
              url: p.url,
              merchant_url: p.url,
              disabled: false,
            }),
          };
        }
        if (p.kind === "cta_call") {
          return {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              id: `call_${idx + 1}`,
              display_text: p.label,
              phone_number: p.phone,
              disabled: false,
            }),
          };
        }
        if (p.kind === "cta_copy") {
          return {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              id: `copy_${idx + 1}`,
              display_text: p.label,
              copy_code: p.code,
              disabled: false,
            }),
          };
        }
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: p.label,
            id: p.id,
            disabled: false,
          }),
        };
      });

      if (baileysHelper?.sendInteractiveMessage) {
        const interactiveMessage = {
          body: { text: bodyText },
          footer: footerText ? { text: footerText } : undefined,
          nativeFlowMessage: { buttons },
        };
        const r = await baileysHelper.sendInteractiveMessage(inst.socket, jid, { interactiveMessage });
        rememberSentMessage(inst, r);
        return res.json({
          ok: true,
          instance: inst.id,
          result: r,
          format: "nativeFlowMessage.buttons",
          transport: "baileys_helper.sendInteractiveMessage",
          note:
            firstUrl ? "URL included in the body as fallback for clients that don't render URL buttons." : undefined,
        });
      }

      const candidates = [
        proto.Message.fromObject({
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: { text: bodyText },
                footer: footerText ? { text: footerText } : undefined,
                nativeFlowMessage: { buttons },
              },
            },
          },
        }),
        proto.Message.fromObject({
          interactiveMessage: {
            body: { text: bodyText },
            footer: footerText ? { text: footerText } : undefined,
            nativeFlowMessage: { buttons },
          },
        }),
      ];

      let lastErr = null;
      for (const content of candidates) {
        try {
          const msg = generateWAMessageFromContent(jid, content, { userJid: inst.socket.user?.id });
          await relayAndRemember(inst, jid, msg, { messageId: msg.key.id });
          return res.json({
            ok: true,
            instance: inst.id,
            result: msg,
            format: "nativeFlowMessage.buttons",
            transport: "legacy.generateWAMessageFromContent",
            note: firstUrl ? "URL included in the body as fallback for clients that don't render URL buttons." : undefined,
          });
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr || new Error("nativeflow_send_failed");
    }

    if (type === "list") {
      if (!listButton) return res.status(400).json({ ok: false, error: "listButton_required" });

      const sections = [];
      let current = { title: "Opções", rows: [] };
      for (const c of choiceStrings) {
        const isSection = c.startsWith("[") && c.endsWith("]") && c.length >= 3;
        if (isSection) {
          if (current.rows.length) sections.push(current);
          current = { title: c.slice(1, -1).trim() || "Opções", rows: [] };
          continue;
        }
        const [titleRaw, idRaw, descRaw] = c.split("|", 3);
        const title = String(titleRaw || "").trim();
        const id = String(idRaw || "").trim() || title;
        const description = String(descRaw || "").trim();
        if (!title) continue;
        current.rows.push({ id, title, description: description || undefined });
      }
      if (current.rows.length) sections.push(current);
      if (!sections.length) return res.status(400).json({ ok: false, error: "no_valid_rows" });

      if (baileysHelper?.sendInteractiveMessage) {
        const buttons = [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: listButton,
              sections: sections.map((s) => ({
                title: s.title,
                rows: s.rows.map((r) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                })),
              })),
            }),
          },
        ];
        const interactiveMessage = {
          body: { text },
          footer: footerText ? { text: footerText } : undefined,
          nativeFlowMessage: { buttons },
        };
        const r = await baileysHelper.sendInteractiveMessage(inst.socket, jid, { interactiveMessage });
        rememberSentMessage(inst, r);
        return res.json({
          ok: true,
          instance: inst.id,
          result: r,
          format: "nativeFlowMessage.single_select",
          transport: "baileys_helper.sendInteractiveMessage",
        });
      }

      const r = await sendAndRemember(inst, jid, {
        text,
        footer: footerText || undefined,
        buttonText: listButton,
        sections: sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((row) => ({
            title: row.title,
            rowId: row.id,
            description: row.description,
          })),
        })),
      });
      return res.json({ ok: true, instance: inst.id, result: r, format: "listMessage" });
    }

    return res.status(400).json({ ok: false, error: "type_not_supported" });
  } catch (err) {
    logger.error({ err }, "Falha ao enviar menu (interactive)");
    const fallback = `${text}\n\n${choiceStrings.join("\n")}`;
    const r = await sendAndRemember(inst, jid, { text: fallback });
    return res.json({ ok: true, instance: inst.id, result: r, format: "fallback_text" });
  }
});

app.post("/send/media", async (req, res) => {
  const instanceId = getInstanceId(req);
  const to = String(req.body?.to ?? req.body?.number ?? "").trim();
  const type = String(req.body?.type || "").trim(); // image | video | document | audio
  const file = req.body?.url ?? req.body?.file;
  const text = String(req.body?.text ?? req.body?.caption ?? "").trim();
  const fileName = String(req.body?.docName ?? req.body?.fileName ?? "").trim();
  const mimetype = String(req.body?.mimetype ?? "").trim();

  if (!to || /\s/.test(to)) return res.status(400).json({ ok: false, error: "to_invalid" });
  if (!type) return res.status(400).json({ ok: false, error: "type_required" });
  const decoded = decodeMaybeBase64File(file);
  if (!decoded) return res.status(400).json({ ok: false, error: "file_invalid" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  const jid = await resolveJid(inst, to);
  if (!jid) return res.status(400).json({ ok: false, error: "to_invalid" });

  try {
    const gate = guardOutbound(inst.id, jid);
    if (!gate.ok) {
      logger.warn({ instance: inst.id, jid, count: gate.count, retryAfterMs: gate.retryAfterMs }, "Outbound guard bloqueou envio de midia.");
      return res.status(429).json({ ok: false, error: "rate_limited", retry_after_ms: gate.retryAfterMs });
    }
    let content;
    const media =
      decoded.kind === "url"
        ? { url: decoded.value }
        : decoded.kind === "buffer"
          ? decoded.value
          : undefined;

    const mt = mimetype || decoded.mimetype;

    if (type === "image") content = { image: media, caption: text || undefined };
    else if (type === "video") content = { video: media, caption: text || undefined };
    else if (type === "audio") content = { audio: media, mimetype: mt || "audio/mpeg" };
    else if (type === "ptt") content = { audio: media, mimetype: mt || "audio/ogg; codecs=opus", ptt: true };
    else if (type === "document")
      content = {
        document: media,
        fileName: fileName || "arquivo",
        caption: text || undefined,
        mimetype: mt || undefined,
      };
    else return res.status(400).json({ ok: false, error: "type_invalid" });

    const presence = type === "audio" || type === "ptt" ? "recording" : "composing";
    const delay = type === "audio" || type === "ptt" ? audioPresenceMs : textPresenceMs;
    const r = await withPresence(inst, jid, presence, delay, async () => sendAndRemember(inst, jid, content));
    return res.json({ ok: true, instance: inst.id, result: r });
  } catch (err) {
    logger.error({ err }, "Falha ao enviar mídia");
    return res.status(502).json({ ok: false, error: "send_failed" });
  }
});

app.post("/send/button-url", async (req, res) => {
  const instanceId = getInstanceId(req);
  const to = String(req.body?.to || "").trim();
  const text = String(req.body?.text || "").trim();
  const buttonText = String(req.body?.buttonText || "").trim();
  const url = String(req.body?.url || "").trim();
  const footerText = String(req.body?.footerText || "").trim();

  if (!to || /\s/.test(to)) return res.status(400).json({ ok: false, error: "to_invalid" });
  if (!text) return res.status(400).json({ ok: false, error: "text_required" });
  if (!buttonText) return res.status(400).json({ ok: false, error: "buttonText_required" });
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: "url_invalid" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  const jid = await resolveJid(inst, to);
  if (!jid) return res.status(400).json({ ok: false, error: "to_invalid" });

  try {
    // Prefer Native Flow CTA URL (more reliable rendering with helper).
    if (baileysHelper?.sendInteractiveMessage) {
      const bodyText = `${text}\n\n${url}`;
      const interactiveMessage = {
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                id: "cta_1",
                display_text: buttonText,
                url,
                merchant_url: url,
                disabled: false,
              }),
            },
          ],
        },
      };

      const r = await baileysHelper.sendInteractiveMessage(inst.socket, jid, { interactiveMessage });
      rememberSentMessage(inst, r);
      return res.json({
        ok: true,
        instance: inst.id,
        result: r,
        format: "nativeFlowMessage.cta_url",
        transport: "baileys_helper.sendInteractiveMessage",
        note: "If the client still doesn't render a button, the URL is included in the message body as fallback.",
      });
    }

    // Prefer "hydrated template" URL button.
    const r = await sendAndRemember(inst, jid, {
      templateMessage: {
        hydratedTemplate: {
          hydratedContentText: `${text}\n\n${url}`,
          hydratedFooterText: footerText || undefined,
          hydratedButtons: [{ urlButton: { displayText: buttonText, url } }],
        },
      },
    });

    const messageType = Object.keys(r?.message || {})[0] || "unknown";
    return res.json({
      ok: true,
      instance: inst.id,
      result: r,
      format: "templateMessage.hydratedTemplate.urlButton",
      messageType,
      note:
        messageType === "extendedTextMessage"
          ? "Sent as text-only (client/server may not support URL buttons via Baileys)."
          : undefined,
    });
  } catch (err1) {
    logger.warn({ err: err1 }, "Falha ao enviar URL button via hydratedTemplate, tentando templateButtons");
    try {
      const r = await sendAndRemember(inst, jid, {
        text: `${text}\n\n${url}`,
        footer: footerText || undefined,
        templateButtons: [{ index: 1, urlButton: { displayText: buttonText, url } }],
      });
      const messageType = Object.keys(r?.message || {})[0] || "unknown";
      return res.json({
        ok: true,
        instance: inst.id,
        result: r,
        format: "templateButtons.urlButton",
        messageType,
      });
    } catch (err2) {
      logger.error({ err: err2 }, "Falha ao enviar botão de URL");
      return res.status(502).json({ ok: false, error: "send_failed" });
    }
  }
});

app.post("/status/text", async (req, res) => {
  const instanceId = getInstanceId(req);
  const text = String(req.body?.text || "").trim();
  const audienceRaw = Array.isArray(req.body?.audience) ? req.body.audience : null;
  const audience = audienceRaw
    ? audienceRaw.map((v) => String(v).trim()).filter((v) => v && !/\s/.test(v))
    : [];

  if (!text) return res.status(400).json({ ok: false, error: "text_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  try {
    const statusJidList = audience.length
      ? audience.map((v) => (v.includes("@") ? v : `${v}@s.whatsapp.net`))
      : undefined;

    const r = await sendAndRemember(
      inst,
      "status@broadcast",
      { text },
      statusJidList ? { statusJidList } : undefined,
    );

    return res.json({ ok: true, instance: inst.id, result: r, statusJidList: statusJidList || "default" });
  } catch (err) {
    logger.error({ err }, "Falha ao publicar status (texto)");
    return res.status(502).json({ ok: false, error: "status_failed" });
  }
});

app.post("/send/status", async (req, res) => {
  const instanceId = getInstanceId(req);
  // Partial compatibility with uazapi `/send/status` (text + image).
  const type = String(req.body?.type || "").trim();
  const text = String(req.body?.text || "").trim();
  const file = req.body?.file;

  if (!type) return res.status(400).json({ ok: false, error: "type_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  try {
    if (type === "text") {
      const r = await sendAndRemember(inst, "status@broadcast", { text });
      return res.json({ ok: true, instance: inst.id, result: r });
    }
    if (type === "image") {
      const decoded = decodeMaybeBase64File(file);
      if (!decoded) return res.status(400).json({ ok: false, error: "file_invalid" });
      const media = decoded.kind === "url" ? { url: decoded.value } : decoded.value;
      const r = await sendAndRemember(inst, "status@broadcast", { image: media, caption: text || undefined });
      return res.json({ ok: true, instance: inst.id, result: r });
    }
    return res.status(400).json({ ok: false, error: "type_not_supported" });
  } catch (err) {
    logger.error({ err }, "Falha ao publicar status");
    return res.status(502).json({ ok: false, error: "status_failed" });
  }
});

app.post("/chat/check", async (req, res) => {
  const instanceId = getInstanceId(req);
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });
  const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : null;
  if (!numbers) return res.status(400).json({ ok: false, error: "numbers_required" });

  const out = [];
  for (const raw of numbers) {
    const query = String(raw || "").trim();
    if (!query) continue;
    if (query.includes("@g.us")) {
      out.push({ query, jid: query, isInWhatsapp: true, groupName: "" });
      continue;
    }
    try {
      let item = null;
      for (const candidate of brVariants(query.replace(/^\+/, ""))) {
        if (!candidate) continue;
        const r = await inst.socket.onWhatsApp(candidate);
        item = Array.isArray(r) && r.length ? r[0] : null;
        if (item?.exists) break;
      }
      out.push({
        query,
        jid: item?.jid || "",
        isInWhatsapp: Boolean(item?.exists),
        verifiedName: "",
      });
    } catch (_err) {
      out.push({ query, jid: "", isInWhatsapp: false, verifiedName: "" });
    }
  }
  return res.json(out);
});

app.post("/ai/transcribe", async (req, res) => {
  const whisperBaseUrl = String(process.env.WHISPER_BASE_URL || "").trim();
  const file = req.body?.file ?? req.body?.url;
  const decoded = decodeMaybeBase64File(file);
  if (!decoded) return res.status(400).json({ ok: false, error: "file_invalid" });

  // Prefer local Whisper (no OpenAI cost)
  if (whisperBaseUrl) {
    try {
      if (decoded.kind === "url") {
        const r = await fetch(`${whisperBaseUrl.replace(/\/+$/, "")}/transcribe/url`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: decoded.value }),
        });
        const body = await r.text();
        if (!r.ok) return res.status(502).json({ ok: false, error: "whisper_error", detail: body.slice(0, 2000) });
        const data = JSON.parse(body);
        return res.json({ ok: true, text: data.text || "", raw: data, provider: "whisper_local" });
      }

      const mime = decoded.mimetype || "audio/ogg";
      const form = new FormData();
      form.append("model", "whisper"); // ignored by our server (compat)
      form.append("file", new Blob([decoded.value], { type: mime }), "audio");

      const r = await fetch(`${whisperBaseUrl.replace(/\/+$/, "")}/v1/audio/transcriptions`, {
        method: "POST",
        body: form,
      });
      const body = await r.text();
      if (!r.ok) return res.status(502).json({ ok: false, error: "whisper_error", detail: body.slice(0, 2000) });
      const data = JSON.parse(body);
      return res.json({ ok: true, text: data.text || "", raw: data, provider: "whisper_local" });
    } catch (err) {
      logger.error({ err }, "Falha ao transcrever via whisper local");
      return res.status(502).json({ ok: false, error: "whisper_failed" });
    }
  }

  // Fallback: OpenAI
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = String(process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe").trim();
  if (!apiKey) return res.status(400).json({ ok: false, error: "openai_not_configured" });

  try {
    let buf;
    let mime = decoded.mimetype || "audio/ogg";
    if (decoded.kind === "buffer") buf = decoded.value;
    else {
      const r = await fetch(decoded.value);
      if (!r.ok) return res.status(502).json({ ok: false, error: "download_failed" });
      const ab = await r.arrayBuffer();
      buf = Buffer.from(ab);
      mime = r.headers.get("content-type") || mime;
    }

    const form = new FormData();
    form.append("model", model);
    form.append("file", new Blob([buf], { type: mime }), "audio");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const text = await resp.text();
    if (!resp.ok) return res.status(502).json({ ok: false, error: "openai_error", detail: text.slice(0, 2000) });
    const data = JSON.parse(text);
    return res.json({ ok: true, text: data.text || "", raw: data, provider: "openai" });
  } catch (err) {
    logger.error({ err }, "Falha ao transcrever via OpenAI");
    return res.status(502).json({ ok: false, error: "openai_failed" });
  }
});

if (eagerStartDefaultInstance) {
  ensureStarted("default").catch((err) => {
    logger.error({ err }, "Falha ao iniciar Baileys (default instance)");
    process.exitCode = 1;
  });
}

bootstrapNamedInstancesOnStartup().catch((err) => {
  logger.error({ err }, "Falha ao bootstrapar instancias nomeadas do Baileys.");
});

app.listen(port, () => logger.info({ port }, "HTTP server pronto"));
