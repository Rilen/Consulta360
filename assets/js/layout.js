
// --- Proteção de Rota (lê sessionStorage primeiro, depois localStorage como fallback) ---
const SESSION_TOKEN = sessionStorage.getItem('sg_token') || localStorage.getItem('sg_token');
const USER_ROLE = sessionStorage.getItem('sg_role') || localStorage.getItem('sg_role');
const DISPLAY_NAME = sessionStorage.getItem('sg_display_name') || localStorage.getItem('sg_display_name');

if (!SESSION_TOKEN) {
    window.location.href = 'login.html';
}

const AUTH_HEADERS = {
    'Content-Type': 'application/json',
    'X-Session-Token': SESSION_TOKEN
};

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
    // Injeta os dados do usuário logado na sidebar
    setTimeout(() => {
        const sidebarNameEl = document.getElementById('sidebarUserName');
        const sidebarRoleEl = document.getElementById('sidebarUserRole');
        const sidebarAvatarEl = document.getElementById('sidebarAvatarLetter');
        if (sidebarNameEl) sidebarNameEl.textContent = DISPLAY_NAME || 'Usuário';
        if (sidebarAvatarEl) sidebarAvatarEl.textContent = (DISPLAY_NAME || 'U')[0].toUpperCase();
        
        if (USER_ROLE === 'admin') {
            if (sidebarRoleEl) sidebarRoleEl.textContent = 'Super Administrador';
        } else if (USER_ROLE === 'administrador') {
            if (sidebarRoleEl) sidebarRoleEl.textContent = 'Administrador';
        } else if (USER_ROLE === 'moderator') {
            if (sidebarRoleEl) sidebarRoleEl.textContent = 'Moderador';
        } else {
            if (sidebarRoleEl) sidebarRoleEl.textContent = 'Usuário Padrão';
        }
    }, 100);

    renderFooter();
    if (typeof updateThemeIcon === 'function') updateThemeIcon();
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

function toggleSidebarCollapse() {
    if (window.innerWidth <= 768) return;
    const sidebar = document.getElementById('sidebar');
    if(sidebar) {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sg_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    }
}

(function restoreSidebar() {
    document.addEventListener('DOMContentLoaded', () => {
        // Precisa rodar depois que a sidebar for renderizada, então um leve delay ajuda se for o caso
        setTimeout(() => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && localStorage.getItem('sg_sidebar_collapsed') === 'true') {
                sidebar.classList.add('collapsed');
            }
        }, 50);
    });
})();
