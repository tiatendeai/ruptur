"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/inbox", label: "MyChat", kicker: "Inbox" },
  { href: "/pipeline", label: "Pipeline", kicker: "CRM" },
  { href: "/broadcasts", label: "Campanhas", kicker: "Disparos" },
  { href: "/warmup", label: "Warmup", kicker: "Maturacao" },
  { href: "/connections", label: "Conexoes", kicker: "Canais" },
  { href: "/sendflow", label: "Sendflow", kicker: "Fluxos" },
  { href: "/metrics", label: "Metricas", kicker: "Saude" },
  { href: "/billing", label: "Planos", kicker: "Receita" },
];

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(14,165,233,0.2),transparent_24%),linear-gradient(180deg,#0b1115_0%,#12191e_52%,#d7d2c5_52%,#d7d2c5_100%)] text-zinc-950">
      <div className="mx-auto min-h-dvh max-w-[1680px] px-3 py-3 sm:px-4 lg:px-5">
        <div className="grid min-h-[calc(100dvh-1.5rem)] grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[32px] border border-black/10 bg-[#0f171c] text-zinc-50 shadow-[0_32px_120px_rgba(0,0,0,0.34)]">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(15,23,28,0.9))] px-5 pb-5 pt-6">
              <div className="text-[11px] uppercase tracking-[0.45em] text-amber-200/75">Ruptur Ops</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="font-sans text-3xl font-semibold leading-none tracking-[-0.04em]">Console</div>
                  <div className="mt-2 max-w-[16rem] text-sm text-zinc-300">
                    cockpit comercial para mensageria, CRM e intervencao operacional
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-zinc-300">
                  live
                </div>
              </div>
            </div>

            <div className="px-3 pb-4 pt-3">
              <div className="grid grid-cols-2 gap-2 px-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  canal primario
                  <div className="mt-2 text-xs text-zinc-200">uazapi</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  contingencia
                  <div className="mt-2 text-xs text-zinc-200">baileys</div>
                </div>
              </div>
            </div>

            <nav className="grid gap-2 px-3 pb-4">
              {NAV_ITEMS.map((item, index) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group relative overflow-hidden rounded-[24px] border px-4 py-4 transition",
                      active
                        ? "border-amber-300/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(255,255,255,0.05))] text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                        : "border-white/8 bg-white/[0.03] text-zinc-300 hover:border-white/15 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <div className="absolute right-3 top-3 font-mono text-[10px] text-zinc-500">0{index + 1}</div>
                    <div className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">{item.kicker}</div>
                    <div className="mt-2 font-sans text-lg font-medium tracking-[-0.03em]">{item.label}</div>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <header className="overflow-hidden rounded-[32px] border border-black/10 bg-[#efe9de] px-5 py-4 shadow-[0_24px_90px_rgba(0,0,0,0.16)]">
              <div className="grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="flex flex-col justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.42em] text-zinc-500">Operational Layer</div>
                  <div className="max-w-3xl font-sans text-3xl font-semibold leading-[0.95] tracking-[-0.05em] text-zinc-950">
                    operacao visivel para campanhas, inbox, aquecimento e decisao comercial em um unico cockpit
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[24px] border border-black/10 bg-white/80 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">estado</div>
                    <div className="mt-2 text-sm font-medium text-zinc-900">preview de producao</div>
                  </div>
                  <div className="rounded-[24px] border border-black/10 bg-[#0f171c] px-4 py-3 text-zinc-50">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">dominio</div>
                    <div className="mt-2 text-sm font-medium">app.ruptur.cloud</div>
                  </div>
                  <div className="rounded-[24px] border border-black/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(255,255,255,0.9))] px-4 py-3">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">foco</div>
                    <div className="mt-2 text-sm font-medium text-zinc-900">entrega ponta a ponta</div>
                  </div>
                </div>
              </div>
            </header>

            <main className="min-h-0 overflow-hidden rounded-[32px] border border-black/10 bg-[#d7d2c5] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.18)] sm:p-4 lg:p-5">
              <div className="min-h-full overflow-auto rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(244,239,232,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-5">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
