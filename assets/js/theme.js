// assets/js/theme.js
(function() {
    function getSystemTimeTheme() {
        const hour = new Date().getHours();
        // Escuro entre 18:00 e 05:59
        return (hour >= 18 || hour < 6) ? 'dark' : 'light';
    }

    const savedTheme = localStorage.getItem('senti-theme');
    const theme = savedTheme || getSystemTimeTheme();

    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('senti-theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const iconEl = document.getElementById('theme-toggle-icon');
    if (!iconEl) return;
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        iconEl.className = 'bi bi-sun-fill text-amber-500';
    } else {
        iconEl.className = 'bi bi-moon-stars-fill text-slate-500';
    }
}

// Update icon on full load or SPA ready
document.addEventListener('DOMContentLoaded', updateThemeIcon);
document.addEventListener('spaContentReady', updateThemeIcon);

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const icon = document.getElementById('collapseIcon');
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
    if (icon) {
        if (sidebar && sidebar.classList.contains('collapsed')) {
            icon.className = 'bi bi-list';
        } else {
            icon.className = 'bi bi-chevron-double-left';
        }
    }
}

function openSidebarMobile() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

async function doLogout() {
    try {
        const API_BASE = "/api/v1";
        const SESSION_TOKEN = sessionStorage.getItem('sg_token') || localStorage.getItem('sg_token');
        const AUTH_HEADERS = {
            'Content-Type': 'application/json',
            'X-Session-Token': SESSION_TOKEN
        };
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: AUTH_HEADERS });
    } catch (_) { }
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = 'login.html';
}
