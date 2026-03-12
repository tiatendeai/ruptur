import express from "express";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import pino from "pino";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  proto,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const baseAuthDir = process.env.BAILEYS_AUTH_DIR || "/data/auth";
const logLevel = process.env.BAILEYS_LOG_LEVEL || "info";

const bulkMinDelayMs = Number.parseInt(process.env.BAILEYS_BULK_MIN_DELAY_MS || "1200", 10);
const bulkMaxDelayMs = Number.parseInt(process.env.BAILEYS_BULK_MAX_DELAY_MS || "3500", 10);

const logger = pino({ level: logLevel });

const instances = new Map(); // instanceId -> {id, authDir, socket, lastConnection, lastQr, startPromise}

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
  };
  instances.set(id, inst);
  return inst;
}

function normalizeRecipient(value) {
  const v = String(value || "").trim();
  if (!v || /\s/.test(v)) return null;
  if (v.includes("@")) return v;
  return `${v}@s.whatsapp.net`;
}

function brVariants(number) {
  const digits = String(number || "").replace(/[^\d]/g, "");
  if (!digits.startsWith("55")) return [digits];
  // 55 + DDD(2) + subscriber
  if (digits.length === 12) {
    // missing 9 (likely mobile): 55 DD XXXXXXXX -> 55 DD 9XXXXXXXX
    return [digits, `${digits.slice(0, 4)}9${digits.slice(4)}`];
  }
  if (digits.length === 13 && digits[4] === "9") {
    // has 9: 55 DD 9XXXXXXXX -> 55 DD XXXXXXXX
    return [digits, `${digits.slice(0, 4)}${digits.slice(5)}`];
  }
  return [digits];
}

async function resolveJid(inst, raw) {
  const v = String(raw || "").trim();
  if (!v || /\s/.test(v)) return null;
  if (v.includes("@")) return v;
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

function decodeMaybeBase64File(file) {
  const f = String(file || "").trim();
  if (!f) return null;
  if (/^https?:\/\//i.test(f)) return { kind: "url", value: f };
  const m = f.match(/^data:([^;]+);base64,(.*)$/i);
  if (m) return { kind: "buffer", value: Buffer.from(m[2], "base64"), mimetype: m[1] };
  if (/^[a-z0-9+/=\r\n]+$/i.test(f) && f.length > 64) return { kind: "buffer", value: Buffer.from(f, "base64") };
  return null;
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

async function waitForOpen(inst, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (inst.lastConnection?.connection === "open") return true;
    await sleep(250);
  }
  return inst.lastConnection?.connection === "open";
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
        await inst.socket.sendMessage(item.jid, { text: item.text });
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
  const { state, saveCreds } = await useMultiFileAuthState(inst.authDir);
  const { version } = await fetchLatestBaileysVersion();

  inst.socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger,
    version,
  });

  inst.socket.ev.on("creds.update", saveCreds);

  inst.socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    const next = { ...(inst.lastConnection || {}) };
    if (typeof connection === "string") next.connection = connection;
    if (lastDisconnect !== undefined) next.lastDisconnect = lastDisconnect;
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
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ instance: inst.id, code }, "Conexão fechada.");
      inst.socket = null;
      inst.lastQr = null;
      if (shouldReconnect) ensureStarted(inst.id).catch((err) => logger.error({ err }, "Falha ao reconectar"));
    }

    if (connection === "open") {
      logger.info({ instance: inst.id }, "WhatsApp conectado (Baileys).");
    }
  });
}

const app = express();
app.use(express.json({ limit: "15mb" }));

app.get("/health", (_req, res) => {
  const summary = [...instances.values()].map((i) => ({
    instance: i.id,
    connection: i.lastConnection?.connection || "unknown",
    hasQr: Boolean(i.lastConnection?.hasQr),
  }));
  res.json({ ok: true, service: "ruptur-baileys", instances: summary });
});

// uazapi-ish endpoints (subset)
app.get("/instance/status", async (_req, res) => {
  const instanceId = getInstanceId(_req);
  const inst = getOrCreateInstance(instanceId);
  if (!inst.socket && !inst.startPromise) {
    // Lazy start so users can retrieve QR for new instances.
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
    await ensureStarted(instanceId);
  } catch (err) {
    logger.error({ err, instance: instanceId }, "Falha ao iniciar instance");
  }
  // In Baileys, "connect" is just: have a QR available when not logged-in.
  return app._router.handle({ ..._req, url: "/instance/status", method: "GET" }, res, () => {});
});

app.post("/send/presence", async (req, res) => {
  const instanceId = getInstanceId(req);
  const number = String(req.body?.number || "").trim();
  const presence = String(req.body?.presence || "").trim(); // composing | recording | paused
  const delay = clampInt(req.body?.delay, 0, 300000) ?? 30000;

  if (!number || /\s/.test(number)) return res.status(400).json({ ok: false, error: "number_invalid" });
  if (!presence) return res.status(400).json({ ok: false, error: "presence_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });
  if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

  const jid = normalizeRecipient(number);
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
  const inst = getOrCreateInstance(instanceId);
  if (!inst.socket && !inst.startPromise) {
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
    const r = await inst.socket.sendMessage(jid, { text });
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
  // Minimal compatibility with uazapi `/send/menu` (type=button).
  const number = String(req.body?.number || "").trim();
  const type = String(req.body?.type || "").trim();
  const text = String(req.body?.text || "").trim();
  const footerText = String(req.body?.footerText || "").trim();
  const choicesRaw = Array.isArray(req.body?.choices) ? req.body.choices : [];

  if (!number || /\s/.test(number)) return res.status(400).json({ ok: false, error: "number_invalid" });
  if (!type) return res.status(400).json({ ok: false, error: "type_required" });
  if (!text) return res.status(400).json({ ok: false, error: "text_required" });
  const inst = await ensureStarted(instanceId);
  if (!inst.socket) return res.status(503).json({ ok: false, error: "not_ready" });

  const jid = await resolveJid(inst, number);
  if (!jid) return res.status(400).json({ ok: false, error: "number_invalid" });

  if (type !== "button") return res.status(400).json({ ok: false, error: "type_not_supported" });

  // Expect choices like: "Label|https://..." or "Label|url:https://..."
  const parsedChoices = choicesRaw
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .map((c) => {
      const [label, right] = c.split("|", 2).map((s) => (s || "").trim());
      let url = right || "";
      if (url.toLowerCase().startsWith("url:")) url = url.slice(4).trim();
      if (!label || !/^https?:\/\//i.test(url)) return null;
      return { label, url };
    })
    .filter(Boolean);

  if (!parsedChoices.length) return res.status(400).json({ ok: false, error: "no_valid_buttons" });

  const buttons = parsedChoices.map((c, idx) => ({
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      id: `cta_${idx + 1}`,
      display_text: c.label,
      url: c.url,
      disabled: false,
    }),
  }));

  const fallbackUrl = parsedChoices[0]?.url;
  const bodyText = fallbackUrl ? `${text}\n\n${fallbackUrl}` : text;

  try {
    if (!(await waitForOpen(inst))) return res.status(503).json({ ok: false, error: "not_connected" });

    // Preferred path: baileys_helper (adds required nodes for better button rendering).
    if (baileysHelper?.sendInteractiveMessage) {
      const interactiveMessage = {
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        nativeFlowMessage: { buttons },
      };
      const r = await baileysHelper.sendInteractiveMessage(inst.socket, jid, { interactiveMessage });
      return res.json({
        ok: true,
        instance: inst.id,
        result: r,
        format: "nativeFlowMessage.cta_url",
        transport: "baileys_helper.sendInteractiveMessage",
        note: "If the client still doesn't render a button, the URL is included in the message body as fallback.",
      });
    }

    // Fallback: NativeFlowMessage manual (legacy).
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
        await inst.socket.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return res.json({
          ok: true,
          instance: inst.id,
          result: msg,
          format: "nativeFlowMessage.cta_url",
          transport: "legacy.generateWAMessageFromContent",
          note: "If the client still doesn't render a button, the URL is included in the message body as fallback.",
        });
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error("nativeflow_send_failed");
  } catch (err) {
    logger.error({ err }, "Falha ao enviar menu/button (nativeFlow)");
    // Fallback: send as plain text with URLs
    const fallback = `${bodyText}\n\n${choicesRaw.map((c) => String(c)).join("\n")}`;
    const r = await inst.socket.sendMessage(jid, { text: fallback });
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

    const r = await inst.socket.sendMessage(jid, content);
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
    // Prefer "hydrated template" URL button.
    const r = await inst.socket.sendMessage(jid, {
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
      const r = await inst.socket.sendMessage(jid, {
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

    const r = await inst.socket.sendMessage(
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
      const r = await inst.socket.sendMessage("status@broadcast", { text });
      return res.json({ ok: true, instance: inst.id, result: r });
    }
    if (type === "image") {
      const decoded = decodeMaybeBase64File(file);
      if (!decoded) return res.status(400).json({ ok: false, error: "file_invalid" });
      const media = decoded.kind === "url" ? { url: decoded.value } : decoded.value;
      const r = await inst.socket.sendMessage("status@broadcast", { image: media, caption: text || undefined });
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
      const v = query.replace(/^\+/, "");
      const r = await inst.socket.onWhatsApp(v);
      const item = Array.isArray(r) && r.length ? r[0] : null;
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

ensureStarted("default").catch((err) => {
  logger.error({ err }, "Falha ao iniciar Baileys (default instance)");
  process.exitCode = 1;
});

app.listen(port, () => logger.info({ port }, "HTTP server pronto"));
