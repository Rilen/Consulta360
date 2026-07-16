// assets/js/evolucao.js
// Lógica Híbrida de Evolução Salarial e Inteligência Macroeconômica (NPA)
// Isolada para a página standalone evolucao_salarial.html

// ── Histórico Nacional Base (MOCK/Referência) ──
const historicoSM = {
    2020: 1045,
    2021: 1100,
    2022: 1212,
    2023: 1320,
    2024: 1412,
    2025: 1509,
    2026: 1610
};

const mockFallback = {
    'Professor': { 2020: 2500, 2021: 2500, 2022: 3000, 2023: 3200, 2024: 3400, 2025: 3500, 2026: 3500 },
    'Médico': { 2020: 6000, 2021: 6500, 2022: 7000, 2023: 7500, 2024: 8000, 2025: 8500, 2026: 9000 },
    'Administrativo': { 2020: 1300, 2021: 1350, 2022: 1500, 2023: 1600, 2024: 1700, 2025: 1800, 2026: 1900 },
    'Enfermeiro': { 2020: 3100, 2021: 3200, 2022: 4750, 2023: 4750, 2024: 4750, 2025: 4750, 2026: 4750 },
    'Guarda Municipal': { 2020: 2100, 2021: 2100, 2022: 2400, 2023: 2600, 2024: 2800, 2025: 2900, 2026: 3000 },
    'Fiscal de Tributos': { 2020: 4200, 2021: 4200, 2022: 4500, 2023: 4800, 2024: 5000, 2025: 5200, 2026: 5500 },
    'Gari': { 2020: 1100, 2021: 1150, 2022: 1250, 2023: 1350, 2024: 1450, 2025: 1550, 2026: 1650 }
};

let dbHistorico = {}; // Dados reais consolidados do IndexedDB
let tetoMunicipal = 0;
let chartPoder = null;
let chartCargos = null;
let isMockMode = false;
let syncInterval = null;

// Inicialização da Página Standalone
document.addEventListener('DOMContentLoaded', async () => {
    bindSyncButton();
    bindCargoSelects();
    await loadDataFromIndexedDB();
    renderCharts();
    renderKPIs();
});

function bindCargoSelects() {
    ['cargo-1', 'cargo-2', 'cargo-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => renderChartCargos());
    });
}

function bindSyncButton() {
    const btnSync = document.getElementById('btn-sync-ano');
    if (!btnSync) return;
    
    btnSync.addEventListener('click', async () => {
        const ano = document.getElementById('sync-ano-select').value;
        const btnOriginalText = btnSync.innerHTML;
        
        btnSync.disabled = true;
        btnSync.innerHTML = `<i class="bi bi-arrow-repeat animate-spin"></i> Iniciando...`;
        btnSync.classList.replace('bg-[#00bcd4]', 'bg-amber-500');

        try {
            // Dispara para nossa API local no Portainer
            const res = await fetch('./api/sync-ano', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ano: parseInt(ano), entidade: 2 })
            });

            if (!res.ok) throw new Error('Falha ao iniciar sincronização.');
            
            // Inicia o Polling
            syncInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('./api/status');
                    if (!statusRes.ok) return;
                    
                    const data = await statusRes.json();
                    if (!data.success) return;
                    
                    if (data.data.status.startsWith('syncing')) {
                        btnSync.innerHTML = `<i class="bi bi-arrow-repeat animate-spin"></i> Processando ${data.data.status.replace('syncing_', '')}...`;
                    } else if (data.data.status === 'idle') {
                        clearInterval(syncInterval);
                        btnSync.innerHTML = `<i class="bi bi-check2-all"></i> Concluído! Baixando...`;
                        btnSync.classList.replace('bg-amber-500', 'bg-emerald-500');
                        
                        // Atualiza o cache local e regera gráficos
                        if(typeof window.autosyncFull === 'function') await window.autosyncFull();
                        await loadDataFromIndexedDB();
                        renderCharts();
                        renderKPIs();
                        
                        setTimeout(() => {
                            btnSync.disabled = false;
                            btnSync.innerHTML = btnOriginalText;
                            btnSync.classList.replace('bg-emerald-500', 'bg-[#00bcd4]');
                        }, 3000);
                    }
                } catch (e) {
                    // ignore polling errors
                }
            }, 2000);

        } catch (e) {
            console.error(e);
            clearInterval(syncInterval);
            btnSync.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Erro na API`;
            btnSync.classList.replace('bg-amber-500', 'bg-rose-500');
            setTimeout(() => {
                btnSync.disabled = false;
                btnSync.innerHTML = btnOriginalText;
                btnSync.classList.replace('bg-rose-500', 'bg-[#00bcd4]');
            }, 3000);
        }
    });
}

async function loadDataFromIndexedDB() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const range = IDBKeyRange.bound('FolhaPagamento_', 'FolhaPagamento_\uffff');
        const req = store.openCursor(range);
        
        let foundRecords = false;
        const agregador = {};
        
        const chaves = await new Promise((resolve, reject) => {
            const keys = [];
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) { keys.push(cursor.key); cursor.continue(); }
                else { resolve(keys); }
            };
            req.onerror = () => reject(req.error);
        });

        if (chaves.length > 0) {
            tetoMunicipal = 0;
            for (const chave of chaves) {
                const ano = chave.split('_')[2].split('-')[0]; // FolhaPagamento_2_2026-05
                
                let rawData = await getCache(chave);
                if (typeof rawData === 'string') {
                    try { rawData = JSON.parse(rawData); } catch (_) { continue; }
                }
                
                if (Array.isArray(rawData)) {
                    foundRecords = true;
                    // Consolidação de múltiplas matrículas por CPF/Nome para o Teto Real
                    const consolidados = {};
                    
                    for (const row of rawData) {
                        const nome = row.Nome || row.Identificador;
                        const prov = parseValorBR(row.Proventos) || 0;
                        if(nome) {
                            consolidados[nome] = (consolidados[nome] || 0) + prov;
                        }
                        
                        const cargo = row.Cargo;
                        if (cargo && prov > 0) {
                            if (!agregador[cargo]) agregador[cargo] = {};
                            if (!agregador[cargo][ano]) agregador[cargo][ano] = [];
                            agregador[cargo][ano].push(prov);
                        }
                    }
                    
                    // Atualiza teto
                    for(const valor of Object.values(consolidados)) {
                        if (valor > tetoMunicipal) tetoMunicipal = valor;
                    }
                }
            }
        }
        
        if (foundRecords) {
            isMockMode = false;
            dbHistorico = {};
            for (const cargo in agregador) {
                dbHistorico[cargo] = {};
                for (const ano in agregador[cargo]) {
                    const vals = agregador[cargo][ano];
                    dbHistorico[cargo][ano] = vals.reduce((a, b) => a + b, 0) / vals.length;
                }
            }
            updateStatusLabel('bg-emerald-100 text-emerald-800 border-emerald-200', '<i class="bi bi-database-check"></i> Dados Reais Carregados');
        } else {
            fallbackToMock();
        }
        
    } catch (e) {
        console.error('Erro ao ler DB. Caiu no mock.', e);
        fallbackToMock();
    }
}

function fallbackToMock() {
    isMockMode = true;
    dbHistorico = mockFallback;
    tetoMunicipal = 32540.50; // valor ficticio simulado
    updateStatusLabel('bg-amber-100 text-amber-800 border-amber-200', '<i class="bi bi-exclamation-triangle"></i> Modo Simulação Offline');
}

function updateStatusLabel(classes, html) {
    const el = document.getElementById('statusCache');
    if(el) {
        el.className = `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${classes}`;
        el.innerHTML = html;
        el.classList.remove('hidden');
    }
}

// ── Renderização ──

function getYears() {
    return Object.keys(historicoSM).sort();
}

function formatBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function renderKPIs() {
    const anos = getYears();
    const anoInit = anos[0];
    const anoFim = anos[anos.length - 1];
    
    // Calcula médias globais considerando apenas cargos que existiam nos 2 extremos
    let somaInit = 0, countInit = 0;
    let somaFim = 0, countFim = 0;
    
    for(const c in dbHistorico) {
        if(dbHistorico[c][anoInit] && dbHistorico[c][anoFim]) {
            somaInit += dbHistorico[c][anoInit];
            countInit++;
            somaFim += dbHistorico[c][anoFim];
            countFim++;
        }
    }
    
    const mediaInit = countInit > 0 ? somaInit / countInit : 0;
    const mediaFim = countFim > 0 ? somaFim / countFim : 0;
    
    // Ideal
    const smInit = historicoSM[anoInit];
    const smFim = historicoSM[anoFim];
    const mediaIdealFim = smInit > 0 ? mediaInit * (smFim / smInit) : 0;
    
    // Defasagem
    let defPct = 0;
    if (mediaFim > 0 && mediaIdealFim > 0) {
        defPct = ((mediaIdealFim - mediaFim) / mediaIdealFim) * 100;
    }
    
    const elDef = document.getElementById('metric-defasagem');
    if (elDef) {
        if (defPct > 0) {
            elDef.innerText = defPct.toFixed(1) + '%';
            elDef.className = 'text-4xl font-black relative z-10 text-rose-600';
        } else {
            elDef.innerText = '+' + Math.abs(defPct).toFixed(1) + '%';
            elDef.className = 'text-4xl font-black relative z-10 text-emerald-600';
        }
    }
    
    // Custo estimado
    const diferencaMes = mediaIdealFim - mediaFim;
    const custoAnual = diferencaMes > 0 ? diferencaMes * 3000 * 13 : 0; // estimando 3000 servidores
    const elCusto = document.getElementById('metric-custo');
    if(elCusto) elCusto.innerText = formatBRL(custoAnual);
    
    const elTeto = document.getElementById('metric-teto');
    if(elTeto) elTeto.innerText = formatBRL(tetoMunicipal);
}

function renderCharts() {
    renderChartPoder();
    renderChartCargos();
}

function renderChartPoder() {
    const ctx = document.getElementById('chartPoderCompra');
    if(!ctx) return;
    if(chartPoder) chartPoder.destroy();
    
    const anos = getYears();
    const anoInit = anos[0];
    const smBase = historicoSM[anoInit];
    
    let somaBase = 0, countBase = 0;
    for(const c in dbHistorico) {
        if(dbHistorico[c][anoInit]) {
            somaBase += dbHistorico[c][anoInit];
            countBase++;
        }
    }
    const mediaBase = countBase > 0 ? somaBase / countBase : 0;
    
    const mediaReal = [];
    const mediaIdeal = [];
    
    anos.forEach(ano => {
        // Real
        let sReal = 0, cReal = 0;
        for(const c in dbHistorico) {
            if(dbHistorico[c][ano]) { sReal += dbHistorico[c][ano]; cReal++; }
        }
        mediaReal.push(cReal > 0 ? sReal / cReal : 0);
        
        // Ideal
        mediaIdeal.push(mediaBase * (historicoSM[ano] / smBase));
    });
    
    chartPoder = new Chart(ctx, {
        type: 'line',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Salário Médio Real (Aplicado)',
                    data: mediaReal,
                    borderColor: '#00bcd4', // Ciano NPA
                    backgroundColor: 'rgba(0, 188, 212, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00bcd4',
                    pointRadius: 4,
                },
                {
                    label: 'Curva Ideal (Inflação Sal. Mínimo)',
                    data: mediaIdeal,
                    borderColor: '#f43f5e', // Vermelho
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatBRL(c.raw) } } },
            scales: { y: { ticks: { callback: v => formatBRL(v) } }, x: { grid: { display: false } } }
        }
    });
}

function renderChartCargos() {
    const ctx = document.getElementById('chartCargos');
    if(!ctx) return;
    if(chartCargos) chartCargos.destroy();
    
    const anos = getYears();
    const c1 = document.getElementById('cargo-1')?.value || 'Professor';
    const c2 = document.getElementById('cargo-2')?.value || 'Administrativo';
    const c3 = document.getElementById('cargo-3')?.value || 'Médico';
    
    const cores = ['#004b80', '#00bcd4', '#10b981']; // Azul NPA, Ciano NPA, Emerald
    const datasets = [c1, c2, c3].map((cargo, i) => {
        return {
            label: cargo,
            data: anos.map(a => dbHistorico[cargo]?.[a] || null),
            borderColor: cores[i],
            backgroundColor: cores[i],
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            spanGaps: true
        };
    });
    
    chartCargos = new Chart(ctx, {
        type: 'line',
        data: { labels: anos, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatBRL(c.raw) } } },
            scales: { y: { ticks: { callback: v => formatBRL(v) } }, x: { grid: { display: false } } }
        }
    });
}
