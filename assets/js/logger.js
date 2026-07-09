// assets/js/logger.js
// Responsável por registrar a trilha de auditoria (Log de Acesso) de forma colaborativa

async function registrarAcesso() {
    if (sessionStorage.getItem('ja_logou_sessao') === 'true') return;
    sessionStorage.setItem('ja_logou_sessao', 'true');
    
    // Evita loop local se estiver abrindo de file://
    if (window.location.protocol === 'file:') return;

    try {
        const url = './data/access_logs.json';
        const resp = await fetch(url, { cache: 'no-store' });
        let logs = [];
        if (resp.ok) {
            logs = await resp.json();
        }
        
        // As infos do usuário estão em SESSION_TOKEN ou no layout.js
        const nome = sessionStorage.getItem('sg_display_name') || localStorage.getItem('sg_display_name') || 'Usuário Desconhecido';
        const role = sessionStorage.getItem('sg_role') || localStorage.getItem('sg_role') || 'Sem Nível';
        
        const novoLog = {
            nome: nome,
            role: role,
            dataHora: new Date().toISOString()
        };
        
        logs.unshift(novoLog); // Adiciona no início (mais recente primeiro)
        
        // Mantém apenas os últimos 500 acessos para não estourar o limite de arquivo
        if (logs.length > 500) {
            logs = logs.slice(0, 500);
        }
        
        // Faz o PUT para o Nginx (WebDAV)
        await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs)
        });
        
    } catch (e) {
        console.log('[Logger] Modo Read-Only ou falha de rede.', e);
    }
}
