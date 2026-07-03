// components/footer/npa.js
function getNpaHtml() {
    return `
    <div class="flex items-center gap-3">
        <span class="text-xs text-slate-400 font-medium">Desenvolvido por:</span>
        <a href="#" data-route="info" title="Equipe NPA: Eduardo, Matheus e Rilen" class="group flex items-center gap-2">
            <img src="./components/footer/logo_npa.png" alt="Logo NPA" class="h-6 w-auto opacity-75 group-hover:opacity-100 transition-opacity">
            <span class="text-[10px] text-slate-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Eduardo, Matheus e Rilen</span>
        </a>
    </div>
    `;
}
