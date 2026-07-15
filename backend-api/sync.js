const axios = require('axios');
const db = require('./database');

const API_BASE_URL = process.env.API_EXTERNA_BASE || 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos';
const PAGE_SIZE = 200;

function isNomeKey(key) {
    const k = String(key).toLowerCase();
    return k.includes('nome') || k.includes('servidor') || k.includes('colabor') || k.includes('funcionario');
}

function isLiquidoKey(key) {
    const k = String(key).toLowerCase();
    return k.includes('liquido') || k.includes('líquido') || (k.includes('valor') && k.includes('pago'));
}

function isBrutoKey(key) {
    const k = String(key).toLowerCase();
    return (k.includes('bruto') || k.includes('provent') || k.includes('total')) && !isLiquidoKey(key);
}

function parseValorBR(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    let s = str.toString().replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val;
}

function parsePlainText(text) {
    const linhas = text.trim().split('\n').filter(l => l.trim());
    if (linhas.length < 2) return [];
    const headers = linhas[0].split(';').map(h => h.trim().replace(/"/g, ''));
    return linhas.slice(1).map(l => {
        const vals = l.split(';').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
        return obj;
    });
}

async function fetchPage(endpoint, page) {
    try {
        // Ensure the base URL ends with a slash if not present, and the endpoint does not start with one
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
        const url = `${baseUrl}${endpoint}?pagina=${page}&tamanho=${PAGE_SIZE}`;
        console.log(`[SYNC] Fetching ${url}`);
        const response = await axios.get(url, {
            headers: { 'Accept': 'text/plain, application/json' }
        });
        
        let data = response.data;
        if (typeof data === 'string') {
            data = parsePlainText(data);
        }
        return data || [];
    } catch (error) {
        console.error(`[SYNC] Erro ao buscar página ${page}:`, error.message);
        return [];
    }
}

async function syncFolha(mesAno, endpoint = 'folha_pagamento') {
    let page = 1;
    let keepGoing = true;
    let recordsSynced = 0;

    const upsertStmt = db.prepare(`
        INSERT INTO folha_pagamento (id, mes_ano, nome, matricula, cargo, orgao, vinculo, bruto, liquido, descontos, dados_brutos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            bruto = excluded.bruto,
            liquido = excluded.liquido,
            descontos = excluded.descontos,
            dados_brutos = excluded.dados_brutos
    `);

    db.prepare(`UPDATE sync_status SET status = 'syncing' WHERE id = 1`).run();

    while (keepGoing) {
        const data = await fetchPage(endpoint, page);
        
        if (data.length === 0) {
            keepGoing = false;
            break;
        }

        const tx = db.transaction((records) => {
            for (const rec of records) {
                // Discover keys
                let nome = '', bruto = 0, liquido = 0;
                for (const key of Object.keys(rec)) {
                    if (isNomeKey(key)) nome = rec[key];
                    if (isBrutoKey(key)) bruto = parseValorBR(rec[key]);
                    if (isLiquidoKey(key)) liquido = parseValorBR(rec[key]);
                }
                
                const matricula = rec['MATRICULA'] || rec['Matricula'] || rec['matricula'] || '0000';
                const cargo = rec['CARGO'] || rec['Cargo'] || '';
                const orgao = rec['ORGAO'] || rec['Orgao'] || '';
                const vinculo = rec['VINCULO'] || rec['Vinculo'] || '';
                const descontos = bruto - liquido;
                
                // Composite ID to uniquely identify this row (Matricula + MesAno)
                const id = `${matricula}_${mesAno}`;

                upsertStmt.run(
                    id, mesAno, nome || 'DESCONHECIDO', matricula, cargo, orgao, vinculo,
                    bruto, liquido, descontos, JSON.stringify(rec)
                );
            }
        });

        tx(data);
        recordsSynced += data.length;
        
        if (data.length < PAGE_SIZE) {
            keepGoing = false;
        } else {
            page++;
        }
    }

    db.prepare(`
        UPDATE sync_status 
        SET last_sync = datetime('now'), status = 'idle', records_synced = records_synced + ? 
        WHERE id = 1
    `).run(recordsSynced);

    console.log(`[SYNC] Sincronização de ${mesAno} concluída com ${recordsSynced} registros.`);
}

// Permitir chamada via linha de comando: node sync.js 2026-06
if (require.main === module) {
    const args = process.argv.slice(2);
    const mesAno = args[0];
    if (mesAno) {
        syncFolha(mesAno).then(() => process.exit(0));
    } else {
        console.log("Forneça o mês/ano no formato YYYY-MM. Ex: node sync.js 2026-06");
        process.exit(1);
    }
}

module.exports = { syncFolha };
