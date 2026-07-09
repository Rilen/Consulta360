// assets/js/router.js
// Single Page Application (SPA) Router para o Consulta360

const routes = {
    'home': './body/home.html',
    'graficos': './body/graficos.html',
    'dashboard': './body/dashboard.html',
    'diff': './body/diff.html',
    'auditoria': './body/auditoria_ia.html',
    'evolucao': './body/evolucao.html',
    'receitas': './body/receitas.html',
    'despesas': './body/despesas.html',
    'contracheque': './body/contracheque.html',
    'comparacao': './body/comparacao.html',
    'config': './body/config.html',
    'info': './body/info.html',
    'changelog': './body/changelog.html'
};

document.addEventListener('DOMContentLoaded', () => {
    // Escuta cliques no menu lateral ou em links internos
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('[data-route]')) {
            e.preventDefault();
            navigateTo(e.target.getAttribute('data-route'));
        } else if (e.target.closest('[data-route]')) {
            e.preventDefault();
            navigateTo(e.target.closest('[data-route]').getAttribute('data-route'));
        }
    });

    // Carrega a rota inicial baseada na URL atual (hash)
    const initialRoute = window.location.hash.replace('#', '') || 'home';
    navigateTo(initialRoute, false);
});

async function navigateTo(route, pushState = true) {
    if (!routes[route]) return;

    const contentDiv = document.getElementById('app-body');
    if (!contentDiv) return;

    try {
        const response = await fetch(routes[route]);
        if (!response.ok) throw new Error('Falha ao carregar a página.');
        
        const html = await response.text();
        contentDiv.innerHTML = html;

        if (pushState) {
            window.history.pushState({ route }, '', `#${route}`);
        }

        // Emitir evento customizado para que os scripts da página saibam que a tela mudou
        document.dispatchEvent(new CustomEvent('routeChanged', { detail: { route } }));

        // Disparar renderização da Sidebar e Footer novamente para atualizar estados visuais
        if (typeof renderSidebar === 'function') renderSidebar(route);
        if (typeof renderFooter === 'function') renderFooter();
        
        // Re-renderizar ícones Lucide da nova tela E do header/footer recém renderizados
        if (typeof lucide !== 'undefined') {

        }

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">Erro ao carregar módulo. Verifique a rede.</div>`;
    }
}

// Lida com o botão "Voltar" do navegador
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.route) {
        navigateTo(e.state.route, false);
    } else {
        const hashRoute = window.location.hash.replace('#', '') || 'home';
        navigateTo(hashRoute, false);
    }
});
