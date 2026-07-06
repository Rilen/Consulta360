// assets/js/autosync.js
// Verifica silenciosamente o servidor Nginx em busca de bases recentes e baixa para o IndexedDB
// Isso poupa o usuário de ter que ir no Painel de Sincronização.

document.addEventListener('DOMContentLoaded', () => {
    // Atraso intencional para não impactar o carregamento da tela inicial (render blocking)
    setTimeout(iniciarAutoSync, 3000);
});

async function iniciarAutoSync() {
    if (typeof getMetadata !== 'function' || typeof setCache !== 'function') return;

    // Em vez de dar "tiro no escuro" e gerar erros 404 vermelhos no console,
    // vamos tentar ler a listagem do diretório /data/ do Nginx (se o autoindex estiver ligado).
    try {
        const dirResp = await fetch('./data/', { cache: 'no-store' });
        if (!dirResp.ok) return; // Se o servidor proibir (403) ou não achar (404), saímos silenciosamente.

        const html = await dirResp.text();
        
        // Extrai todos os nomes de arquivos .json que aparecem no HTML do Nginx
        const jsonFiles = [...html.matchAll(/href="([^"]+\.json)"/g)].map(m => m[1]);
        
        let baixados = 0;

        for (const fileName of jsonFiles) {
            // O fileName no Nginx geralmente vem codificado (ex: FolhaPagamento_PM%20RIO...)
            const cacheKey = decodeURIComponent(fileName.replace('.json', ''));
            
            // Só sincronizar arquivos que comecem com FolhaPagamento (evitar lixo)
            if (!cacheKey.startsWith('FolhaPagamento_')) continue;

            const metaKey = 'meta_' + cacheKey.replace('FolhaPagamento_', 'folha_');

            // 1. Já temos localmente no PC?
            const localMeta = await getMetadata(metaKey);
            if (localMeta) continue; // Pula!

            // 2. Não temos! Como o Nginx listou que o arquivo existe, vamos baixar com 100% de certeza que não dará 404.
            const dataResp = await fetch(`./data/${fileName}`, { cache: 'no-store' });
            if (dataResp.ok) {
                const data = await dataResp.json();
                if (data && data.length > 0) {
                    await setCache(cacheKey, JSON.stringify(data));
                    await setMetadata(metaKey, { records: data.length, auto: true });
                    baixados++;
                    console.log(`[AutoSync] Baixado com sucesso: ${cacheKey}`);
                }
            }
            
            // Pausa entre downloads para não travar a rede
            await new Promise(r => setTimeout(r, 500));
        }

        if (baixados > 0 && typeof updateStatusBanner === 'function') {
            updateStatusBanner('success', `Auto-Sync concluiu o download de ${baixados} arquivos recentes da intranet para o seu PC!`);
            setTimeout(() => updateStatusBanner('', ''), 6000);
        }
    } catch(e) {
        // Silencioso, falhou ao ler o diretório.
    }
}
