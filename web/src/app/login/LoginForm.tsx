"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/inbox", [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase ainda nao foi configurado no web.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel entrar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0908] px-4 py-8 text-[#f6efe3]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-4 rounded-[32px] border border-white/10 bg-[#141210] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(157,78,49,0.35),rgba(10,9,8,0.95))] p-6 lg:p-8">
            <div className="text-[11px] uppercase tracking-[0.36em] text-[#ffd9c9]/75">Ruptur Access</div>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.07em] text-white">
              Entrar com conta segura para abrir o Control Deck.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#f2dfd4]/80">
              Aqui entram as areas protegidas do Inbox, CRM, conexoes, billing, warmup, Studio, Jarvis e CFO.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "sessao segura",
                "controle de acesso",
                "trilha de operacao",
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[#f7e9dd]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#11100f] p-6 lg:p-8">
            <div className="text-[11px] uppercase tracking-[0.32em] text-[#d39e84]">Login</div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">Acesso por email e senha</div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-[#dcc8bb]">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[#d39e84]/60"
                  placeholder="voce@empresa.com"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-[#dcc8bb]">Senha</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[#d39e84]/60"
                  placeholder="Sua senha"
                  required
                />
              </label>

              {error ? <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full border border-[#d39e84]/30 bg-[#9d4e31] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#b25c39] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-[#cbb8ad]">
              Se a base de autenticacao ainda nao estiver ligada, esta tela vai avisar e bloquear o acesso.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
