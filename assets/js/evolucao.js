// evolucao.js - Lógica do Módulo de Evolução Salarial

// Dataset Mockado (Simulado) para renderização imediata
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

const historicoCargos = {
    'Professor':       { 2018: 2500, 2019: 2500, 2020: 2500, 2021: 2500, 2022: 3000, 2023: 3200, 2024: 3400, 2025: 3500, 2026: 3500 },
    'Médico':          { 2018: 6000, 2019: 6000, 2020: 6000, 2021: 6500, 2022: 7000, 2023: 7500, 2024: 8000, 2025: 8500, 2026: 9000 },
    'Guarda Municipal':{ 2018: 2000, 2019: 2100, 2020: 2100, 2021: 2100, 2022: 2400, 2023: 2600, 2024: 2800, 2025: 2900, 2026: 3000 },
    'Administrativo':  { 2018: 1200, 2019: 1300, 2020: 1300, 2021: 1350, 2022: 1500, 2023: 1600, 2024: 1700, 2025: 1800, 2026: 1900 }
};

let chartCargosInst = null;
let chartPoderInst = null;

const TOTAL_SERVIDORES_ESTIMADO = 3000; // Volumetria base

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'evolucao') {
        initEvolucaoModule();
    }
});

if (window.location.hash === '#evolucao') {
    setTimeout(initEvolucaoModule, 100);
}

function initEvolucaoModule() {
    const form = document.getElementById('filter-form');
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    if (window.lucide) lucide.createIcons();
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        gerarHistorico();
    });

    // Render inicial
    gerarHistorico();
}

function gerarHistorico() {
    const anoInicial = parseInt(document.getElementById('anoInicial').value);
    const anoFinal = parseInt(document.getElementById('anoFinal').value);

    if (anoInicial > anoFinal) {
        alert("O Ano Inicial não pode ser maior que o Ano Final.");
        return;
    }

    // Criar array de anos no intervalo
    const anosStr = [];
    for (let a = anoInicial; a <= anoFinal; a++) {
        anosStr.push(a.toString());
    }

    processarMetricasGlobais(anosStr);
    renderizarGraficoCargos(anosStr);
    renderizarGraficoPoderCompra(anosStr);
    renderizarTabela(anosStr);
}

function processarMetricasGlobais(anos) {
    const anoInit = anos[0];
    const anoFim = anos[anos.length - 1];

    // Média global no ano inicial
    let somaInit = 0;
    let numCargos = Object.keys(historicoCargos).length;
    for (let cargo in historicoCargos) {
        somaInit += historicoCargos[cargo][anoInit];
    }
    const mediaGlobalInit = somaInit / numCargos;

    // Média global no ano final
    let somaFim = 0;
    let teto = 0;
    let piso = Infinity;
    for (let cargo in historicoCargos) {
        let valFim = historicoCargos[cargo][anoFim];
        somaFim += valFim;
        if(valFim > teto) teto = valFim;
        if(valFim < piso) piso = valFim;
    }
    const mediaGlobalFim = somaFim / numCargos;

    // Calculo do Salário Ideal corrigido pelo SM
    const smInit = historicoSM[anoInit];
    const smFim = historicoSM[anoFim];
    const fatorCrescimentoSM = smFim / smInit;
    
    const mediaIdealFim = mediaGlobalInit * fatorCrescimentoSM;

    // Defasagem
    let defasagemPct = 0;
    if (mediaGlobalFim < mediaIdealFim) {
        defasagemPct = ((mediaIdealFim - mediaGlobalFim) / mediaIdealFim) * 100;
    } else {
        // Superávit (Valor Negativo representa ganho real acima da inflação do SM)
        defasagemPct = ((mediaIdealFim - mediaGlobalFim) / mediaGlobalFim) * 100;
    }

    // Custo do Ajuste
    const diferencaMes = mediaIdealFim - mediaGlobalFim; // Se positivo, prefeitura deve; se negativo, pagou a mais.
    const impactoAnual = diferencaMes * TOTAL_SERVIDORES_ESTIMADO * 13; // 12 meses + 13º

    // Teto vs Piso
    const ratio = teto / piso;

    // Atualizar UI
    const elDefasagem = document.getElementById('metric-defasagem');
    if(defasagemPct > 0) {
        elDefasagem.innerText = defasagemPct.toFixed(1) + '%';
        elDefasagem.className = 'text-3xl font-black relative z-10 text-rose-600';
    } else {
        elDefasagem.innerText = '+' + Math.abs(defasagemPct).toFixed(1) + '% (Ganho)';
        elDefasagem.className = 'text-3xl font-black relative z-10 text-emerald-600';
    }

    const elCusto = document.getElementById('metric-custo');
    elCusto.innerText = formatBRL(Math.abs(impactoAnual));
    
    document.getElementById('metric-desigualdade').innerText = ratio.toFixed(1) + 'x';
}

function renderizarGraficoCargos(anos) {
    if (chartCargosInst) chartCargosInst.destroy();

    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
    const datasets = [];
    
    let colorIdx = 0;
    for (let cargo in historicoCargos) {
        const data = anos.map(a => historicoCargos[cargo][a]);
        datasets.push({
            label: cargo,
            data: data,
            borderColor: colors[colorIdx],
            backgroundColor: colors[colorIdx],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
        });
        colorIdx++;
    }

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
                        label: function(ctx) { return ctx.dataset.label + ': ' + formatBRL(ctx.raw); }
                    }
                },
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: function(v) { return 'R$ ' + (v/1000).toFixed(1) + 'k'; } }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderizarGraficoPoderCompra(anos) {
    if (chartPoderInst) chartPoderInst.destroy();

    const mediaReal = [];
    const mediaIdeal = [];
    
    const anoInit = anos[0];
    
    // Média base no ano 1
    let somaInit = 0;
    let numCargos = Object.keys(historicoCargos).length;
    for (let c in historicoCargos) { somaInit += historicoCargos[c][anoInit]; }
    const mediaBase = somaInit / numCargos;
    const smBase = historicoSM[anoInit];

    anos.forEach(ano => {
        // Calcular Real
        let somaReal = 0;
        for (let c in historicoCargos) { somaReal += historicoCargos[c][ano]; }
        mediaReal.push(somaReal / numCargos);

        // Calcular Ideal (Corrigido pelo SM)
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
                    borderColor: '#10b981', // Verde
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    pointHitRadius: 10
                },
                {
                    label: 'Curva do Salário Mínimo (Ideal)',
                    data: mediaIdeal,
                    borderColor: '#f43f5e', // Rosa/Vermelho
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: {
                        target: 0,
                        above: 'rgba(244, 63, 94, 0.1)', // Deficit (Ideal > Real = Vermelho claro)
                        below: 'rgba(16, 185, 129, 0.1)' // Superavit (Ideal < Real = Verde claro)
                    },
                    pointRadius: 0,
                    pointHitRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return ctx.dataset.label + ': ' + formatBRL(ctx.raw); }
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
    for (let cargo in historicoCargos) {
        tbodyHtml += `<tr class="hover:bg-slate-50/50 transition-colors">
            <td class="py-3 px-5 text-sm font-semibold text-slate-700 sticky left-0 bg-white border-r border-slate-100">${cargo}</td>`;
        
        anos.forEach(ano => {
            const salario = historicoCargos[cargo][ano];
            const sm = historicoSM[ano];
            const qtdSM = salario / sm;
            
            let color = 'text-slate-600';
            // Regra visual de cor
            if (qtdSM < 1.5) color = 'text-rose-600 font-bold';
            else if (qtdSM > 5) color = 'text-emerald-600 font-bold';

            tbodyHtml += `<td class="py-3 px-4 text-sm text-center ${color}">${qtdSM.toFixed(1)}x SM</td>`;
        });
        tbodyHtml += `</tr>`;
    }
    
    // Adicionar linha do Salário Mínimo Nominal como referência
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
