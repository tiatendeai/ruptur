export default function BroadcastsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Disparos & Campanhas</h1>
      <p className="text-sm text-zinc-400">
        Aqui vamos controlar campanhas 1:1 e campanhas para grupos, com opt-in, warmup/delay e auditoria.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Campanha 1:1</div>
          <div className="mt-1 text-xs text-zinc-400">
            Sequências SDR com opt-in + warmup/delay e pausas por risco.
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Campanha em Grupo</div>
          <div className="mt-1 text-xs text-zinc-400">
            Postagens segmentadas em grupos/comunidades (Sendflow sources).
          </div>
        </div>
      </div>
    </div>
  );
}
