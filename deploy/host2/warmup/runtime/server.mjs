import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const HOST = process.env.WARMUP_RUNTIME_HOST || "0.0.0.0";
const PORT = Number(process.env.WARMUP_RUNTIME_PORT || process.env.PORT || 8787);
const TICK_INTERVAL_MS = Number(process.env.WARMUP_TICK_INTERVAL_MS || 60_000);
const DATA_DIR = path.resolve(process.cwd(), "runtime-data");
const STATE_FILE = path.join(DATA_DIR, "warmup-state.json");
const DIST_DIR = path.resolve(process.cwd(), "dist");
const WARMUP_TRACK_SOURCE = "warmup_manager";
const DEFAULT_WARMUP_24X7_ID = "warmup-default-24x7";
const ACTIVITY_WINDOW_VERSION = 1;
const MAX_QUEUE_EXECUTIONS_PER_TICK = 6;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

let state = await loadState();
let tickTimer = null;
let tickInFlight = null;

function getDefaultSettings() {
  return {
    serverUrl: "https://tiatendeai.uazapi.com",
    adminToken: "",
    defaultDelay: 3000,
    warmupMinIntervalMs: 15 * 60 * 1000,
    warmupMaxDailyPerInstance: 12,
    warmupCooldownRounds: 1,
    warmupReadChat: false,
    warmupReadMessages: false,
    warmupAsync: true,
  };
}

function createEmptyPoolState() {
  return {
    persistent: {
      updatedAt: new Date(0).toISOString(),
      healthyTokens: [],
      readyTokens: [],
    },
    currentRound: undefined,
  };
}

function createDefaultState() {
  return {
    config: {
      settings: getDefaultSettings(),
      routines: [],
      messages: [],
    },
    scheduler: {
      enabled: false,
      status: "paused",
      round: 0,
      lastTickAt: undefined,
      lastStartedAt: undefined,
      lastPausedAt: undefined,
      lastError: undefined,
    },
    summary: {
      totalInstances: 0,
      connected: 0,
      eligible: 0,
      heatingNow: 0,
      queuedEntries: 0,
      persistentPoolSize: 0,
      subpoolCount: 0,
      sentToday: 0,
      recentErrors: 0,
      activeRoutines: 0,
    },
    currentPool: createEmptyPoolState(),
    instanceStates: {},
    logs: [],
    lastSyncedAt: undefined,
    activityWindowVersion: ACTIVITY_WINDOW_VERSION,
    activityWindowResetAt: undefined,
  };
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isProtectedRoutine(routine) {
  return String(routine?.id ?? "") === DEFAULT_WARMUP_24X7_ID;
}

function getNextLocalDayStart(now) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

function buildNextEligibleAt({
  now,
  lastSentAt,
  minIntervalMs,
  cooldownRounds = 0,
  dailyLimitReached = false,
}) {
  const candidates = [];

  if (lastSentAt) {
    const lastSentDate = new Date(lastSentAt);
    if (!Number.isNaN(lastSentDate.getTime())) {
      candidates.push(lastSentDate.getTime() + minIntervalMs);
    }
  }

  if (cooldownRounds > 0) {
    candidates.push(now.getTime() + cooldownRounds * TICK_INTERVAL_MS);
  }

  if (dailyLimitReached) {
    candidates.push(getNextLocalDayStart(now).getTime());
  }

  if (!candidates.length) {
    return undefined;
  }

  return new Date(Math.max(...candidates)).toISOString();
}

function rebaseActivityWindow(nextState, now = new Date()) {
  const nowIso = now.toISOString();

  for (const instanceState of Object.values(nextState.instanceStates ?? {})) {
    instanceState.sentToday = 0;
    instanceState.lastSentAt = nowIso;
    instanceState.nextEligibleAt = new Date(
      now.getTime() + nextState.config.settings.warmupMinIntervalMs,
    ).toISOString();
    instanceState.cooldownRounds = 0;
    instanceState.lastRoundParticipated = undefined;
    instanceState.eligibleNow = false;
    instanceState.warmingNow = false;
    instanceState.eligibilityReason = "Janela temporal reiniciada";
    instanceState.updatedAt = nowIso;
    instanceState.heatScore = 0;
    instanceState.heatStage = "blocked";
  }

  nextState.summary.heatingNow = 0;
  nextState.summary.queuedEntries = 0;
  nextState.summary.subpoolCount = 0;
  nextState.currentPool.currentRound = undefined;
  nextState.activityWindowVersion = ACTIVITY_WINDOW_VERSION;
  nextState.activityWindowResetAt = nowIso;
}

async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const nextState = {
      ...createDefaultState(),
      ...parsed,
      config: {
        ...createDefaultState().config,
        ...(parsed.config ?? {}),
        settings: {
          ...getDefaultSettings(),
          ...(parsed.config?.settings ?? {}),
        },
      },
      scheduler: {
        ...createDefaultState().scheduler,
        ...(parsed.scheduler ?? {}),
      },
      summary: {
        ...createDefaultState().summary,
        ...(parsed.summary ?? {}),
      },
      currentPool: {
        ...createEmptyPoolState(),
        ...(parsed.currentPool ?? {}),
        persistent: {
          ...createEmptyPoolState().persistent,
          ...(parsed.currentPool?.persistent ?? {}),
        },
      },
      instanceStates: parsed.instanceStates ?? {},
      logs: parsed.logs ?? [],
      activityWindowVersion: parsed.activityWindowVersion ?? 0,
      activityWindowResetAt: parsed.activityWindowResetAt,
    };

    if (!nextState.scheduler.enabled) {
      nextState.summary.heatingNow = 0;
      nextState.summary.queuedEntries = 0;
      nextState.summary.subpoolCount = 0;
      nextState.currentPool.currentRound = undefined;
      for (const instanceState of Object.values(nextState.instanceStates)) {
        instanceState.warmingNow = false;
      }
    }

    if ((parsed.activityWindowVersion ?? 0) < ACTIVITY_WINDOW_VERSION) {
      rebaseActivityWindow(nextState, new Date());
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STATE_FILE, JSON.stringify(nextState, null, 2));
    }

    return nextState;
  } catch {
    return createDefaultState();
  }
}

async function saveState() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

function createResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function addRuntimeLog(entry) {
  state.logs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  state.logs = state.logs.slice(0, 500);
}

function extractResolvedNumber(status, instance) {
  const jidUser = status?.status?.jid?.user?.replace(/\D/g, "");
  if (jidUser) return jidUser;

  const owner = instance?.owner?.replace(/\D/g, "");
  if (owner) return owner;

  return undefined;
}

function createDefaultInstanceState(instanceToken, instanceName) {
  return {
    instanceToken,
    instanceName,
    sentToday: 0,
    nextEligibleAt: undefined,
    cooldownRounds: 0,
    eligibleNow: false,
    warmingNow: false,
    proxyStatus: "unknown",
    heatScore: 0,
    heatStage: "blocked",
    updatedAt: new Date(0).toISOString(),
  };
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function getCooldownRemaining(instanceState, round) {
  if (!instanceState.cooldownRounds || instanceState.lastRoundParticipated == null) {
    return 0;
  }

  const roundsSinceLastParticipation = Math.max(0, round - instanceState.lastRoundParticipated);
  return Math.max(0, instanceState.cooldownRounds - roundsSinceLastParticipation);
}

function normalizeInstanceState({ currentState, instance, round, now, resolvedNumber }) {
  const base = currentState ?? createDefaultInstanceState(instance.token, instance.name);
  const next = {
    ...base,
    instanceName: instance.name,
    warmingNow: false,
    resolvedNumber: resolvedNumber ?? base.resolvedNumber,
    updatedAt: now.toISOString(),
    nextEligibleAt: undefined,
    heatScore: base.heatScore ?? 0,
    heatStage: base.heatStage ?? "blocked",
  };

  if (next.lastSentAt) {
    const lastSentAt = new Date(next.lastSentAt);
    if (!isSameDay(lastSentAt, now)) {
      next.sentToday = 0;
    }
  }

  next.cooldownRounds = getCooldownRemaining(next, round);

  const minIntervalMet = !next.lastSentAt
    || now.getTime() - new Date(next.lastSentAt).getTime() >= state.config.settings.warmupMinIntervalMs;
  const dailyLimitMet = next.sentToday < state.config.settings.warmupMaxDailyPerInstance;

  if (instance.status !== "connected") {
    next.eligibleNow = false;
    next.eligibilityReason = "Instância desconectada";
    return next;
  }

  if (!next.resolvedNumber) {
    next.eligibleNow = false;
    next.eligibilityReason = "Número não resolvido";
    return next;
  }

  if (!minIntervalMet) {
    next.eligibleNow = false;
    next.nextEligibleAt = buildNextEligibleAt({
      now,
      lastSentAt: next.lastSentAt,
      minIntervalMs: state.config.settings.warmupMinIntervalMs,
    });
    next.eligibilityReason = next.nextEligibleAt
      ? `Aguardando intervalo mínimo até ${new Date(next.nextEligibleAt).toLocaleString("pt-BR")}`
      : "Aguardando intervalo mínimo";
    return next;
  }

  if (!dailyLimitMet) {
    next.eligibleNow = false;
    next.nextEligibleAt = buildNextEligibleAt({
      now,
      lastSentAt: next.lastSentAt,
      minIntervalMs: state.config.settings.warmupMinIntervalMs,
      dailyLimitReached: true,
    });
    next.eligibilityReason = next.nextEligibleAt
      ? `Limite diário atingido até ${new Date(next.nextEligibleAt).toLocaleString("pt-BR")}`
      : "Limite diário atingido";
    return next;
  }

  if (next.cooldownRounds > 0) {
    next.eligibleNow = false;
    next.nextEligibleAt = buildNextEligibleAt({
      now,
      lastSentAt: next.lastSentAt,
      minIntervalMs: state.config.settings.warmupMinIntervalMs,
      cooldownRounds: next.cooldownRounds,
    });
    next.eligibilityReason = next.nextEligibleAt
      ? `Em cooldown até ${new Date(next.nextEligibleAt).toLocaleString("pt-BR")}`
      : `Em cooldown por ${next.cooldownRounds} rodada(s)`;
    return next;
  }

  next.eligibleNow = true;
  next.eligibilityReason = "Elegível";
  return next;
}

function markInstanceSent(instanceState, round, now) {
  const nextEligibleAt = buildNextEligibleAt({
    now,
    lastSentAt: now.toISOString(),
    minIntervalMs: state.config.settings.warmupMinIntervalMs,
    cooldownRounds: state.config.settings.warmupCooldownRounds,
  });

  return {
    ...instanceState,
    sentToday: instanceState.sentToday + 1,
    lastSentAt: now.toISOString(),
    nextEligibleAt,
    cooldownRounds: state.config.settings.warmupCooldownRounds,
    lastRoundParticipated: round,
    eligibleNow: false,
    warmingNow: true,
    eligibilityReason: nextEligibleAt
      ? `Último disparo em ${now.toLocaleString("pt-BR")} · próximo ciclo após ${new Date(nextEligibleAt).toLocaleString("pt-BR")}`
      : `Mensagem enviada na rodada ${round}`,
    updatedAt: now.toISOString(),
  };
}

function clearWarmingFlags() {
  for (const instanceState of Object.values(state.instanceStates)) {
    instanceState.warmingNow = false;
  }
  state.summary.heatingNow = 0;
  state.summary.queuedEntries = 0;
  state.summary.subpoolCount = 0;
  state.currentPool.currentRound = undefined;
}

function createTrackId(routineId, round, senderToken, receiverToken) {
  return [
    "warmup",
    routineId,
    `r${round}`,
    senderToken.slice(0, 6),
    receiverToken.slice(0, 6),
    crypto.randomUUID().slice(0, 8),
  ].join("_");
}

function shuffle(values) {
  const clone = [...values];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[randomIndex]] = [clone[randomIndex], clone[index]];
  }
  return clone;
}

function normalizeActivityLabel(value, fallback = "Mensagem") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function pickRoutineMessage(routine, options = {}) {
  const { allowGroup = false } = options;
  let routineMessages = state.config.messages.filter((message) => routine.messages.includes(message.id));

  if (allowGroup) {
    const groupMessages = routineMessages.filter((message) => String(message.category ?? "").trim().toLowerCase() === "grupo");
    if (groupMessages.length) {
      routineMessages = groupMessages;
    }
  } else {
    const directMessages = routineMessages.filter((message) => String(message.category ?? "").trim().toLowerCase() !== "grupo");
    if (directMessages.length) {
      routineMessages = directMessages;
    }
  }

  if (!routineMessages.length) {
    return undefined;
  }

  return routineMessages[Math.floor(Math.random() * routineMessages.length)];
}

function buildDefaultRoutine(instances) {
  const allTokens = Array.from(new Set(instances.map((instance) => instance.token)));

  if (allTokens.length < 2) {
    return null;
  }

  const directMessageIds = state.config.messages
    .filter((message) => String(message.category ?? "").trim().toLowerCase() !== "grupo")
    .map((message) => message.id);
  const fallbackMessageIds = state.config.messages.map((message) => message.id);
  const selectedMessages = directMessageIds.length ? directMessageIds : fallbackMessageIds;

  if (!selectedMessages.length) {
    return null;
  }

  return {
    id: DEFAULT_WARMUP_24X7_ID,
    name: "Warmup 24/7 Padrão",
    mode: "one-to-one",
    senderInstances: allTokens,
    receiverInstances: allTokens,
    messages: selectedMessages,
    delayMin: 8,
    delayMax: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
    totalSent: 0,
  };
}

function refreshProtectedRoutines(instances) {
  const allTokens = Array.from(new Set(instances.map((instance) => instance.token)));

  for (const routine of state.config.routines) {
    if (!isProtectedRoutine(routine)) {
      continue;
    }

    routine.senderInstances = allTokens;
    routine.receiverInstances = allTokens;
  }
}

function ensureDefaultRoutine(instances) {
  refreshProtectedRoutines(instances);

  if (state.config.routines.length > 0) {
    return;
  }

  const defaultRoutine = buildDefaultRoutine(instances);
  if (!defaultRoutine) {
    return;
  }

  state.config.routines = [defaultRoutine];
  state.summary.activeRoutines = 1;
  addRuntimeLog({
    type: "warmup",
    instanceName: "runtime",
    message: "Rotina padrão 24/7 criada automaticamente",
    status: "info",
    routineId: defaultRoutine.id,
    routineName: defaultRoutine.name,
    mode: defaultRoutine.mode,
  });
}

function getRandomDelayMs(routine) {
  const min = Math.max(0, Number(routine.delayMin ?? 0));
  const max = Math.max(min, Number(routine.delayMax ?? min));
  return Math.round((Math.random() * (max - min) + min) * 1000);
}

async function fetchJson(url, init, fallbackMessage) {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `${fallbackMessage}: ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") {
        message = payload.error;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

async function fetchAllInstances() {
  return fetchJson(`${state.config.settings.serverUrl}/instance/all`, {
    headers: {
      admintoken: state.config.settings.adminToken,
    },
  }, "Erro ao buscar instâncias");
}

async function fetchInstanceStatus(token) {
  return fetchJson(`${state.config.settings.serverUrl}/instance/status`, {
    headers: {
      token,
    },
  }, "Erro ao buscar status da instância");
}

async function sendText(token, payload) {
  return fetchJson(`${state.config.settings.serverUrl}/send/text`, {
    method: "POST",
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, "Erro ao enviar warmup");
}

function buildPersistentPool(instances, tickStartedAt) {
  const healthyTokens = [];
  const readyTokens = [];

  for (const instance of instances) {
    const instanceState = state.instanceStates[instance.token];
    const isHealthy = instance.status === "connected" && Boolean(instanceState?.resolvedNumber);

    if (isHealthy) {
      healthyTokens.push(instance.token);
    }

    if (instanceState?.eligibleNow) {
      readyTokens.push(instance.token);
    }
  }

  return {
    updatedAt: tickStartedAt.toISOString(),
    healthyTokens,
    readyTokens,
  };
}

function buildDispatchPlan(routine) {
  const eligibleSenders = shuffle(routine.senderInstances).filter((token) => state.instanceStates[token]?.eligibleNow);

  if (routine.mode === "group") {
    const groupId = shuffle(routine.receiverInstances.filter((entry) => entry.endsWith("@g.us")))[0];
    const senderToken = eligibleSenders[0];
    return groupId && senderToken
      ? [{ senderToken, receiverToken: groupId, isGroup: true }]
      : [];
  }

  const directReceivers = shuffle(routine.receiverInstances.filter((entry) => !entry.endsWith("@g.us")))
    .filter((token) => state.instanceStates[token]?.resolvedNumber);
  const plan = [];

  if (routine.mode === "one-to-one") {
    const usedReceivers = new Set();

    for (const senderToken of eligibleSenders) {
      const receiverToken = directReceivers.find((token) => token !== senderToken && !usedReceivers.has(token))
        ?? directReceivers.find((token) => token !== senderToken);

      if (!receiverToken) {
        continue;
      }

      usedReceivers.add(receiverToken);
      plan.push({ senderToken, receiverToken });
    }

    return plan;
  }

  if (routine.mode === "one-to-all") {
    const senderToken = eligibleSenders[0];
    if (!senderToken) {
      return [];
    }

    for (const receiverToken of directReceivers.filter((token) => token !== senderToken).slice(0, 4)) {
      plan.push({ senderToken, receiverToken });
    }
    return plan;
  }

  if (routine.mode === "all-to-one") {
    const receiverToken = directReceivers[0];
    if (!receiverToken) {
      return [];
    }

    for (const senderToken of eligibleSenders.filter((token) => token !== receiverToken).slice(0, 4)) {
      plan.push({ senderToken, receiverToken });
    }
    return plan;
  }

  for (const senderToken of eligibleSenders) {
    for (const receiverToken of directReceivers.filter((token) => token !== senderToken).slice(0, 2)) {
      plan.push({ senderToken, receiverToken });
    }
  }

  return plan;
}

function createPoolEntry({ routine, dispatch, instancesByToken, round, tickStartedAt }) {
  const sender = instancesByToken.get(dispatch.senderToken);
  if (!sender) {
    return null;
  }

  const createdAt = tickStartedAt.toISOString();
  const delayMs = getRandomDelayMs(routine);
  const message = pickRoutineMessage(routine, {
    allowGroup: Boolean(dispatch.isGroup),
  });

  if (!message) {
    return null;
  }

  if (dispatch.isGroup) {
    return {
      id: crypto.randomUUID(),
      routineId: routine.id,
      routineName: routine.name,
      senderToken: dispatch.senderToken,
      senderName: sender.name,
      receiverToken: dispatch.receiverToken,
      receiverNumber: dispatch.receiverToken,
      activityKind: "group",
      activityLabel: normalizeActivityLabel(message.category, "Grupo"),
      messageId: message.id,
      messageText: message.text,
      messageCategory: normalizeActivityLabel(message.category, "Grupo"),
      delayMs,
      trackId: createTrackId(routine.id, round, dispatch.senderToken, dispatch.receiverToken),
      status: "queued",
      createdAt,
      updatedAt: createdAt,
    };
  }

  const receiver = instancesByToken.get(dispatch.receiverToken);
  const receiverState = state.instanceStates[dispatch.receiverToken];
  if (!receiver || !receiverState?.resolvedNumber) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    routineId: routine.id,
    routineName: routine.name,
    senderToken: dispatch.senderToken,
    senderName: sender.name,
    receiverToken: dispatch.receiverToken,
    receiverName: receiver.name,
    receiverNumber: receiverState.resolvedNumber,
    activityKind: "message",
    activityLabel: normalizeActivityLabel(message.category, "Mensagem"),
    messageId: message.id,
    messageText: message.text,
    messageCategory: normalizeActivityLabel(message.category, "Mensagem"),
    delayMs,
    trackId: createTrackId(routine.id, round, dispatch.senderToken, dispatch.receiverToken),
    status: "queued",
    createdAt,
    updatedAt: createdAt,
  };
}

function summarizeRoundSubpools(entries) {
  const buckets = new Map();

  for (const entry of entries) {
    const key = `${entry.activityKind}:${entry.activityLabel}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: entry.activityLabel,
        activityKind: entry.activityKind,
        queuedEntries: 0,
        processedEntries: 0,
        errorEntries: 0,
        senderTokens: new Set(),
      });
    }

    const bucket = buckets.get(key);
    bucket.senderTokens.add(entry.senderToken);

    if (entry.status === "queued") {
      bucket.queuedEntries += 1;
    } else if (entry.status === "error") {
      bucket.errorEntries += 1;
    } else {
      bucket.processedEntries += 1;
    }
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      senderTokens: Array.from(bucket.senderTokens),
    }))
    .sort((left, right) => right.queuedEntries - left.queuedEntries || right.senderTokens.length - left.senderTokens.length);
}

function deriveHeatStage(instanceState, queuedTokens) {
  if (queuedTokens.has(instanceState.instanceToken)) {
    return "queued";
  }

  if (instanceState.eligibleNow) {
    return "eligible";
  }

  const normalizedReason = String(instanceState.eligibilityReason ?? "").toLowerCase();
  if (
    normalizedReason.includes("intervalo mínimo")
    || normalizedReason.includes("cooldown")
    || normalizedReason.includes("limite diário")
  ) {
    return "waiting";
  }

  return "blocked";
}

function computeHeatScore(instanceState, stage) {
  const dailyLimit = Math.max(0, state.config.settings.warmupMaxDailyPerInstance);
  const dailyPercent = dailyLimit > 0
    ? Math.round((instanceState.sentToday / dailyLimit) * 100)
    : 0;
  const normalizedReason = String(instanceState.eligibilityReason ?? "").toLowerCase();

  if (normalizedReason.includes("limite diário")) {
    return 100;
  }

  const stageScores = {
    queued: 94,
    eligible: 82,
    waiting: 54,
    blocked: 20,
  };

  const stageScore = stageScores[stage] ?? 20;
  return Math.min(100, Math.max(stageScore, dailyPercent));
}

function refreshInstanceHeatProfiles(currentRoundPool) {
  const queuedTokens = new Set(currentRoundPool?.queuedSenders ?? []);

  for (const instanceState of Object.values(state.instanceStates)) {
    const stage = deriveHeatStage(instanceState, queuedTokens);
    instanceState.heatStage = stage;
    instanceState.heatScore = computeHeatScore(instanceState, stage);
  }
}

function buildCurrentRoundPool(routines, instancesByToken, round, tickStartedAt) {
  const entries = [];

  for (const routine of routines.filter((entry) => entry.isActive)) {
    const dispatchPlan = buildDispatchPlan(routine);

    if (!dispatchPlan.length) {
      addRuntimeLog({
        type: "warmup",
        instanceName: "runtime",
        message: `Rotina ${routine.name} sem pares elegíveis para o modo ${routine.mode}`,
        status: "info",
        routineId: routine.id,
        routineName: routine.name,
        mode: routine.mode,
      });
      continue;
    }

    for (const dispatch of dispatchPlan) {
      const entry = createPoolEntry({
        routine,
        dispatch,
        instancesByToken,
        round,
        tickStartedAt,
      });

      if (entry) {
        entries.push(entry);
      }
    }
  }

  if (!entries.length) {
    return undefined;
  }

  return {
    round,
    createdAt: tickStartedAt.toISOString(),
    queuedSenders: Array.from(new Set(entries.map((entry) => entry.senderToken))),
    queuedEntries: entries.length,
    subpools: summarizeRoundSubpools(entries),
    entries,
  };
}

async function executePoolEntry(entry, instancesByToken, round) {
  const sender = instancesByToken.get(entry.senderToken);
  const senderState = state.instanceStates[entry.senderToken];
  const now = new Date();

  if (!sender || !senderState?.eligibleNow) {
    entry.status = "skipped";
    entry.updatedAt = now.toISOString();
    return { sentCount: 0 };
  }

  const message = state.config.messages.find((candidate) => candidate.id === entry.messageId);
  if (!message) {
    entry.status = "skipped";
    entry.updatedAt = now.toISOString();
    return { sentCount: 0 };
  }

  if (entry.activityKind === "group") {
    try {
      await sendText(entry.senderToken, {
        number: entry.receiverNumber,
        text: message.text,
        delay: entry.delayMs,
        readchat: state.config.settings.warmupReadChat,
        readmessages: state.config.settings.warmupReadMessages,
        track_source: WARMUP_TRACK_SOURCE,
        track_id: entry.trackId,
        async: state.config.settings.warmupAsync,
      });

      state.instanceStates[entry.senderToken] = markInstanceSent(senderState, round, now);
      sender.lastWarmupAt = now.toISOString();
      entry.status = "sent";
      entry.updatedAt = now.toISOString();

      addRuntimeLog({
        type: "send",
        instanceName: sender.name,
        message: `Warmup em grupo enviado para ${entry.receiverNumber}`,
        status: "success",
        routineId: entry.routineId,
        routineName: entry.routineName,
        originToken: entry.senderToken,
        destinationNumber: entry.receiverNumber,
        delayMs: entry.delayMs,
        trackId: entry.trackId,
        trackSource: WARMUP_TRACK_SOURCE,
        isAsync: state.config.settings.warmupAsync,
        details: message.text,
      });

      return { sentCount: 1 };
    } catch (error) {
      entry.status = "error";
      entry.error = error instanceof Error ? error.message : "Erro desconhecido";
      entry.updatedAt = now.toISOString();

      addRuntimeLog({
        type: "error",
        instanceName: sender.name,
        message: `Erro no warmup em grupo para ${entry.receiverNumber}`,
        status: "error",
        routineId: entry.routineId,
        routineName: entry.routineName,
        originToken: entry.senderToken,
        destinationNumber: entry.receiverNumber,
        delayMs: entry.delayMs,
        trackId: entry.trackId,
        trackSource: WARMUP_TRACK_SOURCE,
        isAsync: state.config.settings.warmupAsync,
        error: entry.error,
        details: message.text,
      });

      return { sentCount: 0 };
    }
  }

  const receiver = entry.receiverToken ? instancesByToken.get(entry.receiverToken) : null;
  const receiverState = entry.receiverToken ? state.instanceStates[entry.receiverToken] : null;

  if (!receiver || !receiverState?.resolvedNumber) {
    entry.status = "skipped";
    entry.updatedAt = now.toISOString();
    return { sentCount: 0 };
  }

  try {
    await sendText(entry.senderToken, {
      number: receiverState.resolvedNumber,
      text: message.text,
      delay: entry.delayMs,
      readchat: state.config.settings.warmupReadChat,
      readmessages: state.config.settings.warmupReadMessages,
      track_source: WARMUP_TRACK_SOURCE,
      track_id: entry.trackId,
      async: state.config.settings.warmupAsync,
    });

    state.instanceStates[entry.senderToken] = markInstanceSent(senderState, round, now);
    sender.lastWarmupAt = now.toISOString();
    entry.status = "sent";
    entry.updatedAt = now.toISOString();

    addRuntimeLog({
      type: "send",
      instanceName: sender.name,
      message: `Warmup [${entry.activityLabel}] enviado para ${receiver.name}`,
      status: "success",
      routineId: entry.routineId,
      routineName: entry.routineName,
      originToken: entry.senderToken,
      destinationToken: entry.receiverToken,
      destinationName: receiver.name,
      destinationNumber: receiverState.resolvedNumber,
      delayMs: entry.delayMs,
      trackId: entry.trackId,
      trackSource: WARMUP_TRACK_SOURCE,
      isAsync: state.config.settings.warmupAsync,
      details: message.text,
    });

    return { sentCount: 1 };
  } catch (error) {
    entry.status = "error";
    entry.error = error instanceof Error ? error.message : "Erro desconhecido";
    entry.updatedAt = now.toISOString();

    addRuntimeLog({
      type: "error",
      instanceName: sender.name,
      message: `Erro ao enviar warmup para ${receiver.name}`,
      status: "error",
      routineId: entry.routineId,
      routineName: entry.routineName,
      originToken: entry.senderToken,
      destinationToken: entry.receiverToken,
      destinationName: receiver.name,
      destinationNumber: receiverState.resolvedNumber,
      delayMs: entry.delayMs,
      trackId: entry.trackId,
      trackSource: WARMUP_TRACK_SOURCE,
      isAsync: state.config.settings.warmupAsync,
      error: entry.error,
      details: message.text,
    });

    return { sentCount: 0 };
  }
}

async function executeRoundPool(roundPool, instancesByToken, round) {
  const groupedQueues = Array.from(
    roundPool.entries.reduce((groups, entry) => {
      const key = `${entry.activityKind}:${entry.activityLabel}`;
      const next = groups.get(key) ?? [];
      next.push(entry);
      groups.set(key, next);
      return groups;
    }, new Map()).values(),
  );

  let sentCount = 0;
  let executedCount = 0;

  while (executedCount < MAX_QUEUE_EXECUTIONS_PER_TICK) {
    let progressed = false;

    for (const queue of groupedQueues) {
      const entry = queue.shift();
      if (!entry) {
        continue;
      }

      const result = await executePoolEntry(entry, instancesByToken, round);
      sentCount += result.sentCount;
      executedCount += 1;
      progressed = true;

      if (executedCount >= MAX_QUEUE_EXECUTIONS_PER_TICK) {
        break;
      }
    }

    if (!progressed) {
      break;
    }
  }

  roundPool.subpools = summarizeRoundSubpools(roundPool.entries);

  for (const routine of state.config.routines.filter((entry) => entry.isActive)) {
    routine.lastRunAt = roundPool.createdAt;
    routine.totalSent = (routine.totalSent ?? 0) + roundPool.entries.filter((entry) => entry.routineId === routine.id && entry.status === "sent").length;
  }

  return {
    sentCount,
    heatingNow: roundPool.queuedSenders.length,
  };
}

function buildSnapshot() {
  refreshInstanceHeatProfiles(state.currentPool.currentRound);
  return {
    scheduler: {
      ...state.scheduler,
      tickIntervalMs: TICK_INTERVAL_MS,
      runtimeAvailable: true,
    },
    summary: {
      ...state.summary,
      heatingNow: state.scheduler.enabled ? state.summary.heatingNow : 0,
      queuedEntries: state.scheduler.enabled ? state.summary.queuedEntries : 0,
      subpoolCount: state.scheduler.enabled ? state.summary.subpoolCount : 0,
    },
    activityMeta: {
      windowStartedAt: state.activityWindowResetAt,
      windowVersion: state.activityWindowVersion,
    },
    currentPool: {
      ...state.currentPool,
      currentRound: state.scheduler.enabled ? state.currentPool.currentRound : undefined,
    },
    configMeta: {
      routinesCount: state.config.routines.length,
      messagesCount: state.config.messages.length,
      lastSyncedAt: state.lastSyncedAt,
    },
    recentLogs: state.logs.slice(0, 50),
    instanceStates: Object.values(state.instanceStates),
  };
}

function summarizeEligibilityReasons(instanceStates) {
  const reasonCounts = new Map();

  for (const instanceState of instanceStates) {
    if (instanceState.eligibleNow || !instanceState.eligibilityReason) {
      continue;
    }

    reasonCounts.set(
      instanceState.eligibilityReason,
      (reasonCounts.get(instanceState.eligibilityReason) ?? 0) + 1,
    );
  }

  return Array.from(reasonCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([reason, count]) => `${count}x ${reason}`)
    .join(" | ");
}

function buildNoEligibleReason() {
  if (!state.config.routines.length) {
    return "Não há rotinas cadastradas no runtime.";
  }

  if (!state.config.routines.some((routine) => routine.isActive)) {
    return "Há rotinas cadastradas, mas nenhuma está ativa.";
  }

  if (state.summary.totalInstances === 0) {
    return "A UAZAPI não retornou instâncias para o scheduler.";
  }

  if (state.summary.connected === 0) {
    return "Nenhuma instância está conectada no momento.";
  }

  if (state.summary.eligible === 0) {
    const summary = summarizeEligibilityReasons(Object.values(state.instanceStates));
    return summary
      ? `Nenhuma instância passou nas regras locais. Principais bloqueios: ${summary}.`
      : "Nenhuma instância passou nas regras locais de elegibilidade.";
  }

  return "Existem instâncias conectadas, mas nenhuma combinação válida de origem e destino foi encontrada nesta rodada.";
}

async function tick(reason = "interval") {
  if (tickInFlight) {
    return tickInFlight;
  }

  if (!state.scheduler.enabled) {
    return buildSnapshot();
  }

  tickInFlight = (async () => {
    const tickStartedAt = new Date();
    state.scheduler.status = "active";
    state.scheduler.round += 1;
    state.scheduler.lastTickAt = tickStartedAt.toISOString();
    state.scheduler.lastError = undefined;

    try {
      const instances = await fetchAllInstances();
      ensureDefaultRoutine(instances);
      const instancesByToken = new Map(instances.map((instance) => [instance.token, instance]));
      const trackedTokens = Array.from(new Set(instances.map((instance) => instance.token)));
      const round = state.scheduler.round;

      await Promise.all(
        trackedTokens.map(async (token) => {
          const instance = instancesByToken.get(token);
          if (!instance) {
            return;
          }

          try {
            const status = await fetchInstanceStatus(token);
            state.instanceStates[token] = normalizeInstanceState({
              currentState: state.instanceStates[token],
              instance,
              round,
              now: tickStartedAt,
              resolvedNumber: extractResolvedNumber(status, instance),
            });
          } catch (error) {
            state.instanceStates[token] = normalizeInstanceState({
              currentState: state.instanceStates[token],
              instance,
              round,
              now: tickStartedAt,
              resolvedNumber: extractResolvedNumber(null, instance),
            });

            addRuntimeLog({
              type: "error",
              instanceName: instance.name,
              message: "Falha ao resolver /instance/status no runtime",
              status: "error",
              originToken: token,
              error: error instanceof Error ? error.message : "Erro desconhecido",
            });
          }
        }),
      );

      const persistentPool = buildPersistentPool(instances, tickStartedAt);
      const currentRoundPool = buildCurrentRoundPool(
        state.config.routines.filter((entry) => entry.isActive),
        instancesByToken,
        round,
        tickStartedAt,
      );

      state.currentPool = {
        persistent: persistentPool,
        currentRound: currentRoundPool,
      };

      const executionResult = currentRoundPool
        ? await executeRoundPool(currentRoundPool, instancesByToken, round)
        : { sentCount: 0, heatingNow: 0 };
      const sentCount = executionResult.sentCount;
      const heatingNow = executionResult.heatingNow;

      const instanceStates = Object.values(state.instanceStates);
      state.summary = {
        totalInstances: instances.length,
        connected: instances.filter((instance) => instance.status === "connected").length,
        eligible: persistentPool.readyTokens.length,
        heatingNow,
        queuedEntries: currentRoundPool?.queuedEntries ?? 0,
        persistentPoolSize: persistentPool.healthyTokens.length,
        subpoolCount: currentRoundPool?.subpools.length ?? 0,
        sentToday: instanceStates.reduce((total, instanceState) => total + instanceState.sentToday, 0),
        recentErrors: state.logs.filter((entry) => entry.status === "error").slice(0, 20).length,
        activeRoutines: state.config.routines.filter((entry) => entry.isActive).length,
      };

      refreshInstanceHeatProfiles(currentRoundPool);

      if (sentCount === 0 && currentRoundPool?.queuedEntries) {
        state.scheduler.status = "active";
        state.scheduler.lastError = undefined;
      } else if (sentCount === 0) {
        state.scheduler.lastError = buildNoEligibleReason();
        state.scheduler.status = state.summary.activeRoutines > 0 && state.summary.eligible === 0
          ? "no-eligible"
          : "active";
      } else {
        state.scheduler.status = "active";
        state.scheduler.lastError = undefined;
      }

      addRuntimeLog({
        type: "scheduler",
        instanceName: "runtime",
        message: `Tick ${reason} concluído`,
        status: sentCount > 0 ? "success" : "info",
        details: JSON.stringify({
          round,
          sentCount,
          heatingNow,
        }),
      });
    } catch (error) {
      state.scheduler.status = "error";
      state.scheduler.lastError = error instanceof Error ? error.message : "Erro desconhecido";
      addRuntimeLog({
        type: "error",
        instanceName: "runtime",
        message: "Falha no scheduler 24/7",
        status: "error",
        error: state.scheduler.lastError,
      });
    } finally {
      await saveState();
    }

    return buildSnapshot();
  })().finally(() => {
    tickInFlight = null;
  });

  return tickInFlight;
}

function startLoop() {
  if (tickTimer) {
    return;
  }

  tickTimer = setInterval(() => {
    tick("interval").catch((error) => {
      console.error("[warmup-runtime] tick failed", error);
    });
  }, TICK_INTERVAL_MS);
}

function stopLoop() {
  if (!tickTimer) {
    return;
  }

  clearInterval(tickTimer);
  tickTimer = null;
}

if (state.scheduler.enabled) {
  startLoop();
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) {
    return false;
  }

  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const sanitizedPath = path
    .normalize(decodeURIComponent(requestUrl.pathname))
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  let filePath = path.join(DIST_DIR, sanitizedPath === "" ? "index.html" : sanitizedPath);

  if (!path.extname(filePath)) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("not a file");
    }

    const extension = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    try {
      const fallbackPath = path.join(DIST_DIR, "index.html");
      const fallbackStat = await stat(fallbackPath);
      if (!fallbackStat.isFile()) {
        return false;
      }

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
      });
      createReadStream(fallbackPath).pipe(res);
      return true;
    } catch {
      return false;
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    createResponse(res, 400, { error: "Requisição inválida" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  try {
    if (req.method === "GET" && requestUrl.pathname === "/api/local/health") {
      createResponse(res, 200, {
        ok: true,
        port: PORT,
        tickIntervalMs: TICK_INTERVAL_MS,
        scheduler: state.scheduler,
      });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/local/app/config") {
      createResponse(res, 200, {
        settings: state.config.settings,
      });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/local/warmup/state") {
      createResponse(res, 200, buildSnapshot());
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/sync") {
      const payload = await parseBody(req);
      const nextRoutines = Array.isArray(payload.routines) ? jsonClone(payload.routines) : [];
      const protectedRoutines = state.config.routines
        .filter((routine) => isProtectedRoutine(routine))
        .filter((routine) => !nextRoutines.some((entry) => entry.id === routine.id))
        .map((routine) => jsonClone(routine));

      state.config = {
        settings: {
          ...getDefaultSettings(),
          ...(payload.settings ?? {}),
        },
        routines: [...protectedRoutines, ...nextRoutines],
        messages: Array.isArray(payload.messages) ? jsonClone(payload.messages) : [],
      };
      state.lastSyncedAt = new Date().toISOString();
      state.summary.activeRoutines = state.config.routines.filter((entry) => entry.isActive).length;
      await saveState();
      createResponse(res, 200, buildSnapshot());
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/start") {
      state.scheduler.enabled = true;
      state.scheduler.status = "active";
      state.scheduler.lastStartedAt = new Date().toISOString();
      state.scheduler.lastError = undefined;
      startLoop();
      const snapshot = await tick("manual-start");
      createResponse(res, 200, snapshot);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/pause") {
      state.scheduler.enabled = false;
      state.scheduler.status = "paused";
      state.scheduler.lastPausedAt = new Date().toISOString();
      clearWarmingFlags();
      stopLoop();
      await saveState();
      createResponse(res, 200, buildSnapshot());
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/stop") {
      state.scheduler.enabled = false;
      state.scheduler.status = "stopped";
      state.scheduler.lastPausedAt = new Date().toISOString();
      state.scheduler.lastError = undefined;
      clearWarmingFlags();
      stopLoop();
      await saveState();
      createResponse(res, 200, buildSnapshot());
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/restart") {
      stopLoop();
      state.scheduler.enabled = true;
      state.scheduler.status = "active";
      state.scheduler.lastStartedAt = new Date().toISOString();
      state.scheduler.lastError = undefined;
      startLoop();
      const snapshot = await tick("manual-restart");
      createResponse(res, 200, snapshot);
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/local/warmup/tick") {
      const snapshot = await tick("manual");
      createResponse(res, 200, snapshot);
      return;
    }

    const served = await serveStatic(req, res);
    if (served) {
      return;
    }

    createResponse(res, 404, { error: "Rota não encontrada" });
  } catch (error) {
    createResponse(res, 500, {
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[warmup-runtime] listening on http://${HOST}:${PORT}`);
});
