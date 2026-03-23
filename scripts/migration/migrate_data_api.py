"""
Script de Migração Resiliente de Dados (Oracle -> KVM2)
Este script transfere registros entre instâncias do Supabase via API REST.
"""
import requests
import json
import re
import os

# Configurações carregadas via variáveis de ambiente para segurança
SOURCE_URL = os.getenv("SOURCE_SUPABASE_URL")
SOURCE_KEY = os.getenv("SOURCE_SUPABASE_ANON_KEY")

DEST_URL = os.getenv("DEST_SUPABASE_URL")
DEST_KEY = os.getenv("DEST_SUPABASE_SERVICE_ROLE_KEY")

TABLES = [
    "clients",
    "cfo_clients",
    "campaigns",
    "channels",
    "leads",
    "message_logs",
    "messages",
    "warmup_instances",
    "warmup_groups",
    "warmup_rules",
    "dispatch_queue"
]

COLS_TO_STRIP = ["user_id", "created_by", "updated_by"]

def migrate_table(table_name):
    if not all([SOURCE_URL, SOURCE_KEY, DEST_URL, DEST_KEY]):
        print("❌ Erro: Variáveis de ambiente (SOURCE_SUPABASE_URL, etc) não configuradas.")
        return

    print(f"Migrando tabela: {table_name}...")
    headers_source = {"apikey": SOURCE_KEY, "Authorization": f"Bearer {SOURCE_KEY}"}
    headers_dest = {
        "apikey": DEST_KEY, "Authorization": f"Bearer {DEST_KEY}",
        "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"
    }
    
    try:
        # 1. Obter dados da origem
        res_src = requests.get(f"{SOURCE_URL}/{table_name}", headers=headers_source)
        if res_src.status_code == 404:
            print(f"⚠️ Tabela {table_name} não encontrada na origem.")
            return
        res_src.raise_for_status()
        src_data = res_src.json()
        if not src_data: return print(f"ℹ️ Tabela {table_name} está vazia.")

        print(f"📦 Encontrados {len(src_data)} registros. Iniciando transferência forçada...")

        # Limpeza preventiva
        for row in src_data:
            for col in COLS_TO_STRIP:
                row.pop(col, None)

        chunk_size = 50
        for i in range(0, len(src_data), chunk_size):
            chunk = src_data[i:i + chunk_size]
            
            success = False
            while not success and chunk:
                res_post = requests.post(f"{DEST_URL}/{table_name}", headers=headers_dest, data=json.dumps(chunk))
                
                if res_post.status_code in [200, 201]:
                    print(f"✅ Chunk {i//chunk_size + 1} migrado.")
                    success = True
                else:
                    try:
                        err_payload = res_post.json()
                        msg = err_payload.get("message", "")
                        if "column" in msg.lower():
                            match = re.search(r"['\"](.*?)['\"] column", msg)
                            if match:
                                bad_col = match.group(1)
                                print(f"🧹 Removendo '{bad_col}' de {table_name}...")
                                for row in src_data: row.pop(bad_col, None)
                                chunk = src_data[i:i + chunk_size]
                            else:
                                break
                        else:
                            print(f"❌ Erro na tabela {table_name}: {msg}")
                            break
                    except:
                        break
    except Exception as e:
        print(f"❌ Falha crítica em {table_name}: {e}")

if __name__ == "__main__":
    for table in TABLES:
        migrate_table(table)
    print("\n🏁 Processo de migração concluído.")
