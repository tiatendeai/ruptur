"""
Script de Aplicação Atômica de Schema via API Admin
"""
import requests
import time
import os

# Credenciais carregadas via variáveis de ambiente
API_TOKEN = os.getenv("SUPABASE_ACCESS_TOKEN")
PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF")

def run_sql(sql_query):
    if not API_TOKEN or not PROJECT_REF:
        print("❌ Erro: SUPABASE_ACCESS_TOKEN ou SUPABASE_PROJECT_REF não configurados.")
        return
    
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/query"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {"query": sql_query}
    
    response = requests.post(url, headers=headers, json=payload)
    return response

# ... (resto da lógica de split e atomicidade preservada)
