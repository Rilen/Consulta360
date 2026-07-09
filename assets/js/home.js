// assets/js/home.js

let currentPage = 1;
const rowsPerPage = 50;
let currentData = [];
let originalData = []; // Para manter todos os dados antes do filtro local

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'home' || e.detail.route === '') {
        initHomeModule();
    }
});

function initHomeModule() {
    const form = document.getElementById('filter-form');
    if (!form) return;
    
    // Evitar múltiplos bindings
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    // Set default month (Mês passado)
    const mesAnoInput = document.getElementById('mesAno');
    if (mesAnoInput && !mesAnoInput.value) {
        const d = new Date();
        d.setMonth(d.getMonth() - 1); 
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        mesAnoInput.value = `${d.getFullYear()}-${m}`;
    }

    form.addEventListener('submit', handleBusca);
    
    document.getElementById('btnPagAnterior')?.addEventListener('click', () => {
        if(currentPage > 1) { currentPage--; renderTable(); }
    });
    
    document.getElementById('btnPagProxima')?.addEventListener('click', () => {
        const total = Math.ceil(currentData.length / rowsPerPage);
        if(currentPage < total) { currentPage++; renderTable(); }
    });
    
    document.getElementById('btnLimpar')?.addEventListener('click', () => {
        document.getElementById('filtraNome').value = '';
        if (originalData.length > 0) {
            currentData = originalData;
            currentPage = 1;
            renderTable();
        } else {
            changeState('inicial');
        }
    });

    document.getElementById('filtraNome')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            if (originalData.length > 0) {
                aplicarFiltroNome();
            } else {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
    });
}

function changeState(state, errorMsg = '') {
    const states = ['stateInicial', 'stateLoading', 'stateSemDados', 'stateResultados'];
    states.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
        if (el) el.classList.remove('flex');
    });

    document.getElementById('alertaErro').classList.add('hidden');

    if (state === 'inicial') { document.getElementById('stateInicial').classList.remove('hidden'); document.getElementById('stateInicial').classList.add('flex'); }
    if (state === 'loading') { document.getElementById('stateLoading').classList.remove('hidden'); document.getElementById('stateLoading').classList.add('flex'); }
    if (state === 'semDados') { document.getElementById('stateSemDados').classList.remove('hidden'); document.getElementById('stateSemDados').classList.add('flex'); }
    if (state === 'resultados') { document.getElementById('stateResultados').classList.remove('hidden'); }
    
    if (state === 'erro') {
        document.getElementById('stateInicial').classList.remove('hidden');
        document.getElementById('stateInicial').classList.add('flex');
        document.getElementById('alertaErro').classList.remove('hidden');
        document.getElementById('alertaErro').classList.add('flex');
        document.getElementById('msgErro').innerText = errorMsg;
    }
}

function showOfflineToast(msg, type = 'warning') {
    let toast = document.getElementById('cache-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cache-toast';
        document.body.appendChild(toast);
    }
    
    if (type === 'warning') {
        toast.className = 'fixed bottom-6 right-6 z-50 p-4 rounded-xl text-sm font-medium shadow-xl flex items-center gap-3 bg-amber-500 text-white shadow-amber-500/20 transition-all transform translate-y-0 opacity-100';
        toast.innerHTML = `<i class="bi bi-wifi-off w-5 h-5"></i> ${msg}`;
    } else {
        toast.className = 'fixed bottom-6 right-6 z-50 p-4 rounded-xl text-sm font-medium shadow-xl flex items-center gap-3 bg-blue-600 text-white shadow-blue-600/20 transition-all transform translate-y-0 opacity-100';
        toast.innerHTML = `<i class="bi bi-database w-5 h-5"></i> ${msg}`;
    }
    
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

async function handleBusca(e) {
    if (e) e.preventDefault();
    const mesAno = document.getElementById('mesAno').value;
    const nomeBase = document.getElementById('nomeBase').value;
    const endpoint = document.getElementById('endpoint').value;

    if(!mesAno) return alert('Selecione o mês de referência');

    const cacheKey = `${endpoint}_${nomeBase}_${mesAno}`;
    const datas = mesAnoParaDatas(mesAno);

    changeState('loading');
    
    try {
        // 1. Check IndexedDB Cache (Exclusivo)
        const cached = await getCache(cacheKey); // Vem do db.js
        const metaPrefix = endpoint === 'Servidor' ? 'meta_servidor' : 'meta_folha';
        const metaKey = `${metaPrefix}_${nomeBase}_${mesAno}`;
        const meta = await getMetadata(metaKey);
        
        if (cached) {
            let textData = typeof cached === 'string' ? cached : JSON.stringify(cached);
            
            const dataFormatada = await resolveTimestampLabel(cacheKey, metaKey);
            updateStatusBanner('success', `Exibindo dados do Banco Local - Última atualização: ${dataFormatada}`);

            // Restaura mensagem original de loading
            const msgEl = document.getElementById('loadingMsg');
            if(msgEl) msgEl.innerText = 'Processando dados da base local...';

            originalData = JSON.parse(textData);

            if (originalData.length === 0) {
                changeState('semDados');
                return;
            }

            aplicarFiltroNome();

        } else {
            updateStatusBanner('error', `Base vazia. Vá em Sincronização para baixar os dados.`);
            document.getElementById('alertaCors').classList.remove('hidden');
            document.getElementById('alertaCors').classList.add('flex');
            throw new Error('Dados não encontrados no Banco Local para este período. Por favor, acesse o menu de Sincronização e faça o download.');
        }

    } catch (err) {
        changeState('erro', err.message);
    }
}

function aplicarFiltroNome() {
    const nomeFiltro = document.getElementById('filtraNome').value.trim().toLowerCase();
    
    if (nomeFiltro) {
        currentData = originalData.filter(r => {
            const keys = Object.keys(r);
            for(let k of keys) {
                if (isNomeKey(k) && String(r[k]).toLowerCase().includes(nomeFiltro)) return true; // isNomeKey vem do api.js
            }
            return false;
        });
    } else {
        currentData = originalData;
    }
    
    if (currentData.length === 0) {
        changeState('semDados');
        return;
    }

    currentPage = 1;
    changeState('resultados');
    renderTable();
}

function renderTable() {
    const thead = document.getElementById('tabelaHead');
    const tbody = document.getElementById('tabelaBody');
    
    if (!currentData || currentData.length === 0) return;

    // Cabeçalhos (Pegar chaves do primeiro objeto)
    const headers = Object.keys(currentData[0]);
    
    let thHtml = '<tr>';
    headers.forEach(h => {
        thHtml += `<th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">${h}</th>`;
    });
    thHtml += '</tr>';
    thead.innerHTML = thHtml;

    // Corpo da tabela (Paginação)
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentData.slice(start, end);

    let tbHtml = '';
    pageData.forEach(row => {
        tbHtml += `<tr class="hover:bg-slate-50 transition-colors">`;
        headers.forEach(h => {
            let val = row[h] || '-';
            
            // Destacar colunas de valor financeiro
            let colorClass = 'text-slate-600';
            if (isBrutoKey(h)) colorClass = 'text-slate-800 font-semibold';
            if (isLiquidoKey(h)) colorClass = 'text-emerald-700 font-bold bg-emerald-50/50';
            
            tbHtml += `<td class="py-3 px-4 text-sm ${colorClass} whitespace-nowrap">${val}</td>`;
        });
        tbHtml += `</tr>`;
    });
    
    tbody.innerHTML = tbHtml;

    // Atualizar Controles de Paginação
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    document.getElementById('pagInfo').innerText = `Mostrando ${start + 1} a ${Math.min(end, currentData.length)} de ${currentData.length} registros (Página ${currentPage} de ${totalPages})`;
    
    document.getElementById('btnPagAnterior').disabled = currentPage === 1;
    document.getElementById('btnPagProxima').disabled = currentPage === totalPages;
    
    renderStats();
}

function renderStats() {
    // Calcula métricas simples baseado nos dados atuais
    const rowCount = currentData.length;
    let sumBruto = 0;
    let sumLiquido = 0;
    let teto = 0;

    const headers = Object.keys(currentData[0] || {});
    let brutoKey = headers.find(isBrutoKey);
    let liquidoKey = headers.find(isLiquidoKey);

    if (brutoKey || liquidoKey) {
        currentData.forEach(row => {
            if (brutoKey) {
                let v = parseValorBR(row[brutoKey]);
                if(!isNaN(v)) {
                    sumBruto += v;
                    if(v > teto) teto = v;
                }
            }
            if (liquidoKey) {
                let v = parseValorBR(row[liquidoKey]);
                if(!isNaN(v)) sumLiquido += v;
            }
        });
    }

    const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    let html = `
        <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Registros</span>
            <span class="text-2xl font-black text-slate-800">${rowCount}</span>
        </div>
    `;

    if (sumBruto > 0) {
        html += `
            <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Folha Bruta Total</span>
                <span class="text-2xl font-black text-slate-800">${formatBRL(sumBruto)}</span>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Maior Remuneração (Teto)</span>
                <span class="text-2xl font-black text-blue-600">${formatBRL(teto)}</span>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Líquido Desembolsado</span>
                <span class="text-2xl font-black text-emerald-700">${formatBRL(sumLiquido)}</span>
            </div>
        `;
    }

    document.getElementById('statsRow').innerHTML = html;
}
