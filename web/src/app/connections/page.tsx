export default function ConnectionsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">Conexões</h1>
      <p className="text-sm text-zinc-400">
        UAZAPI é o primário (multi-instâncias nativas). Baileys fica como contingência e ampliação de escopo.
      </p>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Próximo passo: listar instâncias UAZAPI (<code className="rounded bg-white/10 px-1">/integrations/uazapi/instances</code>)
        e mostrar QR quando precisar conectar.
      </div>
    </div>
  );
}

