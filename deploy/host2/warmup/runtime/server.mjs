import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";

const HOST = process.env.WARMUP_RUNTIME_HOST || "0.0.0.0";
const PORT = Number(process.env.WARMUP_RUNTIME_PORT || process.env.PORT || 8787);
const TICK_INTERVAL_MS = Number(process.env.WARMUP_TICK_INTERVAL_MS || 60_000);
const DATA_DIR = path.resolve(process.cwd(), "runtime-data");
const STATE_FILE = path.join(DATA_DIR, "warmup-state.json");
const DNA_DIR = path.join(DATA_DIR, "instance-dna");
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
    warmupMaxDailyPerInstance: 250,
    warmupCooldownRounds: 1,
    warmupReadChat: false,
    warmupReadMessages: false,
    warmupAsync: true,
    antiBanMaxPerMinute: 12,
  };
}

function getReachableMinIntervalMs(maxDailyPerInstance) {
  const target = Math.max(1, Math.round(Number(maxDailyPerInstance) || 0));
  if (!target) return 0;
  return Math.ceil(86_400_000 / target);
}

function normalizeSettings(settings = {}) {
  const next = {
    ...getDefaultSettings(),
    ...(settings ?? {}),
  };

  if (!Number.isFinite(next.warmupMaxDailyPerInstance) || next.warmupMaxDailyPerInstance <= 0 || next.warmupMaxDailyPerInstance === 12) {
    next.warmupMaxDailyPerInstance = 250;
  }

  if (!Number.isFinite(next.antiBanMaxPerMinute) || next.antiBanMaxPerMinute < 0) {
    next.antiBanMaxPerMinute = 12;
  }

  const reachableMinIntervalMs = getReachableMinIntervalMs(next.warmupMaxDailyPerInstance);
  if (
    Number.isFinite(reachableMinIntervalMs)
    && reachableMinIntervalMs > 0
    && Number.isFinite(next.warmupMinIntervalMs)
    && next.warmupMinIntervalMs > reachableMinIntervalMs
  ) {
    next.warmupMinIntervalMs = reachableMinIntervalMs;
  }

  return next;
}

function mergeRuntimeSettings(currentSettings = {}, incomingSettings = {}) {
  const normalizedIncoming = normalizeSettings(incomingSettings ?? {});
  const current = normalizeSettings(currentSettings ?? {});

  return normalizeSettings({
    ...current,
    ...normalizedIncoming,
    serverUrl: normalizedIncoming.serverUrl?.trim() || current.serverUrl,
    adminToken: normalizedIncoming.adminToken?.trim() || current.adminToken || "",
  });
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
      settings: normalizeSettings(),
      routines: [],
      messages: [],
    },
    scheduler: {
      enabled: false,
      status: "paused",
      round: 0,
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
      cadenceBpm: 0,
      isPulsing: false,
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
    candidates.push(now.getTime() + cooldownRounds * TICK_INTERVAL_MS * 0.1); // Cooldown menor em runtime para rotação
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
    instanceState.heatScore = instanceState.heatScore ?? 0;
    instanceState.heatStage = instanceState.heatStage ?? "blocked";
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
    const normalizedSettings = normalizeSettings(parsed.config?.settings ?? {});
    const nextState = {
      ...createDefaultState(),
      ...parsed,
      config: {
        ...createDefaultState().config,
        ...(parsed.config ?? {}),
        settings: normalizedSettings,
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
      lastSyncedAt: parsed.lastSyncedAt,
      activityWindowVersion: parsed.activityWindowVersion ?? 0,
      activityWindowResetAt: parsed.activityWindowResetAt,
    };

    const shouldPersistMigratedState = JSON.stringify(normalizedSettings) !== JSON.stringify(parsed.config?.settings ?? {});

    if ((parsed.activityWindowVersion ?? 0) < ACTIVITY_WINDOW_VERSION) {
      rebaseActivityWindow(nextState, new Date());
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STATE_FILE, JSON.stringify(nextState, null, 2));
    } else if (shouldPersistMigratedState) {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STATE_FILE, JSON.stringify(nextState, null, 2));
    }

    return nextState;
  } catch {
    return createDefaultState();
  }
}

async function saveState() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("[warmup-runtime] Falha ao salvar estado", error);
  }
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

async function updateInstanceDna(token, event) {
  try {
    await mkdir(DNA_DIR, { recursive: true });
    const dnaPath = path.join(DNA_DIR, `${token}.json`);
    let dna = { history: [], firstSeenAt: new Date().toISOString() };

    if (existsSync(dnaPath)) {
      dna = JSON.parse(await readFile(dnaPath, "utf8"));
    }

    dna.history.unshift({
      timestamp: new Date().toISOString(),
      ...event
    });

    // Manter últimos 200 eventos por instância
    dna.history = dna.history.slice(0, 200);
    dna.lastUpdatedAt = new Date().toISOString();

    await writeFile(dnaPath, JSON.stringify(dna, null, 2));
  } catch (error) {
    console.error(`[warmup-runtime] Falha ao atualizar DNA para ${token}`, error);
  }
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
    sendsLog: [],
    nextEligibleAt: undefined,
    cooldownRounds: 0,
    eligibleNow: false,
    warmingNow: false,
    proxyStatus: "unknown",
    proxy: undefined,
    heatScore: 0,
    heatStage: "blocked",
    updatedAt: new Date(0).toISOString(),
  };
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCooldownRemaining(instanceState, round) {
  if (!instanceState.cooldownRounds || instanceState.lastRoundParticipated == null) {
    return 0;
  }

  const roundsSinceLastParticipation = Math.max(0, round - instanceState.lastRoundParticipated);
  return Math.max(0, instanceState.cooldownRounds - roundsSinceLastParticipation);
}

function calculateHealthScore(params) {
  let score = 100;

  if (params.instance.status !== "connected") score -= 50;
  if (params.instance.isBusiness === false) score -= 10;
  if (params.state.proxyStatus === "error") score -= 30;

  const usageRatio = params.state.sentToday / params.settings.warmupMaxDailyPerInstance;
  if (usageRatio >= 0.9) score -= 25;
  else if (usageRatio >= 0.7) score -= 15;

  if (params.state.cooldownRounds > 0) score -= 5;

  // Penalidade por falhas de conexão no histórico recente
  if (params.instance.lastDisconnectReason?.toLowerCase().includes("fail")) {
    score -= 15;
  }

  // Bônus por estabilidade (tempo conectado) - placeholder para futura implementação
  // score += Math.min(10, connectedMinutes / 60);

  return Math.max(0, Math.min(100, score));
}

function normalizeInstanceState({ currentState, instance, round, now, resolvedNumber, instanceData }) {
  const base = currentState ?? createDefaultInstanceState(instance.token, instance.name);
  const proxy = instanceData?.proxy ?? base.proxy;
  const isManagedProxy = Boolean(
    proxy?.managed
    || proxy?.proxy_fallback === "internal_proxy"
    || String(proxy?.proxy_url ?? "").startsWith("managed_pool://")
  );
  const hasCustomProxy = Boolean(proxy?.enabled && proxy?.proxy_url && !isManagedProxy);
  const next = {
    ...base,
    instanceName: instance.name,
    warmingNow: false,
    resolvedNumber: resolvedNumber ?? base.resolvedNumber,
    proxy,
    proxyStatus: proxy?.validation_error
      ? "error"
      : isManagedProxy
        ? "managed"
        : hasCustomProxy
          ? "custom"
          : proxy
            ? "internal"
            : "unknown",
    updatedAt: now.toISOString(),
    nextEligibleAt: undefined,
  };

  // Limpeza da janela móvel de 24h
  const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000;
  next.sendsLog = (next.sendsLog || []).filter(ts => new Date(ts).getTime() > twentyFourHoursAgo);
  next.sentToday = next.sendsLog.length;

  next.cooldownRounds = getCooldownRemaining(next, round);

  if (instanceData) {
    next.heatScore = calculateHealthScore({
      instance: instanceData,
      state: next,
      settings: state.config.settings,
    });

    if (next.heatScore >= 80) next.heatStage = "eligible";
    else if (next.heatScore >= 40) next.heatStage = "waiting";
    else next.heatStage = "blocked";

    // Auto-restauração: Se estava bloqueada mas a saúde subiu acima de 40%, removemos o bloqueio do Kill Switch
    if (next.heatScore > 40 && next.eligibilityReason?.includes("KILL SWITCH")) {
      next.eligibilityReason = "Saúde restabelecida (>40%). Saindo do Kill Switch.";
    }
  }

  const minIntervalMet = !next.lastSentAt ||
    now.getTime() - new Date(next.lastSentAt).getTime() >= state.config.settings.warmupMinIntervalMs;
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

  const updatedLog = [...(instanceState.sendsLog || []), now.toISOString()];

  return {
    ...instanceState,
    sendsLog: updatedLog,
    sentToday: updatedLog.length,
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
    heatStage: "waiting",
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
    } catch { }
    throw new Error(message);
  }

  return response.json();
}

async function fetchAllInstances() {
  if (!state.config.settings.adminToken?.trim()) {
    throw new Error("Admin token não configurado no runtime.");
  }

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

async function fetchInstanceProxy(token) {
  return fetchJson(`${state.config.settings.serverUrl}/instance/proxy`, {
    headers: {
      token,
    },
  }, "Erro ao buscar proxy da instância");
}

async function sendText(token, payload) {
  return fetchJson(`${state.config.settings.serverUrl}/send/text`, {
    method: "POST",
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, "Erro ao enviar warmup (texto)");
}

async function sendAudio(token, payload) {
  return fetchJson(`${state.config.settings.serverUrl}/send/media`, {
    method: "POST",
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, "Erro ao enviar warmup (áudio)");
}

async function sendPresence(token, payload) {
  return fetchJson(`${state.config.settings.serverUrl}/message/presence`, {
    method: "POST",
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, "Erro ao simular presença");
}

async function setInstancePresence(token, presence) {
  return fetchJson(`${state.config.settings.serverUrl}/instance/presence`, {
    method: "POST",
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ presence }),
  }, "Erro ao alterar presença da instância");
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
    normalizedReason.includes("intervalo mínimo") ||
    normalizedReason.includes("cooldown") ||
    normalizedReason.includes("limite diário")
  ) {
    return "waiting";
  }

  return "blocked";
}

function refreshInstanceHeatProfiles(currentRoundPool) {
  const queuedTokens = new Set(currentRoundPool?.queuedSenders ?? []);

  for (const instanceState of Object.values(state.instanceStates)) {
    const stage = deriveHeatStage(instanceState, queuedTokens);
    instanceState.heatStage = stage;
  }
}

function buildCurrentRoundPool(routines, instancesByToken, round, tickStartedAt) {
  const roundPool = {
    round,
    createdAt: tickStartedAt.toISOString(),
    queuedSenders: [],
    queuedEntries: 0,
    subpools: [],
    entries: [],
  };

  const queuedSenders = new Set();

  for (const routine of routines) {
    const plan = buildDispatchPlan(routine);
    for (const dispatch of plan) {
      const entry = createPoolEntry({
        routine,
        dispatch,
        instancesByToken,
        round,
        tickStartedAt,
      });

      if (entry) {
        roundPool.entries.push(entry);
        roundPool.queuedEntries += 1;
        queuedSenders.add(entry.senderToken);
      }
    }
  }

  roundPool.queuedSenders = Array.from(queuedSenders);
  roundPool.subpools = summarizeRoundSubpools(roundPool.entries);
  return roundPool;
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



  try {
    const receiverNumber = entry.activityKind === "group" ? entry.receiverNumber : state.instanceStates[entry.receiverToken]?.resolvedNumber;

    const presenceType = message.contentType === "audio" ? "recording" : "composing";
    try {
      await sendPresence(entry.senderToken, { number: receiverNumber, presence: presenceType, delay: 1000 });
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[warmup] Erro ao simular presença (${presenceType}) para ${receiverNumber}`);
    }

    if (message.contentType === "audio" && message.audioUrl) {
      await sendAudio(entry.senderToken, {
        number: receiverNumber,
        type: message.audioMode || "ptt",
        file: message.audioUrl,
        delay: entry.delayMs,
        readchat: state.config.settings.warmupReadChat,
        readmessages: state.config.settings.warmupReadMessages,
        track_source: WARMUP_TRACK_SOURCE,
        track_id: entry.trackId,
        async: state.config.settings.warmupAsync,
      });
    } else {
      await sendText(entry.senderToken, {
        number: receiverNumber,
        text: message.text,
        delay: entry.delayMs,
        readchat: state.config.settings.warmupReadChat,
        readmessages: state.config.settings.warmupReadMessages,
        track_source: WARMUP_TRACK_SOURCE,
        track_id: entry.trackId,
        async: state.config.settings.warmupAsync,
      });
    }

    state.instanceStates[entry.senderToken] = markInstanceSent(senderState, round, now);
    sender.lastWarmupAt = now.toISOString();
    entry.status = "sent";
    entry.updatedAt = now.toISOString();

    addRuntimeLog({
      type: "send",
      instanceName: sender.name,
      message: `Warmup [${entry.activityLabel}] enviado para ${entry.receiverName || entry.receiverNumber}`,
      status: "success",
      routineId: entry.routineId,
      routineName: entry.routineName,
      originToken: entry.senderToken,
      destinationNumber: receiverNumber,
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
      message: `Erro ao enviar warmup: ${entry.error}`,
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
    });

    return { sentCount: 0 };
  }
}

async function executeRoundPool(roundPool, instancesByToken, round, maxExecutionsAllowed = MAX_QUEUE_EXECUTIONS_PER_TICK) {
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

  const executionLimit = Math.min(MAX_QUEUE_EXECUTIONS_PER_TICK, Math.max(0, maxExecutionsAllowed));

  while (executedCount < executionLimit) {
    let progressed = false;

    for (const queue of groupedQueues) {
      const entry = queue.shift();
      if (!entry) continue;

      const result = await executePoolEntry(entry, instancesByToken, round);
      sentCount += result.sentCount;
      executedCount += 1;
      progressed = true;

      if (executedCount >= executionLimit) break;
    }

    if (!progressed) break;
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

function summarizeEligibilityReasons(instanceStates) {
  const reasonCounts = new Map();

  for (const instanceState of instanceStates) {
    if (instanceState.eligibleNow || !instanceState.eligibilityReason) continue;
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
  if (!state.config.routines.length) return "Não há rotinas cadastradas no runtime.";
  if (!state.config.routines.some((routine) => routine.isActive)) return "Há rotinas cadastradas, mas nenhuma está ativa.";
  if (state.summary.totalInstances === 0) return "A UAZAPI não retornou instâncias para o scheduler.";
  if (state.summary.connected === 0) return "Nenhuma instância está conectada no momento.";

  if (state.summary.eligible === 0) {
    const summary = summarizeEligibilityReasons(Object.values(state.instanceStates));
    return summary
      ? `Nenhuma instância passou nas regras locais. Principais bloqueios: ${summary}.`
      : "Nenhuma instância passou nas regras locais de elegibilidade.";
  }

  return "Nenhuma combinação válida de origem e destino foi encontrada nesta rodada.";
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
    },
    currentPool: {
      ...state.currentPool,
      currentRound: state.scheduler.enabled ? state.currentPool.currentRound : undefined,
    },
    activityMeta: {
      windowStartedAt: state.activityWindowResetAt,
      windowVersion: state.activityWindowVersion,
    },
    configMeta: {
      routinesCount: state.config.routines.length,
      messagesCount: state.config.messages.length,
      lastSyncedAt: state.lastSyncedAt,
      warmupMinIntervalMs: state.config.settings.warmupMinIntervalMs,
      warmupMaxDailyPerInstance: state.config.settings.warmupMaxDailyPerInstance,
      warmupCooldownRounds: state.config.settings.warmupCooldownRounds,
      antiBanMaxPerMinute: state.config.settings.antiBanMaxPerMinute,
    },
    recentLogs: state.logs.slice(0, 50),
    instanceStates: Object.values(state.instanceStates),
  };
}

async function tick(reason = "interval") {
  if (tickInFlight) return tickInFlight;
  if (!state.scheduler.enabled) return buildSnapshot();

  tickInFlight = (async () => {
    const tickStartedAt = new Date();
    state.scheduler.status = "active";
    state.scheduler.round += 1;
    state.scheduler.lastTickAt = tickStartedAt.toISOString();
    state.scheduler.lastError = undefined;
    state.summary.isPulsing = true;
    state.scheduler.lastTickAt = tickStartedAt.toISOString();

    try {
      const instances = await fetchAllInstances();
      ensureDefaultRoutine(instances);
      const instancesByToken = new Map(instances.map((i) => [i.token, i]));
      const round = state.scheduler.round;

      await Promise.all(
        instances.map(async (instance) => {
          try {
            const [statusResult, proxyResult] = await Promise.allSettled([
              fetchInstanceStatus(instance.token),
              fetchInstanceProxy(instance.token),
            ]);
            const status = statusResult.status === "fulfilled" ? statusResult.value : null;
            const proxy = proxyResult.status === "fulfilled" ? proxyResult.value : undefined;
            state.instanceStates[instance.token] = normalizeInstanceState({
              currentState: state.instanceStates[instance.token],
              instance,
              round,
              now: tickStartedAt,
              resolvedNumber: extractResolvedNumber(status, instance),
              instanceData: {
                ...instance,
                proxy,
              },
            });
          } catch {
            state.instanceStates[instance.token] = normalizeInstanceState({
              currentState: state.instanceStates[instance.token],
              instance,
              round,
              now: tickStartedAt,
              resolvedNumber: extractResolvedNumber(null, instance),
              instanceData: instance,
            });
          }
        })
      );

      // DNA & Kill Switch (Registro e Monitoramento)
      instances.forEach(instance => {
        const istate = state.instanceStates[instance.token];
        if (!istate) return;

        // Registrar pulso no DNA (Registro longo prazo)
        if (round % 10 === 0) {
          updateInstanceDna(instance.token, {
            type: "pulse",
            heatScore: istate.heatScore,
            status: instance.status,
            sentToday: istate.sentToday
          });
        }

        // Matriz de Risco & Kill Switch (Proteção Ativa)
        // Se a saúde cair abaixo de 30%, ativamos o Kill Switch para esta instância
        if (istate.heatScore < 30 && !istate.eligibilityReason?.includes("KILL SWITCH")) {
          istate.eligibleNow = false;
          istate.eligibilityReason = "RISCO CRÍTICO: KILL SWITCH ATIVADO (<30% Saúde)";

          addRuntimeLog({
            type: "scheduler",
            status: "error",
            message: `KILL SWITCH: Instância ${instance.name || instance.token} pausada por risco crítico de banimento.`,
            instanceName: instance.name,
            originToken: instance.token
          });
        }
      });

      const persistentPool = buildPersistentPool(instances, tickStartedAt);
      const currentRoundPool = buildCurrentRoundPool(
        state.config.routines.filter((r) => r.isActive),
        instancesByToken,
        round,
        tickStartedAt
      );

      state.currentPool = {
        persistent: persistentPool,
        currentRound: currentRoundPool,
      };

      // Cálculo de contenção antiBanMaxPerMinute
      const oneMinuteAgo = new Date(tickStartedAt.getTime() - 60 * 1000);
      const sendsLastMinute = state.logs.filter(l => l.type === 'send' && l.status === 'success' && new Date(l.timestamp) > oneMinuteAgo).length;
      const antiBanLimit = state.config.settings.antiBanMaxPerMinute || 12;
      const allowedThisTick = Math.max(0, antiBanLimit - sendsLastMinute);

      let executionResult = { sentCount: 0, heatingNow: 0 };
      if (currentRoundPool && currentRoundPool.queuedEntries > 0) {
        if (allowedThisTick > 0) {
          executionResult = await executeRoundPool(currentRoundPool, instancesByToken, round, allowedThisTick);
        } else {
          addRuntimeLog({
            type: "scheduler",
            status: "info",
            message: `Contenção Anti-Ban: Limite de ${antiBanLimit} envios/min atingido (${sendsLastMinute} envios recentes). Execução adiada.`
          });
          state.scheduler.lastError = `Contenção Anti-Ban: Teto de ${antiBanLimit}/min alcançado. Aguardando.`;
          executionResult = { sentCount: 0, heatingNow: currentRoundPool.queuedEntries };
        }
      }

      const sentCount = executionResult.sentCount;
      const heatingNow = executionResult.heatingNow;

      state.summary = {
        ...state.summary,
        totalInstances: instances.length,
        connected: instances.filter((i) => i.status === "connected").length,
        eligible: persistentPool.readyTokens.length,
        heatingNow,
        persistentPoolSize: persistentPool.healthyTokens.length,
        subpoolCount: currentRoundPool?.subpools.length ?? 0,
        queuedEntries: currentRoundPool?.queuedEntries ?? 0,
        sentToday: Object.values(state.instanceStates).reduce((total, s) => total + s.sentToday, 0),
        recentErrors: state.logs.filter((entry) => entry.status === "error").length,
        activeRoutines: state.config.routines.filter((r) => r.isActive).length,
      };

      // BPM lúdico
      const windowStart = new Date(tickStartedAt.getTime() - 5 * 60 * 1000);
      const recentSends = state.logs.filter(l => l.type === 'send' && l.status === 'success' && new Date(l.timestamp) > windowStart).length;
      state.summary.cadenceBpm = Math.round((recentSends / 5) * 10) / 10 || (state.summary.eligible > 0 ? 0.5 : 0);

      if (sentCount === 0) {
        state.scheduler.lastError = buildNoEligibleReason();
      }

    } catch (error) {
      state.scheduler.status = "error";
      state.scheduler.lastError = error instanceof Error ? error.message : "Erro desconhecido no runtime";
    } finally {
      state.summary.isPulsing = false;
      await saveState();
    }

    return buildSnapshot();
  })().finally(() => {
    tickInFlight = null;
  });

  return tickInFlight;
}

function startLoop() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    tick("interval").catch(console.error);
  }, TICK_INTERVAL_MS);
}

function stopLoop() {
  if (!tickTimer) return;
  clearInterval(tickTimer);
  tickTimer = null;
}

if (state.scheduler.enabled) startLoop();

function processWebhookPayload(payload) {
  try {
    const { event, instance, data } = payload;
    if (!event || !instance) return;

    const istate = Object.values(state.instanceStates).find(s => s.instanceName === instance);
    if (!istate) return;

    if (event === "connection.update" && data?.state === "close") {
      const statusCode = data?.statusCode || data?.reason || 500;
      if (statusCode === 401 || statusCode === 403) {
        istate.heatScore = Math.max(0, istate.heatScore - 50);
        istate.eligibilityReason = `Banimento/Deslogado detectado via Webhook (Code ${statusCode})`;
        istate.heatStage = "blocked";
        istate.eligibleNow = false;

        addRuntimeLog({
          type: "scheduler",
          status: "error",
          message: `🚨 ALERTA VERMELHO: Instância ${instance} caiu com erro ${statusCode} (Possível Ban).`,
          instanceName: instance,
          originToken: istate.instanceToken
        });
      }
    }

    if (event === "messages.update" || event === "messages.upsert" || event === "message.receipt") {
      istate.heatScore = Math.min(100, istate.heatScore + 0.5);

      if (istate.heatScore > 50 && istate.heatStage === "blocked") {
        istate.heatStage = "eligible";
        istate.eligibleNow = true;
        istate.eligibilityReason = "Saúde restabelecida via telemetria";
      }

      updateInstanceDna(istate.instanceToken, {
        type: "webhook_receipt",
        summary: `Evento ${event} da rede (Saúde ++)`
      });
    }
  } catch (error) {
    console.error("[warmup-webhook] Erro ao processar payload", error);
  }
}

function buildRuntimeConfigResponse() {
  return {
    settings: buildPublicSettings(state.config.settings),
    routines: state.config.routines,
    messages: state.config.messages,
    lastSyncedAt: state.lastSyncedAt,
    scheduler: {
      enabled: state.scheduler.enabled,
      status: state.scheduler.status,
    },
  };
}

function buildPublicSettings(settings = {}) {
  return {
    ...settings,
    adminToken: "",
  };
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) return false;
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const sanitizedPath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let filePath = path.join(DIST_DIR, sanitizedPath === "" ? "index.html" : sanitizedPath);
  if (!path.extname(filePath)) filePath = path.join(DIST_DIR, "index.html");

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("not a file");
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    try {
      const fallbackPath = path.join(DIST_DIR, "index.html");
      createReadStream(fallbackPath).pipe(res);
      return true;
    } catch { return false; }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) return createResponse(res, 400, { error: "Requisição inválida" });

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/local/health") return createResponse(res, 200, { ok: true, port: PORT, scheduler: state.scheduler });
    if (url.pathname === "/api/local/app/config") return createResponse(res, 200, { settings: buildPublicSettings(state.config.settings) });
    if (url.pathname === "/api/local/warmup/webhook" && req.method === "POST") {
      const payload = await parseBody(req);
      processWebhookPayload(payload);
      return createResponse(res, 200, { received: true });
    }
    if (url.pathname === "/api/local/warmup/state") return createResponse(res, 200, buildSnapshot());
    if (url.pathname === "/api/local/warmup/config") return createResponse(res, 200, buildRuntimeConfigResponse());
    if (url.pathname === "/api/local/warmup/sync") {
      const payload = await parseBody(req);
      state.config = {
        settings: mergeRuntimeSettings(state.config.settings, payload.settings ?? {}),
        routines: Array.isArray(payload.routines) ? payload.routines : [],
        messages: Array.isArray(payload.messages) ? payload.messages : [],
      };
      state.lastSyncedAt = new Date().toISOString();
      await saveState();
      return createResponse(res, 200, buildSnapshot());
    }
    if (url.pathname === "/api/local/warmup/start") {
      state.scheduler.enabled = true;
      state.scheduler.status = "active";
      startLoop();
      return createResponse(res, 200, await tick("manual-start"));
    }
    if (url.pathname === "/api/local/warmup/pause") {
      state.scheduler.enabled = false;
      state.scheduler.status = "paused";
      stopLoop();
      clearWarmingFlags();
      await saveState();
      return createResponse(res, 200, buildSnapshot());
    }
    if (url.pathname === "/api/local/warmup/stop") {
      state.scheduler.enabled = false;
      state.scheduler.status = "stopped";
      stopLoop();
      clearWarmingFlags();
      await saveState();
      return createResponse(res, 200, buildSnapshot());
    }
    if (url.pathname === "/api/local/warmup/restart") {
      state.scheduler.enabled = true;
      state.scheduler.status = "active";
      clearWarmingFlags();
      startLoop();
      return createResponse(res, 200, await tick("manual-restart"));
    }
    if (url.pathname === "/api/local/warmup/tick") return createResponse(res, 200, await tick("manual"));

    if (await serveStatic(req, res)) return;
    createResponse(res, 404, { error: "Não encontrado" });
  } catch (err) {
    createResponse(res, 500, { error: err.message });
  }
});

// Watchdog: Garante que o motor continue batendo (Self-Healing)
setInterval(() => {
  const lastTick = state.scheduler.lastTickAt ? new Date(state.scheduler.lastTickAt) : null;
  const now = new Date();
  const maxSilenseMs = TICK_INTERVAL_MS * 2.5;

  if (state.scheduler.enabled && lastTick && (now - lastTick > maxSilenseMs)) {
    console.warn(`[warmup-watchdog] Detectada inatividade suspeita (> ${maxSilenseMs}ms). Forçando pulso de recuperação...`);
    addRuntimeLog({
      type: "scheduler",
      status: "info",
      message: "WATCHDOG: Reiniciando motor rítmico após inatividade detectada."
    });
    tick(); // Force restart pulse
  }
}, TICK_INTERVAL_MS * 2);

server.listen(PORT, HOST, () => console.log(`[warmup-runtime] listening on http://${HOST}:${PORT}`));
