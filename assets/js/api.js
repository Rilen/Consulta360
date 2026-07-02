// ----------------------------------------------------
// Lógica Base de Requisição e Helpers da API
// ----------------------------------------------------
const API_BASE = 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos';

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
    labelMMSY: mes.toString().padStart(2, '0') + '/' + ano
  };
}

// Parsers Helpers
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
