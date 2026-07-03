// config.js — Motor de Sincronização Local
// Os dados brutos chegam como JSONs estáticos (gerados pelo script fetch-data.mjs).
// Este módulo carrega do mesmo domínio → IndexedDB. Sem proxy, sem CORS, sem API externa.

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'config') initConfigModule();
});

if (window.location.hash === '#config' || window.location.hash.includes('config')) {
    setTimeout(initConfigModule, 100);
}

let manifestData = null;

async function carregarManifest() {
    if (manifestData) return manifestData;
    try {
        const resp = await fetch('./data/manifest.json');
        if (!resp.ok) return null;
        manifestData = await resp.json();
        return manifestData;
    } catch { return null; }
}

function initConfigModule() {
    atualizarLabelsMetadados();

    // ── Folha de Pagamento ──
    const btnSyncFolha = document.getElementById('btnSyncFolha');
    if (btnSyncFolha) {
        const newBtn = btnSyncFolha.cloneNode(true);
        btnSyncFolha.parentNode.replaceChild(newBtn, btnSyncFolha);
        newBtn.addEventListener('click', async () => {
            const mesAno = document.getElementById('syncMesFolha').value;
            const entidade = document.getElementById('syncBaseFolha').value;
            if (!mesAno) return alert('Selecione o mês para sincronizar a folha.');

            const manifest = await carregarManifest();
            const dataset = manifest?.datasets?.folha?.find(
                d => d.entidade === entidade && d.mesAno === mesAno
            );

            if (!dataset) {
                alert('Dataset não disponível. Os dados para este período não foram pré-carregados.');
                return;
            }

            const cacheKey = `FolhaPagamento_${entidade}_${mesAno}`;
            const metaKey = `meta_folha_${entidade}_${mesAno}`;
            await importarDataset(dataset.file, cacheKey, metaKey, 'Folha', dataset.records);
        });
    }

    // ── Relação de Servidores ──
    const btnSyncServidor = document.getElementById('btnSyncServidor');
    if (btnSyncServidor) {
        const newBtn = btnSyncServidor.cloneNode(true);
        btnSyncServidor.parentNode.replaceChild(newBtn, btnSyncServidor);
        newBtn.addEventListener('click', async () => {
            const mesAno = document.getElementById('syncMesServidor').value;
            const entidade = document.getElementById('syncBaseServidor').value;
            if (!mesAno) return alert('Selecione o mês para sincronizar.');

            const manifest = await carregarManifest();
            const dataset = manifest?.datasets?.servidor?.find(
                d => d.entidade === entidade && d.mesAno === mesAno
            );

            if (!dataset) {
                alert('Dataset não disponível para este período.');
                return;
            }

            const cacheKey = `Servidor_${entidade}_${mesAno}`;
            const metaKey = `meta_servidor_${entidade}_${mesAno}`;
            await importarDataset(dataset.file, cacheKey, metaKey, 'Servidor', dataset.records);
        });
    }

    // ── Receitas ──
    const btnSyncReceitas = document.getElementById('btnSyncReceitas');
    if (btnSyncReceitas) {
        const newBtn = btnSyncReceitas.cloneNode(true);
        btnSyncReceitas.parentNode.replaceChild(newBtn, btnSyncReceitas);
        newBtn.addEventListener('click', async () => {
            const ano = document.getElementById('syncAnoReceitas').value;
            const entidade = document.getElementById('syncBaseReceitas').value;

            const manifest = await carregarManifest();
            const dataset = manifest?.datasets?.receitas?.find(
                d => d.entidade === entidade && String(d.ano) === String(ano)
            );

            if (!dataset) {
                alert('Dataset não disponível para este ano.');
                return;
            }

            const cacheKey = `receitas_${ano}_${entidade}`;
            const metaKey = `meta_receitas_${ano}_${entidade}`;
            await importarDataset(dataset.file, cacheKey, metaKey, 'Receitas', dataset.records);
        });
    }

    // ── Despesas ──
    const btnSyncDespesas = document.getElementById('btnSyncDespesas');
    if (btnSyncDespesas) {
        const newBtn = btnSyncDespesas.cloneNode(true);
        btnSyncDespesas.parentNode.replaceChild(newBtn, btnSyncDespesas);
        newBtn.addEventListener('click', async () => {
            const ano = document.getElementById('syncAnoDespesas').value;
            const entidade = document.getElementById('syncBaseDespesas').value;

            const manifest = await carregarManifest();
            const dataset = manifest?.datasets?.despesas?.find(
                d => d.entidade === entidade && String(d.ano) === String(ano)
            );

            if (!dataset) {
                alert('Dataset não disponível para este ano.');
                return;
            }

            const cacheKey = `despesas_${ano}_${entidade}`;
            const metaKey = `meta_despesas_${ano}_${entidade}`;
            await importarDataset(dataset.file, cacheKey, metaKey, 'Despesas', dataset.records);
        });
    }

    // ── Limpar Cache ──
    const btnLimpar = document.getElementById('btnLimparTudo');
    if (btnLimpar) {
        const newBtn = btnLimpar.cloneNode(true);
        btnLimpar.parentNode.replaceChild(newBtn, btnLimpar);
        newBtn.addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja apagar todos os dados cacheados do navegador? O sistema precisará baixar tudo novamente.')) {
                try {
                    const db = await initDB();
                    const tx1 = db.transaction(STORE_NAME, 'readwrite');
                    tx1.objectStore(STORE_NAME).clear();
                    const tx2 = db.transaction('metadata', 'readwrite');
                    tx2.objectStore('metadata').clear();
                    alert('Todos os dados locais foram apagados com sucesso!');
                    atualizarLabelsMetadados();
                } catch (e) {
                    alert('Erro ao limpar banco: ' + e.message);
                }
            }
        });
    }
}

// ─────────────────────────────────────────────────────
// Motor de importação: JSON local → IndexedDB
// ─────────────────────────────────────────────────────
async function importarDataset(filePath, cacheKey, metaKey, uiPrefix, estimatedRecords) {
    const btn = document.getElementById(`btnSync${uiPrefix}`);
    const box = document.getElementById(`progresso${uiPrefix}Box`);
    const txt = document.getElementById(`lblProgresso${uiPrefix}Texto`);
    const perc = document.getElementById(`lblProgresso${uiPrefix}Perc`);
    const barra = document.getElementById(`barraProgresso${uiPrefix}`);

    if (!btn || !box) return;

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    box.classList.remove('hidden');

    txt.textContent = 'Carregando dataset...';
    perc.textContent = '0%';
    barra.style.width = '0%';

    try {
        const resp = await fetch(filePath);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        // Leitura com progresso (streaming)
        const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
        const reader = resp.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (contentLength > 0) {
                const p = Math.min(Math.round((received / contentLength) * 100), 99);
                perc.textContent = `${p}%`;
                barra.style.width = `${p}%`;
                txt.textContent = `Baixando... ${(received / 1024 / 1024).toFixed(1)} MB`;
            }
        }

        // Decodifica e salva
        const decoder = new TextDecoder();
        const allText = chunks.map(c => decoder.decode(c, { stream: true })).join('') + decoder.decode();
        const data = JSON.parse(allText);

        txt.textContent = 'Salvando no IndexedDB...';
        perc.textContent = '99%';
        barra.style.width = '99%';

        await setCache(cacheKey, JSON.stringify(data));
        await setMetadata(metaKey, { records: data.length });

        txt.textContent = `Concluído! ${data.length} registros carregados.`;
        perc.textContent = '100%';
        barra.style.width = '100%';
        atualizarLabelsMetadados();
    } catch (err) {
        txt.textContent = `Erro: ${err.message}`;
        perc.textContent = 'Falha';
        barra.style.width = '100%';
        barra.classList.replace('bg-blue-600', 'bg-rose-500');
        barra.classList.replace('bg-green-600', 'bg-rose-500');
        barra.classList.replace('bg-indigo-600', 'bg-rose-500');
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    setTimeout(() => {
        box.classList.add('hidden');
        barra.classList.replace('bg-rose-500', 'bg-blue-600');
    }, 4000);
}

// ─────────────────────────────────────────────────────
// Labels de metadados
// ─────────────────────────────────────────────────────
async function atualizarLabelsMetadados() {
    const formatarData = (ts) => {
        if (!ts) return 'Status: Não sincronizado';
        const d = new Date(ts);
        return `Atualizado em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
    };

    const mesFolha = document.getElementById('syncMesFolha')?.value;
    const baseFolha = document.getElementById('syncBaseFolha')?.value;
    if (mesFolha && baseFolha) {
        const metaFolha = await getMetadata(`meta_folha_${baseFolha}_${mesFolha}`);
        const lblF = document.getElementById('lblSyncFolha');
        if (lblF) lblF.textContent = metaFolha ? formatarData(metaFolha.timestamp) : 'Status: Não sincronizado';
    }

    const mesServ = document.getElementById('syncMesServidor')?.value;
    const baseServ = document.getElementById('syncBaseServidor')?.value;
    if (mesServ && baseServ) {
        const metaServ = await getMetadata(`meta_servidor_${baseServ}_${mesServ}`);
        const lblS = document.getElementById('lblSyncServidor');
        if (lblS) lblS.textContent = metaServ ? formatarData(metaServ.timestamp) : 'Status: Não sincronizado';
    }

    const anoRec = document.getElementById('syncAnoReceitas')?.value;
    const baseRec = document.getElementById('syncBaseReceitas')?.value;
    if (anoRec && baseRec) {
        const metaRec = await getMetadata(`meta_receitas_${anoRec}_${baseRec}`);
        const lblR = document.getElementById('lblSyncReceitas');
        if (lblR) lblR.textContent = metaRec ? formatarData(metaRec.timestamp) : 'Status: Não sincronizado';
    }

    const anoDesp = document.getElementById('syncAnoDespesas')?.value;
    const baseDesp = document.getElementById('syncBaseDespesas')?.value;
    if (anoDesp && baseDesp) {
        const metaDesp = await getMetadata(`meta_despesas_${anoDesp}_${baseDesp}`);
        const lblD = document.getElementById('lblSyncDespesas');
        if (lblD) lblD.textContent = metaDesp ? formatarData(metaDesp.timestamp) : 'Status: Não sincronizado';
    }
}

document.body.addEventListener('change', (e) => {
    if (e.target.id.startsWith('sync')) atualizarLabelsMetadados();
});
