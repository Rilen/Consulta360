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
          ? `<div class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="database" class="w-4 h-4"></i> Consulta
             </div>`
          : `<a href="#" data-route="home" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              <i data-lucide="database" class="w-4 h-4 text-blue-500"></i> Consulta
             </a>`
        }
        
        <!-- Análise de Dados -->
        ${
          isGraficos
          ? `<div class="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="pie-chart" class="w-4 h-4"></i> Análise de Dados
             </div>`
          : `<a href="#" data-route="graficos" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-500"></i> Análise de Dados
             </a>`
        }
        
        <!-- Auditoria -->
        ${
          isAuditoria
          ? `<div class="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="brain" class="w-4 h-4"></i> Auditoria
             </div>`
          : `<a href="#" data-route="auditoria" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-500"></i> Auditoria
             </a>`
        }
        
        <!-- Evolução -->
        ${
          isEvolucao
          ? `<div class="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="trending-up" class="w-4 h-4"></i> Evolução
             </div>`
          : `<a href="#" data-route="evolucao" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600 transition-colors">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-500"></i> Evolução
             </a>`
        }
    </div>
    `;
}
