export default function ConnectionsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">Conexões</h1>
      <p className="text-sm text-zinc-400">
        Conecte seus canais de atendimento (WhatsApp hoje; multicanal depois). O Ruptur usa um canal primário e mantém
        contingência quando necessário.
      </p>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Próximo passo: listar conexões existentes e mostrar QR quando precisar conectar um novo número.
      </div>
    </div>
  );
}
