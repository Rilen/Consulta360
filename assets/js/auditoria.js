// auditoria.js - Módulo de Inteligência Artificial e Compliance

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'auditoria') {
        initAuditoriaModule();
    }
});

if (window.location.hash === '#auditoria' || window.location.hash.includes('auditoria')) {
    setTimeout(initAuditoriaModule, 100);
}

function initAuditoriaModule() {
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
            carregarDadosAuditoria();
        });
    }
}

let dadosUnificados = [];
let totalBrutoFolha = 0;
let labelMesAtual = '';
let chartPreditivoInst = null;
const TETO_CONSTITUCIONAL = 41650.92;

async function carregarDadosAuditoria() {
    const mesAno = document.getElementById('mesAno').value;
    const nomeBase = document.getElementById('nomeBase').value;
    
    if (!mesAno) {
        mostrarErroAuditoria('Selecione uma competência.');
        return;
    }

    const cacheKey = `analytics_${mesAno}_${nomeBase}`;
    const statusCache = document.getElementById('statusCache');
    
    esconderErroAuditoria();
    setUiLoadingAuditoria(true, 'Alimentando Modelo...', 'Extraindo dados...');

    try {
        let rawData = await getCache(cacheKey);
        const metaKey = `meta_folha_${nomeBase}_${mesAno}`;
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
            
            processarEngineIA(rawData, mesAnoParaDatas(mesAno).labelMMSY);
            return;
        } else {
            statusCache.classList.add('hidden');
            statusCache.classList.remove('flex');
            updateStatusBanner('error', `Base vazia. Vá em Sincronização para baixar os dados.`);
            mostrarErroAuditoria('Dados não encontrados no Banco Local para este período. Por favor, acesse o menu de Sincronização e faça o download.');
            setUiLoadingAuditoria(false);
            return;
        }
        
    } catch (err) {
        console.error(err);
        mostrarErroAuditoria('Erro de Processamento: ' + err.message);
        document.getElementById('aiDashboard').classList.add('hidden');
        setUiLoadingAuditoria(false);
    }
}

function processarEngineIA(rawRows, labelMMSY) {
    if (!rawRows || rawRows.length === 0) return;
    labelMesAtual = labelMMSY;
    
    const sample = rawRows[0];
    const chaves = Object.keys(sample);
    const colNome = chaves.find(k => isNomeKey(k));
    const colBruto = chaves.find(k => isBrutoKey(k));
    const colLiquido = chaves.find(k => isLiquidoKey(k));

    const unificados = {};
    totalBrutoFolha = 0;

    rawRows.forEach(row => {
        const nomeOriginal = row[colNome] ? String(row[colNome]).trim() : 'Desconhecido';
        const nomeUpper = nomeOriginal.toUpperCase();
        
        let brutoVal = 0; let liquidoVal = 0;
        if (colBruto && row[colBruto]) brutoVal = parseFloat(String(row[colBruto]).replace(',', '.')) || 0;
        if (colLiquido && row[colLiquido]) liquidoVal = parseFloat(String(row[colLiquido]).replace(',', '.')) || 0;

        if (!unificados[nomeUpper]) {
            unificados[nomeUpper] = { nome: nomeOriginal, vinculos: 0, totalBruto: 0, totalLiquido: 0 };
        }
        unificados[nomeUpper].vinculos += 1;
        unificados[nomeUpper].totalBruto += brutoVal;
        unificados[nomeUpper].totalLiquido += liquidoVal;
        
        totalBrutoFolha += brutoVal;
    });

    dadosUnificados = Object.values(unificados);

    let qdtAcimaTeto = 0;
    let qtdTriplaMultipla = 0;
    let anomalias = [];

    dadosUnificados.forEach(s => {
        let isAnomalia = false;
        
        if (s.totalBruto > TETO_CONSTITUCIONAL) {
            qdtAcimaTeto++;
            anomalias.push({ nome: s.nome, tipo: 'Extrapola Teto Constitucional', risk: 'critico', valorStr: formatBRL(s.totalBruto) });
            isAnomalia = true;
        }

        if (s.vinculos >= 3) {
            qtdTriplaMultipla++;
            if (!isAnomalia) {
                let risk = s.vinculos >= 4 ? 'critico' : 'moderado';
                anomalias.push({ nome: s.nome, tipo: `${s.vinculos} Matrículas Ativas`, risk: risk, valorStr: formatBRL(s.totalBruto) });
            }
        }
        
        if (!isAnomalia && s.totalLiquido > 25000 && s.vinculos <= 2) {
            anomalias.push({ nome: s.nome, tipo: 'Rendimento Líquido Atípico', risk: 'moderado', valorStr: formatBRL(s.totalLiquido) });
        }
    });

    document.getElementById('valTeto').textContent = qdtAcimaTeto;
    document.getElementById('valTripla').textContent = qtdTriplaMultipla;

    renderizarRadarAnomalias(anomalias);
    renderizarPredicao();

    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.innerHTML = `
            <div class="flex items-start gap-3 fade-in">
                <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="bot" class="w-4 h-4 text-white"></i>
                </div>
                <div class="bg-slate-800/80 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-200 border border-white/5 shadow-md">
                    Processamento concluído. Analisei ${dadosUnificados.length.toLocaleString('pt-BR')} servidores consolidados nesta matriz. Como posso ajudar nas inferências?
                </div>
            </div>
        `;
    }

    document.getElementById('aiDashboard').classList.remove('hidden');
    setUiLoadingAuditoria(false);
    lucide.createIcons();
}

function renderizarRadarAnomalias(anomalias) {
    const container = document.getElementById('anomalies-list');
    if (!container) return;
    
    if (anomalias.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500 text-sm">Nenhuma anomalia crítica ou moderada detectada na base.</div>`;
        return;
    }
    
    anomalias.sort((a,b) => (a.risk === 'critico' ? -1 : 1));

    container.innerHTML = anomalias.map(a => `
        <div class="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div>
                <div class="text-xs font-bold text-slate-200">${a.nome}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">${a.tipo}</div>
            </div>
            <div class="text-right">
                <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${a.risk === 'critico' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'} mb-1">${a.risk}</span>
                <div class="text-xs font-semibold text-slate-300">${a.valorStr}</div>
            </div>
        </div>
    `).join('');
}

function renderizarPredicao() {
    if (chartPreditivoInst) chartPreditivoInst.destroy();
    
    const mesAtualVal = totalBrutoFolha;
    const m1 = mesAtualVal * 1.015;
    const m2 = m1 * 1.015;
    const m3 = m2 * 1.015;

    let labels = ['Realizado ('+labelMesAtual+')', `M+1`, `M+2`, `M+3`];

    const ctx = document.getElementById('chartPredictive');
    if(!ctx) return;
    
    chartPreditivoInst = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Custo Bruto Projetado (R$)',
                data: [mesAtualVal, m1, m2, m3],
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) { return 'Custo Bruto: ' + formatBRL(ctx.raw); }
                    }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function enviarPrompt(tipo) {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer || dadosUnificados.length === 0) return;

    let pergunta = '';
    let resposta = '';

    if (tipo === 'maiores-acumuladores') {
        pergunta = 'Maior número de matrículas?';
        const acum = [...dadosUnificados].filter(s => s.vinculos >= 3).sort((a,b) => b.vinculos - a.vinculos).slice(0,5);
        if(acum.length > 0) {
            resposta = `Encontrei ${acum.length} servidores com anomalias de acúmulo (3+). Os maiores são:<br><ul class="mt-2 space-y-1">` + 
            acum.map(s => `<li>- <b>${s.nome}</b>: ${s.vinculos} matrículas.</li>`).join('') + `</ul>`;
        } else {
            resposta = 'Nenhum servidor com 3 ou mais matrículas foi encontrado nesta competência.';
        }
    } else if (tipo === 'teto-constitucional') {
        pergunta = 'Quem superou o Teto?';
        const acima = [...dadosUnificados].filter(s => s.totalBruto > TETO_CONSTITUCIONAL).sort((a,b) => b.totalBruto - a.totalBruto).slice(0,5);
        if(acima.length > 0) {
            resposta = `Listando os principais servidores que superaram o teto (R$ 41.650,92) ao consolidar vínculos:<br><ul class="mt-2 space-y-1">` + 
            acima.map(s => `<li>- <b>${s.nome}</b>: ${formatBRL(s.totalBruto)}.</li>`).join('') + `</ul>`;
        } else {
            resposta = 'Excelente! Nenhum servidor extrapolou o teto constitucional com a soma dos vínculos nesta folha.';
        }
    } else if (tipo === 'resumo-executivo') {
        pergunta = 'Gerar Resumo Executivo';
        resposta = `<b>Resumo Executivo (${labelMesAtual}):</b><br>
        - Volume Total Bruto: <b>${formatBRL(totalBrutoFolha)}</b><br>
        - Servidores Únicos Processados: <b>${dadosUnificados.length.toLocaleString('pt-BR')}</b><br>
        - Crescimento Vegetativo Esperado (próx. mês): <b>${formatBRL(totalBrutoFolha * 1.015)}</b><br>
        O panorama sugere atenção apenas nos outliers listados no Radar de Anomalias.`;
    }

    const perguntaHtml = `
        <div class="flex items-start gap-3 justify-end fade-in">
            <div class="bg-indigo-600/20 rounded-2xl rounded-tr-sm p-4 text-sm text-indigo-100 border border-indigo-500/20">
                ${pergunta}
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <i data-lucide="user" class="w-4 h-4 text-slate-300"></i>
            </div>
        </div>
    `;

    const respostaHtml = `
        <div class="flex items-start gap-3 fade-in mt-4">
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <i data-lucide="bot" class="w-4 h-4 text-white"></i>
            </div>
            <div class="bg-slate-800/80 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-200 border border-white/5 shadow-md">
                ${resposta}
            </div>
        </div>
    `;

    chatContainer.innerHTML += perguntaHtml + respostaHtml;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    lucide.createIcons();
}
window.enviarPrompt = enviarPrompt;

function formatBRL(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setUiLoadingAuditoria(isLoading, msgLoading, msgSub) {
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

function mostrarErroAuditoria(msg) {
    const errMsg = document.getElementById('msgErro');
    const errAlert = document.getElementById('alertaErro');
    if(!errMsg || !errAlert) return;
    errMsg.textContent = msg;
    errAlert.classList.remove('hidden');
    errAlert.classList.add('flex');
}

function esconderErroAuditoria() {
    const errAlert = document.getElementById('alertaErro');
    if(!errAlert) return;
    errAlert.classList.add('hidden');
    errAlert.classList.remove('flex');
}
