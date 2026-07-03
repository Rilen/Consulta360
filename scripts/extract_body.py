import os
import re

files_to_migrate = {
    'index.html': 'home.html',
    'graficos.html': 'graficos.html',
    'auditoria_ia.html': 'auditoria_ia.html',
    'evolucao_salarial.html': 'evolucao.html',
    'changelog.html': 'changelog.html'
}

for root_file, body_file in files_to_migrate.items():
    if not os.path.exists(root_file):
        continue
        
    with open(root_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Extract everything inside <main ...> ... </main>
    # We want to keep the inner content, but since the <main> tag itself might have specific classes, 
    # it's better to just grab the inner HTML and we will put the <main class="..."> in the root index.html
    match = re.search(r'<main[^>]*>(.*?)</main>', content, re.DOTALL | re.IGNORECASE)
    
    if match:
        inner_html = match.group(1).strip()
        with open(os.path.join('body', body_file), 'w', encoding='utf-8') as f:
            f.write(inner_html)
        print(f"Extracted {root_file} to body/{body_file}")
    else:
        print(f"Could not find <main> in {root_file}")
