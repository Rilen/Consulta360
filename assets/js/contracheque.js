// contracheque.js — Auditoria de Contracheque via PDF
// Extrai dados do PDF, cruza com IndexedDB e gera parecer técnico-contábil.

// ── Referência globais ──
let pdfDadosExtraidos = null;  // objeto com os dados parseados do PDF

const MESES = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03',
    'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
    'agosto': '08', 'setembro': '09', 'outubro': '10',
    'novembro': '11', 'dezembro': '12'
};

// ─────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'contracheque') initContrachequeModule();
});
if (window.location.hash === '#contracheque' || window.location.hash.includes('contracheque')) {
    setTimeout(initContrachequeModule, 100);
}

function initContrachequeModule() {
    if (window.lucide) lucide.createIcons();
    pdfDadosExtraidos = null;

    // Esconder seções de resultado
    document.getElementById('dadosExtraidos').classList.add('hidden');
    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');

    // Drop zone
    const dropZone = document.getElementById('dropZone');
    const pdfInput = document.getElementById('pdfInput');
    const dropInner = document.getElementById('dropZoneInner');
    const dropProc = document.getElementById('dropZoneProcessing');

    if (!dropZone || dropZone.dataset.bound === 'true') return;
    dropZone.dataset.bound = 'true';

    dropZone.addEventListener('click', () => pdfInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-50/30');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-50/30');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-50/30');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') processarPDF(file);
    });
    pdfInput.addEventListener('change', () => {
        const file = pdfInput.files[0];
        if (file) processarPDF(file);
    });

    // Botão Auditar
    const btnAuditar = document.getElementById('btnAuditar');
    if (btnAuditar) {
        const newBtn = btnAuditar.cloneNode(true);
        btnAuditar.parentNode.replaceChild(newBtn, btnAuditar);
        newBtn.addEventListener('click', () => cruzarComAPI());
    }

    // Botão Limpar
    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        const newBtn = btnLimpar.cloneNode(true);
        btnLimpar.parentNode.replaceChild(newBtn, btnLimpar);
        newBtn.addEventListener('click', () => {
            pdfDadosExtraidos = null;
            document.getElementById('dadosExtraidos').classList.add('hidden');
            document.getElementById('resultadoAuditoria').classList.add('hidden');
            document.getElementById('estadoSemAPI').classList.add('hidden');
            dropInner.classList.remove('hidden');
            dropProc.classList.add('hidden');
            pdfInput.value = '';
        });
    }
}

// ─────────────────────────────────────────────────
// Processamento do PDF
// ─────────────────────────────────────────────────

async function processarPDF(file) {
    const dropInner = document.getElementById('dropZoneInner');
    const dropProc = document.getElementById('dropZoneProcessing');
    const statusEl = document.getElementById('processingStatus');

    dropInner.classList.add('hidden');
    dropProc.classList.remove('hidden');
    document.getElementById('dadosExtraidos').classList.add('hidden');
    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');

    try {
        // Carregar pdf.js se ainda não estiver disponível
        if (typeof pdfjsLib === 'undefined') {
            await carregarPDFJS();
        }

        statusEl.textContent = 'Lendo arquivo...';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        statusEl.textContent = `PDF carregado (${pdf.numPages} páginas). Extraindo texto...`;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        statusEl.textContent = 'Texto extraído. Parseando dados...';
        pdfDadosExtraidos = parseTextoContracheque(fullText);

        if (!pdfDadosExtraidos) {
            throw new Error('Não foi possível identificar os dados do contra-cheque no PDF enviado.');
        }

        preencherDadosExtraidos(pdfDadosExtraidos);
        dropProc.classList.add('hidden');
        dropInner.classList.remove('hidden');
        document.getElementById('dadosExtraidos').classList.remove('hidden');
        document.getElementById('dadosExtraidos').scrollIntoView({ behavior: 'smooth' });
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error(err);
        dropProc.classList.add('hidden');
        dropInner.classList.remove('hidden');
        alert('Erro ao processar o PDF: ' + err.message);
    }
}

async function carregarPDFJS() {
    return new Promise((resolve, reject) => {
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
// Parser: extrai dados estruturados do texto do PDF
// ─────────────────────────────────────────────────

function parseTextoContracheque(text) {
    // Normalizar: remover quebras múltiplas, normalizar espaços
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

    // ── Nome ──
    // Procura após "Nome do Funcionário" até a próxima palavra-chave
    const nomeMatch = t.match(/Nome\s+do\s+Funcion[áa]rio\s+Matr[íi]cula\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+?)(?:\s+Matr[íi]cula|\s+CPF|\s+Lotacao|\s+Lot[açã]ção|\s+Admiss)/i);
    if (nomeMatch) {
        resultado.nome = nomeMatch[1].trim();
    }

    // ── CPF ──
    const cpfMatch = t.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
    if (cpfMatch) resultado.cpf = cpfMatch[1];

    // ── Matrícula ──
    // Formato comum: "XXXXX-X/X" ou "XXXXXX-X"
    const matrMatch = t.match(/(\d{4,6}-\d(?:\/\d)?)/);
    if (matrMatch) resultado.matricula = matrMatch[1];

    // ── Competência ──
    // "Junho / 2026" ou "06/2026"
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
    if (cargoMatch) {
        resultado.cargo = cargoMatch[1].trim();
    }

    // ── Lotação ──
    const lotMatch1 = t.match(/CNPJ\s+[\d\.\/-]+\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s+V[íi]nculo|\s+Vinculo|\s+Cargo)/i);
    if (lotMatch1) {
        resultado.lotacao = lotMatch1[1].trim();
    }
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
    // Encontra a seção entre "Código Descrição" e "Totais"
    const codDescIdx = t.search(/C[óo]digo\s+Descri[cç][ãa]o/i);
    const totaisIdx = t.search(/Totais/i);
    
    if (codDescIdx >= 0 && totaisIdx > codDescIdx) {
        const secaoRubricas = t.substring(codDescIdx, totaisIdx);

        // Cada rubrica: código numérico + texto + valores
        // Padrão: número (código) seguido de descrição (texto) seguido de valores numéricos
        const linhas = secaoRubricas.split(/(?=\d{1,4}\s+[A-ZÀ-Ú])/);

        for (const linha of linhas) {
            // Tenta extrair: código, descrição, rendimento, desconto
            // Formato: "2 Vencimento Basico 30 Dias 2.811,38"
            // ou: "450 Pensão Liquído 1-Folha 30 1.176,15"
            const match = linha.match(/^(\d{1,4})\s+(.+?)\s+([\d\.]+,\d{2})\s*(?:([\d\.]+,\d{2}))?$/);
            if (match) {
                const rub = {
                    codigo: match[1],
                    descricao: match[2].trim(),
                    rendimentos: null,
                    descontos: null
                };
                // O terceiro valor pode ser rendimento ou desconto dependendo da posição
                const val1 = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
                if (match[4]) {
                    const val2 = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
                    rub.rendimentos = val1;
                    rub.descontos = val2;
                } else {
                    // Descobrir se é rendimento ou desconto pelo contexto
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
    const liqMatch = t.match(/Valor\s+L[íi]quido\s+([\d\.]+,\d{2})/i);
    if (liqMatch) resultado.valorLiquido = parseFloat(liqMatch[1].replace(/\./g, '').replace(',', '.'));

    // Tenta extrair totais de Rendimentos e Descontos (linha após "Totais")
    const totaisResto = t.substring(totaisIdx >= 0 ? totaisIdx : 0);
    const totaisMatch = totaisResto.match(/Totais\s+.*?([\d\.]+,\d{2})\s+([\d\.]+,\d{2})/);
    if (totaisMatch) {
        resultado.totalRendimentos = parseFloat(totaisMatch[1].replace(/\./g, '').replace(',', '.'));
        resultado.totalDescontos = parseFloat(totaisMatch[2].replace(/\./g, '').replace(',', '.'));
    }

    // Fallback: calcular totais das rubricas
    if (resultado.totalRendimentos === null) {
        resultado.totalRendimentos = resultado.rubricas.reduce((s, r) => s + (r.rendimentos || 0), 0);
    }
    if (resultado.totalDescontos === null) {
        resultado.totalDescontos = resultado.rubricas.reduce((s, r) => s + (r.descontos || 0), 0);
    }

    // ── Validação mínima ──
    if (!resultado.nome && !resultado.matricula) return null;
    
    return resultado;
}

// ─────────────────────────────────────────────────
// Preencher UI com dados extraídos
// ─────────────────────────────────────────────────

function preencherDadosExtraidos(d) {
    document.getElementById('ext-nome').textContent = d.nome || 'Não identificado';
    document.getElementById('ext-matricula').textContent = d.matricula || 'Não identificada';
    document.getElementById('ext-competencia').textContent = d.competencia || 'Não identificada';
    document.getElementById('ext-cargo').textContent = d.cargo || 'Não identificado';
    document.getElementById('ext-lotacao').textContent = d.lotacao || 'Não identificada';

    // Rubricas
    const tbody = document.getElementById('ext-rubricas');
    if (d.rubricas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-3 text-center text-slate-400 text-sm">Nenhuma rubrica identificada</td></tr>';
    } else {
        tbody.innerHTML = d.rubricas.map(r => `
            <tr class="hover:bg-slate-50/50">
                <td class="py-2 px-3 font-mono text-xs text-slate-500">${r.codigo}</td>
                <td class="py-2 px-3 text-xs text-slate-700">${r.descricao}</td>
                <td class="py-2 px-3 text-xs text-right ${(r.rendimentos || 0) > 0 ? 'text-emerald-600 font-medium' : 'text-slate-300'}">${(r.rendimentos || 0) > 0 ? fmtMoeda(r.rendimentos) : '—'}</td>
                <td class="py-2 px-3 text-xs text-right ${(r.descontos || 0) > 0 ? 'text-rose-600 font-medium' : 'text-slate-300'}">${(r.descontos || 0) > 0 ? fmtMoeda(r.descontos) : '—'}</td>
            </tr>
        `).join('');
    }

    // Totais
    const totais = document.getElementById('ext-totais');
    totais.innerHTML = `
        <tr>
            <td colspan="2" class="py-2 px-3 text-xs uppercase text-slate-500">Totais</td>
            <td class="py-2 px-3 text-xs text-right font-bold text-emerald-700">${fmtMoeda(d.totalRendimentos || 0)}</td>
            <td class="py-2 px-3 text-xs text-right font-bold text-rose-700">${fmtMoeda(d.totalDescontos || 0)}</td>
        </tr>
        <tr>
            <td colspan="3" class="py-2 px-3 text-xs uppercase text-slate-500">Valor Líquido</td>
            <td class="py-2 px-3 text-xs text-right font-black text-slate-800 text-base">${fmtMoeda(d.valorLiquido || 0)}</td>
        </tr>
    `;
}

// ─────────────────────────────────────────────────
// Cruzamento com API (IndexedDB)
// ─────────────────────────────────────────────────

async function cruzarComAPI() {
    if (!pdfDadosExtraidos) return alert('Envie um PDF primeiro.');

    const d = pdfDadosExtraidos;

    // Mostrar loading
    document.getElementById('resultadoAuditoria').classList.add('hidden');
    document.getElementById('estadoSemAPI').classList.add('hidden');
    document.getElementById('dadosExtraidos').scrollIntoView({ behavior: 'smooth' });

    try {
        // Determinar a competência para buscar no banco
        const comp = d.competencia; // ex: "06/2026"
        if (!comp) {
            alert('Não foi possível identificar a competência no PDF. Verifique se o PDF contém o mês/ano.');
            return;
        }
        const [mes, ano] = comp.split('/');
        const mesAno = ano + '-' + mes; // "2026-06"

        // Procurar em todas as entidades
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

            // Buscar por nome (case-insensitive) e/ou matrícula
            const nomeBusca = d.nome ? d.nome.toUpperCase().trim() : '';
            const matrBusca = d.matricula ? d.matricula.replace(/\D/g, '') : '';

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

        // Gerar parecer
        gerarParecer(d, dadosAPI, entidadeEncontrada);

    } catch (err) {
        console.error(err);
        alert('Erro ao cruzar dados: ' + err.message);
    }
}

// ─────────────────────────────────────────────────
// Geração do parecer técnico-contábil
// ─────────────────────────────────────────────────

function gerarParecer(d, dadosAPI, entidade) {
    // Consolidar registros da API (pode ter múltiplos vínculos)
    let apiProventos = 0, apiDescontos = 0, apiLiquido = 0;
    const apiCargos = new Set();

    for (const row of dadosAPI) {
        const prov = parseFloat(row.Proventos) || parseFloat(String(row.Proventos || '').replace(',', '.')) || 0;
        const desc = parseFloat(row.Descontos) || parseFloat(String(row.Descontos || '').replace(',', '.')) || 0;
        const liq = parseFloat(row.Liquido) || parseFloat(String(row.Liquido || '').replace(',', '.')) || 0;
        apiProventos += prov;
        apiDescontos += desc;
        apiLiquido += liq;
        if (row.Cargo) apiCargos.add(row.Cargo);
    }

    const numVinculos = dadosAPI.length;

    // Comparações
    const difProventos = (d.totalRendimentos || 0) - apiProventos;
    const difDescontos = (d.totalDescontos || 0) - apiDescontos;
    const difLiquido = (d.valorLiquido || 0) - apiLiquido;

    const tol = 0.02; // tolerância de 2 centavos
    const provOk = Math.abs(difProventos) <= tol;
    const descOk = Math.abs(difDescontos) <= tol;
    const liqOk = Math.abs(difLiquido) <= tol;

    const tudoOk = provOk && descOk && liqOk;

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
        alertaMsg.textContent = `Os dados do PDF conferem com os registros da API (${numVinculos} vínculo${numVinculos > 1 ? 's' : ''} encontrado${numVinculos > 1 ? 's' : ''} em ${entidade}).`;
    } else {
        alerta.className = 'ag-card rounded-2xl p-4 flex items-start gap-3 bg-rose-50 border border-rose-200';
        alertaIcon.className = 'w-6 h-6 flex-shrink-0 mt-0.5 text-rose-600';
        alertaIcon.setAttribute('data-lucide', 'alert-triangle');
        alertaTitulo.className = 'text-sm font-bold text-rose-800';
        alertaTitulo.textContent = 'Divergência Detectada';
        alertaMsg.className = 'text-xs text-rose-600 mt-1';
        alertaMsg.textContent = `Foram encontradas inconsistências entre o contra-cheque e os dados da API. ${numVinculos} vínculo${numVinculos > 1 ? 's' : ''} localizado${numVinculos > 1 ? 's' : ''} em ${entidade}.`;
    }

    // ── Parecer Técnico-Contábil ──
    const parecer = document.getElementById('parecerConteudo');

    let textoMotivo = '';
    if (!provOk && !liqOk && numVinculos > 1) {
        textoMotivo = `
            <p>A API do <strong>cidade360.cloud</strong> consolida múltiplos contra-cheques de uma mesma matrícula dentro da competência em um único registro. No entanto, a consolidação é <strong>parcial</strong>:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>O campo de <strong>proventos</strong> acumula corretamente as verbas de todos os contra-cheques da matrícula.</li>
                <li>Os campos de <strong>descontos</strong> e <strong>líquido</strong> reproduzem apenas os valores do primeiro contra-cheque, ignorando os demais documentos de pagamento.</li>
            </ul>
            <p>Como consequência, a equação contábil básica <strong>Proventos − Descontos = Líquido</strong> não se sustenta nos registros da API quando há múltiplos contra-cheques para a mesma matrícula no mesmo mês.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Ajustar a rotina de agregação do endpoint <code>/dadosabertos/FolhaPagamento</code> para que todos os campos de valor sejam tratados de forma uniforme — somados integralmente ou mantidos como registros individuais, preservando a rastreabilidade de cada documento de pagamento.</p>
        `;
    } else if (!provOk) {
        textoMotivo = `
            <p>O valor total de <strong>rendimentos/proventos</strong> informado pela API diverge do contra-cheque oficial.</p>
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
            <p>O valor total de <strong>descontos</strong> informado pela API diverge do contra-cheque oficial.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Verificar se há rubricas de desconto não contabilizadas ou contabilizadas incorretamente no endpoint da API.</p>
        `;
    } else if (!liqOk) {
        textoMotivo = `
            <p>O <strong>valor líquido</strong> informado pela API diverge do contra-cheque oficial, embora os proventos e descontos estejam consistentes individualmente. Isso sugere um erro de arredondamento ou cálculo final no endpoint.</p>
            <p class="font-semibold">Recomendação:</p>
            <p>Revisar a fórmula de cálculo do campo <code>Liquido</code> no endpoint <code>/dadosabertos/FolhaPagamento</code>.</p>
        `;
    } else {
        textoMotivo = `
            <p>Todos os campos analisados — proventos, descontos e valor líquido — apresentam <strong>conformidade plena</strong> entre o contra-cheque oficial e os dados fornecidos pela API <code>cidade360.cloud</code>.</p>
            <p>Não foram identificadas inconsistências contábeis para esta matrícula na competência analisada.</p>
        `;
    }

    parecer.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-bold">
                <span>Parecer</span>
                <span class="flex-1 border-t border-slate-200"></span>
                <span>${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <p><strong>Objeto:</strong> Divergência entre contra-cheque oficial (PDF) e API de dados abertos de Folha de Pagamento — <code>webapp1-riodasostras.cidade360.cloud</code>.</p>
            <p><strong>Servidor:</strong> ${d.nome || 'Não identificado'} | <strong>Matrícula:</strong> ${d.matricula || 'N/I'} | <strong>Competência:</strong> ${d.competencia || 'N/I'}</p>
            <p><strong>Entidade na API:</strong> ${entidade} (${numVinculos} registro${numVinculos > 1 ? 's' : ''})</p>
            ${textoMotivo}
            <div class="mt-2 pt-3 border-t border-slate-200 text-xs text-slate-400">
                <em>Este parecer foi gerado automaticamente pelo módulo de Auditoria de Contracheque do Consulta360. Os dados do PDF foram extraídos por OCR textual (pdf.js) e cruzados com o banco local IndexedDB abastecido pela API de dados abertos.</em>
            </div>
        </div>
    `;

    // ── Tabela Comparativa ──
    const tbody = document.getElementById('tbodyComparativo');
    const linhas = [
        { campo: 'Registros (vínculos)', pdf: '1', api: String(numVinculos), ok: numVinculos === 1 ? '⚠️' : '⚠️ múltiplos' },
        { campo: 'Proventos / Rendimentos', pdf: fmtMoeda(d.totalRendimentos || 0), api: fmtMoeda(apiProventos), ok: provOk },
        { campo: 'Descontos', pdf: fmtMoeda(d.totalDescontos || 0), api: fmtMoeda(apiDescontos), ok: descOk },
        { campo: 'Valor Líquido', pdf: fmtMoeda(d.valorLiquido || 0), api: fmtMoeda(apiLiquido), ok: liqOk },
    ];
    if (d.salarioBase !== null) {
        const apiSB = parseFloat(dadosAPI[0]?.SalarioBase) || parseFloat(String(dadosAPI[0]?.SalarioBase || '').replace(',', '.')) || 0;
        linhas.push({ campo: 'Salário Base', pdf: fmtMoeda(d.salarioBase), api: fmtMoeda(apiSB), ok: '—' });
    }

    tbody.innerHTML = linhas.map(l => {
        let statusHtml = '';
        if (l.ok === true || l.ok === '✅') {
            statusHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">✅ Confere</span>';
        } else if (l.ok === false || l.ok === '❌') {
            statusHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">❌ Divergente</span>';
        } else if (typeof l.ok === 'string') {
            statusHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">' + l.ok + '</span>';
        } else {
            statusHtml = '<span class="text-slate-400 text-xs">—</span>';
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
