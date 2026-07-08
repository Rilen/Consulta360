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
    const isComparacao = currentRoute === 'comparacao';
    
    const isBI = isGraficos || currentRoute === 'dashboard' || currentRoute === 'diff' || isAuditoria || isEvolucao || isComparacao;

    return `
    <div class="flex items-center justify-center md:justify-end w-full">
      <div class="flex items-center justify-center md:justify-end gap-2 md:gap-4 flex-wrap">
        <!-- Consulta -->
        ${
          isHome
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i class="bi bi-database w-4 h-4 text-blue-300"></i> Consulta
             </div>`
          : `<a href="#" data-route="home" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i class="bi bi-database w-4 h-4 text-blue-400"></i> Consulta
             </a>`
        }
        
        <!-- BI Dropdown -->
        <div class="relative group">
          <div class="px-4 py-1.5 ${isBI ? 'bg-white/20 text-white border-white/40 shadow-sm' : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/15 hover:text-white'} border rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer transition-all">
            <i class="bi bi-bar-chart w-4 h-4 ${isBI ? 'text-indigo-300' : 'text-indigo-400'}"></i> BI <i class="bi bi-chevron-down w-3 h-3 ml-1 opacity-70"></i>
          </div>
          
          <div class="absolute left-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 flex flex-col overflow-hidden py-1">
            
            <a href="#" data-route="dashboard" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${currentRoute === 'dashboard' ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-grid-1x2 w-4 h-4 text-cyan-400"></i> Macro-Dashboard
            </a>
            
            <a href="#" data-route="graficos" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${isGraficos ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-pie-chart w-4 h-4 text-indigo-400"></i> Análise de Dados
            </a>
            
            <a href="#" data-route="diff" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${currentRoute === 'diff' ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-clock-history w-4 h-4 text-fuchsia-400"></i> Máquina do Tempo
            </a>
            
            <a href="#" data-route="auditoria" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${isAuditoria ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-cpu w-4 h-4 text-emerald-400"></i> Auditoria IA
            </a>
            
            <a href="#" data-route="evolucao" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${isEvolucao ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-graph-up-arrow w-4 h-4 text-amber-400"></i> Evolução
            </a>
            
            <a href="#" data-route="comparacao" class="px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${isComparacao ? 'bg-white/10 text-white' : ''}">
              <i class="bi bi-bank w-4 h-4 text-orange-400"></i> Comparação Salarial
            </a>
            
          </div>
        </div>

        <!-- Contracheque -->
        ${
          isContracheque
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i class="bi bi-file-earmark-check w-4 h-4 text-violet-300"></i> Contracheque
             </div>`
          : `<a href="#" data-route="contracheque" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i class="bi bi-file-earmark-check w-4 h-4 text-violet-400"></i> Contracheque
             </a>`
        }
        
        <!-- Receitas -->
        ${
          isReceitas
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i class="bi bi-currency-dollar w-4 h-4 text-green-300"></i> Receitas
             </div>`
          : `<a href="#" data-route="receitas" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i class="bi bi-currency-dollar w-4 h-4 text-green-400"></i> Receitas
             </a>`
        }

        <!-- Despesas -->
        ${
          isDespesas
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i class="bi bi-cart w-4 h-4 text-rose-300"></i> Despesas
             </div>`
          : `<a href="#" data-route="despesas" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i class="bi bi-cart w-4 h-4 text-rose-400"></i> Despesas
             </a>`
        }
      </div>

      <!-- Configurações -->
      <div class="ml-4 border-l border-white/20 pl-4">
        ${
          isConfig
          ? `<div class="px-4 py-1.5 bg-white/20 text-white border border-white/40 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm backdrop-blur-md">
              <i class="bi bi-gear w-4 h-4 text-slate-300"></i> Sincronização
             </div>`
          : `<a href="#" data-route="config" class="px-4 py-1.5 bg-white/5 text-slate-200 border border-white/10 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/15 hover:text-white transition-all">
              <i class="bi bi-gear w-4 h-4 text-slate-300"></i> Sincronização
             </a>`
        }
      </div>
    </div>
    `;
}
