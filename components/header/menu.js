// components/sidebar/menu.js (antigo header/menu.js)
function getMenuHtml(currentRoute) {
    const isHome = currentRoute === 'home' || currentRoute === '';
    const isDashboard = currentRoute === 'dashboard';
    const isGraficos = currentRoute === 'graficos';
    const isDiff = currentRoute === 'diff';
    const isAuditoria = currentRoute === 'auditoria';
    const isEvolucao = currentRoute === 'evolucao';
    const isComparacao = currentRoute === 'comparacao';

    const isContracheque = currentRoute === 'contracheque';
    const isReceitas = currentRoute === 'receitas';
    const isDespesas = currentRoute === 'despesas';

    const isConfig = currentRoute === 'config';

    // The Display Name and Role will be injected by app.js on DOMContentLoaded or spaContentReady
    // as it already looks for #sidebarUserName, #sidebarUserRole, #sidebarAvatarLetter

    return `
    <aside class="sidebar">
        <div class="logo">
            <h1><i class="bi bi-shield-lock me-2"></i>Consulta360</h1>
        </div>
        
        <nav class="nav-menu">
            <div class="nav-section-title">Análises & BI</div>
            
            <a href="#home" class="nav-item ${isHome ? 'active' : ''}">
                <i class="bi bi-database"></i> Consulta Raw
            </a>
            <a href="#dashboard" class="nav-item ${isDashboard ? 'active' : ''}">
                <i class="bi bi-grid-1x2"></i> Macro-Dashboard
            </a>
            <a href="#graficos" class="nav-item ${isGraficos ? 'active' : ''}">
                <i class="bi bi-pie-chart"></i> Análise de Dados
            </a>
            <a href="#diff" class="nav-item ${isDiff ? 'active' : ''}">
                <i class="bi bi-clock-history"></i> Máquina do Tempo
            </a>
            <a href="#auditoria" class="nav-item ${isAuditoria ? 'active' : ''}">
                <i class="bi bi-cpu"></i> Auditoria IA
            </a>
            <a href="#evolucao" class="nav-item ${isEvolucao ? 'active' : ''}">
                <i class="bi bi-graph-up-arrow"></i> Evolução
            </a>
            <a href="#comparacao" class="nav-item ${isComparacao ? 'active' : ''}">
                <i class="bi bi-bank"></i> Comparação Salarial
            </a>
            
            <div class="nav-section-title mt-2">Financeiro</div>
            <a href="#contracheque" class="nav-item ${isContracheque ? 'active' : ''}">
                <i class="bi bi-file-earmark-check"></i> Contracheque
            </a>
            <a href="#receitas" class="nav-item ${isReceitas ? 'active' : ''}">
                <i class="bi bi-currency-dollar"></i> Receitas
            </a>
            <a href="#despesas" class="nav-item ${isDespesas ? 'active' : ''}">
                <i class="bi bi-cart"></i> Despesas
            </a>

            <div class="nav-section-title mt-2">Sistema</div>
            <a href="#config" class="nav-item ${isConfig ? 'active' : ''}" id="navConfig">
                <i class="bi bi-gear"></i> Sincronização
            </a>
        </nav>
        
        <div class="sidebar-footer">
            <div class="sidebar-user">
                <div class="avatar" id="sidebarAvatarLetter">U</div>
                <div class="user-info">
                    <span class="user-name" id="sidebarUserName">Usuário</span>
                    <span class="user-role" id="sidebarUserRole">N/A</span>
                </div>
                
            <button class="btn-theme-toggle mr-2" title="Alternar Tema" onclick="toggleTheme()" style="background: rgba(255, 255, 255, 0.05); border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                <i id="theme-toggle-icon" class="bi bi-moon-stars-fill text-blue-300"></i>
            </button>

                <button class="btn-logout" title="Sair" onclick="doLogout()">
                    <i class="bi bi-box-arrow-right"></i>
                </button>
            </div>
        </div>
    </aside>
    `;
}
