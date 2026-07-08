// assets/js/layout.js
// Responsável por montar as peças do layout (Header e Footer) usando os componentes puros.

function renderSidebar(currentRoute) {
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;

    sidebarEl.innerHTML = typeof getMenuHtml === 'function' ? getMenuHtml(currentRoute) : '';
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
    renderSidebar(route);
    renderFooter();
});

// ─────────────────────────────────────────────────────────
// Helper: Vincula handler a um formulário evitando duplicação.
// Substitui o anti-pattern: form.cloneNode(true) + replaceChild.
// Uso: bindFormOnce('meu-form-id', handleSubmit)
// ─────────────────────────────────────────────────────────
function bindFormOnce(formId, submitHandler) {
    const form = document.getElementById(formId);
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', submitHandler);
}

// Helper genérico para bindar um evento uma única vez em qualquer elemento.
// Uso: bindOnce('meu-btn-id', 'click', handler)
function bindOnce(elementId, eventName, handler) {
    const el = document.getElementById(elementId);
    if (!el || el.dataset.bound === 'true') return;
    el.dataset.bound = 'true';
    el.addEventListener(eventName, handler);
}

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

    }
}
