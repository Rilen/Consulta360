// assets/js/layout.js
// Responsável por montar as peças do layout (Header e Footer) usando os componentes puros.

function renderHeader(currentRoute) {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
        <div class="max-w-[1600px] mx-auto px-4 md:px-6 h-auto md:h-16 py-4 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            ${typeof getLogoHtml === 'function' ? getLogoHtml() : ''}
            <div class="w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                ${typeof getMenuHtml === 'function' ? getMenuHtml(currentRoute) : ''}
            </div>
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

function updateStatusBanner(type, message) {
    const banner = document.getElementById('status-banner');
    const icon = document.getElementById('status-banner-icon');
    const text = document.getElementById('status-banner-text');
    
    if (!banner || !icon || !text) return;
    
    banner.classList.remove('hidden', 'bg-green-600', 'bg-rose-600', 'bg-amber-600');
    
    text.textContent = message;
    
    if (type === 'success') {
        banner.classList.add('bg-green-600');
        icon.setAttribute('data-lucide', 'check-circle');
    } else if (type === 'warning') {
        banner.classList.add('bg-amber-600');
        icon.setAttribute('data-lucide', 'alert-triangle');
    } else if (type === 'error') {
        banner.classList.add('bg-rose-600');
        icon.setAttribute('data-lucide', 'alert-circle');
    } else {
        banner.classList.add('hidden'); // hidden
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
