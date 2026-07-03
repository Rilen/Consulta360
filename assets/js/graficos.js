// graficos.js - Módulo de Análise e Gráficos

let myCharts = {};

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'graficos') {
        initGraficosModule();
    }
});

if (window.location.hash === '#graficos' || window.location.hash.includes('graficos')) {
    setTimeout(initGraficosModule, 100);
}

function initGraficosModule() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const mesAnoInput = document.getElementById('mesAno');
    if (mesAnoInput && !mesAnoInput.value) {
        mesAnoInput.value = ano + '-' + mes;
    }

    const form = document.getElementById('filter-form');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            carregarDadosGraficos(false);
        });
    }

    const btnForcar = document.getElementById('btnForcarAtualizacao');
    if (btnForcar) {
        const newBtn = btnForcar.cloneNode(true);
        btnForcar.parentNode.replaceChild(newBtn, btnForcar);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            carregarDadosGraficos(true);
        });
    }
}

async function carregarDadosGraficos(forceUpdate = false) {
    const mesAno = document.getElementById('mesAno').value;
    const nomeBase = document.getElementById('nomeBase').value;
    
    if (!mesAno) {
        mostrarErroGraficos('Selecione um mês de referência.');
        return;
    }

    const cacheKey = `analytics_${mesAno}_${nomeBase}`;
    const statusCache = document.getElementById('statusCache');
    
    esconderErroGraficos();
    setUiLoadingGraficos(true);

    try {
        let rawData = null;

        if (forceUpdate) {
            await removeCache(cacheKey);
        } else {
            rawData = await getCache(cacheKey);
        }

        if (rawData) {
            statusCache.classList.remove('hidden');
            statusCache.classList.add('flex');
            processarAnalytics(rawData);
            setUiLoadingGraficos(false);
            return;
        }

        statusCache.classList.add('hidden');
        statusCache.classList.remove('flex');
        
        const datas = mesAnoParaDatas(mesAno);
        const baseUrl = API_BASE + '/FolhaPagamento' +
            '?dataInicial=' + datas.dataInicial +
            '&dataFinal=' + datas.dataFinal +
            '&nomeBase=' + encodeURIComponent(nomeBase);

        let dadosApi = [];
        let pagina = 1;
        const maxPaginas = 100;
        let falhaApi = false;

        while (pagina <= maxPaginas) {
            const url = baseUrl + '&numeroPagina=' + pagina;
            const loadingMsg = document.getElementById('loadingMsg');
            if (loadingMsg) loadingMsg.textContent = `Sincronizando página ${pagina} da API...`;

            try {
                const resp = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
                
                if (!resp.ok) {
                    falhaApi = true;
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
                dadosApi = dadosApi.concat(paginaDados);
                
                if (paginaDados.length < 200) break;
                pagina++;
            } catch(e) {
                falhaApi = true;
                break;
            }
        }

        if (pagina === 1 && falhaApi) {
            console.warn('API falhou, tentando fallback local...', baseUrl);
            try {
                const mockRes = await fetch('./payload.json');
                if (mockRes.ok) {
                    dadosApi = await mockRes.json();
                    if(typeof showOfflineToast !== 'undefined') {
                        showOfflineToast('⚠️ API Bloqueada por CORS. Carregando Base de Demonstração (MOCK Local).', 'warning');
                    }
                } else {
                    throw new Error('Sem mock');
                }
            } catch(e) {
                const alertaErro = document.getElementById('alertaErro');
                if (alertaErro) {
                    alertaErro.classList.remove('hidden');
                    alertaErro.classList.add('flex');
                }
                throw new Error('API Indisponível e sem cache salvo para este período.');
            }
        }

        if (dadosApi.length > 0) {
            if (!falhaApi) {
                await setCache(cacheKey, dadosApi);
            }
            processarAnalytics(dadosApi);
        } else {
            mostrarErroGraficos('Nenhum dado encontrado para o período/entidade informado.');
            document.getElementById('analyticsArea').classList.add('hidden');
        }

    } catch (err) {
        console.error(err);
        mostrarErroGraficos('Erro ao processar os dados: ' + err.message);
        document.getElementById('analyticsArea').classList.add('hidden');
    } finally {
        setUiLoadingGraficos(false);
    }
}

let cacheServidoresGeral = [];

function processarAnalytics(rawRows) {
    if (!rawRows || rawRows.length === 0) return;

    const sample = rawRows[0];
    const chaves = Object.keys(sample);
    
    const colNome = chaves.find(k => isNomeKey(k));
    const colBruto = chaves.find(k => isBrutoKey(k));
    const colLiquido = chaves.find(k => isLiquidoKey(k));

    if (!colNome) {
        mostrarErroGraficos('Não foi possível identificar a coluna de nome do servidor nos dados.');
        return;
    }

    const unificados = {};

    rawRows.forEach(row => {
        const nomeOriginal = row[colNome] ? String(row[colNome]).trim() : 'Desconhecido';
        const nomeUpper = nomeOriginal.toUpperCase();
        
        let brutoVal = 0;
        let liquidoVal = 0;

        if (colBruto && row[colBruto]) {
            brutoVal = parseFloat(String(row[colBruto]).replace(',', '.')) || 0;
        }
        if (colLiquido && row[colLiquido]) {
            liquidoVal = parseFloat(String(row[colLiquido]).replace(',', '.')) || 0;
        }

        if (!unificados[nomeUpper]) {
            unificados[nomeUpper] = {
                nome: nomeOriginal,
                vinculos: 0,
                totalBruto: 0,
                totalLiquido: 0
            };
        }

        unificados[nomeUpper].vinculos += 1;
        unificados[nomeUpper].totalBruto += brutoVal;
        unificados[nomeUpper].totalLiquido += liquidoVal;
    });

    const servidores = Object.values(unificados);
    cacheServidoresGeral = servidores;

    const totalVinculos = rawRows.length;
    const totalUnicos = servidores.length;
    
    const liquidosSort = servidores.map(s => s.totalLiquido).sort((a,b) => a - b);
    let mediana = 0;
    if (liquidosSort.length > 0) {
        const mid = Math.floor(liquidosSort.length / 2);
        if (liquidosSort.length % 2 === 0) {
            mediana = (liquidosSort[mid - 1] + liquidosSort[mid]) / 2;
        } else {
            mediana = liquidosSort[mid];
        }
    }

    const somaGeral = liquidosSort.reduce((acc, v) => acc + v, 0);
    const media = totalUnicos > 0 ? (somaGeral / totalUnicos) : 0;

    const servidoresComAcumulo = servidores.filter(s => s.vinculos > 1).length;
    const pctAcumulo = totalUnicos > 0 ? (servidoresComAcumulo / totalUnicos) * 100 : 0;

    document.getElementById('metric-unicos').textContent = totalUnicos.toLocaleString('pt-BR');
    document.getElementById('metric-total-vinculos').textContent = `Total de ${totalVinculos.toLocaleString('pt-BR')} matrículas (bruto)`;
    document.getElementById('metric-media').textContent = formatBRL(media);
    document.getElementById('metric-mediana').textContent = formatBRL(mediana);
    document.getElementById('metric-acumulo').textContent = pctAcumulo.toFixed(1) + '%';
    document.getElementById('donutTotal').textContent = totalUnicos.toLocaleString('pt-BR');

    document.getElementById('analyticsArea').classList.remove('hidden');

    Object.keys(myCharts).forEach(k => {
        if (myCharts[k]) myCharts[k].destroy();
    });

    renderChartDistribuicao(servidores);
    renderChartAcumulacao(totalUnicos, servidoresComAcumulo);
    renderChartTop10(servidores, media);
}

function renderChartDistribuicao(servidores) {
    let f1 = 0, f2 = 0, f3 = 0, f4 = 0;
    
    servidores.forEach(s => {
        const liq = s.totalLiquido;
        if (liq <= 3000) f1++;
        else if (liq <= 6000) f2++;
        else if (liq <= 10000) f3++;
        else f4++;
    });

    const ctx = document.getElementById('chartDistribuicao').getContext('2d');
    myCharts['distribuicao'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Até R$ 3.000', 'R$ 3.001 - R$ 6.000', 'R$ 6.001 - R$ 10.000', 'Acima de R$ 10.000'],
            datasets: [{
                label: 'Qtd de Servidores Únicos',
                data: [f1, f2, f3, f4],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                x: { grid: { display: false } }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    let filters = [];
                    if(idx === 0) filters = servidores.filter(s => s.totalLiquido <= 3000);
                    if(idx === 1) filters = servidores.filter(s => s.totalLiquido > 3000 && s.totalLiquido <= 6000);
                    if(idx === 2) filters = servidores.filter(s => s.totalLiquido > 6000 && s.totalLiquido <= 10000);
                    if(idx === 3) filters = servidores.filter(s => s.totalLiquido > 10000);
                    abrirModalVinculosCustom(filters, `Faixa: ${['Até R$ 3.000', 'R$ 3.001 - R$ 6.000', 'R$ 6.001 - R$ 10.000', 'Acima de R$ 10.000'][idx]}`);
                }
            }
        }
    });
}

function renderChartAcumulacao(totalUnicos, acumulados) {
    const umVinculo = totalUnicos - acumulados;
    
    const ctx = document.getElementById('chartAcumulacao').getContext('2d');
    myCharts['acumulacao'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Possuem 1 Vínculo', 'Possuem Múltiplos Vínculos'],
            datasets: [{
                data: [umVinculo, acumulados],
                backgroundColor: ['rgba(148, 163, 184, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                hoverBackgroundColor: ['rgba(148, 163, 184, 1)', 'rgba(168, 85, 247, 1)'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderChartTop10(servidores, mediaGeral) {
    const limit = parseInt(document.getElementById('selectTopLimit')?.value || '10');
    const order = document.getElementById('selectTopOrdem')?.value || 'desc';

    let sorted = [...servidores];
    if (order === 'desc') {
        sorted.sort((a, b) => b.totalLiquido - a.totalLiquido);
    } else {
        sorted.sort((a, b) => a.totalLiquido - b.totalLiquido);
    }
    
    sorted = sorted.slice(0, limit);
    
    const labels = sorted.map(s => {
        const parts = s.nome.split(' ');
        if(parts.length > 2) return `${parts[0]} ${parts[parts.length-1]}`;
        return s.nome;
    });
    const dataLiquido = sorted.map(s => s.totalLiquido);

    const container = document.getElementById('chartTopContainer');
    if(limit > 20) {
        container.style.height = (limit * 25) + 'px';
    } else {
        container.style.height = '400px';
    }

    if(myCharts['top10']) {
        myCharts['top10'].destroy();
    }

    const ctx = document.getElementById('chartTop10').getContext('2d');
    myCharts['top10'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Líquido Agregado',
                    data: dataLiquido,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Média Geral (Linha de Base)',
                    type: 'line',
                    data: Array(limit).fill(mediaGeral),
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.x !== null) { label += formatBRL(context.parsed.x); }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                y: { grid: { display: false } }
            }
        }
    });
}

function atualizarTop() {
    if(cacheServidoresGeral.length > 0) {
        const liquidosSort = cacheServidoresGeral.map(s => s.totalLiquido).sort((a,b) => a - b);
        const somaGeral = liquidosSort.reduce((acc, v) => acc + v, 0);
        const media = cacheServidoresGeral.length > 0 ? (somaGeral / cacheServidoresGeral.length) : 0;
        renderChartTop10(cacheServidoresGeral, media);
    }
}

function abrirModalVinculos(tipo) {
    if(tipo === 1) {
        abrirModalVinculosCustom(cacheServidoresGeral.filter(s => s.vinculos === 1), '1 Vínculo (Ativos únicos)');
    } else {
        abrirModalVinculosCustom(cacheServidoresGeral.filter(s => s.vinculos > 1), 'Múltiplos Vínculos (2+)');
    }
}

function abrirModalVinculosCustom(lista, titulo) {
    const modalTitulo = document.getElementById('modalVinculosTitulo');
    if (modalTitulo) {
        modalTitulo.innerHTML = `<i data-lucide="list" class="w-5 h-5 text-purple-500"></i> ${titulo} (${lista.length})`;
    }
    const tbody = document.getElementById('modalVinculosBody');
    if (tbody) {
        const sorted = [...lista].sort((a,b) => b.totalLiquido - a.totalLiquido);
        tbody.innerHTML = sorted.map(s => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-5 text-xs text-slate-700 font-medium">${s.nome}</td>
                <td class="py-3 px-5 text-xs text-slate-500 text-center"><span class="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">${s.vinculos}</span></td>
                <td class="py-3 px-5 text-xs text-emerald-600 font-bold text-right">${formatBRL(s.totalLiquido)}</td>
            </tr>
        `).join('');
    }
    
    const modal = document.getElementById('modalVinculos');
    if (modal) {
        modal.classList.remove('hidden');
    }
    lucide.createIcons();
}

window.abrirModalVinculos = abrirModalVinculos;
window.abrirModalVinculosCustom = abrirModalVinculosCustom;
window.atualizarTop = atualizarTop;

function fecharModalVinculos() {
    const modal = document.getElementById('modalVinculos');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.fecharModalVinculos = fecharModalVinculos;

function formatBRL(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setUiLoadingGraficos(isLoading) {
    const btn = document.getElementById('btnBuscar');
    const loadState = document.getElementById('stateLoading');
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

function mostrarErroGraficos(msg) {
    const errMsg = document.getElementById('msgErro');
    const errAlert = document.getElementById('alertaErro');
    if(!errMsg || !errAlert) return;
    errMsg.textContent = msg;
    errAlert.classList.remove('hidden');
    errAlert.classList.add('flex');
}

function esconderErroGraficos() {
    const errAlert = document.getElementById('alertaErro');
    if(!errAlert) return;
    errAlert.classList.add('hidden');
    errAlert.classList.remove('flex');
}
