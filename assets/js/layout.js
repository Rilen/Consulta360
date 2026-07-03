// assets/js/layout.js
// Responsável por montar as peças do layout (Header e Footer) usando os componentes puros.

function renderHeader(currentRoute) {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
        <div class="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
            ${typeof getLogoHtml === 'function' ? getLogoHtml() : ''}
            ${typeof getMenuHtml === 'function' ? getMenuHtml(currentRoute) : ''}
        </div>
    `;
}

function renderFooter() {
    const footerEl = document.getElementById('app-footer');
    if (!footerEl) return;

    footerEl.innerHTML = `
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
            ${typeof getNpaHtml === 'function' ? getNpaHtml() : ''}
            <div class="flex items-center gap-6">
                ${typeof getVersaoHtml === 'function' ? getVersaoHtml() : ''}
            </div>
        </div>
    `;
}

// Inicializar renderização básica caso a rota não mande o evento a tempo
document.addEventListener('DOMContentLoaded', () => {
    const route = window.location.hash.replace('#', '') || 'home';
    renderHeader(route);
    renderFooter();
});
