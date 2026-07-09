// despesas.js - Módulo de Despesas e Empenhos

let chartsDespesas = {};

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'despesas') {
        initDespesasModule();
    }
});



function initDespesasModule() {
    const form = document.getElementById('form-despesas');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            carregarDadosDespesas();
        });
    }
}

async function carregarDadosDespesas() {
    const exercicio = document.getElementById('exercicioDespesas').value;
    const entidade = document.getElementById('entidadeDespesas').value;
    
    if (!exercicio || !entidade) {
        mostrarErroDespesas('Preencha os filtros para consultar.');
        return;
    }

    const cacheKey = `despesas_${exercicio}_${entidade}`;
    const statusCache = document.getElementById('statusCacheDespesas');
    
    esconderErroDespesas();
    setUiLoadingDespesas(true);

    try {
        let rawData = await getCache(cacheKey);
        if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch (e) {}
        }
        const metaKey = `meta_despesas_${exercicio}_${entidade}`;
        const meta = await getMetadata(metaKey);

        if (rawData) {
            statusCache.classList.remove('hidden');
            statusCache.classList.add('flex');
            
            let dataFormatada = 'Data desconhecida';
            if (meta && meta.timestamp) {
                const d = new Date(meta.timestamp);
                dataFormatada = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
            } else {
                const oldCacheObj = await getCacheRaw(cacheKey);
                if (oldCacheObj && oldCacheObj.timestamp) {
                    const d = new Date(oldCacheObj.timestamp);
                    dataFormatada = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
                }
            }
            updateStatusBanner('success', `Exibindo dados do Banco Local - Última atualização: ${dataFormatada}`);
            
            processarDespesas(rawData);
            setUiLoadingDespesas(false);
            return;
        } else {
            statusCache.classList.add('hidden');
            statusCache.classList.remove('flex');
            updateStatusBanner('error', `Base vazia. Vá em Sincronização para baixar os dados.`);
            mostrarErroDespesas('Dados não encontrados no Banco Local para este período. Por favor, acesse o menu de Sincronização e faça o download.');
            document.getElementById('areaDespesas').classList.add('hidden');
            setUiLoadingDespesas(false);
            return;
        }

    } catch (err) {
        console.error(err);
        mostrarErroDespesas('Erro ao processar as despesas: ' + err.message);
        document.getElementById('areaDespesas').classList.add('hidden');
    } finally {
        setUiLoadingDespesas(false);
    }
}

function gerarMockDespesas(ano, entidade) {
    const funcoes = ['Saúde', 'Educação', 'Urbanismo', 'Administração', 'Segurança Pública'];
    const fornecedores = ['Construtora Alfa Ltda', 'Distribuidora Beta S/A', 'Posto de Gasolina Omega', 'Viacao Delta', 'Livraria Estudantil'];
    
    let mock = [];
    const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    meses.forEach(mes => {
        for(let i=0; i<15; i++) {
            const val = Math.random() * 500000;
            mock.push({
                Mes: mes,
                Ano: ano,
                Entidade: entidade,
                Funcao: funcoes[Math.floor(Math.random() * funcoes.length)],
                Credor: fornecedores[Math.floor(Math.random() * fornecedores.length)],
                ValorEmpenhado: val * 1.1,
                ValorLiquidado: val * 1.05,
                ValorPago: val
            });
        }
    });
    
    return mock;
}

function processarDespesas(rawRows) {
    let tEmpenhado = 0;
    let tLiquidado = 0;
    let tPago = 0;
    
    let mapFuncao = {};
    let mapCredores = {};

    rawRows.forEach(row => {
        const vEmpenhado = parseValorBR(row.valorEmpenho || row.ValorEmpenhado || row.empenhado || '0') || 0;
        const vLiquidado = parseValorBR(row.valorLiquidado || row.ValorLiquidado || row.liquidado || '0') || 0;
        const vPago = parseValorBR(row.valorPago || row.ValorPago || row.pago || '0') || 0;
        
        tEmpenhado += vEmpenhado;
        tLiquidado += vLiquidado;
        tPago += vPago;
        
        const funcStr = row.funcao || row.Funcao || 'Administração Geral';
        const credorStr = row.credor || row.Credor || 'Diversos';

        if(!mapFuncao[funcStr]) mapFuncao[funcStr] = 0;
        mapFuncao[funcStr] += vPago;
        
        if(!mapCredores[credorStr]) mapCredores[credorStr] = 0;
        mapCredores[credorStr] += vPago;
    });

    document.getElementById('totalEmpenhado').textContent = formatBRL(tEmpenhado);
    document.getElementById('totalLiquidado').textContent = formatBRL(tLiquidado);
    document.getElementById('totalPago').textContent = formatBRL(tPago);

    if (tEmpenhado === 0 && rawRows.length > 0) {
        document.getElementById('totalEmpenhado').textContent = 'CHAVES: ' + Object.keys(rawRows[0]).join(', ');
    }

    document.getElementById('areaDespesas').classList.remove('hidden');

    renderChartFases(tEmpenhado, tLiquidado, tPago);
    renderChartFuncao(mapFuncao);
    renderTabelaCredores(mapCredores);
}

function renderChartFases(e, l, p) {
    if(chartsDespesas['fases']) chartsDespesas['fases'].destroy();
    
    const ctx = document.getElementById('chartDespesasFases').getContext('2d');
    chartsDespesas['fases'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Empenhado', 'Liquidado', 'Pago'],
            datasets: [{
                label: 'Execução (R$)',
                data: [e, l, p],
                backgroundColor: ['#f43f5e', '#f97316', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => formatBRL(ctx.raw) } }
            },
            scales: {
                y: { grid: { borderDash: [4, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderChartFuncao(mapFuncao) {
    if(chartsDespesas['funcao']) chartsDespesas['funcao'].destroy();
    
    const entries = Object.entries(mapFuncao).sort((a,b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 5);
    const labels = topEntries.map(e => e[0]);
    const data = topEntries.map(e => e[1]);

    const ctx = document.getElementById('chartDespesasFuncao').getContext('2d');
    chartsDespesas['funcao'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: { callbacks: { label: ctx => formatBRL(ctx.raw) } }
            }
        }
    });
}

function renderTabelaCredores(mapCredores) {
    const tbody = document.getElementById('tabelaDespesasBody');
    if(!tbody) return;

    const entries = Object.entries(mapCredores).sort((a,b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 20); // Mostrar os 20 maiores credores
    
    tbody.innerHTML = topEntries.map(e => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4 text-xs font-medium text-slate-700">${e[0]}</td>
            <td class="py-3 px-4 text-xs font-bold text-slate-700 text-right">${formatBRL(e[1])}</td>
        </tr>
    `).join('');
}

function formatBRL(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setUiLoadingDespesas(isLoading) {
    const btn = document.getElementById('btnBuscarDespesas');
    const loadState = document.getElementById('loadingDespesas');
    if(!btn || !loadState) return;
    
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('opacity-70');
        loadState.classList.remove('hidden');
        loadState.classList.add('flex');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-70');
        loadState.classList.add('hidden');
        loadState.classList.remove('flex');
    }
}

function mostrarErroDespesas(msg) {
    const errMsg = document.getElementById('msgErroDespesas');
    const errAlert = document.getElementById('alertaErroDespesas');
    if(!errMsg || !errAlert) return;
    errMsg.textContent = msg;
    errAlert.classList.remove('hidden');
    errAlert.classList.add('flex');
}

function esconderErroDespesas() {
    const errAlert = document.getElementById('alertaErroDespesas');
    if(!errAlert) return;
    errAlert.classList.add('hidden');
    errAlert.classList.remove('flex');
}
