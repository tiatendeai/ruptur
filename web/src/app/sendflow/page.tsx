import Link from "next/link";

export default function SendflowPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Sendflow</h1>
          <p className="text-sm text-zinc-400">
            Fontes (grupos/comunidades/canais) + opt-in (ManyChat e similares). Entra lead com consentimento e fica
            rastreável.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Fontes</div>
          <div className="mt-1 text-xs text-zinc-400">
            Cadastre de onde o lead veio: grupo, comunidade, landing, ManyChat, etc.
          </div>
          <div className="mt-3">
            <code className="block rounded-lg bg-black/40 p-3 text-xs text-zinc-200">
              GET /sendflow/sources{"\n"}POST /sendflow/sources
            </code>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Opt-in</div>
          <div className="mt-1 text-xs text-zinc-400">
            Endpoint de entrada de leads com consentimento (ideal para integrações tipo ManyChat).
          </div>
          <div className="mt-3">
            <code className="block rounded-lg bg-black/40 p-3 text-xs text-zinc-200">
              POST /sendflow/optin{"\n"}
              {"{ provider, phone, name, source_id?, consent:true, proof:{} }"}
            </code>
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        Dica: combine isso com o CRM (Kanban) para cadências SDR e com Disparos para campanhas (sempre com opt-out).
        <span className="ml-2">
          <Link className="underline hover:text-zinc-300" href="/inbox">
            Ir para Inbox
          </Link>
        </span>
      </div>
    </div>
  );
}

