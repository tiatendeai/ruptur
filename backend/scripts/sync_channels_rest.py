import requests
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Configurações reais
UAZAPI_URL = "https://tiatendeai.uazapi.com"
UAZAPI_TOKEN = os.getenv("RUPTUR_UAZAPI_ADMIN_TOKEN")
SUPABASE_URL = os.getenv("RUPTUR_SUPABASE_URL")
SUPABASE_KEY = os.getenv("RUPTUR_SUPABASE_PUBLISHABLE_KEY")

def sync_via_rest():
    print("🚀 Iniciando Sync Definitivo (Uazapi -> Supabase REST)...")
    
    headers_supabase = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    # 1. Pegar UID do Diego na Auth
    # Via API auth.users não é acessível publicamente. Vamos buscar o UID que já existe na tabela jarvis_profiles!
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/jarvis_profiles?select=user_id&limit=1", headers=headers_supabase)
    if resp.status_code != 200 or not resp.json():
        print("❌ Não foi possível encontrar o user_id do Diego nos perfis do Jarvis.")
        return
    
    diego_id = resp.json()[0]['user_id']
    print(f"✅ UID Diego recuperado: {diego_id}")

    # 2. Buscar Instâncias
    print("📡 Buscando Uazapi...")
    resp = requests.get(f"{UAZAPI_URL}/instance/all", headers={"admintoken": UAZAPI_TOKEN})
    if resp.status_code != 200:
        print(f"❌ Erro Uazapi: {resp.status_code}")
        return
    
    instances = resp.json()
    print(f"📦 {len(instances)} instâncias encontradas.")

    for inst in instances:
        inst_id = inst.get('id') or inst.get('name')
        name = inst.get('name')
        status = inst.get('status', 'open').upper()
        phone = inst.get('profileName') or name

        # A) Inserir em Channels
        ch_payload = {
            "id": f"ch_{inst_id}",
            "user_id": diego_id,
            "provider": "uazapi",
            "instance_id": inst_id,
            "name": name,
            "phone_number": phone,
            "status": status,
            "is_active": True
        }
        res_ch = requests.post(f"{SUPABASE_URL}/rest/v1/channels", headers=headers_supabase, json=ch_payload)
        
        if res_ch.status_code in [201, 200, 409]: # 409 é conflito (já existe)
            if res_ch.status_code == 409:
                requests.patch(f"{SUPABASE_URL}/rest/v1/channels?id=eq.ch_{inst_id}", headers=headers_supabase, json={"is_active": True, "name": name, "status": status})
            print(f"✅ Canal {name} sincronizado.", end=" ")
        else:
            print(f"❌ Erro CH {name}: {res_ch.text}")

        # B) Inserir em Warmup Instances
        w_payload = {
            "id": f"warmup_{inst_id}",
            "user_id": diego_id,
            "data": inst
        }
        res_w = requests.post(f"{SUPABASE_URL}/rest/v1/warmup_instances", headers=headers_supabase, json=w_payload)
        if res_w.status_code == 409:
             requests.patch(f"{SUPABASE_URL}/rest/v1/warmup_instances?id=eq.warmup_{inst_id}", headers=headers_supabase, json={"data": inst})
             
        # C) Inserir em channel_warmup_status para o kanban funcionar
        ws_payload = {
            "channel_id": f"ch_{inst_id}",
            "is_active": True,
            "current_day": 1,
            "profile_type": "NOVO"
        }
        res_ws = requests.post(f"{SUPABASE_URL}/rest/v1/channel_warmup_status", headers=headers_supabase, json=ws_payload)
        if res_ws.status_code == 409:
            pass # já existe, blz

        print("-> Warmup OK.")

if __name__ == "__main__":
    sync_via_rest()
