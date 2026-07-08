// evolucao.js - Lógica do Módulo de Evolução Salarial
// Os dados de cargos são extraídos do IndexedDB (FolhaPagamento sincronizada).
// Caso o banco local esteja vazio, cai no mock histórico.

// ── Salário Mínimo histórico (referência nacional) ──
const historicoSM = {
    2018: 954,
    2019: 998,
    2020: 1045,
    2021: 1100,
    2022: 1212,
    2023: 1320,
    2024: 1412,
    2025: 1509,
    2026: 1610
};

// ── Mock de fallback (usado apenas se IndexedDB estiver vazio) ──
const historicoCargosMock = {
    'Professor':       { 2018: 2500, 2019: 2500, 2020: 2500, 2021: 2500, 2022: 3000, 2023: 3200, 2024: 3400, 2025: 3500, 2026: 3500 },
    'Médico':          { 2018: 6000, 2019: 6000, 2020: 6000, 2021: 6500, 2022: 7000, 2023: 7500, 2024: 8000, 2025: 8500, 2026: 9000 },
    'Guarda Municipal':{ 2018: 2000, 2019: 2100, 2020: 2100, 2021: 2100, 2022: 2400, 2023: 2600, 2024: 2800, 2025: 2900, 2026: 3000 },
    'Administrativo':  { 2018: 1200, 2019: 1300, 2020: 1300, 2021: 1350, 2022: 1500, 2023: 1600, 2024: 1700, 2025: 1800, 2026: 1900 },
    'Enfermeiro':      { 2018: 3000, 2019: 3100, 2020: 3100, 2021: 3200, 2022: 4750, 2023: 4750, 2024: 4750, 2025: 4750, 2026: 4750 },
    'Técnico de Enfermagem': { 2018: 1800, 2019: 1800, 2020: 1800, 2021: 2000, 2022: 3325, 2023: 3325, 2024: 3325, 2025: 3325, 2026: 3325 },
    'Fiscal de Tributos':{ 2018: 4000, 2019: 4200, 2020: 4200, 2021: 4200, 2022: 4500, 2023: 4800, 2024: 5000, 2025: 5200, 2026: 5500 },
    'Assistente Social': { 2018: 2200, 2019: 2300, 2020: 2300, 2021: 2400, 2022: 2600, 2023: 2800, 2024: 2900, 2025: 3000, 2026: 3100 },
    'Agente de Trânsito':{ 2018: 1500, 2019: 1600, 2020: 1600, 2021: 1700, 2022: 1900, 2023: 2000, 2024: 2200, 2025: 2300, 2026: 2400 },
    'Gari':              { 2018: 1000, 2019: 1050, 2020: 1100, 2021: 1150, 2022: 1250, 2023: 1350, 2024: 1450, 2025: 1550, 2026: 1650 },
    'Psicólogo':         { 2018: 2400, 2019: 2500, 2020: 2500, 2021: 2600, 2022: 2800, 2023: 3000, 2024: 3200, 2025: 3300, 2026: 3400 }
};

// ── Estado global ──
let historicoCargos = {};   // { cargo: { ano: salarioMedio } } — populado do IndexedDB ou mock
let chartCargosInst = null;
let chartPoderInst = null;
let dadosCarregados = false;

const TOTAL_SERVIDORES_ESTIMADO = 3000;
const MAX_CARGOS_GRAFICO = 20;   // máximo de linhas no gráfico de cargos

// ─────────────────────────────────────────────────
// Paleta de cores para gráficos com muitos cargos
// ─────────────────────────────────────────────────
const PALETA = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#14b8a6', '#e11d48',
    '#0ea5e9', '#a855f7', '#22c55e', '#eab308', '#d946ef', '#64748b',
    '#0284c7', '#b45309', '#4f46e5', '#65a30d', '#0891b2', '#be123c',
    '#7c3aed', '#15803d', '#ca8a04', '#db2777', '#475569', '#0369a1'
];

function corParaIndice(i) {
    return PALETA[i % PALETA.length];
}

// ─────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────

async function listarChavesFolha() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const range = IDBKeyRange.bound('FolhaPagamento_', 'FolhaPagamento_\uffff');
            const req = store.openCursor(range);
            const keys = [];
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) { keys.push(cursor.key); cursor.continue(); }
                else { resolve(keys); }
            };
            req.onerror = () => reject(req.error);
        });
    } catch (_) { return []; }
}

async function carregarHistoricoDoIndexedDB() {
    if (dadosCarregados) return true;

    const statusEl = document.getElementById('statusCache');
    if (statusEl) {
        statusEl.classList.remove('hidden'); statusEl.classList.add('flex');
        statusEl.innerHTML = '<i class="bi bi-loader w-3.5 h-3.5 animate-spin"></i> Lendo dados do banco local...';
    }

    try {
        const chaves = await listarChavesFolha();
        if (chaves.length === 0) {
            historicoCargos = historicoCargosMock;
            dadosCarregados = true;
            if (statusEl) statusEl.innerHTML = '<i class="bi bi-server w-3.5 h-3.5"></i> Usando Dataset Histórico (Mock)';
            return false;
        }

        // Agregador: { cargo: { ano: [proventos, ...] } }
        const agregador = {};

        for (const chave of chaves) {
            // Chave: FolhaPagamento_${entidade}_${mesAno}
            const idxUltimoUnderscore = chave.lastIndexOf('_');
            if (idxUltimoUnderscore < 0) continue;
            const mesAno = chave.slice(idxUltimoUnderscore + 1); // "2026-05"
            const ano = mesAno.split('-')[0];                    // "2026"

            const rawData = await getCache(chave);
            let rows = rawData;
            if (typeof rawData === 'string') {
                try { rows = JSON.parse(rawData); } catch (_) { continue; }
            }
            if (!Array.isArray(rows)) continue;

            for (const row of rows) {
                const cargo = row.Cargo;
                if (!cargo) continue;
                const proventos = parseFloat(row.Proventos) ||
                    parseFloat(String(row.Proventos || '').replace(',', '.')) || 0;
                if (proventos <= 0) continue;

                if (!agregador[cargo]) agregador[cargo] = {};
                if (!agregador[cargo][ano]) agregador[cargo][ano] = [];
                agregador[cargo][ano].push(proventos);
            }
        }

        // Média por cargo por ano
        const resultado = {};
        for (const cargo in agregador) {
            resultado[cargo] = {};
            for (const ano in agregador[cargo]) {
                const vals = agregador[cargo][ano];
                resultado[cargo][ano] = vals.reduce((a, b) => a + b, 0) / vals.length;
            }
        }

        if (Object.keys(resultado).length > 0) {
            historicoCargos = resultado;
            dadosCarregados = true;
            const totalCargos = Object.keys(resultado).length;
            const totalMeses = chaves.length;
            if (statusEl) statusEl.innerHTML = `<i class="bi bi-database w-3.5 h-3.5"></i> ${totalCargos} cargos reais · ${totalMeses} meses no banco`;
            if (window.lucide) lucide.createIcons();
            return true;
        }

        historicoCargos = historicoCargosMock;
        dadosCarregados = true;
        if (statusEl) statusEl.innerHTML = '<i class="bi bi-server w-3.5 h-3.5"></i> Usando Dataset Histórico (Mock)';
        return false;
    } catch (e) {
        console.error('Erro ao carregar histórico do IndexedDB:', e);
        historicoCargos = historicoCargosMock;
        dadosCarregados = true;
        if (statusEl) statusEl.innerHTML = '<i class="bi bi-server w-3.5 h-3.5"></i> Usando Dataset Histórico (Mock)';
        return false;
    }
}

// ─────────────────────────────────────────────────
// Helpers para dados esparsos
// ─────────────────────────────────────────────────

/** Retorna os cargos que têm valor para o ano informado. */
function cargosComAno(ano) {
    const result = {};
    for (const c in historicoCargos) {
        if (historicoCargos[c][ano] !== undefined) result[c] = historicoCargos[c][ano];
    }
    return result;
}

/** Média dos valores de um objeto { cargo: valor } */
function mediaValores(obj) {
    const vals = Object.values(obj);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'evolucao') {
        initEvolucaoModule();
    }
});

if (window.location.hash === '#evolucao') {
    setTimeout(initEvolucaoModule, 100);
}

async function initEvolucaoModule() {
    const form = document.getElementById('filter-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    if (window.lucide) lucide.createIcons();

    // Campo de busca textual
    const buscaInput = document.getElementById('buscaCargoTabela');
    if (buscaInput) {
        buscaInput.addEventListener('input', () => {
            const anosSelecionados = [];
            const ini = parseInt(document.getElementById('anoInicial').value);
            const fim = parseInt(document.getElementById('anoFinal').value);
            if (ini <= fim) {
                for (let a = ini; a <= fim; a++) anosSelecionados.push(a.toString());
                renderizarTabela(anosSelecionados);
            }
        });
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        gerarHistorico();
    });

    // Carregar dados e fazer render inicial
    await carregarHistoricoDoIndexedDB();
    if (window.lucide) lucide.createIcons();
    gerarHistorico();
}

function gerarHistorico() {
    const anoInicial = parseInt(document.getElementById('anoInicial').value);
    const anoFinal = parseInt(document.getElementById('anoFinal').value);

    if (anoInicial > anoFinal) {
        alert('O Ano Inicial não pode ser maior que o Ano Final.');
        return;
    }

    const anosStr = [];
    for (let a = anoInicial; a <= anoFinal; a++) anosStr.push(a.toString());

    processarMetricasGlobais(anosStr);
    renderizarGraficoCargos(anosStr);
    renderizarGraficoPoderCompra(anosStr);
    renderizarTabela(anosStr);
}

// ─────────────────────────────────────────────────
// Métricas Globais (cards superiores)
// ─────────────────────────────────────────────────

function processarMetricasGlobais(anos) {
    const anoInit = anos[0];
    const anoFim = anos[anos.length - 1];

    // Só conta cargos que têm dados no ano inicial
    const cargosInit = cargosComAno(anoInit);
    const cargosFim = cargosComAno(anoFim);

    const mediaGlobalInit = mediaValores(cargosInit);
    const mediaGlobalFim = mediaValores(cargosFim);

    // Teto e piso no ano final
    let teto = 0, piso = Infinity;
    for (const v of Object.values(cargosFim)) {
        if (v > teto) teto = v;
        if (v < piso) piso = v;
    }
    if (piso === Infinity) piso = 0;

    // Ideal corrigido pelo SM
    const smInit = historicoSM[anoInit];
    const smFim = historicoSM[anoFim];
    const mediaIdealFim = smInit > 0 ? mediaGlobalInit * (smFim / smInit) : 0;

    // Defasagem
    let defasagemPct = 0;
    if (mediaGlobalFim > 0 && mediaIdealFim > 0) {
        if (mediaGlobalFim < mediaIdealFim) {
            defasagemPct = ((mediaIdealFim - mediaGlobalFim) / mediaIdealFim) * 100;
        } else {
            defasagemPct = ((mediaIdealFim - mediaGlobalFim) / mediaGlobalFim) * 100;
        }
    }

    const diferencaMes = mediaIdealFim - mediaGlobalFim;
    const impactoAnual = diferencaMes * TOTAL_SERVIDORES_ESTIMADO * 13;
    const ratio = piso > 0 ? (teto / piso) : 0;

    // UI
    const elDefasagem = document.getElementById('metric-defasagem');
    if (defasagemPct > 0) {
        elDefasagem.innerText = defasagemPct.toFixed(1) + '%';
        elDefasagem.className = 'text-3xl font-black relative z-10 text-rose-600';
    } else {
        elDefasagem.innerText = '+' + Math.abs(defasagemPct).toFixed(1) + '% (Ganho)';
        elDefasagem.className = 'text-3xl font-black relative z-10 text-emerald-600';
    }

    document.getElementById('metric-custo').innerText = formatBRL(Math.abs(impactoAnual));
    document.getElementById('metric-desigualdade').innerText = ratio.toFixed(1) + 'x';
}

// ─────────────────────────────────────────────────
// Gráfico de Evolução por Cargo
// ─────────────────────────────────────────────────

function renderizarGraficoCargos(anos) {
    if (chartCargosInst) chartCargosInst.destroy();

    // Pega os top cargos com maior salário no último ano do intervalo
    const anoRef = anos[anos.length - 1];
    const cargosNoUltimo = cargosComAno(anoRef);
    const cargosOrdenados = Object.entries(cargosNoUltimo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_CARGOS_GRAFICO)
        .map(([c]) => c);

    // Se não houver dados no último ano, usa os primeiros MAX_CARGOS_GRAFICO
    const cargosExibir = cargosOrdenados.length > 0
        ? cargosOrdenados
        : Object.keys(historicoCargos).slice(0, MAX_CARGOS_GRAFICO);

    const datasets = [];
    cargosExibir.forEach((cargo, i) => {
        const data = anos.map(a => {
            const v = historicoCargos[cargo]?.[a];
            return v !== undefined ? v : null;
        });
        const color = corParaIndice(i);
        datasets.push({
            label: cargo,
            data: data,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            spanGaps: false
        });
    });

    const ctx = document.getElementById('chartCargos').getContext('2d');
    chartCargosInst = new Chart(ctx, {
        type: 'line',
        data: { labels: anos, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.raw === null) return ctx.dataset.label + ': sem dados';
                            return ctx.dataset.label + ': ' + formatBRL(ctx.raw);
                        }
                    }
                },
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: function(v) { return 'R$ ' + (v / 1000).toFixed(1) + 'k'; } }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ─────────────────────────────────────────────────
// Gráfico de Poder de Compra
// ─────────────────────────────────────────────────

function renderizarGraficoPoderCompra(anos) {
    if (chartPoderInst) chartPoderInst.destroy();

    const anoInit = anos[0];
    const smBase = historicoSM[anoInit];

    // Média base no primeiro ano (apenas cargos com dados)
    const baseObj = cargosComAno(anoInit);
    const mediaBase = mediaValores(baseObj);

    const mediaReal = [];
    const mediaIdeal = [];

    anos.forEach(ano => {
        // Real: média dos cargos que têm dados naquele ano
        const realObj = cargosComAno(ano);
        mediaReal.push(mediaValores(realObj));

        // Ideal: corrigido pelo SM
        const fator = historicoSM[ano] / smBase;
        mediaIdeal.push(mediaBase * fator);
    });

    const ctx = document.getElementById('chartPoderCompra').getContext('2d');
    chartPoderInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Salário Médio Real (Aplicado)',
                    data: mediaReal,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    pointHitRadius: 10
                },
                {
                    label: 'Curva do Salário Mínimo (Ideal)',
                    data: mediaIdeal,
                    borderColor: '#f43f5e',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: {
                        target: 0,
                        above: 'rgba(244, 63, 94, 0.1)',
                        below: 'rgba(16, 185, 129, 0.1)'
                    },
                    pointRadius: 0,
                    pointHitRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.raw === 0) return ctx.dataset.label + ': sem dados';
                            return ctx.dataset.label + ': ' + formatBRL(ctx.raw);
                        }
                    }
                },
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: function(v) { return 'R$ ' + v.toLocaleString('pt-BR'); } }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ─────────────────────────────────────────────────
// Tabela de Proporção em Salários Mínimos
// ─────────────────────────────────────────────────

function renderizarTabela(anos) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');

    // Header
    let trHead = `<th class="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50">Cargo</th>`;
    anos.forEach(ano => {
        trHead += `<th class="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">${ano}</th>`;
    });
    head.innerHTML = trHead;

    // Body
    let tbodyHtml = '';
    const termoBusca = (document.getElementById('buscaCargoTabela')?.value || '').toLowerCase().trim();

    // Ordenar cargos alfabeticamente
    const cargosOrdenados = Object.keys(historicoCargos).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );

    for (const cargo of cargosOrdenados) {
        if (termoBusca && !cargo.toLowerCase().includes(termoBusca)) continue;

        tbodyHtml += `<tr class="hover:bg-slate-50/50 transition-colors">
            <td class="py-3 px-5 text-sm font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-100">${sanitize(cargo)}</td>`;

        anos.forEach(ano => {
            const salario = historicoCargos[cargo]?.[ano];
            if (salario === undefined || salario === null) {
                tbodyHtml += `<td class="py-3 px-4 text-sm text-center text-slate-300">—</td>`;
            } else {
                const sm = historicoSM[ano];
                const qtdSM = sm > 0 ? (salario / sm) : 0;

                let color = 'text-slate-600';
                if (qtdSM < 1.5) color = 'text-rose-600 font-bold';
                else if (qtdSM > 5) color = 'text-emerald-600 font-bold';

                tbodyHtml += `<td class="py-3 px-4 text-sm text-center ${color}">${qtdSM.toFixed(1)}x SM</td>`;
            }
        });
        tbodyHtml += `</tr>`;
    }

    // Linha de referência do Salário Mínimo
    tbodyHtml += `<tr class="bg-amber-50/30">
            <td class="py-3 px-5 text-xs font-bold text-amber-700 uppercase tracking-wider sticky left-0 bg-amber-50/80 border-r border-amber-100/50">Valor S.M. (Ref)</td>`;
    anos.forEach(ano => {
        tbodyHtml += `<td class="py-2 px-4 text-xs font-bold text-amber-700 text-center">${formatBRL(historicoSM[ano])}</td>`;
    });
    tbodyHtml += `</tr>`;

    body.innerHTML = tbodyHtml;
}

function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
