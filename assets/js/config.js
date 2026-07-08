// config.js — Sincronização On‑Demand
// O usuário seleciona mês/entidade → clica Sincronizar → os dados são
// buscados da API (via proxy CORS Cloudflare Worker), página por página,
// e salvos no IndexedDB. As consultas batem sempre no cache local.

document.addEventListener('routeChanged', (e) => {
    if (e.detail.route === 'config') initConfigModule();
});
if (window.location.hash === '#config' || window.location.hash.includes('config')) {
    setTimeout(initConfigModule, 100);
}

// ── Proxy CORS ──────────────────────────────────
// Preencha com a URL do seu Worker após fazer deploy: npx wrangler deploy (pasta worker/)
// Deixe vazio para cair no mock local enquanto não tiver proxy.
const CORS_PROXY = 'https://consulta360-proxy.rilen-lima.workers.dev';

// Função para retornar a URL base da API dependendo da entidade (Prefeitura vs OstrasPrev)
function getApiUrlForEntidade(entidade) {
    if (!entidade) return 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos';
    if (entidade.toUpperCase().includes('OSTRASPREV')) {
        return 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos_ostrasprev';
    }
    return 'https://webapp1-riodasostras.cidade360.cloud/dadosabertos';
}

function wrapUrl(apiUrl) {
    // Se não tem proxy, retorna a URL direta (vai falhar CORS → cai no mock)
    if (!CORS_PROXY) return apiUrl;
    return CORS_PROXY + '/?url=' + encodeURIComponent(apiUrl);
}

// ─────────────────────────────────────────────────

function initConfigModule() {
    atualizarLabelsMetadados();

    // ── Folha de Pagamento ──
    bindSyncButton('btnSyncFolha', async () => {
        const mesAno = document.getElementById('syncMesFolha').value;
        const entidade = document.getElementById('syncBaseFolha').value;
        if (!mesAno) return alert('Selecione o mês.');
        const datas = mesAnoParaDatas(mesAno);
        const API_URL = getApiUrlForEntidade(entidade);
        const baseUrl = `${API_URL}/FolhaPagamento?dataInicial=${encodeURIComponent(datas.dataInicial)}&dataFinal=${encodeURIComponent(datas.dataFinal)}&nomeBase=${encodeURIComponent(entidade)}`;
        const cacheKey = `FolhaPagamento_${entidade}_${mesAno}`;
        const metaKey = `meta_folha_${entidade}_${mesAno}`;
        await motorSincronizacao(baseUrl, cacheKey, metaKey, 'Folha', 50);
    });

    // ── Relação de Servidores ──
    bindSyncButton('btnSyncServidor', async () => {
        const mesAno = document.getElementById('syncMesServidor').value;
        const entidade = document.getElementById('syncBaseServidor').value;
        if (!mesAno) return alert('Selecione o mês.');
        const datas = mesAnoParaDatas(mesAno);
        const API_URL = getApiUrlForEntidade(entidade);
        const baseUrl = `${API_URL}/Servidor?dataInicial=${encodeURIComponent(datas.dataInicial)}&dataFinal=${encodeURIComponent(datas.dataFinal)}&nomeBase=${encodeURIComponent(entidade)}`;
        const cacheKey = `Servidor_${entidade}_${mesAno}`;
        const metaKey = `meta_servidor_${entidade}_${mesAno}`;
        await motorSincronizacao(baseUrl, cacheKey, metaKey, 'Servidor', 30);
    });

    // ── Receitas ──
    bindSyncButton('btnSyncReceitas', async () => {
        const ano = document.getElementById('syncAnoReceitas').value;
        const entidade = document.getElementById('syncBaseReceitas').value;
        if (!ano) return alert('Selecione o ano.');
        const API_URL = getApiUrlForEntidade(entidade);
        const baseUrl = `${API_URL}/Receitas/buscarDadosReceitas/${ano}`;
        const cacheKey = `receitas_${ano}_${entidade}`;
        const metaKey = `meta_receitas_${ano}_${entidade}`;
        await motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, 'Receitas', 20);
    });

    // ── Despesas ──
    bindSyncButton('btnSyncDespesas', async () => {
        const ano = document.getElementById('syncAnoDespesas').value;
        const entidade = document.getElementById('syncBaseDespesas').value;
        if (!ano) return alert('Selecione o ano.');
        const API_URL = getApiUrlForEntidade(entidade);
        const baseUrl = `${API_URL}/Despesas/buscarDadosDespesas/${ano}`;
        const cacheKey = `despesas_${ano}_${entidade}`;
        const metaKey = `meta_despesas_${ano}_${entidade}`;
        await motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, 'Despesas', 20);
    });

    // ── Limpar Cache ──
    bindSyncButton('btnLimparTudo', async () => {
        if (!confirm('Apagar todos os dados locais?')) return;
        try {
            await clearAllCache(); // encapsulado em db.js
            alert('Cache limpo.');
            atualizarLabelsMetadados();
        } catch (e) { alert('Erro: ' + e.message); }
    });
}

function bindSyncButton(id, handler) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', handler);
}

// ─────────────────────────────────────────────────
// Motores de sincronização (paginação)
// ─────────────────────────────────────────────────

async function motorSincronizacao(baseUrl, cacheKey, metaKey, uiPrefix, estimativa = 50) {
    await iniciarMotor(async (pagina) => {
        const url = wrapUrl(`${baseUrl}&numeroPagina=${pagina}`);
        return await fetch(url, { headers: { Accept: 'application/json, text/plain, */*' } });
    }, cacheKey, metaKey, uiPrefix, estimativa);
}

async function motorSincronizacaoRest(baseUrl, entidade, cacheKey, metaKey, uiPrefix, estimativa = 20) {
    await iniciarMotor(async (pagina) => {
        const url = wrapUrl(`${baseUrl}/${pagina}/${encodeURIComponent(entidade)}?unidadeGestora=CONSOLIDADO`);
        return await fetch(url, { headers: { Accept: 'application/json, text/plain, */*' } });
    }, cacheKey, metaKey, uiPrefix, estimativa);
}

async function iniciarMotor(fetchFunc, cacheKey, metaKey, uiPrefix, estimativaPaginas) {
    const btn = document.getElementById(`btnSync${uiPrefix}`);
    const box = document.getElementById(`progresso${uiPrefix}Box`);
    const txt = document.getElementById(`lblProgresso${uiPrefix}Texto`);
    const perc = document.getElementById(`lblProgresso${uiPrefix}Perc`);
    const barra = document.getElementById(`barraProgresso${uiPrefix}`);
    const alerta = document.getElementById('alertaErroConfig');
    if (!btn || !box) return;

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    box.classList.remove('hidden');
    if (alerta) { alerta.classList.add('hidden'); alerta.classList.remove('flex'); }

    let pagina = 1, allData = [], falhou = false;

    // ── 1. Tentar ler do Cache Colaborativo (Nginx Local) ──
    try {
        txt.textContent = 'Verificando cache colaborativo no servidor...';
        const cacheUrl = `./data/${cacheKey}.json`;
        const localResp = await fetch(cacheUrl, { cache: 'no-store' });
        if (localResp.ok) {
            const data = await localResp.json();
            if (Array.isArray(data) && data.length > 0) {
                await setCache(cacheKey, JSON.stringify(data));
                await setMetadata(metaKey, { records: data.length });
                txt.textContent = `Carregado do Cache Local da Rede! ${data.length} registros.`;
                perc.textContent = '100%'; barra.style.width = '100%';
                atualizarLabelsMetadados();
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                setTimeout(() => { box.classList.add('hidden'); }, 4000);
                return; // Encerra aqui, não vai para a nuvem
            }
        }
    } catch(e) {
        // Ignora erro de rede/CORS local e segue para a API oficial
    }

    while (true) {
        const p = Math.min(Math.round((pagina / estimativaPaginas) * 100), 99);
        txt.textContent = `Buscando página ${pagina}...`;
        perc.textContent = `${p}%`;
        barra.style.width = `${p}%`;

        try {
            const resp = await fetchFunc(pagina);
            if (!resp.ok) { falhou = true; break; }
            const text = await resp.text();
            if (!text || !text.trim()) break;

            let data;
            try { data = JSON.parse(text); } catch (_) { data = parsePlainText(text); }
            if (!Array.isArray(data)) {
                const k = Object.keys(data || {}).find(k => Array.isArray(data[k]));
                data = k ? data[k] : [];
            }
            if (data.length === 0) break;

            allData = allData.concat(data);
            if (data.length < 200) break;
            pagina++;
            await new Promise(r => setTimeout(r, 100));
        } catch (_) { falhou = true; break; }
    }

    // ── Resultado ──
    if (falhou && pagina === 1) {
        // CORS / rede falhou → mock
        if (alerta) { alerta.classList.remove('hidden'); alerta.classList.add('flex'); }
        txt.textContent = 'Sem proxy CORS. Carregando demo local...';
        perc.textContent = 'Demo'; barra.style.width = '100%';
        const colors = ['bg-blue-600', 'bg-green-600', 'bg-rose-600', 'bg-indigo-600'];
        colors.forEach(c => barra.classList.replace(c, 'bg-amber-500'));

        try {
            if (uiPrefix === 'Folha') {
                const mock = await fetch('./payload.json').then(r => r.json());
                await setCache(cacheKey, JSON.stringify(mock));
                await setMetadata(metaKey, { records: mock.length });
            } else if (uiPrefix === 'Servidor' && typeof gerarMockServidor === 'function') {
                const [_, ent, mesAno] = cacheKey.match(/Servidor_(.+)_(\d{4}-\d{2})/) || [];
                const mock = gerarMockServidor(ent || '', mesAno || '');
                await setCache(cacheKey, JSON.stringify(mock));
                await setMetadata(metaKey, { records: mock.length });
            } else if (uiPrefix === 'Receitas' && typeof gerarMockReceitas === 'function') {
                const [_, ano, ent] = cacheKey.match(/receitas_(\d{4})_(.+)/) || [];
                await setCache(cacheKey, gerarMockReceitas(ano || '', ent || ''));
                await setMetadata(metaKey, { records: 50 });
            } else if (uiPrefix === 'Despesas' && typeof gerarMockDespesas === 'function') {
                const [_, ano, ent] = cacheKey.match(/despesas_(\d{4})_(.+)/) || [];
                await setCache(cacheKey, gerarMockDespesas(ano || '', ent || ''));
                await setMetadata(metaKey, { records: 50 });
            }
            txt.textContent = 'Demo local carregada. Configure o proxy CORS para dados reais.';
            atualizarLabelsMetadados();
        } catch (e) { txt.textContent = 'Erro no mock.'; }
    } else if (allData.length > 0) {
        const dados = (uiPrefix === 'Folha' || uiPrefix === 'Servidor') ? JSON.stringify(allData) : allData;
        await setCache(cacheKey, dados);
        await setMetadata(metaKey, { records: allData.length });
        txt.textContent = `Concluído! ${allData.length} registros. Salvando no Servidor Local...`;
        perc.textContent = '100%'; barra.style.width = '100%';
        
        // ── 2. Gravar no Cache Colaborativo (Nginx Local) via WebDAV (PUT) ──
        try {
            const uploadPayload = typeof dados === 'string' ? dados : JSON.stringify(dados);
            await fetch(`./data/${cacheKey}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: uploadPayload
            });
            txt.textContent = `Concluído e Compartilhado! ${allData.length} registros.`;
        } catch(e) {
            txt.textContent = `Concluído! ${allData.length} registros (Cache Local não salvo).`;
        }
        
        atualizarLabelsMetadados();
    } else {
        txt.textContent = 'Nenhum dado encontrado.'; perc.textContent = '0%'; barra.style.width = '0%';
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    setTimeout(() => { box.classList.add('hidden'); }, 4000);
}

// ─────────────────────────────────────────────────
// Labels de metadados
// ─────────────────────────────────────────────────

async function atualizarLabelsMetadados() {
    const checkStatus = async (cacheKey, metaKey, elId) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const m = await getMetadata(metaKey);
        if (m) {
            el.innerHTML = '<span class="text-emerald-600 font-medium"><i class="bi bi-check-circle w-3 h-3 inline"></i> Baixado neste PC em ' + new Date(m.timestamp).toLocaleDateString('pt-BR') + '</span>';
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        
        el.textContent = 'Verificando a rede...';
        
        try {
            const resp = await fetch(`./data/${cacheKey}.json`, { method: 'HEAD', cache: 'no-store' });
            if (resp.ok) {
                const lastMod = resp.headers.get('Last-Modified');
                const dt = lastMod ? new Date(lastMod).toLocaleDateString('pt-BR') : 'hoje';
                el.innerHTML = `<span class="text-blue-600 font-medium"><i class="bi bi-server w-3 h-3 inline"></i> No Servidor da Rede (desde ${dt}) - Rápido</span>`;
                if (window.lucide) window.lucide.createIcons();
            } else {
                el.innerHTML = '<span class="text-slate-500"><i class="bi bi-cloud-off w-3 h-3 inline"></i> Nuvem Oficial (Download inicial demorado)</span>';
                if (window.lucide) window.lucide.createIcons();
            }
        } catch(e) {
            el.innerHTML = '<span class="text-slate-500"><i class="bi bi-cloud-off w-3 h-3 inline"></i> Nuvem Oficial (Download inicial demorado)</span>';
            if (window.lucide) window.lucide.createIcons();
        }
    };

    const mf = document.getElementById('syncMesFolha')?.value, bf = document.getElementById('syncBaseFolha')?.value;
    if (mf && bf) checkStatus(`FolhaPagamento_${bf}_${mf}`, `meta_folha_${bf}_${mf}`, 'lblSyncFolha');

    const ms = document.getElementById('syncMesServidor')?.value, bs = document.getElementById('syncBaseServidor')?.value;
    if (ms && bs) checkStatus(`Servidor_${bs}_${ms}`, `meta_servidor_${bs}_${ms}`, 'lblSyncServidor');

    const ar = document.getElementById('syncAnoReceitas')?.value, br = document.getElementById('syncBaseReceitas')?.value;
    if (ar && br) checkStatus(`receitas_${ar}_${br}`, `meta_receitas_${ar}_${br}`, 'lblSyncReceitas');

    const ad = document.getElementById('syncAnoDespesas')?.value, bd = document.getElementById('syncBaseDespesas')?.value;
    if (ad && bd) checkStatus(`despesas_${ad}_${bd}`, `meta_despesas_${ad}_${bd}`, 'lblSyncDespesas');
}

document.body.addEventListener('change', e => { if (e.target.id.startsWith('sync')) atualizarLabelsMetadados(); });

// ── Mock fallback para Servidor ──
function gerarMockServidor(entidade, mesAno) {
    const [ano, mes] = (mesAno || '2026-01').split('-');
    const cargos = ['Professor I', 'Professor II', 'Auxiliar Administrativo', 'Técnico em Enfermagem', 'Médico', 'Agente Comunitário', 'Motorista', 'Vigia', 'Assistente Social', 'Engenheiro Civil'];
    const vinculos = ['ESTATUTARIO', 'COMISSIONADO', 'CONTRATADO'];
    const lotacoes = ['Secretaria de Educação', 'Secretaria de Saúde', 'Secretaria de Obras', 'Secretaria de Administração', 'Gabinete do Prefeito'];
    const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nunes', 'Carvalho', 'Gomes'];
    const nomes = ['Ana', 'Carlos', 'Maria', 'João', 'Paulo', 'José', 'Pedro', 'Lucas', 'Mariana', 'Fernanda', 'Rafael', 'Juliana', 'Marcos', 'Patrícia', 'Bruno'];
    return Array.from({ length: 40 + Math.floor(Math.random() * 30) }, (_, i) => ({
        Matricula: String(10000 + i).padStart(6, '0'),
        Nome: nomes[i % nomes.length] + ' ' + sobrenomes[i % sobrenomes.length],
        CargoFuncao: cargos[i % cargos.length],
        VinculoEmpregaticio: vinculos[i % vinculos.length],
        Lotacao: lotacoes[i % lotacoes.length],
        Entidade: entidade || 'PM RIO DAS OSTRAS',
        MesReferencia: `${mes}/${ano}`,
    }));
}
