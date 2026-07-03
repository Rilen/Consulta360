// components/header/menu.js
function getMenuHtml(currentRoute) {
    const isHome = currentRoute === 'home' || currentRoute === '';
    const isGraficos = currentRoute === 'graficos';
    const isAuditoria = currentRoute === 'auditoria';
    const isEvolucao = currentRoute === 'evolucao';

    return `
    <div class="flex items-center gap-4">
        <!-- Consulta -->
        ${
          isHome
          ? `<div class="px-4 py-1.5 bg-blue-500/20 text-white border border-blue-300/30 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-inner backdrop-blur-md">
              <i data-lucide="database" class="w-4 h-4 text-blue-300"></i> Consulta
             </div>`
          : `<a href="#" data-route="home" class="px-4 py-1.5 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all border border-transparent">
              <i data-lucide="database" class="w-4 h-4 text-blue-400/70"></i> Consulta
             </a>`
        }
        
        <!-- Análise de Dados -->
        ${
          isGraficos
          ? `<div class="px-4 py-1.5 bg-indigo-500/20 text-white border border-indigo-300/30 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-inner backdrop-blur-md">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-300"></i> Análise de Dados
             </div>`
          : `<a href="#" data-route="graficos" class="px-4 py-1.5 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all border border-transparent">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-400/70"></i> Análise de Dados
             </a>`
        }
        
        <!-- Auditoria -->
        ${
          isAuditoria
          ? `<div class="px-4 py-1.5 bg-emerald-500/20 text-white border border-emerald-300/30 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-inner backdrop-blur-md">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-300"></i> Auditoria
             </div>`
          : `<a href="#" data-route="auditoria" class="px-4 py-1.5 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all border border-transparent">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-400/70"></i> Auditoria
             </a>`
        }
        
        <!-- Evolução -->
        ${
          isEvolucao
          ? `<div class="px-4 py-1.5 bg-amber-500/20 text-white border border-amber-300/30 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-inner backdrop-blur-md">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-300"></i> Evolução
             </div>`
          : `<a href="#" data-route="evolucao" class="px-4 py-1.5 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all border border-transparent">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-400/70"></i> Evolução
             </a>`
        }
    </div>
    `;
}
