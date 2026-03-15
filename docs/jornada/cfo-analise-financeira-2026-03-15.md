# CFO - Analise Financeira (Ruptur)

Data: 2026-03-15

## 1) Objetivo

Transformar a visao de produto do Ruptur em disciplina financeira operavel: crescer com caixa controlado, margem positiva e payback rapido.

## 2) Premissas atuais (fase 1)

- Estrategia inicial: operacao enxuta e baixo custo fixo.
- Produto em consolidacao: CRM + Inbox + Pipeline + Disparos + Conexoes + Billing.
- Canais e infraestrutura com custo variavel relevante (mensageria, proxy, IA e automacoes).
- Billing previsto com Asaas e regras de liberacao por plano.

## 3) Estrutura financeira alvo

Receita:
- Assinatura mensal por conta/tenant.
- Add-ons por uso (ex.: volume de mensagens, automacoes, recursos premium de IA).
- Servicos de setup/onboarding (opcional, sem virar dependencia de receita).

Custos variaveis:
- Proxies/instancias de canal.
- Consumo de IA por automacao/agente.
- Custos transacionais de billing e notificacoes.
- Ferramentas externas conectadas (quando habilitadas por cliente).

Custos fixos:
- Infra base (API, banco, observabilidade).
- Equipe minima de produto/engenharia/suporte.
- Operacao comercial essencial.

## 4) KPIs de CFO (painel semanal)

- MRR total e MRR novo (new MRR).
- Churn de receita (logo + receita).
- ARPA (ticket medio mensal por conta ativa).
- Margem de contribuicao por cliente e consolidada.
- CAC por canal e CAC payback (meses).
- LTV, LTV/CAC e burn multiple.
- Runway (meses de caixa).

## 5) Unit economics (modelo de decisao)

Formulas:
- `ARPA = MRR / contas_ativas`
- `MargemContrib = (MRR - custos_variaveis) / MRR`
- `LTV = ARPA * margem_bruta / churn_mensal`
- `CAC Payback (meses) = CAC / (ARPA * margem_bruta)`
- `LTV/CAC` alvo >= 3.0

Guardrails praticos:
- Margem de contribuicao alvo >= 70% (SaaS B2B enxuto).
- CAC payback alvo <= 6 meses.
- Churn de receita mensal alvo <= 3% na fase de tracao inicial.

## 6) Cenarios de referencia (hipoteses)

Observacao: numeros abaixo sao referencia inicial para planejamento; substituir por dados reais de vendas/custos.

| Cenario | Clientes Pagantes | Ticket Medio (R$) | MRR (R$) |
| --- | ---: | ---: | ---: |
| Conservador | 15 | 297 | 4.455 |
| Base | 30 | 349 | 10.470 |
| Agressivo | 60 | 399 | 23.940 |

Leitura CFO:
- Atingir o cenario base ja permite validacao comercial.
- O break-even depende de manter custo variavel controlado por cliente (especialmente canal + IA).
- Nao escalar time antes de validar churn e payback do canal principal de aquisicao.

## 7) Plano financeiro de 30 dias

1. Fechar tabela oficial de planos e add-ons (preco, limites, margem esperada).
2. Implantar dashboard semanal com MRR, churn, CAC, payback, margem e runway.
3. Separar custos por centro: `canal`, `IA`, `infra`, `comercial`, `suporte`.
4. Medir margem por tenant (nao apenas consolidado).
5. Definir gatilhos de decisao:
   - contratar apenas com payback estabilizado;
   - cortar experimento sem retorno em 30 dias;
   - revisar precificacao se margem de contribuicao cair abaixo do alvo.

## 8) Dados que faltam para analise financeira completa

- Base atual de clientes pagantes e trial.
- Ticket medio real por segmento.
- Churn mensal real (logos e receita).
- CAC por canal (organico, indicacao, outbound, midia paga).
- Custo variavel medio por cliente (canal + IA + operacao).
- Caixa atual e despesas fixas mensais.

## 9) Recomendacao executiva (CFO)

- Priorizar crescimento com margem, nao apenas volume.
- Tratar precificacao e limites de uso como parte do produto (nao como ajuste tardio).
- Publicar o painel financeiro semanal para decisao integrada entre produto, comercial e operacao.
