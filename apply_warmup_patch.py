import os
import glob

assets_path = "/Users/diego/Documents/GitHub/codex/ruptur/deploy/host2/warmup/dist/assets/index-*.js"
supabase_url = "https://axrwlboyowoskdxeogba.supabase.co"
supabase_key = "sbp_9403d15664177d5c0d8b4b0d12e350d915bd4c83"

target = 'var Ey=``,Dy=``'
replacement = f'var Ey="{supabase_url}",Dy="{supabase_key}"'

files = glob.glob(assets_path)
if not files:
    print("Nenhum arquivo de bundle encontrado em dist/assets/")
    exit(1)

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target in content:
        new_content = content.replace(target, replacement)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patch aplicado com sucesso em: {os.path.basename(file_path)}")
    else:
        # Tenta com crases e ponto e vírgula
        target_alt = 'var Ey=``,Dy=``;'
        replacement_alt = f'var Ey="{supabase_url}",Dy="{supabase_key}";'
        if target_alt in content:
            new_content = content.replace(target_alt, replacement_alt)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Patch aplicado (alt) com sucesso em: {os.path.basename(file_path)}")
        else:
            print(f"Alvo não encontrado em: {os.path.basename(file_path)}")
