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
        iconEl.className = 'bi bi-moon-stars-fill text-blue-300';
    } else {
        iconEl.className = 'bi bi-sun-fill text-amber-500';
    }
}

// Update icon on full load or SPA ready
document.addEventListener('DOMContentLoaded', updateThemeIcon);
document.addEventListener('spaContentReady', updateThemeIcon);
