// receitas.js - Módulo de Receitas e Arrecadação

let chartsReceitas = {};

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'receitas') {
        initReceitasModule();
    }
});

if (window.location.hash === '#receitas' || window.location.hash.includes('receitas')) {
    setTimeout(initReceitasModule, 100);
}

function initReceitasModule() {
    const form = document.getElementById('form-receitas');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            carregarDadosReceitas();
        });
    }
}

async function carregarDadosReceitas() {
    const exercicio = document.getElementById('exercicioReceitas').value;
    const entidade = document.getElementById('entidadeReceitas').value;
    
    if (!exercicio || !entidade) {
        mostrarErroReceitas('Preencha os filtros para consultar.');
        return;
    }

    const cacheKey = `receitas_${exercicio}_${entidade}`;
    const statusCache = document.getElementById('statusCacheReceitas');
    
    esconderErroReceitas();
    setUiLoadingReceitas(true);

    try {
        let rawData = await getCache(cacheKey);
        if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch (e) {}
        }
        const metaKey = `meta_receitas_${exercicio}_${entidade}`;
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
            
            processarReceitas(rawData);
            setUiLoadingReceitas(false);
            return;
        } else {
            statusCache.classList.add('hidden');
            statusCache.classList.remove('flex');
            updateStatusBanner('error', `Base vazia. Vá em Sincronização para baixar os dados.`);
            mostrarErroReceitas('Dados não encontrados no Banco Local para este período. Por favor, acesse o menu de Sincronização e faça o download.');
            document.getElementById('areaReceitas').classList.add('hidden');
            setUiLoadingReceitas(false);
            return;
        }    } catch (err) {
        console.error(err);
        mostrarErroReceitas('Erro ao processar as receitas: ' + err.message);
        document.getElementById('areaReceitas').classList.add('hidden');
    } finally {
        setUiLoadingReceitas(false);
    }
}

function gerarMockReceitas(ano, entidade) {
    const categorias = [
        { nome: 'Impostos, Taxas e Contribuições de Melhoria', base: 120000000 },
        { nome: 'Transferências Correntes (FPM, ICMS, IPVA)', base: 450000000 },
        { nome: 'Receitas Patrimoniais', base: 15000000 },
        { nome: 'Receitas de Serviços', base: 25000000 },
        { nome: 'Outras Receitas Correntes', base: 35000000 }
    ];
    
    let mock = [];
    const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    meses.forEach(mes => {
        categorias.forEach(cat => {
            // Variação randomica de +/- 15% por mes
            const variacao = 1 + ((Math.random() * 0.3) - 0.15);
            const valorMes = (cat.base / 12) * variacao;
            
            mock.push({
                Mes: mes,
                Ano: ano,
                Entidade: entidade,
                Categoria: cat.nome,
                ValorArrecadado: valorMes
            });
        });
    });
    
    return mock;
}

function processarReceitas(rawRows) {
    let totalAno = 0;
    let mapMensal = {};
    let mapComposicao = {};

    // Inicializar meses 1 a 12
    for(let i=1; i<=12; i++) {
        mapMensal[String(i).padStart(2, '0')] = 0;
    }

    rawRows.forEach(row => {
        const valStr = row.ValorArrecadadoLiquido || row.ValorArrecadadoBruto || row.ValorArrecadado || row.valor || row.Arrecadado || '0';
        const valor = parseFloat(String(valStr).replace(',', '.')) || 0;
        
        let mesStr = String(row.Mes || row.mes || '01').toUpperCase();
        
        const nomesMeses = {
            'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'MARCO': '03',
            'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07',
            'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
        };
        if (nomesMeses[mesStr]) mesStr = nomesMeses[mesStr];
        else if (!isNaN(mesStr)) mesStr = mesStr.padStart(2, '0');

        const catStr = row.dsRubrica || row.dsOrigem || row.Categoria || row.Rubrica || row.Receita || 'Outras';

        totalAno += valor;
        
        if(mapMensal[mesStr] !== undefined) {
            mapMensal[mesStr] += valor;
        }

        if(!mapComposicao[catStr]) mapComposicao[catStr] = 0;
        mapComposicao[catStr] += valor;
    });

    // Atualizar Cards
    const mediaMes = totalAno / 12;
    document.getElementById('totalArrecadado').textContent = formatBRL(totalAno);
    document.getElementById('mediaArrecadacao').textContent = formatBRL(mediaMes);

    if (totalAno === 0 && rawRows.length > 0) {
        document.getElementById('totalArrecadado').textContent = 'CHAVES: ' + Object.keys(rawRows[0]).join(', ');
    }
    
    let maiorFonte = '-';
    let maxVal = 0;
    Object.keys(mapComposicao).forEach(k => {
        if(mapComposicao[k] > maxVal) {
            maxVal = mapComposicao[k];
            maiorFonte = k;
        }
    });
    document.getElementById('maiorFonteReceita').textContent = maiorFonte;

    document.getElementById('areaReceitas').classList.remove('hidden');

    // Gráficos
    renderChartMensal(mapMensal);
    renderChartComposicao(mapComposicao);
    renderTabelaReceitas(mapComposicao, totalAno);
}

function renderChartMensal(mapMensal) {
    if(chartsReceitas['mensal']) chartsReceitas['mensal'].destroy();
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const valores = Object.values(mapMensal);

    const ctx = document.getElementById('chartReceitasMensal').getContext('2d');
    chartsReceitas['mensal'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Arrecadação (R$)',
                data: valores,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#047857'
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

function renderChartComposicao(mapComposicao) {
    if(chartsReceitas['composicao']) chartsReceitas['composicao'].destroy();
    
    // Sort and limit to top 5
    const entries = Object.entries(mapComposicao).sort((a,b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 5);
    const labels = topEntries.map(e => e[0].length > 25 ? e[0].substring(0, 25) + '...' : e[0]);
    const data = topEntries.map(e => e[1]);

    const ctx = document.getElementById('chartReceitasComposicao').getContext('2d');
    chartsReceitas['composicao'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
                borderWidth: 0,
                cutout: '70%'
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

function renderTabelaReceitas(mapComposicao, total) {
    const tbody = document.getElementById('tabelaReceitasBody');
    if(!tbody) return;

    const entries = Object.entries(mapComposicao).sort((a,b) => b[1] - a[1]);
    
    tbody.innerHTML = entries.map(e => {
        const perc = total > 0 ? ((e[1] / total) * 100).toFixed(1) + '%' : '0%';
        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 text-xs font-medium text-slate-700">${e[0]}</td>
                <td class="py-3 px-4 text-xs font-bold text-slate-700 text-right">${formatBRL(e[1])}</td>
                <td class="py-3 px-4 text-xs font-semibold text-slate-500 text-center">
                    <span class="inline-block bg-slate-100 px-2 py-1 rounded">${perc}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function formatBRL(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setUiLoadingReceitas(isLoading) {
    const btn = document.getElementById('btnBuscarReceitas');
    const loadState = document.getElementById('loadingReceitas');
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

function mostrarErroReceitas(msg) {
    const errMsg = document.getElementById('msgErroReceitas');
    const errAlert = document.getElementById('alertaErroReceitas');
    if(!errMsg || !errAlert) return;
    errMsg.textContent = msg;
    errAlert.classList.remove('hidden');
    errAlert.classList.add('flex');
}

function esconderErroReceitas() {
    const errAlert = document.getElementById('alertaErroReceitas');
    if(!errAlert) return;
    errAlert.classList.add('hidden');
    errAlert.classList.remove('flex');
}
