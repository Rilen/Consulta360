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
