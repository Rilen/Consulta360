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
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="database" class="w-4 h-4 text-blue-300"></i> Consulta
             </div>`
          : `<a href="#" data-route="home" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="database" class="w-4 h-4 text-blue-400"></i> Consulta
             </a>`
        }
        
        <!-- Análise de Dados -->
        ${
          isGraficos
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-300"></i> Análise de Dados
             </div>`
          : `<a href="#" data-route="graficos" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-400"></i> Análise de Dados
             </a>`
        }
        
        <!-- Auditoria -->
        ${
          isAuditoria
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-300"></i> Auditoria
             </div>`
          : `<a href="#" data-route="auditoria" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-400"></i> Auditoria
             </a>`
        }
        
        <!-- Evolução -->
        ${
          isEvolucao
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-300"></i> Evolução
             </div>`
          : `<a href="#" data-route="evolucao" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-400"></i> Evolução
             </a>`
        }
    </div>
    `;
}
