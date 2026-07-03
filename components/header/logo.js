// components/header/logo.js
function getLogoHtml() {
    return `
    <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <i data-lucide="briefcase" class="w-5 h-5"></i>
        </div>
        <div>
            <h1 class="text-sm font-bold text-slate-800 leading-tight">Consulta360</h1>
            <p class="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Portal de Transparência</p>
        </div>
    </div>
    `;
}
