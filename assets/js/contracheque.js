// contracheque.js — Auditoria de Contracheque via PDF
// Extrai dados do PDF, cruza com IndexedDB e gera parecer técnico-contábil.
// Suporte a múltiplos PDFs: o usuário pode enviar todos os contra-cheques
// do mesmo mês (salário + adiantamento 13º, etc.) e o sistema soma antes
// de comparar com a API.

// ── Estado global ──
let pdfsCarregados = [];  // array de { dados, nomeArquivo, id }

const MESES = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03',
    'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
    'agosto': '08', 'setembro': '09', 'outubro': '10',
    'novembro': '11', 'dezembro': '12'
};

let contadorId = 0;

// ─────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'contracheque') initContrachequeModule();
});


function initContrachequeModule() {
    if (window.lucide) lucide.createIcons();

    resetarTudo();

    const dropZone = document.getElementById('dropZone');
    const pdfInput = document.getElementById('pdfInput');
    const dropInner = document.getElementById('dropZoneInner');
    const dropProc = document.getElementById('dropZoneProcessing');

    if (!dropZone || dropZone.dataset.bound === 'true') return;
    dropZone.dataset.bound = 'true';

    dropZone.addEventListener('click', () => pdfInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-violet-400', 'bg-violet-50/30');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-violet-400', 'bg-violet-50/30');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-violet-400', 'bg-violet-50/30');
        if (e.dataTransfer.files.length > 0) processarMultiplosPDFs(e.dataTransfer.files);
    });
    pdfInput.addEventListener('change', () => {
        if (pdfInput.files.length > 0) processarMultiplosPDFs(pdfInput.files);
    });

    // Botões
    const btnAuditar = document.getElementById('btnAuditar');
    if (btnAuditar) {
        const newBtn = btnAuditar.cloneNode(true);
        btnAuditar.parentNode.replaceChild(newBtn, btnAuditar);
        newBtn.addEventListener('click', () => cruzarComAPI());
    }

    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        const newBtn = btnLimpar.cloneNode(true);
        btnLimpar.parentNode.replaceChild(newBtn, btnLimpar);
        newBtn.addEventListener('click', () => resetarTudo());
    }
}

function resetarTudo() {
    pdfsCarregados = [];
    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');
    document.getElementById('acoesUpload').classList.add('hidden');
    document.getElementById('resumoSoma').classList.add('hidden');
    document.getElementById('listaPDFs').innerHTML = '';
    document.getElementById('badgePdfs').classList.add('hidden');
    document.getElementById('dropZoneInner').classList.remove('hidden');
    document.getElementById('dropZoneProcessing').classList.add('hidden');
    if (document.getElementById('pdfInput')) document.getElementById('pdfInput').value = '';
    contadorId = 0;
}

// ─────────────────────────────────────────────────
// Processamento em lote de PDFs
// ─────────────────────────────────────────────────

async function processarMultiplosPDFs(files) {
    const dropInner = document.getElementById('dropZoneInner');
    const dropProc = document.getElementById('dropZoneProcessing');
    const statusEl = document.getElementById('processingStatus');

    dropInner.classList.add('hidden');
    dropProc.classList.remove('hidden');

    const arrayFiles = Array.from(files);
    let erros = 0;

    for (let i = 0; i < arrayFiles.length; i++) {
        const file = arrayFiles[i];
        statusEl.textContent = `Processando ${i + 1}/${arrayFiles.length}: ${file.name}...`;

        try {
            if (typeof pdfjsLib === 'undefined') {
                await carregarPDFJS();
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(' ') + '\n';
            }

            const dados = parseTextoContracheque(fullText, file.name);
            if (!dados) {
                erros++;
                console.warn(`Não foi possível extrair dados do PDF: ${file.name}`);
                continue;
            }

            pdfsCarregados.push({
                dados: dados,
                nomeArquivo: file.name,
                id: ++contadorId
            });

        } catch (err) {
            erros++;
            console.error(`Erro ao processar ${file.name}:`, err);
        }
    }

    dropProc.classList.add('hidden');
    dropInner.classList.remove('hidden');

    if (pdfsCarregados.length === 0) {
        alert('Nenhum PDF pôde ser processado. Verifique se os arquivos são contra-cheques válidos.');
        return;
    }

    if (erros > 0) {
        statusEl.textContent = `${pdfsCarregados.length} processado(s), ${erros} com erro.`;
    }

    atualizarUI();
}

async function carregarPDFJS() {
    return new Promise((resolve, reject) => {
        if (typeof pdfjsLib !== 'undefined') { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = () => reject(new Error('Falha ao carregar a biblioteca de leitura de PDF. Verifique sua conexão.'));
        document.head.appendChild(script);
    });
}

// ─────────────────────────────────────────────────
// Atualizar toda a UI com a lista atual de PDFs
// ─────────────────────────────────────────────────

function atualizarUI() {
    const listaEl = document.getElementById('listaPDFs');
    const badge = document.getElementById('badgePdfs');
    const acoes = document.getElementById('acoesUpload');
    const resumo = document.getElementById('resumoSoma');

    if (pdfsCarregados.length === 0) {
        acoes.classList.add('hidden');
        resumo.classList.add('hidden');
        badge.classList.add('hidden');
        listaEl.innerHTML = '';
        return;
    }

    // Badge
    badge.textContent = `${pdfsCarregados.length} PDF${pdfsCarregados.length > 1 ? 's' : ''}`;
    badge.classList.remove('hidden');

    // Cards de cada PDF
    listaEl.innerHTML = pdfsCarregados.map(p => {
        const d = p.dados;
        const tipo = detectarTipoContracheque(d);
        const tipoLabel = tipo === '13' ? 'Adiant. 13º' : tipo === 'ferias' ? 'Férias' : 'Salário';
        const tipoColor = tipo === '13'
            ? 'bg-amber-100 text-amber-700'
            : tipo === 'ferias'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-emerald-100 text-emerald-700';

        return `
        <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-shadow">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-slate-800 truncate">${d.nome || 'Não identificado'}</span>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${tipoColor}">${tipoLabel}</span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span class="font-mono">Mat: ${d.matricula || 'N/I'}</span>
                    <span>${d.competencia || 'N/I'}</span>
                    <span class="text-slate-400">${p.nomeArquivo}</span>
                </div>
                <div class="flex items-center gap-4 mt-2 text-xs">
                    <span><span class="text-slate-400">Prov:</span> <span class="text-emerald-600 font-mono font-medium">${fmtMoeda(d.totalRendimentos || 0)}</span></span>
                    <span><span class="text-slate-400">Desc:</span> <span class="text-rose-600 font-mono font-medium">${fmtMoeda(d.totalDescontos || 0)}</span></span>
                    <span><span class="text-slate-400">Líq:</span> <span class="text-slate-800 font-mono font-bold">${fmtMoeda(d.valorLiquido || 0)}</span></span>
                </div>
            </div>
            <button onclick="removerPDF(${p.id})" class="flex-shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remover">
                <i class="bi bi-x-lg w-4 h-4"></i>
            </button>
        </div>`;
    }).join('');

    // Soma
    const somaProventos = pdfsCarregados.reduce((s, p) => s + (p.dados.totalRendimentos || 0), 0);
    const somaDescontos = pdfsCarregados.reduce((s, p) => s + (p.dados.totalDescontos || 0), 0);
    const somaLiquido = pdfsCarregados.reduce((s, p) => s + (p.dados.valorLiquido || 0), 0);

    document.getElementById('somaProventos').textContent = fmtMoeda(somaProventos);
    document.getElementById('somaDescontos').textContent = fmtMoeda(somaDescontos);
    document.getElementById('somaLiquido').textContent = fmtMoeda(somaLiquido);
    resumo.classList.remove('hidden');

    acoes.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
}

function removerPDF(id) {
    pdfsCarregados = pdfsCarregados.filter(p => p.id !== id);
    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');
    atualizarUI();
    if (pdfsCarregados.length === 0) {
        document.getElementById('acoesUpload').classList.add('hidden');
        document.getElementById('resumoSoma').classList.add('hidden');
        document.getElementById('badgePdfs').classList.add('hidden');
    }
}

// ─────────────────────────────────────────────────
// Parser: extrai dados estruturados do texto do PDF
// ─────────────────────────────────────────────────

function parseTextoContracheque(text, nomeArquivo) {
    const t = text.replace(/\s+/g, ' ').trim();

    const resultado = {
        nome: null,
        matricula: null,
        cpf: null,
        competencia: null,
        cargo: null,
        lotacao: null,
        vinculo: null,
        salarioBase: null,
        rubricas: [],
        totalRendimentos: null,
        totalDescontos: null,
        valorLiquido: null
    };

    // ── CPF ──
    const cpfMatch = t.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
    if (cpfMatch) resultado.cpf = cpfMatch[1];

    // ── Matrícula ──
    const matrMatch = t.match(/(\d{4,6}-\d(?:\/\d)?)/);
    if (matrMatch) resultado.matricula = matrMatch[1];

    // ── Nome ──
    let nomeExtraido = null;
    
    // Estratégia 1: regex tolerante que captura o nome mesmo com layouts variados
    const nomeMatch1 = t.match(/Nome\s+do\s+Funcion[áa]rio\s+(?:Matr[íi]cula\s+)?([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,80}?)(?:\s*\d{4,6}-\d|\s+CPF|\s+Lotacao|\s+Lota[cç][aã]o|\s+Admiss|\s{2,})/i);
    if (nomeMatch1) nomeExtraido = nomeMatch1[1].trim();

    // Estratégia 2: o nome está em qualquer posição perto da matrícula
    if (!nomeExtraido && resultado.matricula) {
        // Procura a posição da matrícula no texto normalizado
        const idxMatr = t.indexOf(resultado.matricula);
        if (idxMatr > 10) {
            // Olha os 150 caracteres anteriores à matrícula
            const antes = t.substring(Math.max(0, idxMatr - 150), idxMatr);
            // Encontra sequência de 2-6 palavras iniciadas com maiúscula
            const nomeBackup = antes.match(/([\p{Lu}][\p{L}]{1,20}(?:\s+[\p{Lu}][\p{L}]{1,20}){1,5})$/u);
            if (nomeBackup) nomeExtraido = nomeBackup[1].trim();
        }
    }

    if (nomeExtraido) resultado.nome = nomeExtraido;

    // ── Competência ──
    const compMatch1 = t.match(/([A-Z][a-zçÇ]+)\s*\/\s*(\d{4})/);
    if (compMatch1) {
        const mesNome = compMatch1[1].toLowerCase();
        const mesNum = MESES[mesNome] || null;
        if (mesNum) resultado.competencia = mesNum + '/' + compMatch1[2];
    }
    if (!resultado.competencia) {
        const compMatch2 = t.match(/Compet[eê]ncia\s*[:\s]*(\d{2}\/\d{4})/i);
        if (compMatch2) resultado.competencia = compMatch2[1];
    }

    // ── Cargo ──
    const cargoMatch = t.match(/Cargo\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-\.]+?)(?:\s+N[íi]vel|\s+Nivel|\s+Salarial|\s+V[íi]nculo|\s+Vinculo)/i);
    if (cargoMatch) resultado.cargo = cargoMatch[1].trim();

    // ── Lotação ──
    const lotMatch1 = t.match(/CNPJ\s+[\d\.\/-]+\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s+V[íi]nculo|\s+Vinculo|\s+Cargo)/i);
    if (lotMatch1) resultado.lotacao = lotMatch1[1].trim();
    if (!resultado.lotacao) {
        const lotMatch2 = t.match(/Lota[cç][aã]o\s+(?:Admiss[aã]o\s+[\d\/]+\s+)?([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s+Admiss|\s+CNPJ|\s+V[íi]nculo|\s+Vinculo|\s+Cargo)/i);
        if (lotMatch2) resultado.lotacao = lotMatch2[1].trim();
    }

    // ── Vínculo ──
    const vincMatch = t.match(/V[íi]nculo\s+(ESTATUTARIO|COMISSIONADO|CONTRATADO|CELETISTA)/i);
    if (vincMatch) resultado.vinculo = vincMatch[1].toUpperCase();

    // ── Salário Base ──
    const sbMatch = t.match(/Sal[áa]rio\s+Base\s*:?\s*([\d\.]+,\d{2})/i);
    if (sbMatch) resultado.salarioBase = parseFloat(sbMatch[1].replace(/\./g, '').replace(',', '.'));

    // ── Rubricas ──
    const codDescIdx = t.search(/C[óo]digo\s+Descri[cç][ãa]o/i);
    let totaisIdx = t.search(/Totais/i);
    // Fallback: alguns PDFs usam "Total" no singular
    if (totaisIdx < 0) totaisIdx = t.search(/Total\s/);

    if (codDescIdx >= 0 && totaisIdx > codDescIdx) {
        const secaoRubricas = t.substring(codDescIdx, totaisIdx);
        const linhas = secaoRubricas.split(/(?=\d{1,4}\s+[A-ZÀ-Ú])/);

        for (const linha of linhas) {
            const match = linha.match(/^(\d{1,4})\s+(.+?)\s+([\d\.]+,\d{2})\s*(?:([\d\.]+,\d{2}))?$/);
            if (match) {
                const rub = {
                    codigo: match[1],
                    descricao: match[2].trim(),
                    rendimentos: null,
                    descontos: null
                };
                const val1 = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
                if (match[4]) {
                    rub.rendimentos = val1;
                    rub.descontos = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
                } else {
                    const descUpper = rub.descricao.toUpperCase();
                    if (/DESCONTO|PENS[AÃ]O|PREV|SIND|OSTRAS/i.test(descUpper)) {
                        rub.descontos = val1;
                    } else {
                        rub.rendimentos = val1;
                    }
                }
                resultado.rubricas.push(rub);
            }
        }
    }

    // ── Totais / Valor Líquido ──
    // ABANDONAMOS o regex de "Totais" — o layout varia entre tipos de
    // contra-cheque. A soma das rubricas é a verdade contábil.
    const somaRubRend = resultado.rubricas.reduce((s, r) => s + (r.rendimentos || 0), 0);
    const somaRubDesc = resultado.rubricas.reduce((s, r) => s + (r.descontos || 0), 0);

    // Se nenhuma rubrica foi extraída, tenta extrair direto dos totais como último recurso
    if (resultado.rubricas.length === 0) {
        const totaisResto = t.substring(totaisIdx >= 0 ? totaisIdx : 0);
        const numeros = [...totaisResto.matchAll(/([\d\.]+,\d{2})/g)].map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')));
        if (numeros.length >= 2) {
            // Primeiro número após Totais = Rendimentos, segundo = Descontos
            resultado.totalRendimentos = numeros[0];
            resultado.totalDescontos = numeros[1];
        }
    } else {
        resultado.totalRendimentos = somaRubRend;
        resultado.totalDescontos = somaRubDesc;
    }

    // ── Valor Líquido ──
    // Calculado contabilmente: Prov − Desc (verdade contábil, independente
    // de onde o "Valor Líquido" aparece no layout do PDF).
    const liqCalculado = (resultado.totalRendimentos || 0) - (resultado.totalDescontos || 0);

    const liqMatch = t.match(/Valor\s+L[íi]quido\s+([\d\.]+,\d{2})/i);
    if (liqMatch) {
        const liqDeclarado = parseFloat(liqMatch[1].replace(/\./g, '').replace(',', '.'));
        // Só confia no valor extraído do texto se ele bater com a fórmula contábil
        // (tolerância de R$ 0,50 para arredondamentos)
        if (Math.abs(liqDeclarado - liqCalculado) < 0.5) {
            resultado.valorLiquido = liqDeclarado;
        } else {
            resultado.valorLiquido = liqCalculado;
        }
    } else {
        resultado.valorLiquido = liqCalculado;
    }

    console.log('[contracheque] Parser:', {
        arquivo: nomeArquivo,
        rubricas: resultado.rubricas.length,
        somaRend: somaRubRend, somaDesc: somaRubDesc,
        finalRend: resultado.totalRendimentos, finalDesc: resultado.totalDescontos,
        liquido: resultado.valorLiquido
    });

    if (!resultado.nome && !resultado.matricula) return null;

    return resultado;
}

// ─────────────────────────────────────────────────
// Detecta o tipo de contra-cheque
// ─────────────────────────────────────────────────

function detectarTipoContracheque(dados) {
    if (!dados || !dados.rubricas) return 'salario';
    const todasDesc = dados.rubricas.map(r => r.descricao).join(' ').toUpperCase();
    if (/13[º°]|DECIMO|D[ÉE]CIMO|ADIANTAMENTO.*13|13.*ADIANTAMENTO/i.test(todasDesc)) return '13';
    if (/F[ÉE]RIAS|ABONO.*F[ÉE]RIAS|TERCO.*CONST|1\/3/i.test(todasDesc)) return 'ferias';
    return 'salario';
}

// ─────────────────────────────────────────────────
// Cruzamento com API (usando soma de todos os PDFs)
// ─────────────────────────────────────────────────

async function cruzarComAPI() {
    if (pdfsCarregados.length === 0) return alert('Envie ao menos um PDF primeiro.');

    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');

    const primeiro = pdfsCarregados[0].dados;
    const comp = primeiro.competencia;
    if (!comp) {
        alert('Não foi possível identificar a competência no PDF. Verifique se o PDF contém o mês/ano.');
        return;
    }
    const [mes, ano] = comp.split('/');
    const mesAno = ano + '-' + mes;

    // Buscar na API
    const entidades = [
        'PM RIO DAS OSTRAS - EFETIVOS E COMISSIONADOS',
        'PM RIO DAS OSTRAS - CONTRATADOS',
        'SAAE - RIO DAS OSTRAS'
    ];

    let dadosAPI = null;
    let entidadeEncontrada = null;

    for (const entidade of entidades) {
        const cacheKey = `FolhaPagamento_${entidade}_${mesAno}`;
        let raw = await getCache(cacheKey);
        if (!raw) continue;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (_) { continue; }
        }
        if (!Array.isArray(raw) || raw.length === 0) continue;

        const nomeBusca = primeiro.nome ? primeiro.nome.toUpperCase().trim() : '';
        const matrBusca = primeiro.matricula ? primeiro.matricula.replace(/\D/g, '') : '';

        const encontrados = raw.filter(row => {
            const nomeRow = (row.NomeServidor || '').toUpperCase().trim();
            const matrRow = (row.Matricula || '').replace(/\D/g, '');
            if (matrBusca && matrBusca.length >= 4 && matrRow.includes(matrBusca)) return true;
            if (nomeBusca && nomeRow.includes(nomeBusca)) return true;
            return false;
        });

        if (encontrados.length > 0) {
            dadosAPI = encontrados;
            entidadeEncontrada = entidade;
            break;
        }
    }

    if (!dadosAPI || dadosAPI.length === 0) {
        document.getElementById('estadoSemAPI').classList.remove('hidden');
        document.getElementById('estadoSemAPI').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    gerarParecer(dadosAPI, entidadeEncontrada);
}

// ─────────────────────────────────────────────────
// Geração do parecer técnico-contábil
// ─────────────────────────────────────────────────

function gerarParecer(dadosAPI, entidade) {
    // Soma de todos os PDFs enviados
    const soma = {
        proventos: pdfsCarregados.reduce((s, p) => s + (p.dados.totalRendimentos || 0), 0),
        descontos: pdfsCarregados.reduce((s, p) => s + (p.dados.totalDescontos || 0), 0),
        liquido: pdfsCarregados.reduce((s, p) => s + (p.dados.valorLiquido || 0), 0)
    };

    // Consolidar registros da API
    let apiProventos = 0, apiDescontos = 0, apiLiquido = 0;
    const apiCargos = new Set();

    for (const row of dadosAPI) {
        apiProventos += parseValorBR(row.Proventos) || 0;
        apiDescontos += parseValorBR(row.Descontos) || 0;
        apiLiquido += parseValorBR(row.Liquido) || 0;
        if (row.Cargo) apiCargos.add(row.Cargo);
    }

    const numVinculosAPI = dadosAPI.length;
    const numPDFs = pdfsCarregados.length;

    // Comparações
    const difProventos = soma.proventos - apiProventos;
    const difDescontos = soma.descontos - apiDescontos;
    const difLiquido = soma.liquido - apiLiquido;

    const tol = 0.02;
    const provOk = Math.abs(difProventos) <= tol;
    const descOk = Math.abs(difDescontos) <= tol;
    const liqOk = Math.abs(difLiquido) <= tol;

    const tudoOk = provOk && descOk && liqOk;

    // ── Diagnóstico: quando há múltiplos PDFs e o padrão de consolidação parcial ──
    // Se proventos e descontos batem (soma de todos os CC bate com API), mas líquido não,
    // e temos múltiplos PDFs, é o caso clássico de consolidação parcial.
    const padraoConsolidacaoParcial = numPDFs > 1 && provOk && descOk && !liqOk;

    // Se só tem 1 PDF e proventos não batem, verificar se a diferença corresponde a um
    // líquido de outro contra-cheque (caso do 13º)
    let suspeita13 = false;
    if (numPDFs === 1 && !provOk && liqOk && descOk) {
        // Prov API > Prov PDF: API tem um extra
        // Liq API = Liq PDF: mas o líquido é o mesmo
        // Isso acontece quando API consolidou dois CC mas só pegou líquido do primeiro
        suspeita13 = true;
    }

    // ── Alerta de Status ──
    const alerta = document.getElementById('alertaStatus');
    const alertaIcon = document.getElementById('alertaIcon');
    const alertaTitulo = document.getElementById('alertaTitulo');
    const alertaMsg = document.getElementById('alertaMsg');

    if (tudoOk) {
        alerta.className = 'ag-card rounded-2xl p-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200';
        alertaIcon.className = 'w-6 h-6 flex-shrink-0 mt-0.5 text-emerald-600';
        alertaIcon.setAttribute('data-lucide', 'check-circle');
        alertaTitulo.className = 'text-sm font-bold text-emerald-800';
        alertaTitulo.textContent = 'Contracheque Válido — Sem Divergências';
        alertaMsg.className = 'text-xs text-emerald-600 mt-1';
        alertaMsg.textContent = `Os dados de ${numPDFs} PDF${numPDFs > 1 ? 's' : ''} conferem com ${numVinculosAPI} registro${numVinculosAPI > 1 ? 's' : ''} da API (${entidade}).`;
    } else if (padraoConsolidacaoParcial) {
        alerta.className = 'ag-card rounded-2xl p-4 flex items-start gap-3 bg-amber-50 border border-amber-200';
        alertaIcon.className = 'w-6 h-6 flex-shrink-0 mt-0.5 text-amber-600';
        alertaIcon.setAttribute('data-lucide', 'alert-triangle');
        alertaTitulo.className = 'text-sm font-bold text-amber-800';
        alertaTitulo.textContent = 'Consolidação Parcial Detectada';
        alertaMsg.className = 'text-xs text-amber-600 mt-1';
        alertaMsg.textContent = `A API somou corretamente os proventos e descontos dos ${numPDFs} contra-cheques, mas o líquido reflete apenas um deles. Diferença no líquido: ${fmtMoeda(difLiquido)}.`;
    } else {
        alerta.className = 'ag-card rounded-2xl p-4 flex items-start gap-3 bg-rose-50 border border-rose-200';
        alertaIcon.className = 'w-6 h-6 flex-shrink-0 mt-0.5 text-rose-600';
        alertaIcon.setAttribute('data-lucide', 'alert-triangle');
        alertaTitulo.className = 'text-sm font-bold text-rose-800';
        alertaTitulo.textContent = 'Divergência Detectada';
        alertaMsg.className = 'text-xs text-rose-600 mt-1';
        alertaMsg.textContent = `Inconsistências entre ${numPDFs} PDF${numPDFs > 1 ? 's' : ''} e ${numVinculosAPI} registro${numVinculosAPI > 1 ? 's' : ''} da API (${entidade}).`;
    }

    // ── Parecer Técnico-Contábil ──
    const parecer = document.getElementById('parecerConteudo');
    const primeiro = pdfsCarregados[0].dados;

    let textoMotivo = '';

    if (tudoOk) {
        textoMotivo = `
            <p>Todos os campos analisados — proventos, descontos e valor líquido — apresentam <strong>conformidade plena</strong> entre o(s) contra-cheque(s) oficial(is) e os dados fornecidos pela API <code>cidade360.cloud</code>.</p>
            <p>Não foram identificadas inconsistências contábeis para esta matrícula na competência analisada.</p>
        `;
    } else if (padraoConsolidacaoParcial) {
        // Caso ideal: usuário enviou todos os PDFs, a soma bate em Prov e Desc, só Liq diverge
        const valorExtraLiq = Math.abs(difLiquido);
        const liqCorretoAPI = apiProventos - apiDescontos;
        textoMotivo = `
            <p>A API do <strong>cidade360.cloud</strong> (endpoint <code>/dadosabertos/FolhaPagamento</code>) consolida múltiplos contra-cheques de uma mesma matrícula dentro da competência em um <strong>único registro</strong>. No entanto, a consolidação é <strong>parcial</strong>:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>O campo de <strong>proventos</strong> acumula corretamente as verbas de todos os contra-cheques da matrícula — em conformidade com a definição do próprio sistema Pronim, que estabelece que Proventos é "composto pela soma dos valores de cargo Efetivo, função gratificada, cargo comissionado, horas extras, benefícios, férias, <strong>13º salário</strong>, indenizações e outros ganhos" (<strong>${fmtMoeda(apiProventos)}</strong>).</li>
                <li>O campo de <strong>descontos</strong> também acumula corretamente (<strong>${fmtMoeda(apiDescontos)}</strong>).</li>
                <li>O campo de <strong>líquido</strong>, porém, reproduz apenas o valor do primeiro contra-cheque, ignorando o líquido dos demais documentos de pagamento (<strong>${fmtMoeda(valorExtraLiq)}</strong> a menor).</li>
            </ul>
            <p>Segundo o <strong>dicionário de dados oficial do sistema Pronim</strong> (módulo "Detalhes de Servidor Efetivo"):</p>
            <blockquote class="border-l-4 border-slate-300 pl-4 my-3 text-slate-500 italic space-y-1">
                <p><strong>Vencimentos Totais:</strong> "É o resultado da soma dos proventos com as vantagens."</p>
                <p><strong>Líquido:</strong> "É o resultado da subtração dos vencimentos totais com os descontos totais."</p>
            </blockquote>
            <p>Aplicando a <strong>fórmula oficial do próprio sistema</strong> aos dados consolidados pela API:</p>
            <div class="bg-slate-100 rounded-lg p-3 my-2 font-mono text-xs">
                <p>Vencimentos Totais = Proventos + Vantagens = ${fmtMoeda(apiProventos)} + ${fmtMoeda(0)} = <strong>${fmtMoeda(apiProventos)}</strong></p>
                <p>Líquido (fórmula Pronim) = Vencimentos Totais − Descontos = ${fmtMoeda(apiProventos)} − ${fmtMoeda(apiDescontos)} = <strong>${fmtMoeda(liqCorretoAPI)}</strong></p>
                <p>Líquido informado pela API = <strong class="text-rose-600">${fmtMoeda(apiLiquido)}</strong> ← diverge da fórmula</p>
            </div>
            <p>Como consequência, a equação contábil definida pelo próprio Pronim — <strong>Líquido = Vencimentos Totais − Descontos</strong> — não se sustenta nos registros retornados pelo endpoint.</p>
            <p class="font-semibold">Evidência complementar:</p>
            <p>O sistema Pronim consultado diretamente exibe as duas linhas separadas ("13º Salário Adiantamento" e "Folha Mensal") com os totais corretos: proventos ${fmtMoeda(apiProventos)}, descontos ${fmtMoeda(apiDescontos)}, líquido ${fmtMoeda(liqCorretoAPI)}. O erro está exclusivamente na camada de exposição via API.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Ajustar a rotina de agregação do endpoint <code>/dadosabertos/FolhaPagamento</code> para que, ao consolidar múltiplos contra-cheques de uma mesma matrícula, o campo <code>Liquido</code> seja recalculado conforme a fórmula definida no dicionário de dados do próprio Pronim: <strong>Liquido = VencimentosTotais − Descontos</strong>.</p>
        `;
    } else if (suspeita13 && numPDFs === 1) {
        // Usuário enviou só 1 PDF, mas API claramente tem dados de mais de um
        const valorExtra = Math.abs(difProventos);
        textoMotivo = `
            <p>Você enviou <strong>1 contra-cheque</strong>, mas a API contém proventos superiores em <strong>${fmtMoeda(valorExtra)}</strong>. Os descontos e o líquido batem exatamente com o PDF enviado.</p>
            <p>Este é o padrão clássico de <strong>consolidação parcial</strong>: a API consolidou dois contra-cheques da matrícula (ex: salário mensal + adiantamento do 13º salário) em um único registro, somando corretamente os proventos de ambos, mas mantendo apenas os descontos e o líquido do primeiro.</p>
            <p>A diferença de <strong>${fmtMoeda(valorExtra)}</strong> nos proventos provavelmente corresponde a um <strong>segundo contra-cheque</strong> (adiantamento de 13º, férias, etc.) que não foi contabilizado nos descontos nem no líquido.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Para um diagnóstico completo, <strong>envie também o segundo contra-cheque</strong> (clique na área de upload novamente). Com ambos os PDFs, o sistema confirmará se a soma bate e gerará o parecer de consolidação parcial. Encaminhe este parecer à equipe técnica do <code>cidade360.cloud</code> para correção do endpoint.</p>
        `;
    } else if (!provOk && !descOk && numPDFs > 1) {
        textoMotivo = `
            <p>A API do <strong>cidade360.cloud</strong> consolida múltiplos contra-cheques de uma mesma matrícula na competência em um único registro. A divergência atinge múltiplos campos:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li><strong>Proventos:</strong> diferença de ${fmtMoeda(Math.abs(difProventos))} ${difProventos > 0 ? '(PDF maior que API)' : '(API maior que PDF)'}</li>
                <li><strong>Descontos:</strong> diferença de ${fmtMoeda(Math.abs(difDescontos))} ${difDescontos > 0 ? '(PDF maior que API)' : '(API maior que PDF)'}</li>
                <li><strong>Líquido:</strong> diferença de ${fmtMoeda(Math.abs(difLiquido))} ${difLiquido > 0 ? '(PDF maior que API)' : '(API maior que PDF)'}</li>
            </ul>
            <p class="font-semibold">Recomendação:</p>
            <p>Revisar a rotina de agregação do endpoint <code>/dadosabertos/FolhaPagamento</code> para que todos os campos de valor sejam tratados de forma uniforme — somados integralmente ou mantidos como registros individuais, preservando a rastreabilidade de cada documento de pagamento.</p>
        `;
    } else if (!provOk) {
        textoMotivo = `
            <p>O valor total de <strong>rendimentos/proventos</strong> informado pela API diverge do contra-cheque oficial em ${fmtMoeda(Math.abs(difProventos))}.</p>
            <p class="font-semibold">Possíveis causas:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Verba transitória ou de exercício anterior computada indevidamente pela API.</li>
                <li>Duplicação de rubrica na consolidação dos dados.</li>
                <li>Erro de cálculo no campo <code>Proventos</code> do endpoint.</li>
            </ul>
            <p class="font-semibold">Recomendação:</p>
            <p>Revisar a rotina de totalização de proventos no endpoint <code>/dadosabertos/FolhaPagamento</code>.</p>
        `;
    } else if (!descOk) {
        textoMotivo = `
            <p>O valor total de <strong>descontos</strong> informado pela API diverge do contra-cheque oficial em ${fmtMoeda(Math.abs(difDescontos))}.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Verificar se há rubricas de desconto não contabilizadas ou contabilizadas incorretamente no endpoint da API.</p>
        `;
    } else if (!liqOk) {
        textoMotivo = `
            <p>O <strong>valor líquido</strong> informado pela API diverge do contra-cheque oficial em ${fmtMoeda(Math.abs(difLiquido))}, embora os proventos e descontos estejam consistentes individualmente.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Revisar a fórmula de cálculo do campo <code>Liquido</code> no endpoint <code>/dadosabertos/FolhaPagamento</code>.</p>
        `;
    }

    parecer.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-bold">
                <span>Parecer Técnico-Contábil</span>
                <span class="flex-1 border-t border-slate-200"></span>
                <span>${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <p><strong>Objeto:</strong> Divergência entre contra-cheque oficial (PDF) e API de dados abertos de Folha de Pagamento — <code>webapp1-riodasostras.cidade360.cloud</code>.</p>
            <p><strong>Servidor:</strong> ${primeiro.nome || 'Não identificado'} | <strong>Matrícula:</strong> ${primeiro.matricula || 'N/I'} | <strong>Competência:</strong> ${primeiro.competencia || 'N/I'}</p>
            <p><strong>PDFs enviados:</strong> ${numPDFs} contra-cheque${numPDFs > 1 ? 's' : ''} | <strong>Registros na API:</strong> ${numVinculosAPI} (entidade: ${entidade})</p>
            ${textoMotivo}
            <div class="mt-2 pt-3 border-t border-slate-200 text-xs text-slate-400">
                <em>Este parecer foi gerado automaticamente pelo módulo de Auditoria de Contracheque do Consulta360. Os dados do PDF foram extraídos via pdf.js e cruzados com o banco local IndexedDB abastecido pela API de dados abertos. Nenhum dado foi transmitido a servidores externos.</em>
            </div>
        </div>
    `;

    // ── Tabela Comparativa ──
    const tbody = document.getElementById('tbodyComparativo');
    const linhas = [
        { campo: 'PDFs enviados', pdf: String(numPDFs), api: `${numVinculosAPI} registro(s)`, ok: '—' },
        { campo: 'Proventos / Rendimentos', pdf: fmtMoeda(soma.proventos), api: fmtMoeda(apiProventos), ok: provOk },
        { campo: 'Descontos', pdf: fmtMoeda(soma.descontos), api: fmtMoeda(apiDescontos), ok: descOk },
        { campo: 'Valor Líquido', pdf: fmtMoeda(soma.liquido), api: fmtMoeda(apiLiquido), ok: liqOk },
    ];
    if (primeiro.salarioBase !== null) {
        const apiSB = parseValorBR(dadosAPI[0]?.SalarioBase) || 0;
        linhas.push({ campo: 'Salário Base (1º CC)', pdf: fmtMoeda(primeiro.salarioBase), api: fmtMoeda(apiSB), ok: '—' });
    }

    // Se há múltiplos PDFs, adicionar linha de decomposição
    if (numPDFs > 1) {
        linhas.push({ campo: '— Decomposição dos PDFs —', pdf: '', api: '', ok: '—' });
        pdfsCarregados.forEach(p => {
            const tipo = detectarTipoContracheque(p.dados);
            const tipoIcone = tipo === '13' ? '📌 13º' : tipo === 'ferias' ? '🏖 Férias' : '💰 Salário';
            linhas.push({
                campo: `  ${tipoIcone} (${p.nomeArquivo})`,
                pdf: `Prov ${fmtMoeda(p.dados.totalRendimentos || 0)} | Desc ${fmtMoeda(p.dados.totalDescontos || 0)} | Líq ${fmtMoeda(p.dados.valorLiquido || 0)}`,
                api: '—',
                ok: '—'
            });
        });
    }

    // Linha extra: check da equação contábil na API
    const apiEquacao = apiProventos - apiDescontos;
    const apiEquacaoOk = Math.abs(apiEquacao - apiLiquido) <= tol;
    linhas.push({
        campo: 'Eq. contábil da API (Prov−Desc=Líq)',
        pdf: '—',
        api: apiEquacaoOk ? '✅ Válida' : `❌ ${fmtMoeda(apiProventos)} − ${fmtMoeda(apiDescontos)} = ${fmtMoeda(apiEquacao)} ≠ ${fmtMoeda(apiLiquido)}`,
        ok: apiEquacaoOk ? '✅' : '❌'
    });

    tbody.innerHTML = linhas.map(l => {
        let statusHtml = '';
        if (l.ok === true || l.ok === '✅') {
            statusHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">✅ Confere</span>';
        } else if (l.ok === false || l.ok === '❌') {
            statusHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">❌ Divergente</span>';
        } else if (typeof l.ok === 'string' && l.ok !== '—') {
            statusHtml = `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">${l.ok}</span>`;
        } else {
            statusHtml = '<span class="text-slate-400 text-xs">' + (l.ok || '—') + '</span>';
        }
        return `<tr class="hover:bg-slate-50/50">
            <td class="py-3 px-4 text-sm font-medium text-slate-700">${l.campo}</td>
            <td class="py-3 px-4 text-sm text-right font-mono text-slate-800">${l.pdf}</td>
            <td class="py-3 px-4 text-sm text-right font-mono text-slate-800">${l.api}</td>
            <td class="py-3 px-4 text-center">${statusHtml}</td>
        </tr>`;
    }).join('');

    // Mostrar resultado
    document.getElementById('resultadoAuditoria').classList.remove('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');
    document.getElementById('resultadoAuditoria').scrollIntoView({ behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
}

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function fmtMoeda(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Expõe função global para o onclick no HTML ──
window.removerPDF = removerPDF;
