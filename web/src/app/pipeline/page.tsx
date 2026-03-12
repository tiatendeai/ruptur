export default function PipelinePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">Pipeline</h1>
      <p className="text-sm text-zinc-400">
        Kanban (MVP): estágios vêm de <code className="rounded bg-white/10 px-1">/crm/stages</code> e leads de{" "}
        <code className="rounded bg-white/10 px-1">/crm/leads</code>.
      </p>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Próximo passo: drag & drop e atualização de status (stage) com auditoria.
      </div>
    </div>
  );
}

