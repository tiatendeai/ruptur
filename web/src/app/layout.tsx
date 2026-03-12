import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruptur Console",
  description: "Inbox, CRM e operação de WhatsApp (UAZAPI + Baileys)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}
      >
        <div className="min-h-dvh">
          <div className="mx-auto grid min-h-dvh max-w-7xl grid-cols-12 gap-0">
            <aside className="col-span-12 border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur md:col-span-3 md:min-h-dvh md:border-b-0 md:border-r">
              <div className="flex items-center justify-between md:block">
                <div>
                  <div className="text-sm font-semibold tracking-wide">Ruptur</div>
                  <div className="text-xs text-zinc-400">Console</div>
                </div>
              </div>
              <nav className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-1">
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/inbox">
                  Inbox
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/pipeline">
                  Pipeline
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/broadcasts">
                  Disparos
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/connections">
                  Conexões
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/sendflow">
                  Sendflow
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/metrics">
                  Métricas
                </Link>
                <Link className="rounded-lg px-3 py-2 text-sm hover:bg-white/5" href="/billing">
                  Planos
                </Link>
              </nav>
              <div className="mt-6 hidden text-xs text-zinc-500 md:block">
                UAZAPI primário • Baileys contingência
              </div>
            </aside>
            <main className="col-span-12 bg-zinc-950 px-4 py-6 md:col-span-9 md:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
