// scripts/fetch-data.mjs
// Busca dados do Portal da Transparência e salva como JSONs estáticos.
// Roda no CI/CD (GitHub Actions) antes do deploy — sem CORS, sem proxy.
//
// Uso: node scripts/fetch-data.mjs
// Requer Node.js 18+ (fetch nativo)

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const API = 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos';

const ENTIDADES = {
  folha: [
    'PM RIO DAS OSTRAS - EFETIVOS E COMISSIONADOS',
    'PM RIO DAS OSTRAS - CONTRATADOS',
    'SAAE - RIO DAS OSTRAS',
  ],
  servidor: [
    'PM RIO DAS OSTRAS - EFETIVOS E COMISSIONADOS',
    'PM RIO DAS OSTRAS - CONTRATADOS',
    'SAAE - RIO DAS OSTRAS',
  ],
  receitas: ['PM RIO DAS OSTRAS', 'SAAE - RIO DAS OSTRAS'],
  despesas: ['PM RIO DAS OSTRAS', 'SAAE - RIO DAS OSTRAS'],
};

const ANOS = [2026, 2025];

function mesAnoParaDatas(mesAno) {
  const [ano, mes] = mesAno.split('-').map(Number);
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  };
  return { dataInicial: fmt(primeiro), dataFinal: fmt(ultimo) };
}

async function fetchPaginated(baseUrl, label) {
  let pagina = 1;
  const all = [];
  while (true) {
    const url = `${baseUrl}&numeroPagina=${pagina}`;
    process.stdout.write(`  → ${label} pág ${pagina}... `);
    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/json, text/plain, */*' },
      });
      if (!resp.ok) {
        console.log(`HTTP ${resp.status} — fim.`);
        break;
      }
      const text = await resp.text();
      if (!text || text.trim() === '') {
        console.log('vazia — fim.');
        break;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log('não-JSON — fim.');
        break;
      }
      if (!Array.isArray(data)) {
        const arrKey = Object.keys(data).find((k) => Array.isArray(data[k]));
        data = arrKey ? data[arrKey] : [];
      }
      if (data.length === 0) {
        console.log('0 registros — fim.');
        break;
      }
      all.push(...data);
      console.log(`${data.length} registros (total: ${all.length})`);
      if (data.length < 200) break;
      pagina++;
    } catch (err) {
      console.log(`erro: ${err.message}`);
      break;
    }
  }
  return all;
}

// ─────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────
if (!existsSync('data')) mkdirSync('data');

const manifest = { updated: new Date().toISOString(), datasets: {} };

// ── Folha de Pagamento ──
console.log('\n📋 FOLHA DE PAGAMENTO');
manifest.datasets.folha = [];
for (const ano of ANOS) {
  for (let mes = 1; mes <= 12; mes++) {
    const mesAno = `${ano}-${String(mes).padStart(2, '0')}`;
    const datas = mesAnoParaDatas(mesAno);
    for (const entidade of ENTIDADES.folha) {
      const safe = entidade.replace(/[^a-zA-Z0-9À-ÿ-]/g, '_').replace(/_+/g, '_');
      const baseUrl = `${API}/FolhaPagamento?dataInicial=${encodeURIComponent(datas.dataInicial)}&dataFinal=${encodeURIComponent(datas.dataFinal)}&nomeBase=${encodeURIComponent(entidade)}`;
      console.log(`\nFolha ${mesAno} — ${entidade}`);
      const dados = await fetchPaginated(baseUrl, 'Folha');
      const filename = `data/folha_${safe}_${mesAno}.json`;
      writeFileSync(filename, JSON.stringify(dados));
      manifest.datasets.folha.push({ entidade, mesAno, file: filename, records: dados.length });
    }
  }
}

// ── Relação de Servidores ──
console.log('\n\n👤 SERVIDORES');
manifest.datasets.servidor = [];
for (const ano of ANOS) {
  for (let mes = 1; mes <= 12; mes++) {
    const mesAno = `${ano}-${String(mes).padStart(2, '0')}`;
    const datas = mesAnoParaDatas(mesAno);
    for (const entidade of ENTIDADES.servidor) {
      const safe = entidade.replace(/[^a-zA-Z0-9À-ÿ-]/g, '_').replace(/_+/g, '_');
      const baseUrl = `${API}/Servidor?dataInicial=${encodeURIComponent(datas.dataInicial)}&dataFinal=${encodeURIComponent(datas.dataFinal)}&nomeBase=${encodeURIComponent(entidade)}`;
      console.log(`\nServidor ${mesAno} — ${entidade}`);
      const dados = await fetchPaginated(baseUrl, 'Servidor');
      const filename = `data/servidor_${safe}_${mesAno}.json`;
      writeFileSync(filename, JSON.stringify(dados));
      manifest.datasets.servidor.push({ entidade, mesAno, file: filename, records: dados.length });
    }
  }
}

// ── Receitas ──
console.log('\n\n💰 RECEITAS');
manifest.datasets.receitas = [];
for (const ano of ANOS) {
  for (const entidade of ENTIDADES.receitas) {
    const safe = entidade.replace(/[^a-zA-Z0-9À-ÿ-]/g, '_').replace(/_+/g, '_');
    console.log(`\nReceitas ${ano} — ${entidade}`);
    const dados = await fetchPaginated(
      `${API}/Receitas/buscarDadosReceitas/${ano}/1/${encodeURIComponent(entidade)}?unidadeGestora=CONSOLIDADO`,
      'Receitas',
    );
    const filename = `data/receitas_${safe}_${ano}.json`;
    writeFileSync(filename, JSON.stringify(dados));
    manifest.datasets.receitas.push({ entidade, ano, file: filename, records: dados.length });
  }
}

// ── Despesas ──
console.log('\n\n💸 DESPESAS');
manifest.datasets.despesas = [];
for (const ano of ANOS) {
  for (const entidade of ENTIDADES.despesas) {
    const safe = entidade.replace(/[^a-zA-Z0-9À-ÿ-]/g, '_').replace(/_+/g, '_');
    console.log(`\nDespesas ${ano} — ${entidade}`);
    const dados = await fetchPaginated(
      `${API}/Despesas/buscarDadosDespesas/${ano}/1/${encodeURIComponent(entidade)}?unidadeGestora=CONSOLIDADO`,
      'Despesas',
    );
    const filename = `data/despesas_${safe}_${ano}.json`;
    writeFileSync(filename, JSON.stringify(dados));
    manifest.datasets.despesas.push({ entidade, ano, file: filename, records: dados.length });
  }
}

writeFileSync('data/manifest.json', JSON.stringify(manifest, null, 2));
console.log('\n✅ Concluído! Ver data/manifest.json');
