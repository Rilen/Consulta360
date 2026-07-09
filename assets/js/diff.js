// assets/js/diff.js
// Algoritmo de cruzamento de dados para a Máquina do Tempo (Diff)

let diffResultadosGlobais = [];
let diffFiltroAtual = 'todos';
let diffPaginaAtual = 1;
const DIFF_ITENS_POR_PAGINA = 50;

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'diff') {
        initDiff();
    }
});

function initDiff() {
    // Configura os inputs type="month" para valores padrão
    const hoje = new Date();
    const mesA = document.getElementById('diffMesA');
    const mesB = document.getElementById('diffMesB');
    
    if (mesA && !mesA.value) {
        let dA = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
        mesA.value = `${dA.getFullYear()}-${String(dA.getMonth()+1).padStart(2, '0')}`;
    }
    if (mesB && !mesB.value) {
        let dB = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        mesB.value = `${dB.getFullYear()}-${String(dB.getMonth()+1).padStart(2, '0')}`;
    }

    // Vincula o botão de comparar via ID (substitui onclick string frágil)
    const btnGerar = document.getElementById('btnGerarDiff');
    if (btnGerar && !btnGerar.dataset.bound) {
        btnGerar.dataset.bound = 'true';
        btnGerar.addEventListener('click', gerarDiff);
    }
}

function mostrarErroDiff(msg) {
    const el = document.getElementById('diffError');
    const msgEl = document.getElementById('diffErrorMsg');
    if (!el || !msgEl) return;
    
    if (msg) {
        msgEl.innerHTML = `<strong>Erro na Comparação:</strong> ${msg}`;
        el.classList.remove('hidden');
        el.classList.add('flex');
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
}

async function gerarDiff() {
    mostrarErroDiff('');
    const btn = document.getElementById('btnGerarDiff');
    if (btn) btn.innerHTML = '<i class="bi bi-loader-2 w-4 h-4 animate-spin"></i> Processando...';
    if (window.lucide) window.lucide.createIcons();

    const valA = document.getElementById('diffMesA')?.value;
    const valB = document.getElementById('diffMesB')?.value;
    const base = document.getElementById('diffBase')?.value;

    if (!valA || !valB || !base) {
        mostrarErroDiff('Preencha os meses e a base para comparar.');
        if (btn) btn.innerHTML = '<i class="bi bi-play w-4 h-4"></i> Comparar Folhas';
        return;
    }

    const keyA = `FolhaPagamento_${base}_${valA}`;
    const keyB = `FolhaPagamento_${base}_${valB}`;

    try {
        const rawA = await getCacheRaw(keyA);
        const rawB = await getCacheRaw(keyB);

        if (!rawA || !rawB) {
            mostrarErroDiff('Um ou ambos os meses selecionados não estão sincronizados localmente. Por favor, vá ao Painel de Sincronização e baixe-os primeiro.');
            if (btn) btn.innerHTML = '<i class="bi bi-play w-4 h-4"></i> Comparar Folhas';
            return;
        }

        let listaA = typeof rawA.data === 'string' ? JSON.parse(rawA.data) : rawA.data;
        let listaB = typeof rawB.data === 'string' ? JSON.parse(rawB.data) : rawB.data;

        executarAlgoritmoDiff(listaA, listaB);

        document.getElementById('diffResults').classList.remove('hidden');

    } catch (e) {
        mostrarErroDiff('Falha ao processar os dados em cache.');
        console.error(e);
    }

    if (btn) btn.innerHTML = '<i class="bi bi-play w-4 h-4"></i> Comparar Folhas';
    if (window.lucide) window.lucide.createIcons();
}

function consolidarServidores(lista) {
    const mapa = new Map();
    for (const reg of lista) {
        const cpf = reg.CPF || reg.cpf || '';
        const nome = reg.Nome || reg.NomeServidor || reg.NomeCompleto || '';
        const ident = cpf.replace(/\D/g, '') || nome.trim().toUpperCase();
        
        if (!ident) continue;

        const liq = parseValorBR(reg.ValorLiquido || reg.Liquido || 0);

        if (mapa.has(ident)) {
            const atual = mapa.get(ident);
            atual.liquido += liq;
        } else {
            mapa.set(ident, {
                nome: nome.toUpperCase(),
                liquido: liq
            });
        }
    }
    return mapa;
}

function executarAlgoritmoDiff(listaA, listaB) {
    const mapA = consolidarServidores(listaA);
    const mapB = consolidarServidores(listaB);

    let entraram = 0;
    let sairam = 0;
    let aumentos = 0;
    let resultados = [];

    // Quem estava no mês A
    for (const [id, servA] of mapA.entries()) {
        if (!mapB.has(id)) {
            // Saiu no mês B
            sairam++;
            resultados.push({
                nome: servA.nome,
                tipo: 'saiu',
                valA: servA.liquido,
                valB: 0,
                diff: -servA.liquido
            });
        } else {
            // Continua na folha, verificar aumento/redução
            const servB = mapB.get(id);
            const diff = servB.liquido - servA.liquido;
            
            // Só registra se houver variação de pelo menos R$ 1,00
            if (Math.abs(diff) > 1.0) {
                if (diff > 0) aumentos++;
                resultados.push({
                    nome: servA.nome,
                    tipo: diff > 0 ? 'aumento' : 'reducao',
                    valA: servA.liquido,
                    valB: servB.liquido,
                    diff: diff
                });
            }
        }
    }

    // Quem apareceu novo no mês B
    for (const [id, servB] of mapB.entries()) {
        if (!mapA.has(id)) {
            entraram++;
            resultados.push({
                nome: servB.nome,
                tipo: 'entrou',
                valA: 0,
                valB: servB.liquido,
                diff: servB.liquido
            });
        }
    }

    // Ordenar resultados pelo maior impacto financeiro absoluto (diff)
    resultados.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    diffResultadosGlobais = resultados;
    diffFiltroAtual = 'todos';
    diffPaginaAtual = 1;

    // Atualizar Contadores
    document.getElementById('diffEntraram').textContent = entraram.toLocaleString('pt-BR');
    document.getElementById('diffSairam').textContent = sairam.toLocaleString('pt-BR');
    document.getElementById('diffAumentos').textContent = aumentos.toLocaleString('pt-BR');

    renderDiffTable();
}

function filtrarDiffTable(tipo) {
    diffFiltroAtual = tipo;
    diffPaginaAtual = 1;
    
    // Atualizar botões visuais
    document.querySelectorAll('.diff-filter').forEach(btn => {
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600');
    });
    const btnAtivo = document.querySelector(`.diff-filter[onclick="filtrarDiffTable('${tipo}')"]`);
    if (btnAtivo) {
        btnAtivo.classList.remove('bg-slate-100', 'text-slate-600');
        btnAtivo.classList.add('bg-slate-800', 'text-white');
    }

    renderDiffTable();
}

function mudarPaginaDiff(delta) {
    diffPaginaAtual += delta;
    if (diffPaginaAtual < 1) diffPaginaAtual = 1;
    renderDiffTable();
}

function renderDiffTable() {
    const tbody = document.getElementById('diffTableBody');
    if (!tbody) return;

    let filtrados = diffResultadosGlobais;
    if (diffFiltroAtual !== 'todos') {
        filtrados = diffResultadosGlobais.filter(r => r.tipo === diffFiltroAtual);
    }

    const totalPaginas = Math.ceil(filtrados.length / DIFF_ITENS_POR_PAGINA);
    if (diffPaginaAtual > totalPaginas && totalPaginas > 0) diffPaginaAtual = totalPaginas;

    const start = (diffPaginaAtual - 1) * DIFF_ITENS_POR_PAGINA;
    const end = start + DIFF_ITENS_POR_PAGINA;
    const paginaData = filtrados.slice(start, end);

    if (paginaData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">Nenhum registro encontrado para este filtro.</td></tr>`;
    } else {
        tbody.innerHTML = paginaData.map(r => {
            let badge = '';
            let valClass = '';
            let valSinal = r.diff > 0 ? '+' : '';
            if (r.tipo === 'entrou') { badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Entrou</span>'; valClass = 'text-emerald-600'; }
            if (r.tipo === 'saiu') { badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Saiu</span>'; valClass = 'text-rose-600'; }
            if (r.tipo === 'aumento') { badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Aumento</span>'; valClass = 'text-amber-600'; }
            if (r.tipo === 'reducao') { badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Redução</span>'; valClass = 'text-purple-600'; }

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3 px-4 text-sm font-medium text-slate-700">${sanitize(r.nome)}</td>
                    <td class="py-3 px-4">${badge}</td>
                    <td class="py-3 px-4 text-sm text-right text-slate-500">${r.valA === 0 ? '-' : formatarMoeda(r.valA)}</td>
                    <td class="py-3 px-4 text-sm text-right text-slate-500">${r.valB === 0 ? '-' : formatarMoeda(r.valB)}</td>
                    <td class="py-3 px-4 text-sm text-right font-bold ${valClass}">${valSinal}${formatarMoeda(r.diff)}</td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('diffPaginacaoInfo').textContent = `Mostrando ${start + 1} a ${Math.min(end, filtrados.length)} de ${filtrados.length} registros`;
}
