<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/pop_quarentena_artefatos.md
Não edite manualmente aqui sem promover no STATE.
-->

# POP: Quarentena de Artefatos Intrusos (Protocolo OMEGA)

> [!CAUTION]
> **OBJETIVO DO PROCEDIMENTO:** 
> Prevenir a perda irreversível de dados enquanto higienizamos repositórios operacionais (como `vps-oracle`, `ruptur`, `alpha`, etc.). Nenhum arquivo grande ou de origem desconhecida deve ser deletado com `rm` ou `git rm -f` sem antes passar por este POP.

## 1. Escopo e Justificativa
Durante varreduras de agentes ou manutenção por desenvolvedores, arquivos "intrusos" ou de "lixo temporário" são frequentemente encontrados polindo a topologia (ex: PDFs colossais, logs soltos, backups do tipo `.bak` ou `.tmp`). 
Para evitar a perda de contexto histórico e permitir **reversão em 100% dos casos**, implementamos o fluxo de *Quarentena Passiva no Córtex Central (State)*.

## 2. A Métrica de Qualificação (O que vai para quarentena?)
Um arquivo deve ser movido para a quarentena do STATE se:
- **Tamanho:** For superior a 200KB e não for código-fonte ou `.csv`/tabelas nativas aprovadas.
- **Tipo:** For arquivo bloqueado/binário `.pdf`, `.zip`, `.tar.gz`, ou `.docx` alocado fora de `/docs` oficial.
- **Contexto:** Estiver "sobrando" na raiz sem justificativa rastreável no `ARCHITECTURE.md` do repositório local.

## 3. Fluxo de Transferência (O Padrão-Ouro)

### Passo A: Criar Manifesto (No STATE)
1. Antes de mover, o agente responsável (ex: J.A.R.V.I.S.) deve gerar um `manifesto` no STATE.
2. O arquivo será salvo em `state/quarantine/manifests/YYMMDD_REPO_LIMPEZA.md`.
3. **O manifesto DEVE conter:**
   - Origem exata (caminho absoluto anterior).
   - Nome do arquivo original.
   - Hash sumário (se necessário) ou Tamanho.
   - O porquê dele estar sendo isolado.
   - Instruções de REVERSÃO (comando exato de `mv` de volta).

### Passo B: Mover (Isolamento Físico)
Executar a movimentação dos arquivos ofensores do repositório alvo para a respectiva pasta `state/quarantine/blobs/[NOME_DO_REPO]/`.

### Passo C: Commits Gêmeos (A Rastreabilidade)
Sempre realizar dois commits paralelos e vinculados:
1. **No Repositório Alvo (Origem):** `git commit -m "chore(hygiene): remove artefatos pdf para quarentena OMEGA"`
2. **No Repositório STATE (Destino):** `git commit -m "chore(quarantine): isola arquivos do [REPO] documentados no manifesto X"`

## 4. Auditoria e Métricas Retentivas
A quarentena é um "Freezer". O Curador (Diego) deve periodicamente auditar `state/quarantine/` para decidir se os arquivos serão expurgados definitivamente ou realocados como Conhecimento Oficial (`knowledge/`). 

---
**Escrito por:** J.A.R.V.I.S. (Via Selo OMEGA)
**Ativo a partir de:** 2026-03-24
