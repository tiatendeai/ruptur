"use client";

import { useMemo, useState } from "react";
import { rupturApiBaseUrl } from "@/lib/config";

type Period = "annual" | "quarterly";
type PlanKey = "basic" | "professional" | "enterprise";

type Plan = {
  key: PlanKey;
  name: string;
  minAttendants: number;
  whatsappNumbersIncluded: number;
  features: string[];
  priceCentsAnnualPerAttendant: number;
  priceCentsQuarterlyPerAttendant: number;
};

const PLANS: Plan[] = [
  {
    key: "basic",
    name: "BASIC",
    minAttendants: 2,
    whatsappNumbersIncluded: 1,
    features: ["Apenas 1 número de WhatsApp", "Sem relatórios", "Sem disparos em massa", "Sem API/webhook", "Sem chatbots"],
    priceCentsAnnualPerAttendant: 7890,
    priceCentsQuarterlyPerAttendant: 9900,
  },
  {
    key: "professional",
    name: "PROFISSIONAL",
    minAttendants: 2,
    whatsappNumbersIncluded: 3,
    features: [
      "Até 3 números de WhatsApp",
      "Chatbot básico pré-configurado",
      "Relatórios de conversas e atendentes",
      "Disparo de mensagens em massa",
      "Agendamento de mensagens",
      "API de integração e webhook (MVP)",
    ],
    priceCentsAnnualPerAttendant: 7890,
    priceCentsQuarterlyPerAttendant: 9900,
  },
  {
    key: "enterprise",
    name: "ENTERPRISE",
    minAttendants: 2,
    whatsappNumbersIncluded: 3,
    features: [
      "Tudo do Profissional +",
      "Mais números por atendente",
      "Construtor de chatbot visual",
      "API de integração e webhook",
      "Log de atividade",
    ],
    priceCentsAnnualPerAttendant: 10899,
    priceCentsQuarterlyPerAttendant: 12900,
  },
];

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${rupturApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

export default function BillingPage() {
  const [period, setPeriod] = useState<Period>("annual");
  const [attendants, setAttendants] = useState(2);
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planPriceLabel = useMemo(() => (period === "annual" ? "por atendente/mês (anual)" : "por atendente/mês (trimestral)"), [period]);

  function perAttendant(plan: Plan) {
    return period === "annual" ? plan.priceCentsAnnualPerAttendant : plan.priceCentsQuarterlyPerAttendant;
  }

  async function onSubscribe(planKey: PlanKey) {
    setError(null);
    setLoading(planKey);
    try {
      const company_name = prompt("Nome da empresa (ex.: 2DL Company)")?.trim() || "";
      if (!company_name) return;
      const email = prompt("Email (opcional)")?.trim() || undefined;
      const phone = prompt("Telefone (opcional)")?.trim() || undefined;

      const r = await postJson("/billing/checkout", {
        plan_key: planKey,
        period,
        attendants,
        company_name,
        email,
        phone,
        success_url: `${window.location.origin}/billing?success=1`,
      });

      const url = r.checkoutUrl as string | undefined;
      if (url) window.location.href = url;
      else alert(`Checkout criado (${r.checkoutId}). Configure o link do checkout no backend.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Escolha seu plano</h1>
          <div className="text-sm text-zinc-400">Pague por ano ou trimestre e cancele quando quiser.</div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            className={[
              "rounded-full px-3 py-1.5 text-xs",
              period === "annual" ? "bg-indigo-500/80 text-white" : "text-zinc-300 hover:bg-white/5",
            ].join(" ")}
          >
            Planos anuais
          </button>
          <button
            type="button"
            onClick={() => setPeriod("quarterly")}
            className={[
              "rounded-full px-3 py-1.5 text-xs",
              period === "quarterly" ? "bg-indigo-500/80 text-white" : "text-zinc-300 hover:bg-white/5",
            ].join(" ")}
          >
            Planos trimestrais
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-sm font-semibold">Atendentes</div>
          <div className="text-xs text-zinc-400">Mínimo de 2 atendentes nos planos.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 rounded-full bg-white/10 text-lg hover:bg-white/15"
            onClick={() => setAttendants((n) => Math.max(2, n - 1))}
          >
            –
          </button>
          <div className="w-10 text-center text-sm font-semibold">{attendants}</div>
          <button
            type="button"
            className="h-9 w-9 rounded-full bg-white/10 text-lg hover:bg-white/15"
            onClick={() => setAttendants((n) => Math.min(99, n + 1))}
          >
            +
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const per = perAttendant(p);
          const total = per * attendants;
          const isRecommended = p.key === "professional";
          return (
            <div key={p.key} className={["rounded-2xl border bg-white/5 p-4", isRecommended ? "border-indigo-400/30" : "border-white/10"].join(" ")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{p.name}</div>
                {isRecommended ? (
                  <div className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-200">RECOMENDADO</div>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-zinc-400">{planPriceLabel}</div>
              <div className="mt-1 text-lg font-semibold">{brl(per)}</div>
              <div className="mt-3 text-xs text-zinc-400">Total</div>
              <div className="text-lg font-semibold">{brl(total)}</div>

              <button
                type="button"
                className="mt-4 w-full rounded-full bg-indigo-500/80 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => onSubscribe(p.key)}
                disabled={loading !== null}
              >
                {loading === p.key ? "Criando checkout…" : "Assine agora"}
              </button>

              <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded bg-emerald-500/15 text-center text-[10px] text-emerald-200">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

