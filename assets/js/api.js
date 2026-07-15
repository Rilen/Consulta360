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
