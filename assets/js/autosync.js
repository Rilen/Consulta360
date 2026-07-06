// assets/js/autosync.js
// Verifica silenciosamente o servidor Nginx em busca de bases recentes e baixa para o IndexedDB
// Isso poupa o usuário de ter que ir no Painel de Sincronização.

document.addEventListener('DOMContentLoaded', () => {
    // Atraso intencional para não impactar o carregamento da tela inicial (render blocking)
    setTimeout(iniciarAutoSync, 3000);
});

async function iniciarAutoSync() {
    if (typeof getMetadata !== 'function' || typeof setCache !== 'function') return;

    // Lista de entidades principais para auto-sync
    const bases = [
        'PM RIO DAS OSTRAS - EFETIVOS E COMISSIONADOS',
        'SAAE - RIO DAS OSTRAS'
    ];
    
    // Meses recentes (ex: últimos 3 meses)
    const hoje = new Date();
    const mesesParaVerificar = [];
    for (let i = 0; i < 4; i++) {
        let d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        let m = String(d.getMonth() + 1).padStart(2, '0');
        let a = d.getFullYear();
        mesesParaVerificar.push(`${a}-${m}`);
    }

    let baixados = 0;

    for (const base of bases) {
        for (const mes of mesesParaVerificar) {
            const cacheKey = `FolhaPagamento_${base}_${mes}`;
            const metaKey = `meta_folha_${base}_${mes}`;

            // 1. Já temos localmente?
            const localMeta = await getMetadata(metaKey);
            if (localMeta) continue; // Já temos, pula!

            // 2. Não temos localmente. Tem na rede (Intranet/Nginx)?
            try {
                const resp = await fetch(`./data/${cacheKey}.json`, { method: 'HEAD', cache: 'no-store' });
                if (resp.ok) {
                    // 3. Está na rede! Vamos puxar o JSON completo em background
                    const dataResp = await fetch(`./data/${cacheKey}.json`, { cache: 'no-store' });
                    if (dataResp.ok) {
                        const data = await dataResp.json();
                        if (data && data.length > 0) {
                            await setCache(cacheKey, JSON.stringify(data));
                            await setMetadata(metaKey, { records: data.length, auto: true });
                            baixados++;
                            console.log(`[AutoSync] Baixado com sucesso: ${cacheKey}`);
                        }
                    }
                }
            } catch(e) {
                // Silencioso. Sem rede ou arquivo não existe.
            }
            
            // Pausa pequena entre verificações para poupar CPU
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (baixados > 0 && typeof updateStatusBanner === 'function') {
        updateStatusBanner('success', `Auto-Sync concluiu o download de ${baixados} arquivos de folha recentes da intranet para o seu PC!`);
        setTimeout(() => updateStatusBanner('', ''), 6000);
    }
}
