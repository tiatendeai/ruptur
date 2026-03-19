"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  kicker: string;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/inbox", label: "MyChat", kicker: "Inbox" },
  { href: "/crm", label: "CRM", kicker: "Modulo" },
  { href: "/pipeline", label: "Pipeline", kicker: "CRM" },
  { href: "/broadcasts", label: "Campanhas", kicker: "Disparos" },
  { href: "/connections", label: "Conexoes", kicker: "Canais" },
  { href: "https://app.ruptur.cloud/warmup", label: "Warmup", kicker: "Maturacao", external: true },
  { href: "/sendflow", label: "Sendflow", kicker: "Fluxos" },
  { href: "/metrics", label: "Metricas", kicker: "Saude" },
  { href: "/billing", label: "Planos", kicker: "Receita" },
  { href: "https://studio.ruptur.cloud", label: "Studio", kicker: "Connectome", external: true },
];

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  if (pathname === "/" || pathname.startsWith("/showcase") || pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  const currentItem = NAV_ITEMS.find((item) => pathname.startsWith(item.href)) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-dvh text-zinc-950">
      <div className="mx-auto min-h-dvh max-w-[1720px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="mb-3 overflow-hidden rounded-[28px] border border-black/10 bg-[#fcfaf5] shadow-[0_18px_64px_rgba(70,43,31,0.1)] lg:hidden">
          <div className="border-b border-black/10 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.34em] text-[#9d4e31]">Ruptur Ops</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-zinc-950">{currentItem.label}</div>
              </div>
              <div className="rounded-full border border-[#9d4e31]/20 bg-[#fffaf2] px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9d4e31]">
                live
              </div>
            </div>
            <div className="mt-3 text-sm text-zinc-600">operacao assistida com prioridade clara e modulo principal sempre visivel no mobile.</div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-3 py-3">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "min-w-[132px] rounded-[20px] border px-4 py-3 transition",
                    active
                      ? "border-[#9d4e31]/30 bg-[#fff8ef] text-zinc-950 shadow-[0_14px_32px_rgba(70,43,31,0.1)]"
                      : "border-black/8 bg-[#fbf7f0] text-zinc-700 hover:border-black/15 hover:bg-white",
                  ].join(" ")}
                >
                  <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{item.kicker}</div>
                  <div className="mt-2 text-sm font-medium tracking-[-0.03em]">{item.label}</div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="grid min-h-[calc(100dvh-1.5rem)] gap-3 lg:grid-cols-[264px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[32px] border border-black/10 bg-[#f8f4ec]/95 shadow-[0_24px_80px_rgba(70,43,31,0.12)] backdrop-blur lg:flex">
            <div className="border-b border-black/10 px-5 pb-5 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.42em] text-[#9d4e31]">Ruptur Ops</div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-[#9d4e31]/20 bg-[#fffaf2] px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9d4e31]">
                    live
                  </div>
                  <LogoutButton />
                </div>
              </div>
              <div className="mt-5 text-[2.4rem] font-semibold leading-[0.9] tracking-[-0.08em] text-[#16110f]">
                Control
                <br />
                Deck
              </div>
              <p className="mt-4 max-w-[16rem] text-sm leading-6 text-zinc-600">
                operacao comercial com leitura rapida, contexto continuo e menos ruido visual.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px border-b border-black/10 bg-black/10 text-[10px] uppercase tracking-[0.28em]">
              <div className="bg-[#f3ecdf] px-4 py-4 text-zinc-500">
                stack
                <div className="mt-2 text-xs tracking-[0.12em] text-zinc-900">uazapi primaria + baileys contingencia</div>
              </div>
              <div className="bg-[#f3ecdf] px-4 py-4 text-zinc-500">
                ambiente
                <div className="mt-2 text-xs tracking-[0.12em] text-zinc-900">app.ruptur.cloud</div>
              </div>
            </div>

            <nav className="grid gap-2 px-3 py-4 sm:grid-cols-2 lg:grid-cols-1">
              {NAV_ITEMS.map((item, index) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    className={[
                      "group relative overflow-hidden rounded-[22px] border px-4 py-4 transition",
                      item.external ? "sm:col-span-2 lg:col-span-1" : "",
                      active
                        ? "border-[#9d4e31]/30 bg-[#fff8ef] text-zinc-950 shadow-[0_14px_32px_rgba(70,43,31,0.1)]"
                        : "border-black/8 bg-[#fbf7f0] text-zinc-700 hover:border-black/15 hover:bg-white",
                    ].join(" ")}
                  >
                    <div className="absolute right-3 top-3 font-mono text-[10px] text-zinc-400">0{index + 1}</div>
                    <div className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">{item.kicker}</div>
                    <div className="mt-2 font-sans text-lg font-medium tracking-[-0.04em]">{item.label}</div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-black/10 px-5 py-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">modo</div>
              <div className="mt-2 text-sm text-zinc-700">operacao assistida com primario e contingencia definidos</div>
            </div>
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <header className="hidden overflow-hidden rounded-[32px] border border-black/10 bg-[#fcfaf5] shadow-[0_18px_64px_rgba(70,43,31,0.1)] lg:block">
              <div className="grid gap-px xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="bg-[#fcfaf5] px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.38em] text-zinc-500">
                    <span>{currentItem.kicker}</span>
                    <span className="rounded-full border border-black/10 px-2.5 py-1 tracking-[0.22em] text-[#9d4e31]">
                      {currentItem.label}
                    </span>
                  </div>
                  <div className="mt-4 max-w-4xl font-sans text-3xl font-semibold leading-[0.94] tracking-[-0.065em] text-zinc-950 sm:text-[2.8rem]">
                    operacao clara, decisao rapida e menos cenografia entre a equipe e a conversa.
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">uazapi primaria</span>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">contingencia pronta</span>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">crm em linha</span>
                  </div>
                </div>

                <div className="grid gap-px bg-black/10 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="bg-[#efe4d4] px-5 py-4">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">estado</div>
                    <div className="mt-2 text-sm font-medium text-zinc-900">producao assistida</div>
                  </div>
                  <div className="bg-[#9d4e31] px-5 py-4 text-[#fff7ee]">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-200">modulo ativo</div>
                    <div className="mt-2 text-sm font-medium">{currentItem.label}</div>
                  </div>
                  <div className="bg-[#efe4d4] px-5 py-4">
                    <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">foco</div>
                    <div className="mt-2 text-sm font-medium text-zinc-900">leitura, resposta e governanca</div>
                    <div className="mt-3">
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="min-h-0 overflow-hidden rounded-[32px] border border-black/10 bg-[#fffdf8]/90 p-2 shadow-[0_28px_90px_rgba(70,43,31,0.12)] sm:p-3">
              <div className="min-h-full overflow-auto rounded-[26px] bg-[#fffaf2] p-4 text-zinc-950 sm:p-5">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
