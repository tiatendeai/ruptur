# 🏛️ Infrastructure State: Source of Truth

> [!IMPORTANT]
> **NOTICE TO ALL AGENTS (A2A) & MCPs:** This directory represents the canonical physical infrastructure state (IaC, Docker Swarm, Observability) for the entire Ruptur Ecosystem. ALL architectural and deployment decisions MUST query this knowledge base first. Any assumptions made outside of this directory regarding server locations or active services are considered hallucinations.

---

## 🗺️ Mapa de Arquitetura em Tempo Real (DaC)

Nossos diagramas não ficam perdidos em PDFs corporativos. Eles são gerados dinamicamente via **Diagram as Code (Mermaid)** direto neste arquivo, lidos nativamente pelo GitHub, pela sua IDE e pelos Agentes A2A.

```mermaid
graph TD
    classDef cloud fill:#0d1117,stroke:#58a6ff,stroke-width:2px,color:#c9d1d9;
    classDef swarm fill:#161b22,stroke:#3fb950,stroke-width:2px,color:#c9d1d9;
    classDef db fill:#161b22,stroke:#d2a8ff,stroke-width:2px,color:#c9d1d9;
    classDef ops fill:#161b22,stroke:#ff7b72,stroke-width:2px,color:#c9d1d9;

    subgraph "🌐 External Traffic"
        Client[Usuários / Webhooks]
    end

    subgraph "infrastructure-state/ (Control Plane)"
        
        subgraph "☁️ Oracle Cloud (Core)"
            O1[Oracle Node 1 - Manager]:::cloud
            O2[Oracle Node 2 - Worker]:::cloud
            DB[(Supabase / Postgres)]:::db
        end
        
        subgraph "☁️ Hostinger (KVM2)"
            KVM2[KVM2 Node - Worker]:::cloud
        end

        subgraph "🐳 Docker Swarm Cluster"
            O1 --- KVM2
            O1 --- O2
            
            App[Ruptur Core App]:::swarm
            N8N[n8n Workflow]:::swarm
            Grafa[Grafana / Prom]:::ops
            Aquec[Aquecimento de Chips ?]:::swarm
        end
        
        O1 --> App
        KVM2 --> N8N
        KVM2 --> Grafa
        O2 --> Aquec
    end

    Client --> App
    Client --> N8N
```

---

## 📋 Como este diretório funciona?

1. **Governança Estrita**: Tudo o que roda fisicamente nos servidores deve ter seu manifesto (`.tf`, `docker-compose.yml`) documentado aqui.
2. **Separação de Preocupações (SoC)**:
   - `iac/`: Código Terraform que cria as VPS (Hostinger/Oracle).
   - `swarm/`: Configurações de Deploy (o que roda sobre a VPS).
   - `playbooks/`: Procedimentos Operacionais Padrão (SOPs) para que IAs possam curar a infraestrutura quando algo cair.
3. **Wipe & Rebuild**: Se um servidor estiver corrompido ou cheio (ex: KVM2 cheio de logs), a recuperação é reinstalar a máquina e rodar o estado definido nesta pasta. Nenhuma configuração manual é permitida.
