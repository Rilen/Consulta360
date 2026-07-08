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
    <aside id="sidebar" class="sidebar">
        <div class="sidebar-header d-flex flex-column align-items-center mb-4 w-100">
            <img src="https://cloud.riodasostras.rj.gov.br/index.php/apps/files_sharing/publicpreview/C7Xm2pmQKnNgsZW?x=1910&y=595&a=true&file=logo_branca.png&scalingup=0" height="25" alt="GOVTIC Logo" class="mb-3 opacity-90 govtic-logo-top">
            <h1 class="logo-title text-center w-100 m-0" style="font-size: 1.1rem; font-weight: 800; background: linear-gradient(135deg, #60A5FA, #3B82F6); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;"><i class="bi bi-shield-lock me-2"></i>Consulta360</h1>
            
        </div>
        
        <nav class="nav-menu">
            <div class="nav-section-title">Análises & BI</div>
            
            <a href="#home" class="nav-item ${isHome ? 'active' : ''}">
                <i class="bi bi-database"></i> <span> Consulta Raw
            </span></a>
            <a href="#dashboard" class="nav-item ${isDashboard ? 'active' : ''}">
                <i class="bi bi-grid-1x2"></i> <span> Macro-Dashboard
            </span></a>
            <a href="#graficos" class="nav-item ${isGraficos ? 'active' : ''}">
                <i class="bi bi-pie-chart"></i> <span> Análise de Dados
            </span></a>
            <a href="#diff" class="nav-item ${isDiff ? 'active' : ''}">
                <i class="bi bi-clock-history"></i> <span> Máquina do Tempo
            </span></a>
            <a href="#auditoria" class="nav-item ${isAuditoria ? 'active' : ''}">
                <i class="bi bi-cpu"></i> <span> Auditoria IA
            </span></a>
            <a href="#evolucao" class="nav-item ${isEvolucao ? 'active' : ''}">
                <i class="bi bi-graph-up-arrow"></i> <span> Evolução
            </span></a>
            <a href="#comparacao" class="nav-item ${isComparacao ? 'active' : ''}">
                <i class="bi bi-bank"></i> <span> Comparação Salarial
            </span></a>
            
            <div class="nav-section-title mt-2">Financeiro</div>
            <a href="#contracheque" class="nav-item ${isContracheque ? 'active' : ''}">
                <i class="bi bi-file-earmark-check"></i> <span> Contracheque
            </span></a>
            <a href="#receitas" class="nav-item ${isReceitas ? 'active' : ''}">
                <i class="bi bi-currency-dollar"></i> <span> Receitas
            </span></a>
            <a href="#despesas" class="nav-item ${isDespesas ? 'active' : ''}">
                <i class="bi bi-cart"></i> <span> Despesas
            </span></a>

            <div class="nav-section-title mt-2">Sistema</div>
            <a href="#config" class="nav-item ${isConfig ? 'active' : ''}" id="navConfig">
                <i class="bi bi-gear"></i> <span> Sincronização
            </span></a>
        </nav>
        
        
        <div class="sidebar-footer">
            <div class="sidebar-user mb-2 flex-wrap justify-center">
                <div class="avatar" id="sidebarAvatarLetter">U</div>
                <div class="user-info">
                    <span class="user-name" id="sidebarUserName">Usuário</span>
                    <span class="user-role" id="sidebarUserRole">N/A</span>
                </div>
                
                <div class="d-flex align-items-center w-100 justify-content-center mt-2 gap-2 buttons-row">
                    <button class="btn-theme-toggle" title="Alternar Tema" onclick="toggleTheme()" style="background: rgba(255, 255, 255, 0.05); border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                        <i id="theme-toggle-icon" class="bi bi-sun-fill text-amber-500"></i>
                    </button>

                    

                    <button class="btn-logout" title="Sair" onclick="doLogout()">
                        <i class="bi bi-box-arrow-right"></i>
                    </button>
                </div>
            </div>
            
        </div>
    </aside>

    <!-- Botões de recolher/expandir da barra lateral -->
    <button class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="Recolher sidebar">
        <i class="bi bi-chevron-left"></i>
    </button>
    <button class="sidebar-expand-btn" onclick="toggleSidebarCollapse()" title="Expandir sidebar">
        <i class="bi bi-chevron-right"></i>
    </button>


    `;
}
