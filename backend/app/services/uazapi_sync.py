import requests
from app.db import connect
from app.repositories import growth_repo
from psycopg.types.json import Jsonb

# Configurações reais (Uazapi)
UAZAPI_URL = "https://tiatendeai.uazapi.com"
UAZAPI_TOKEN = "UmiLwsiyjN01ipt5XuaU97vC4PTyPwHfhFN15CyHvJklANTzGX"

def sync_operation():
    print("🚀 Iniciando Sincronização Nativa Uazapi -> KVM2...")
    
    # 1. Obter Diego ID via DB local
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM auth.users WHERE email = 'tiatendeai@gmail.com' LIMIT 1")
            res = cur.fetchone()
            if not res:
                print("❌ Usuário tiatendeai@gmail.com não encontrado no banco local.")
                return
            diego_id = res[0]
            print(f"✅ UID Diego Identificado: {diego_id}")

            # 2. Buscar instâncias na Uazapi
            print("📡 Buscando dados na Uazapi...")
            headers = {"admintoken": UAZAPI_TOKEN}
            response = requests.get(f"{UAZAPI_URL}/instances", headers=headers)
            if response.status_code != 200:
                print(f"❌ Erro Uazapi: {response.status_code}")
                return
            
            instances = response.json()
            data = instances.get('instances', instances) if isinstance(instances, dict) else instances
            print(f"📦 {len(data)} instâncias encontradas.")

            # 3. Mapear e Salvar
            for inst in data:
                inst_id = inst.get('instance') or inst.get('id') or inst.get('name')
                if not inst_id: continue
                
                status = inst.get('status', 'unknown').upper()
                
                # Inserir Canais
                cur.execute("""
                    INSERT INTO channels (id, user_id, provider, instance_id, status, created_at, updated_at)
                    VALUES (%s, %s, 'uazapi', %s, 'open', now(), now())
                    ON CONFLICT (id) DO UPDATE SET updated_at = now();
                """, (f"ch_{inst_id}", diego_id, inst_id))

                # Inserir Saúde (via repo para seguir o padrão)
                growth_repo.upsert_channel_health(
                    conn,
                    provider="uazapi",
                    instance_id=inst_id,
                    score=inst.get('score', 95),
                    status=status,
                    metrics=inst
                )

                # Inserir Warmup
                cur.execute("""
                    INSERT INTO warmup_instances (id, user_id, data, created_at, updated_at)
                    VALUES (%s, %s, %s, now(), now())
                    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
                """, (f"warmup_{inst_id}", diego_id, Jsonb(inst)))
        
        conn.commit()
    print("✨ Sincronização concluída com sucesso!")

if __name__ == "__main__":
    sync_operation()
