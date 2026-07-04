// components/header/menu.js
function getMenuHtml(currentRoute) {
    const isHome = currentRoute === 'home' || currentRoute === '';
    const isGraficos = currentRoute === 'graficos';
    const isAuditoria = currentRoute === 'auditoria';
    const isEvolucao = currentRoute === 'evolucao';
    const isContracheque = currentRoute === 'contracheque';
    const isReceitas = currentRoute === 'receitas';
    const isDespesas = currentRoute === 'despesas';
    const isConfig = currentRoute === 'config';

    return `
    <div class="flex items-center justify-end w-full">
      <div class="flex items-center justify-end gap-4 flex-wrap">
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

        <!-- Contracheque -->
        ${
          isContracheque
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="file-check" class="w-4 h-4 text-violet-300"></i> Contracheque
             </div>`
          : `<a href="#" data-route="contracheque" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="file-check" class="w-4 h-4 text-violet-400"></i> Contracheque
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

        <!-- Receitas -->
        ${
          isReceitas
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="dollar-sign" class="w-4 h-4 text-green-300"></i> Receitas
             </div>`
          : `<a href="#" data-route="receitas" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="dollar-sign" class="w-4 h-4 text-green-400"></i> Receitas
             </a>`
        }

        <!-- Despesas -->
        ${
          isDespesas
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="shopping-cart" class="w-4 h-4 text-rose-300"></i> Despesas
             </div>`
          : `<a href="#" data-route="despesas" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="shopping-cart" class="w-4 h-4 text-rose-400"></i> Despesas
             </a>`
        }
      </div>

      <!-- Configurações -->
      <div class="ml-4 border-l border-white/20 pl-4">
        ${
          isConfig
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i data-lucide="settings" class="w-4 h-4 text-slate-300"></i> Sincronização
             </div>`
          : `<a href="#" data-route="config" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i data-lucide="settings" class="w-4 h-4 text-slate-300"></i> Sincronização
             </a>`
        }
      </div>
    </div>
    `;
}
