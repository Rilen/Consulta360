require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const { syncFolha } = require('./sync');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Rota de unificação e listagem com filtros
app.get('/api/folha', (req, res) => {
    const { mes_ano, q, limit = 50, offset = 0 } = req.query;
    let query = `
        SELECT 
            nome, 
            GROUP_CONCAT(matricula) as matriculas, 
            SUM(bruto) as total_bruto, 
            SUM(liquido) as total_liquido,
            SUM(descontos) as total_descontos
        FROM folha_pagamento 
        WHERE 1=1
    `;
    const params = [];

    if (mes_ano) {
        query += ` AND mes_ano = ?`;
        params.push(mes_ano);
    }
    
    if (q) {
        query += ` AND nome LIKE ?`;
        params.push(`%${q}%`);
    }

    query += ` GROUP BY nome ORDER BY total_bruto DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    try {
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Métricas agregadas globais
app.get('/api/stats', (req, res) => {
    const { mes_ano } = req.query;
    let query = `
        SELECT 
            COUNT(DISTINCT nome) as total_servidores,
            SUM(bruto) as gasto_bruto,
            SUM(liquido) as gasto_liquido,
            AVG(bruto) as media_bruta
        FROM folha_pagamento
        WHERE 1=1
    `;
    const params = [];
    if (mes_ano) {
        query += ` AND mes_ano = ?`;
        params.push(mes_ano);
    }

    try {
        const stats = db.prepare(query).get(...params);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Status de Sincronização
app.get('/api/status', (req, res) => {
    try {
        const status = db.prepare(`SELECT * FROM sync_status WHERE id = 1`).get();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota de gatilho manual para Sync (apenas para admins ou testes)
app.post('/api/sync', (req, res) => {
    const { mes_ano } = req.body;
    if (!mes_ano) return res.status(400).json({ error: 'mes_ano é obrigatório (ex: 2026-06)' });

    // Roda em background
    syncFolha(mes_ano).catch(console.error);
    res.json({ success: true, message: `Sync iniciado em background para ${mes_ano}` });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Consulta360 API rodando na porta ${PORT}`);
});
