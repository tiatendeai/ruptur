# Blueprint oficial — Ruptur

## 1) Origem

O Ruptur nasce da observação de um problema recorrente no empreendedor brasileiro: existe acesso a tecnologia, IA e plataformas digitais, mas falta uma forma **simples e prática** de operar tudo isso no dia a dia.

Na prática, muitos empreendedores precisam aprender integrações, APIs e automações antes de conseguir tocar a operação comercial com previsibilidade.

**Hipótese fundadora:** o empreendedor não deveria operar ferramentas; as ferramentas deveriam operar para o empreendedor.

## 2) Tese central

O empreendedor não precisa aprender tecnologia.
A tecnologia precisa operar para ele.

O Ruptur é um núcleo de automação empresarial que:

- conecta ferramentas existentes;
- orquestra agentes especialistas;
- executa processos operacionais;
- responde a comandos simples (incluindo áudio).

## 3) Problema que resolvemos

Hoje a operação comercial costuma estar fragmentada em:

- WhatsApp;
- CRM;
- agenda;
- automações;
- marketing;
- follow-up;
- relatórios.

Resultados comuns da fragmentação:

- leads perdidos;
- follow-ups esquecidos;
- oportunidades desperdiçadas;
- sobrecarga cognitiva.

## 4) Experiência do usuário (UX alvo)

Interação natural e orientada à execução.

### Exemplo

**Entrada (áudio):**

> “Veja como estão os leads hoje e marque visita para os mais interessados.”

**Fluxo interno:**

1. transcrição;
2. interpretação da intenção;
3. planejamento da tarefa;
4. execução por agentes;
5. resposta resumida.

**Saída esperada:**

> “Hoje entraram 17 leads. 4 estão quentes. Marquei visita com 2 para amanhã.”

## 5) Arquitetura conceitual

A arquitetura combina três pilares:

### MCP (Model Context Protocol)

Conexão com ferramentas externas sem recriá-las.

Exemplos de conectores:

- Supabase;
- Google Calendar;
- WhatsApp APIs;
- Notion;
- Gmail.

### ADK (Agent Development Kit)

Estrutura modular para agentes especializados, por exemplo:

- lead sentinel;
- conversation agent;
- follow-up agent;
- calendar agent;
- report agent;
- memory agent.

Cada agente tem responsabilidades claras, skills e plugins.

### A2A (Agent-to-Agent)

Coordenação entre agentes.

Exemplo: o agente central delega simultaneamente para qualificação, agenda e follow-up.

## 6) Superagente (orquestrador)

Nome conceitual: **Jarvis**.

Papel:

- receber solicitações;
- interpretar intenção;
- decompor tarefas;
- coordenar agentes especialistas;
- consolidar e responder resultados.

## 7) Princípio técnico fundamental

**API-first**. As interfaces são superfícies; o núcleo é a API.

Fluxo lógico:

```text
User
↓
Interface (WhatsApp / Web / CLI)
↓
API
↓
Event System
↓
Orchestrator
↓
Agents
↓
Tools (MCP)
```

## 8) Stack inicial (fase 1)

Critério: priorizar o que já existe com tier gratuito.

- **Infra:** Supabase (banco, storage, edge functions)
- **Comunicação:** WhatsApp API
- **Agenda:** Google Calendar API
- **IA:** OpenAI ou modelo compatível
- **Backend:** Python
- **Orquestração:** arquitetura orientada a eventos

## 9) Estrutura alvo do repositório

```text
ruptur/
  core/
    api/
    events/
    orchestrator/

  agents/
    lead_sentinel/
    conversation/
    followup/
    calendar/
    report/

  skills/
    crm/
    qualification/
    sales/
    operations/

  plugins/
    supabase/
    google_calendar/
    whatsapp/

  docs/
    genesis/
    arquitetura/
    manifesto/
    blueprint/

  experiments/
```

## 10) Próximos passos (execução)

1. fechar modelagem mínima de dados (`leads`, `conversations`, `messages`, `pipeline_events`);
2. criar webhook de entrada e persistência idempotente de mensagens;
3. implementar qualificação v1 por regras;
4. implementar rotina de follow-up para contatos sem resposta;
5. criar visão simples de pipeline por estágio;
6. consolidar o primeiro fluxo completo em produção assistida.

> Plano operacional detalhado: `docs/jornada/proximos_passos_fase1.md`.

## 11) Roadmap

### Fase 1 — Ruptur Core

Objetivo: operar um negócio real com previsibilidade.

Capacidades:

- captura de leads;
- memória de conversa;
- classificação;
- follow-up;
- agenda.

### Fase 2 — Templates de operação

Pacotes por segmento:

- imobiliária;
- agência;
- serviços locais.

### Fase 3 — Plugins MCP adicionais

Integrações com:

- CRMs externos;
- automação de marketing;
- plataformas de anúncio.

### Fase 4 — Produto replicável

Empacotar playbooks, observabilidade e onboarding para escala.

## 12) Princípios de design

A simplicidade de uso é mandatória.

Exemplo conceitual:

```python
ruptur.connect("supabase")
ruptur.connect("google_calendar")
ruptur.connect("whatsapp")

ruptur.run("qualifique novos leads e agende visitas")
```

## 13) Direção do produto

O Ruptur **não é**:

- CRM tradicional;
- chatbot isolado;
- automação visual sem contexto.

O Ruptur **é**:

- infraestrutura de automação empresarial orientada por agentes.

## 14) Referências (livros, repositórios e vídeos)

### Livro de base

- *Receita Previsível* — Aaron Ross & Marylou Tyler (`docs/literatura/receita_previsivel.md`)

### Repositórios

- Interface Design: <https://github.com/Dammyjay93/interface-design>
- Claude Code frontend plugin: <https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design>

### Vídeos analisados

- Design e frontend: <https://www.youtube.com/watch?v=ddBlmSQGVrU>
- Agent frameworks e automação:
  - <https://www.youtube.com/watch?v=c0nJB1y-SQI>
  - <https://www.youtube.com/watch?v=GpY41sPt5hA>
  - <https://www.youtube.com/watch?v=duWhy3-iG38>
  - <https://www.youtube.com/watch?v=6AxZMW-sQrY>
  - <https://www.youtube.com/watch?v=yt3z6t8cLzE>
  - <https://www.youtube.com/watch?v=52BZ24-a9kQ>
  - <https://www.youtube.com/watch?v=BqU0cUJRjh4>
  - <https://www.youtube.com/watch?v=ZuOEuVJK86Y>
  - <https://www.youtube.com/watch?v=ssiHUVbkRIo>

## 15) Apêndice

### A) Contexto cultural brasileiro

Muitos empreendedores operam com:

- mensagens de áudio;
- WhatsApp como canal principal;
- comunicação rápida e informal;
- baixa tolerância a setup técnico complexo.

O Ruptur deve se adaptar a esse contexto, e não exigir que o usuário se adapte ao software.

### B) Filosofia do projeto

O empreendedor deve focar no seu ofício.
O Ruptur cuida da máquina operacional.

### C) Frase de síntese

**Ruptur conecta agentes, ferramentas e plataformas para operar processos de negócio. Você descreve o que precisa. O Ruptur resolve.**
