const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbDir = path.dirname(process.env.DATABASE_PATH || path.join(__dirname, 'data', 'database.sqlite'));
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
function initDB() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS folha_pagamento (
            id TEXT PRIMARY KEY,
            mes_ano TEXT NOT NULL,
            nome TEXT NOT NULL,
            matricula TEXT NOT NULL,
            cargo TEXT,
            orgao TEXT,
            vinculo TEXT,
            bruto REAL,
            liquido REAL,
            descontos REAL,
            dados_brutos TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_nome ON folha_pagamento(nome);
        CREATE INDEX IF NOT EXISTS idx_matricula ON folha_pagamento(matricula);
        CREATE INDEX IF NOT EXISTS idx_mes_ano ON folha_pagamento(mes_ano);

        CREATE TABLE IF NOT EXISTS sync_status (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_sync DATETIME,
            status TEXT,
            records_synced INTEGER
        );
        
        INSERT OR IGNORE INTO sync_status (id, last_sync, status, records_synced) VALUES (1, NULL, 'idle', 0);
    `);
    console.log('Database schema initialized.');
}

initDB();

module.exports = db;
