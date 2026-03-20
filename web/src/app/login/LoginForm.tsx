"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/inbox", [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"email" | "password" | "signup" | "forgot" | "forgot_success">("email");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase ainda nao foi configurado no web.");
      return;
    }

    if (view === "email") {
      if (!email.trim()) {
        setError("Por favor, insira um e-mail.");
        return;
      }
      setView("password");
      return;
    }

    setLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      
      if (view === "password") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        router.replace(nextPath);
        router.refresh();
      } else if (view === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${siteUrl()}/auth/callback?next=/inbox`,
          }
        });

        if (signUpError) throw signUpError;
        
        setError("Conta criada com sucesso! Verifique seu e-mail ou faca o login.");
        setView("password");
      } else if (view === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${siteUrl()}/auth/callback?next=/update-password`,
        });
        
        if (resetError) throw resetError;
        
        setView("forgot_success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel processar a solicitacao agora.");
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
            <div className="text-[11px] uppercase tracking-[0.32em] text-[#d39e84]">
              {view === "signup" ? "Cadastro" : view === "forgot" || view === "forgot_success" ? "Recuperacao" : "Login"}
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
              {view === "email" 
                ? "Acesse sua conta" 
                : view === "password"
                ? "Digite sua senha"
                : view === "signup"
                ? "Crie sua conta"
                : view === "forgot" 
                ? "Recuperar senha" 
                : "Email enviado"}
            </div>

            {view === "forgot_success" ? (
              <div className="mt-8 space-y-4">
                <p className="text-sm text-[#f2dfd4]/80">
                  Se este e-mail estiver cadastrado, voce recebera um link para redefinir sua senha.
                </p>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Voltar para o login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {(view === "email" || view === "signup" || view === "forgot") && (
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
                )}

                {view === "password" && (
                  <div className="space-y-4">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70 flex justify-between items-center">
                      <span>{email}</span>
                      <button type="button" onClick={() => setView("email")} className="text-xs text-[#d39e84] hover:underline">Editar</button>
                    </div>
                    
                    <label className="block space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#dcc8bb]">Senha</span>
                        <button
                          type="button"
                          onClick={() => setView("forgot")}
                          className="text-xs text-[#d39e84] hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
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
                  </div>
                )}

                {view === "signup" && (
                  <label className="block space-y-2 mt-4">
                    <span className="text-sm text-[#dcc8bb]">Criar Senha</span>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
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
                )}

                {error ? <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full border border-[#d39e84]/30 bg-[#9d4e31] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#b25c39] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading 
                      ? "Processando..." 
                      : view === "email" 
                      ? "Continuar" 
                      : view === "password"
                      ? "Entrar"
                      : view === "signup"
                      ? "Cadastrar"
                      : "Enviar validacao"}
                  </button>

                  {view === "email" && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setView("signup")}
                      className="w-full text-center text-sm font-medium text-[#dcc8bb] transition hover:text-white mt-2"
                    >
                      Nao tem uma conta? Cadastre-se
                    </button>
                  )}
                  
                  {view === "signup" && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setView("email")}
                      className="w-full text-center text-sm font-medium text-[#dcc8bb] transition hover:text-white mt-2"
                    >
                      Ja tem uma conta? Fazer login
                    </button>
                  )}

                  {view === "forgot" && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setError(null);
                        setView("email");
                      }}
                      className="w-full text-center text-sm font-medium text-[#dcc8bb] transition hover:text-white"
                    >
                      Voltar para o login
                    </button>
                  )}
                </div>
              </form>
            )}

          </section>
        </div>
      </div>
    </div>
  );
}
