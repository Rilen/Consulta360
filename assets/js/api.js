// api.js — Helpers de dados (datas, parsing, chaves financeiras)
// Os dados brutos vêm dos JSONs estáticos (data/) ou do IndexedDB.
// Nenhuma chamada externa à API acontece neste arquivo.

function toInputDate(d) {
    return d.toISOString().split('T')[0];
}

function toBRDate(iso) {
    var parts = iso.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function mesAnoParaDatas(mesAno) {
    var parts = mesAno.split('-');
    var ano = parseInt(parts[0]);
    var mes = parseInt(parts[1]);
    var primeiroDia = new Date(ano, mes - 1, 1);
    var ultimoDia = new Date(ano, mes, 0);
    return {
        dataInicial: toBRDate(toInputDate(primeiroDia)),
        dataFinal: toBRDate(toInputDate(ultimoDia)),
        labelMMSY: mes.toString().padStart(2, '0') + '/' + ano,
    };
}

function isNomeKey(key) {
    var k = String(key).toLowerCase();
    return k.includes('nome') || k.includes('servidor') || k.includes('colabor') || k.includes('funcionario');
}

function isLiquidoKey(key) {
    var k = String(key).toLowerCase();
    return k.includes('liquido') || k.includes('líquido') || (k.includes('valor') && k.includes('pago'));
}

function isBrutoKey(key) {
    var k = String(key).toLowerCase();
    return (k.includes('bruto') || k.includes('provent') || k.includes('total')) && !isLiquidoKey(key);
}

function parsePlainText(text) {
    var linhas = text.trim().split('\n').filter(l => l.trim());
    if (linhas.length < 2) return [];
    var headers = linhas[0].split(';').map(h => h.trim().replace(/"/g, ''));
    return linhas.slice(1).map(l => {
        var vals = l.split(';').map(v => v.trim().replace(/"/g, ''));
        var obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
        return obj;
    });
}

// Converte string de valor monetário brasileiro para número (float).
// Suporta: "1.234,56" → 1234.56 | "1234,56" → 1234.56 | 1234 → 1234
// Extraído de dashboard.js para ser a função canônica de parsing de valores.
function parseValorBR(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    let s = str.toString().replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) {
        // Formato BR: 1.234,56
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        // Formato sem milhar: 1234,56
        s = s.replace(',', '.');
    }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val;
}

function sanitize(str) {
    if (typeof str !== 'string') return str;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return str.replace(reg, (match)=>(map[match]));
}

function exportarCSV(dados, nomeArquivo) {
    if (!dados || dados.length === 0) return;

    // Extrair cabeçalhos
    const cabecalhos = Object.keys(dados[0]);
    let csvContent = cabecalhos.join(';') + '\n';

    // Extrair linhas
    for (const linha of dados) {
        const valores = cabecalhos.map(cabecalho => {
            let valor = linha[cabecalho];
            if (valor === null || valor === undefined) valor = '';
            // Se for número, converter ponto para vírgula para abrir no Excel em PT-BR
            if (typeof valor === 'number') {
                valor = valor.toString().replace('.', ',');
            } else {
                // Escapar aspas duplas dentro de strings e encapsular em aspas duplas
                valor = `"${String(valor).replace(/"/g, '""')}"`;
            }
            return valor;
        });
        csvContent += valores.join(';') + '\n';
    }

    // Adicionar BOM para Excel reconhecer UTF-8
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${nomeArquivo}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// INTEGRAÇÃO COM BACKEND HÍBRIDO (Node.js/SQLite)
// ----------------------------------------------------

async function getStatusReplicador() {
    try {
        const res = await fetch('./api/status');
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Erro ao buscar status do replicador:", e);
        return null;
    }
}

async function getFolhaAgregada(mesAno, limit = 50, offset = 0, query = '') {
    try {
        let url = `./api/folha?limit=${limit}&offset=${offset}`;
        if (mesAno) url += `&mes_ano=${mesAno}`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return json.success ? json.data : [];
    } catch (e) {
        console.error("Erro ao buscar folha agregada do replicador:", e);
        return [];
    }
}

async function getStatsReplicador(mesAno) {
    try {
        let url = `./api/stats`;
        if (mesAno) url += `?mes_ano=${mesAno}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch (e) {
        console.error("Erro ao buscar stats do replicador:", e);
        return null;
    }
}

// ----------------------------------------------------
// Sincronização de Ano Inteiro (UI + Polling)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const btnSync = document.getElementById('btn-sync-ano');
    const selectAno = document.getElementById('sync-ano-select');
    let pollingInterval = null;

    if (btnSync && selectAno) {
        btnSync.addEventListener('click', async () => {
            const ano = selectAno.value;
            btnSync.disabled = true;
            btnSync.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando...`;
            
            try {
                // 1. Dispara o sync no backend
                await fetch('./api/sync-ano', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ano })
                });

                // 2. Inicia o Polling
                pollingInterval = setInterval(async () => {
                    const statusData = await getStatusReplicador();
                    if (statusData && statusData.success && statusData.data) {
                        const s = statusData.data;
                        if (s.status.startsWith('Sincronizando')) {
                            btnSync.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${s.status}`;
                        } else if (s.status === 'idle') {
                            // Backend terminou o sync!
                            clearInterval(pollingInterval);
                            btnSync.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando no IndexedDB...`;
                            
                            // 3. Baixar os 12 meses pro IndexedDB
                            await baixarAnoParaIndexedDB(ano);
                            
                            btnSync.innerHTML = `<i class="bi bi-check-circle"></i> Ano ${ano} Sincronizado!`;
                            setTimeout(() => {
                                btnSync.disabled = false;
                                btnSync.innerHTML = `<i class="bi bi-arrow-repeat"></i> Sincronizar Ano Inteiro`;
                            }, 5000);
                        }
                    }
                }, 3000);

            } catch (e) {
                console.error("Erro ao iniciar sync anual", e);
                btnSync.disabled = false;
                btnSync.innerHTML = `<i class="bi bi-x-circle"></i> Falha. Tentar novamente`;
            }
        });
    }
});

async function baixarAnoParaIndexedDB(ano) {
    if (typeof setCache !== 'function') {
        console.warn('setCache não está disponível. O db.js não foi carregado corretamente.');
        return;
    }

    for (let i = 1; i <= 12; i++) {
        const mesStr = i.toString().padStart(2, '0');
        const mesAno = `${ano}-${mesStr}`;
        const cacheKey = `FolhaPagamento_PM RIO DAS OSTRAS_${mesAno}`;
        const metaKey = `meta_folha_PM RIO DAS OSTRAS_${mesAno}`;
        
        try {
            // Busca dados completos para o mês, passando limite alto (ex: 100000) caso não tenha paginação no IndexedDB
            const res = await fetch(`./api/folha?mes_ano=${mesAno}&limit=100000`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data && json.data.length > 0) {
                    await setCache(cacheKey, JSON.stringify(json.data));
                    if (typeof setMetadata === 'function') {
                        await setMetadata(metaKey, { records: json.data.length, auto: true });
                    }
                    console.log(`[IndexedDB] Mês ${mesAno} salvo localmente.`);
                }
            }
        } catch (e) {
            console.error(`Erro ao salvar mês ${mesAno} no IndexedDB`, e);
        }
    }
}
