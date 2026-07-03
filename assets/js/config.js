// config.js - Motor de Sincronização em Lote

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'config') {
        initConfigModule();
    }
});

if (window.location.hash === '#config' || window.location.hash.includes('config')) {
    setTimeout(initConfigModule, 100);
}

function initConfigModule() {
    atualizarLabelsMetadados();

    const btnSyncFolha = document.getElementById('btnSyncFolha');
    if (btnSyncFolha) {
        const newBtn = btnSyncFolha.cloneNode(true);
        btnSyncFolha.parentNode.replaceChild(newBtn, btnSyncFolha);
        newBtn.addEventListener('click', async () => {
            const mesAno = document.getElementById('syncMesFolha').value;
            const entidade = document.getElementById('syncBaseFolha').value;
            if(!mesAno) return alert('Selecione o mês para sincronizar a folha.');
            
            const datas = mesAnoParaDatas(mesAno);
            const url = `${API_BASE}/FolhaPagamento?dataInicial=${encodeURIComponent(datas.dataInicial)}&dataFinal=${encodeURIComponent(datas.dataFinal)}&nomeBase=${encodeURIComponent(entidade)}`;
            const cacheKey = `FolhaPagamento_${entidade}_${mesAno}`;
            const metaKey = `meta_folha_${entidade}_${mesAno}`;
            
            await motorSincronizacao(url, cacheKey, metaKey, 'Folha', 50);
        });
    }

    const btnSyncReceitas = document.getElementById('btnSyncReceitas');
    if (btnSyncReceitas) {
        const newBtn = btnSyncReceitas.cloneNode(true);
        btnSyncReceitas.parentNode.replaceChild(newBtn, btnSyncReceitas);
        newBtn.addEventListener('click', async () => {
            const ano = document.getElementById('syncAnoReceitas').value;
            const entidade = document.getElementById('syncBaseReceitas').value;
            
            const baseUrl = `${API_BASE}/Receitas/buscarDadosReceitas/${ano}`;
            const cacheKey = `receitas_${ano}_${entidade}`;
            const metaKey = `meta_receitas_${ano}_${entidade}`;
            
            await motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, 'Receitas', 20);
        });
    }

    const btnSyncDespesas = document.getElementById('btnSyncDespesas');
    if (btnSyncDespesas) {
        const newBtn = btnSyncDespesas.cloneNode(true);
        btnSyncDespesas.parentNode.replaceChild(newBtn, btnSyncDespesas);
        newBtn.addEventListener('click', async () => {
            const ano = document.getElementById('syncAnoDespesas').value;
            const entidade = document.getElementById('syncBaseDespesas').value;
            
            const baseUrl = `${API_BASE}/Despesas/buscarDadosDespesas/${ano}`;
            const cacheKey = `despesas_${ano}_${entidade}`;
            const metaKey = `meta_despesas_${ano}_${entidade}`;
            
            await motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, 'Despesas', 20);
        });
    }

    const btnLimpar = document.getElementById('btnLimparTudo');
    if (btnLimpar) {
        const newBtn = btnLimpar.cloneNode(true);
        btnLimpar.parentNode.replaceChild(newBtn, btnLimpar);
        newBtn.addEventListener('click', async () => {
            if(confirm('Tem certeza que deseja apagar todos os dados cacheados do navegador? O sistema precisará baixar tudo novamente.')) {
                try {
                    const db = await initDB();
                    const tx1 = db.transaction(STORE_NAME, 'readwrite');
                    tx1.objectStore(STORE_NAME).clear();
                    const tx2 = db.transaction('metadata', 'readwrite');
                    tx2.objectStore('metadata').clear();
                    
                    alert('Todos os dados locais foram apagados com sucesso!');
                    atualizarLabelsMetadados();
                } catch(e) {
                    alert('Erro ao limpar banco: ' + e.message);
                }
            }
        });
    }
}

async function atualizarLabelsMetadados() {
    const formatarData = (ts) => {
        if(!ts) return 'Status: Não sincronizado';
        const d = new Date(ts);
        return `Atualizado em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
    };

    // Folha
    const mesFolha = document.getElementById('syncMesFolha')?.value;
    const baseFolha = document.getElementById('syncBaseFolha')?.value;
    if(mesFolha && baseFolha) {
        const metaFolha = await getMetadata(`meta_folha_${baseFolha}_${mesFolha}`);
        const lblF = document.getElementById('lblSyncFolha');
        if(lblF) lblF.textContent = metaFolha ? formatarData(metaFolha.timestamp) : 'Status: Não sincronizado';
    }

    // Receitas
    const anoRec = document.getElementById('syncAnoReceitas')?.value;
    const baseRec = document.getElementById('syncBaseReceitas')?.value;
    if(anoRec && baseRec) {
        const metaRec = await getMetadata(`meta_receitas_${anoRec}_${baseRec}`);
        const lblR = document.getElementById('lblSyncReceitas');
        if(lblR) lblR.textContent = metaRec ? formatarData(metaRec.timestamp) : 'Status: Não sincronizado';
    }

    // Despesas
    const anoDesp = document.getElementById('syncAnoDespesas')?.value;
    const baseDesp = document.getElementById('syncBaseDespesas')?.value;
    if(anoDesp && baseDesp) {
        const metaDesp = await getMetadata(`meta_despesas_${anoDesp}_${baseDesp}`);
        const lblD = document.getElementById('lblSyncDespesas');
        if(lblD) lblD.textContent = metaDesp ? formatarData(metaDesp.timestamp) : 'Status: Não sincronizado';
    }
}

// Escuta mudanças nos selects para atualizar as labels
document.body.addEventListener('change', (e) => {
    if(e.target.id.startsWith('sync')) {
        atualizarLabelsMetadados();
    }
});


// Motor para Query Params (Folha)
async function motorSincronizacao(baseUrl, cacheKey, metaKey, uiPrefix, estimativaPaginas = 50) {
    await iniciarMotor(async (pagina) => {
        const url = `${baseUrl}&numeroPagina=${pagina}`;
        return await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
    }, cacheKey, metaKey, uiPrefix, estimativaPaginas);
}

// Motor para RESTful paths (Receitas e Despesas)
async function motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, uiPrefix, estimativaPaginas = 20) {
    await iniciarMotor(async (pagina) => {
        const url = `${baseUrl}/${pagina}/${encodeURIComponent(entidade)}`;
        return await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
    }, cacheKey, metaKey, uiPrefix, estimativaPaginas);
}

// Núcleo do Motor de Extração
async function iniciarMotor(fetchFunc, cacheKey, metaKey, uiPrefix, estimativaPaginas) {
    const btn = document.getElementById(`btnSync${uiPrefix}`);
    const box = document.getElementById(`progresso${uiPrefix}Box`);
    const txt = document.getElementById(`lblProgresso${uiPrefix}Texto`);
    const perc = document.getElementById(`lblProgresso${uiPrefix}Perc`);
    const barra = document.getElementById(`barraProgresso${uiPrefix}`);
    const alerta = document.getElementById('alertaErroConfig');
    
    if(!btn || !box) return;

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    box.classList.remove('hidden');
    alerta.classList.add('hidden');
    alerta.classList.remove('flex');
    
    let pagina = 1;
    let allData = [];
    let falhouCORS = false;

    while (true) {
        // Atualiza UI
        let p = Math.min(Math.round((pagina / estimativaPaginas) * 100), 99);
        txt.textContent = `Sincronizando página ${pagina}...`;
        perc.textContent = `${p}%`;
        barra.style.width = `${p}%`;

        try {
            const resp = await fetchFunc(pagina);
            if (!resp.ok) {
                falhouCORS = true;
                break;
            }

            const text = await resp.text();
            if (!text || text.trim() === '') break;

            let paginaDados;
            try { paginaDados = JSON.parse(text); } catch(e) { paginaDados = parsePlainText(text); }

            if (!Array.isArray(paginaDados)) {
                if (typeof paginaDados === 'object' && paginaDados !== null) {
                    const chaves = Object.keys(paginaDados);
                    const primeiraChave = chaves.find(k => Array.isArray(paginaDados[k]));
                    paginaDados = primeiraChave ? paginaDados[primeiraChave] : [paginaDados];
                } else { paginaDados = []; }
            }

            if (paginaDados.length === 0) break;
            
            allData = allData.concat(paginaDados);
            
            if (paginaDados.length < 200) break; // Chegou no fim

            pagina++;
            
            // Pausa sutil para não travar a UI do navegador
            await new Promise(r => setTimeout(r, 100));

        } catch (err) {
            falhouCORS = true;
            break;
        }
    }

    // Finalização
    if (falhouCORS && pagina === 1) {
        // Falha no primeiro request = CORS/Rede
        alerta.classList.remove('hidden');
        alerta.classList.add('flex');
        txt.textContent = 'Falha de Rede (CORS). Carregando Mock...';
        perc.textContent = 'Demo';
        barra.style.width = '100%';
        barra.classList.replace('bg-blue-600', 'bg-amber-500');
        barra.classList.replace('bg-green-600', 'bg-amber-500');
        barra.classList.replace('bg-rose-600', 'bg-amber-500');

        // Carrega Mock
        try {
            if (uiPrefix === 'Folha') {
                const mockRes = await fetch('./payload.json');
                const mockData = await mockRes.json();
                await setCache(cacheKey, JSON.stringify(mockData));
                await setMetadata(metaKey, { records: mockData.length });
            } else if (uiPrefix === 'Receitas') {
                // mock gerado localmente em receitas.js (se carregado)
                if (typeof gerarMockReceitas === 'function') {
                    const params = cacheKey.split('_'); // receitas_ano_entidade
                    const mockR = gerarMockReceitas(params[1], params[2]);
                    await setCache(cacheKey, mockR);
                    await setMetadata(metaKey, { records: mockR.length });
                }
            } else if (uiPrefix === 'Despesas') {
                if (typeof gerarMockDespesas === 'function') {
                    const params = cacheKey.split('_');
                    const mockD = gerarMockDespesas(params[1], params[2]);
                    await setCache(cacheKey, mockD);
                    await setMetadata(metaKey, { records: mockD.length });
                }
            }
            txt.textContent = 'Base de Demonstração injetada com sucesso!';
            atualizarLabelsMetadados();
        } catch(e) {
            txt.textContent = 'Erro ao carregar Mock.';
            barra.classList.replace('bg-amber-500', 'bg-rose-500');
        }
    } else if (allData.length > 0) {
        // Sucesso
        const dadosString = (uiPrefix === 'Folha') ? JSON.stringify(allData) : allData;
        await setCache(cacheKey, dadosString);
        await setMetadata(metaKey, { records: allData.length });
        
        txt.textContent = `Concluído! ${allData.length} registros baixados.`;
        perc.textContent = '100%';
        barra.style.width = '100%';
        atualizarLabelsMetadados();
    } else {
        txt.textContent = 'Nenhum dado encontrado no servidor.';
        perc.textContent = '0%';
        barra.style.width = '0%';
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    setTimeout(() => {
        box.classList.add('hidden');
        barra.classList.replace('bg-rose-500', 'bg-blue-600');
    }, 4000);
}
