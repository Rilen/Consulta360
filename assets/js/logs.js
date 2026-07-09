// assets/js/logs.js

let todosLogs = [];

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'logs') initLogs();
});

async function initLogs() {
    const btn = document.getElementById('btnRecarregarLogs');
    const filtro = document.getElementById('filtroLogs');
    
    if (btn) {
        btn.addEventListener('click', carregarLogs);
    }
    
    if (filtro) {
        filtro.addEventListener('input', renderizarLogsTabela);
    }
    
    await carregarLogs();
}

async function carregarLogs() {
    const tbody = document.getElementById('tabelaLogs');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-slate-400"><i class="bi bi-hourglass-split w-6 h-6 animate-pulse block mx-auto mb-2"></i>Buscando registros na rede...</td></tr>`;
    
    try {
        const resp = await fetch('./data/access_logs.json', { cache: 'no-store' });
        if (resp.ok) {
            todosLogs = await resp.json();
        } else {
            todosLogs = [];
        }
        renderizarLogsTabela();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-rose-400">Falha ao comunicar com o servidor da rede.</td></tr>`;
    }
}

function renderizarLogsTabela() {
    const tbody = document.getElementById('tabelaLogs');
    const filtroEl = document.getElementById('filtroLogs');
    if (!tbody) return;
    
    if (todosLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-slate-400">Nenhum log encontrado.</td></tr>`;
        return;
    }
    
    const termo = filtroEl ? filtroEl.value.trim().toLowerCase() : '';
    
    const filtrados = todosLogs.filter(l => 
        (l.nome && String(l.nome).toLowerCase().includes(termo)) ||
        (l.role && String(l.role).toLowerCase().includes(termo))
    );
    
    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-slate-400">Nenhum log corresponde à busca.</td></tr>`;
        return;
    }
    
    const max = 200; // Limite de exibição para não travar
    const trs = filtrados.slice(0, max).map(l => {
        const dt = l.dataHora ? new Date(l.dataHora).toLocaleString('pt-BR') : 'Desconhecida';
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                            ${l.nome ? String(l.nome).charAt(0) : '?'}
                        </div>
                        <span class="font-medium text-slate-700">${typeof sanitize === 'function' ? sanitize(l.nome) : l.nome}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">${typeof sanitize === 'function' ? sanitize(l.role) : l.role}</span>
                </td>
                <td class="py-3 px-4 text-right text-slate-500 text-sm">
                    ${dt}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = trs.join('');
}
