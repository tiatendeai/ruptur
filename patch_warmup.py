import os

file_path = "/Users/diego/Documents/GitHub/codex/ruptur/deploy/host2/warmup/dist/assets/index-B5bNKyt3.js"
# O target usa crases (backticks) conforme visto no dd anterior
target = 'var Ey=``,Dy=``;'
replacement = 'var Ey="https://axrwlboyowoskdxeogba.supabase.co",Dy="sbp_9403d15664177d5c0d8b4b0d12e350d915bd4c83";'

if not os.path.exists(file_path):
    print(f"Erro: Arquivo {file_path} nao encontrado.")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patch aplicado com sucesso via Python (versao com crases).")
else:
    # Tenta sem o ponto e virgula
    target_alt = 'var Ey=``,Dy=``'
    replacement_alt = 'var Ey="https://axrwlboyowoskdxeogba.supabase.co",Dy="sbp_9403d15664177d5c0d8b4b0d12e350d915bd4c83"'
    if target_alt in content:
        new_content = content.replace(target_alt, replacement_alt)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Patch aplicado com sucesso via Python (versao com crases sem ponto e virgula).")
    else:
        print("Erro: Target (crases) nao encontrado no arquivo.")
        # Debug: mostra um pedaço do arquivo perto do byte que identificamos antes
        print("Contexto próximo ao erro:")
        print(content[531800:531900])
        exit(1)
