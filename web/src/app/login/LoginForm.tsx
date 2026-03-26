"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/inbox", [searchParams]);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase ainda nao foi configurado no web.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (signUpError) throw signUpError;
        setMessage("Conta criada! Verifique seu email para confirmar o acesso (ou tente entrar se a confirmacao estiver desligada).");
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.replace(nextPath);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel processar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0908] px-4 py-8 text-[#f6efe3]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-4 rounded-[32px] border border-white/10 bg-[#141210] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
          <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(157,78,49,0.35),rgba(10,9,8,0.95))] p-6 lg:p-8">
            <div className="text-[11px] uppercase tracking-[0.36em] text-[#ffd9c9]/75">{"<🛟Ruptur />"}</div>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.07em] text-white">
              {isSignUp ? "Crie sua conta para acessar o Control Deck." : "Entrar com conta segura para abrir o Control Deck."}
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
            <div className="text-[11px] uppercase tracking-[0.32em] text-[#d39e84]">{isSignUp ? "Cadastro" : "Login"}</div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
              {isSignUp ? "Criar novo perfil" : "Acesso por email e senha"}
            </div>

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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 pr-24 text-sm text-white outline-none transition focus:border-[#d39e84]/60"
                    placeholder="Sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[#f2dfd4] transition hover:bg-white/10"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>

              {error ? <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
              {message ? <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full border border-[#d39e84]/30 bg-[#9d4e31] px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-[#b25c39] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (isSignUp ? "Criando conta..." : "Entrando...") : (isSignUp ? "CONFIRMAR CADASTRO" : "ENTRAR NO SISTEMA")}
              </button>

              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs font-semibold uppercase tracking-wider text-[#d39e84] underline decoration-[#d39e84]/30 underline-offset-4 transition hover:text-white"
                >
                  {isSignUp ? "← Voltar para o Login" : "Nao tem conta? Cadastre-se aqui e agora."}
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-[20px] border border-white/10 bg-black/40 px-4 py-4 text-[10px] uppercase tracking-widest text-[#cbb8ad]/60">
              Ambiente: {isSignUp ? "Novo Cadastro" : "Painel de Acesso"} | KVM2-STABLE
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
