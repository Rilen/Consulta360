// assets/js/header.js
// Script para renderizar o Header fixo global de forma unificada em todas as páginas

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  
  const headerHtml = `
    <div class="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
          <i data-lucide="briefcase" class="w-5 h-5"></i>
        </div>
        <div>
          <h1 class="text-sm font-bold text-slate-800 leading-tight">Consulta360</h1>
          <p class="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Portal de Transparência</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        
        <!-- Consulta -->
        ${
          currentPath.includes('index.html') || currentPath.endsWith('/consulta360/') 
          ? `<div class="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="database" class="w-4 h-4"></i> Consulta
             </div>`
          : `<a href="./index.html" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              <i data-lucide="database" class="w-4 h-4 text-blue-500"></i> Consulta
             </a>`
        }
        
        <!-- Análise de Dados -->
        ${
          currentPath.includes('graficos.html')
          ? `<div class="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="pie-chart" class="w-4 h-4"></i> Análise de Dados
             </div>`
          : `<a href="./graficos.html" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-500"></i> Análise de Dados
             </a>`
        }
        
        <!-- Auditoria -->
        ${
          currentPath.includes('auditoria_ia.html')
          ? `<div class="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="brain" class="w-4 h-4"></i> Auditoria
             </div>`
          : `<a href="./auditoria_ia.html" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              <i data-lucide="brain" class="w-4 h-4 text-emerald-500"></i> Auditoria
             </a>`
        }
        
        <!-- Evolução -->
        ${
          currentPath.includes('evolucao_salarial.html')
          ? `<div class="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-xs font-bold tracking-wide flex items-center gap-2">
              <i data-lucide="trending-up" class="w-4 h-4"></i> Evolução
             </div>`
          : `<a href="./evolucao_salarial.html" class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600 transition-colors">
              <i data-lucide="trending-up" class="w-4 h-4 text-amber-500"></i> Evolução
             </a>`
        }
      </div>
    </div>
  `;
  
  const headerEl = document.getElementById("global-header");
  if(headerEl) {
    headerEl.innerHTML = headerHtml;
    // Re-renderizar ícones Lucide no header recém injetado
    if(typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
  }
});
