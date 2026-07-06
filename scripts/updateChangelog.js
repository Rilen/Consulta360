const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'body', 'changelog.html');

let content = fs.readFileSync(file, 'utf8');

content = content.replace('<span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Atual</span>', '');
content = content.replace('<!-- Versão V0.0.5 -->\n      <section class="ag-card rounded-2xl p-8 relative overflow-hidden group">', '<!-- Versão V0.0.5 -->\n      <section class="ag-card rounded-2xl p-8 relative overflow-hidden group opacity-80">');

const newVersionHtml = `      <!-- Versão V0.0.6 -->
      <section class="ag-card rounded-2xl p-8 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full tracking-wider">v0.0.6</span>
            <span class="text-sm font-medium text-slate-500">06 de Julho de 2026</span>
          </div>
          <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Atual</span>
        </div>

        <div class="space-y-6 relative z-10">
          <div>
            <h3 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-rose-400"></span> Corrigido
            </h3>
            <ul class="list-disc list-inside text-sm text-slate-600 space-y-2 ml-1">
              <li><strong>Roteamento do OstrasPrev:</strong> Correção no construtor de URL de Requisição de Receitas e Despesas que estava duplicando o parâmetro da Entidade no final da rota.</li>
              <li><strong>Seleção OstrasPrev:</strong> Habilitado campo de OstrasPrev na Sincronização de Folha de Pagamento e Relação de Servidores.</li>
            </ul>
          </div>
        </div>
      </section>

`;

content = content.replace('<div class="space-y-8" id="changelog-container">\n', '<div class="space-y-8" id="changelog-container">\n' + newVersionHtml);

fs.writeFileSync(file, content);
