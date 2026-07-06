// comparacao.js - Módulo de Comparação Salarial entre Cargos

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'comparacao') {
        initComparacaoModule();
    }
});

if (window.location.hash === '#comparacao' || window.location.hash.includes('comparacao')) {
    setTimeout(initComparacaoModule, 100);
}

let chartComparacao = null;

function initComparacaoModule() {
    const form = document.getElementById('form-comparacao');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            gerarComparacaoSalarial();
        });
    }

    const busca = document.getElementById('buscaCargo');
    if (busca) {
        busca.addEventListener('input', filtrarTabelaCargos);
    }
}

async function gerarComparacaoSalarial() {
    const mesAno = document.getElementById('mesComparacao').value;
    const entidade = document.getElementById('entidadeComparacao').value;
    
    if (!mesAno || !entidade) return;

    const cacheKey = `FolhaPagamento_${entidade}_${mesAno}`;
    const statusCache = document.getElementById('statusCacheComparacao');
    
    setUiLoadingComparacao(true);
    document.getElementById('alertaErroComparacao').classList.add('hidden');
    document.getElementById('alertaErroComparacao').classList.remove('flex');

    try {
        let rawData = await getCache(cacheKey);
        
        if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch(e) {}
        }

        if (!rawData || rawData.length === 0) {
            statusCache.classList.add('hidden');
            statusCache.classList.remove('flex');
            mostrarErroComparacao('Base não encontrada. Por favor, acesse o menu Sincronização e baixe a Folha de Pagamento deste mês.');
            document.getElementById('areaComparacao').classList.add('hidden');
            return;
        }

        statusCache.classList.remove('hidden');
        statusCache.classList.add('flex');
        updateStatusBanner('success', `Dados processados com sucesso pelo motor local.`);

        processarAgrupamentoCargos(rawData);
    } catch (err) {
        console.error(err);
        mostrarErroComparacao('Erro interno ao processar folha: ' + err.message);
    } finally {
        setUiLoadingComparacao(false);
    }
}

function processarAgrupamentoCargos(folhaData) {
    const mapCargos = {};

    folhaData.forEach(reg => {
        let cargo = reg.CargoFuncao || reg.Cargo || reg.cargo || 'NÃO ESPECIFICADO';
        cargo = cargo.trim().toUpperCase();
        if (!cargo) cargo = 'NÃO ESPECIFICADO';

        const bruto = parseFloat(String(reg.Bruto || reg.bruto || '0').replace(',', '.')) || 0;
        
        // Ignora quem ganha zero ou negativo no bruto para não distorcer as médias
        if (bruto <= 0) return;

        if (!mapCargos[cargo]) {
            mapCargos[cargo] = {
                nome: cargo,
                somaBruto: 0,
                menorBruto: bruto,
                maiorBruto: bruto,
                quantidade: 0
            };
        }

        mapCargos[cargo].somaBruto += bruto;
        mapCargos[cargo].quantidade += 1;
        
        if (bruto < mapCargos[cargo].menorBruto) mapCargos[cargo].menorBruto = bruto;
        if (bruto > mapCargos[cargo].maiorBruto) mapCargos[cargo].maiorBruto = bruto;
    });

    const listaCargos = Object.values(mapCargos).map(c => {
        c.mediaBruto = c.somaBruto / c.quantidade;
        return c;
    });

    // Ordenar do maior salário médio para o menor
    listaCargos.sort((a, b) => b.mediaBruto - a.mediaBruto);

    renderizarCardsTopLevel(listaCargos);
    renderizarGraficoTop15(listaCargos);
    renderizarTabelaCargos(listaCargos);

    document.getElementById('areaComparacao').classList.remove('hidden');
}

function renderizarCardsTopLevel(listaCargos) {
    document.getElementById('cmpTotalCargos').textContent = listaCargos.length;

    if (listaCargos.length > 0) {
        const maior = listaCargos[0];
        document.getElementById('cmpMaiorCargo').textContent = maior.nome;
        document.getElementById('cmpMaiorCargo').title = maior.nome;
        document.getElementById('cmpMaiorMedia').textContent = formatBRL(maior.mediaBruto);

        const menor = listaCargos[listaCargos.length - 1];
        document.getElementById('cmpMenorCargo').textContent = menor.nome;
        document.getElementById('cmpMenorCargo').title = menor.nome;
        document.getElementById('cmpMenorMedia').textContent = formatBRL(menor.mediaBruto);
    } else {
        document.getElementById('cmpMaiorCargo').textContent = '-';
        document.getElementById('cmpMaiorMedia').textContent = 'R$ 0,00';
        document.getElementById('cmpMenorCargo').textContent = '-';
        document.getElementById('cmpMenorMedia').textContent = 'R$ 0,00';
    }
}

function renderizarGraficoTop15(listaCargos) {
    if (chartComparacao) chartComparacao.destroy();

    const top15 = listaCargos.slice(0, 15);
    const labels = top15.map(c => c.nome.length > 25 ? c.nome.substring(0, 25) + '...' : c.nome);
    const dataBruta = top15.map(c => c.mediaBruto);

    const ctx = document.getElementById('chartComparacaoCargos').getContext('2d');
    chartComparacao = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Média Salarial Bruta (R$)',
                data: dataBruta,
                backgroundColor: 'rgba(249, 115, 22, 0.8)', // orange-500
                borderColor: '#ea580c', // orange-600
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Barras horizontais
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => formatBRL(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { borderDash: [4, 4] },
                    ticks: { callback: val => 'R$ ' + (val/1000).toFixed(0) + 'k' }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function renderizarTabelaCargos(listaCargos) {
    const tbody = document.getElementById('tabelaComparacaoBody');
    if (!tbody) return;

    window.comparacaoAtual = listaCargos; // Guarda globalmente para a busca funcionar

    let html = '';
    listaCargos.forEach(c => {
        html += `
            <tr class="hover:bg-slate-50 transition-colors cargo-row" data-nome="${c.nome}">
                <td class="py-3 px-4 text-xs font-medium text-slate-700 max-w-[200px] truncate" title="${c.nome}">${c.nome}</td>
                <td class="py-3 px-4 text-xs text-center"><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">${c.quantidade}</span></td>
                <td class="py-3 px-4 text-xs font-medium text-slate-500 text-right">${formatBRL(c.menorBruto)}</td>
                <td class="py-3 px-4 text-xs font-bold text-orange-600 text-right bg-orange-50/30">${formatBRL(c.mediaBruto)}</td>
                <td class="py-3 px-4 text-xs font-medium text-slate-500 text-right">${formatBRL(c.maiorBruto)}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function filtrarTabelaCargos(e) {
    const termo = e.target.value.toUpperCase();
    const rows = document.querySelectorAll('.cargo-row');
    
    rows.forEach(row => {
        const nome = row.getAttribute('data-nome');
        if (nome.includes(termo)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function setUiLoadingComparacao(isLoading) {
    const btn = document.getElementById('btnGerarComparacao');
    const loadState = document.getElementById('loadingComparacao');
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

function mostrarErroComparacao(msg) {
    const errMsg = document.getElementById('msgErroComparacao');
    const errAlert = document.getElementById('alertaErroComparacao');
    if(!errMsg || !errAlert) return;
    errMsg.textContent = msg;
    errAlert.classList.remove('hidden');
    errAlert.classList.add('flex');
}
