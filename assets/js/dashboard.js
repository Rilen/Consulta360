let chartEvolucaoGlobalInstance = null;

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'dashboard') {
        setTimeout(() => {
            const btn = document.getElementById('btnRefreshDashboard');
            if (btn && !btn.dataset.bound) {
                btn.dataset.bound = 'true';
                btn.addEventListener('click', loadDashboardData);
            }
            loadDashboardData();
        }, 100);
    }
});

if (window.location.hash === '#dashboard') {
    setTimeout(loadDashboardData, 100);
}

async function loadDashboardData() {
    const btn = document.getElementById('btnRefreshDashboard');
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Processando...';
    if (window.lucide) window.lucide.createIcons();

    try {
        const allCaches = await getAllCache(); // usa wrapper encapsulado de db.js
        processarDadosDashboard(allCaches);
        if (btn) btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar Dados';
        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error("Erro no Dashboard:", e);
        if (btn) btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar Dados';
    }
}

function processarDadosDashboard(allCaches) {
    let mesesCacheados = 0;
    let custoTotal = 0;
    let maiorSalario = 0;
    let topSalarios = [];
    let unicos = new Set();
    
    // Para o gráfico de evolução
    const custosPorMes = {};

    for (const cache of allCaches) {
        if (!cache.id.startsWith('FolhaPagamento_')) continue;
        
        mesesCacheados++;
        
        let dataStr = typeof cache.data === 'string' ? cache.data : null;
        let dataObj = typeof cache.data === 'object' ? cache.data : null;
        
        if (dataStr) {
            try { dataObj = JSON.parse(dataStr); } catch(e) {}
        }
        
        if (!Array.isArray(dataObj)) continue;

        const partesId = cache.id.split('_');
        const mesAno = partesId[partesId.length - 1]; // "2026-05"

        let custoMes = 0;

        for (const reg of dataObj) {
            const cpf = reg.CPF || reg.cpf || '';
            const nome = reg.Nome || reg.NomeServidor || reg.NomeCompleto || '';
            const ident = cpf.replace(/\D/g, '') || nome.trim().toUpperCase();
            
            if (ident) unicos.add(ident);

            const liquido = parseValorBR(reg.ValorLiquido || reg.Liquido || 0);
            const vencimento = parseValorBR(reg.VencimentosTotais || reg.Vencimento || 0);
            
            custoMes += vencimento;
            custoTotal += vencimento;

            if (liquido > maiorSalario) maiorSalario = liquido;

            // Coletar para Top 10 (apenas os maiores de toda a base)
            topSalarios.push({
                nome: nome,
                cargo: reg.CargoFuncao || reg.Cargo || '',
                liquido: liquido,
                mes: mesAno
            });
        }

        if (!custosPorMes[mesAno]) custosPorMes[mesAno] = 0;
        custosPorMes[mesAno] += custoMes;
    }

    // Top 10 Maiores (Ordenação super rápida)
    topSalarios.sort((a, b) => b.liquido - a.liquido);
    const top10 = topSalarios.slice(0, 10);

    // Atualizar UI
    document.getElementById('dashMeses').textContent = mesesCacheados;
    document.getElementById('dashServidores').textContent = unicos.size.toLocaleString('pt-BR');
    document.getElementById('dashCusto').textContent = formatarMoeda(custoTotal);
    document.getElementById('dashTeto').textContent = formatarMoeda(maiorSalario);

    renderTopSalarios(top10);
    renderChartEvolucaoGlobal(custosPorMes);
}

function renderTopSalarios(lista) {
    const container = document.getElementById('listaTopSalarios');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 text-center py-10">Nenhum dado encontrado no cache local.</p>';
        return;
    }

    container.innerHTML = lista.map((item, i) => `
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'} flex items-center justify-center font-bold text-xs shrink-0">
                    ${i + 1}º
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-700 leading-tight">${item.nome}</h4>
                    <p class="text-[11px] text-slate-500 mt-0.5">${item.cargo} • ${item.mes}</p>
                </div>
            </div>
            <div class="text-sm font-bold text-emerald-600 shrink-0 ml-4">
                ${formatarMoeda(item.liquido)}
            </div>
        </div>
    `).join('');
}

function renderChartEvolucaoGlobal(custosPorMes) {
    const ctx = document.getElementById('chartEvolucaoGlobal');
    if (!ctx) return;

    // Ordenar os meses cronologicamente
    const meses = Object.keys(custosPorMes).sort();
    const valores = meses.map(m => custosPorMes[m]);

    if (chartEvolucaoGlobalInstance) chartEvolucaoGlobalInstance.destroy();

    chartEvolucaoGlobalInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Custo Total da Folha (R$)',
                data: valores,
                borderColor: '#3b82f6', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Custo: ' + formatarMoeda(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                            return 'R$ ' + value;
                        }
                    }
                }
            }
        }
    });
}

// parseValorLocal foi consolidada em parseValorBR (api.js) — função canônica de parsing.
// formatarMoeda: wrapper local para Intl.NumberFormat
function formatarMoeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
