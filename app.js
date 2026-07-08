const API_BASE = "/api/v1";

// --- Proteção de Rota (lê sessionStorage primeiro, depois localStorage como fallback) ---
const SESSION_TOKEN = sessionStorage.getItem('sg_token') || localStorage.getItem('sg_token');
const USER_ROLE = sessionStorage.getItem('sg_role') || localStorage.getItem('sg_role');
const DISPLAY_NAME = sessionStorage.getItem('sg_display_name') || localStorage.getItem('sg_display_name');

if (!SESSION_TOKEN) {
    window.location.href = 'login.html';
}

const AUTH_HEADERS = {
    'Content-Type': 'application/json',
    'X-Session-Token': SESSION_TOKEN
};

// --- Bootstrap Modal instance ---

let workerPollInterval = null;
let workerModalBS = null;


document.addEventListener('DOMContentLoaded', () => {
    // Injeta dados do usuário logado
    const nameEl = document.getElementById('userDisplayName');
    const roleEl = document.getElementById('userRoleBadge');
    if (nameEl) nameEl.textContent = DISPLAY_NAME || 'Usuário';
    if (USER_ROLE === 'admin') {
        if (roleEl) roleEl.textContent = '⚙ Super Administrador';
    } else if (USER_ROLE === 'administrador') {
        if (roleEl) roleEl.textContent = '⚙ Administrador';
    } else if (USER_ROLE === 'moderator') {
        if (roleEl) roleEl.textContent = '🛡 Moderador';
    } else {
        if (roleEl) roleEl.textContent = '👤 Usuário';
    }

    // Sidebar user info
    const sidebarNameEl = document.getElementById('sidebarUserName');
    const sidebarRoleEl = document.getElementById('sidebarUserRole');
    const sidebarAvatarEl = document.getElementById('sidebarAvatarLetter');
    if (sidebarNameEl) sidebarNameEl.textContent = DISPLAY_NAME || 'Usuário';
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = (DISPLAY_NAME || 'U')[0].toUpperCase();
    if (USER_ROLE === 'admin') {
        if (sidebarRoleEl) sidebarRoleEl.textContent = 'Super Administrador';
    } else if (USER_ROLE === 'administrador') {
        if (sidebarRoleEl) sidebarRoleEl.textContent = 'Administrador';
    } else if (USER_ROLE === 'moderator') {
        if (sidebarRoleEl) sidebarRoleEl.textContent = 'Moderador';
    } else {
        if (sidebarRoleEl) sidebarRoleEl.textContent = 'Usuário';
    }

    // Exibe menu Admin apenas para admin
    if (USER_ROLE === 'admin') {
        const navConfig = document.getElementById('navConfig');
        if (navConfig) {
            navConfig.style.display = 'block';
        }
    }

    // Exibe Atualizar para moderadores, admins e administradores
    if (USER_ROLE === 'moderator' || USER_ROLE === 'admin' || USER_ROLE === 'administrador') {
        const navRefresh = document.getElementById('navRefresh');
        if (navRefresh) navRefresh.style.display = '';
    }

    // Exibe filtro de moderação para moderadores e admins
    if (USER_ROLE === 'moderator' || USER_ROLE === 'admin') {
        const filterMod = document.getElementById('filterModerated');
        if (filterMod) filterMod.style.display = '';
        const btnMod = document.getElementById('showModeratedOnly');
        if (btnMod) btnMod.style.display = '';
    }

    // Inicializa os modais Bootstrap 5
    initWorkerModal();

    checkMetaOnceDaily();
    loadDashboard();
    checkCriticalComments();

    // Delega hover para botões de preview do post associado (tooltip)
    document.addEventListener('mouseover', (e) => {
        const btn = e.target.closest('.parent-post-preview-btn');
        if (btn) handleParentPostHover(btn, btn.dataset.parentId);
    });
    document.addEventListener('mouseout', (e) => {
        const btn = e.target.closest('.parent-post-preview-btn');
        if (btn) hideParentPostTooltip();
    });

    // Delega clique para botões "Adicionar tópico"
    document.getElementById('mentionsList').addEventListener('click', async (e) => {
        const btn = e.target.closest('.add-topic-btn');
        if (!btn) return;
        const mentionId = btn.dataset.id;

        // Busca tópicos existentes
        let topics = [];
        try {
            const res = await fetchWithTimeout(`${API_BASE}/topics`, { headers: AUTH_HEADERS });
            if (res.ok) topics = await res.json();
        } catch (_) { }

        // Cria selector
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
        wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

        const card = document.createElement('div');
        card.className = 'bg-white rounded shadow p-4';
        card.style.cssText = 'min-width:300px;max-width:90vw;';
        card.innerHTML = `
            <h6 class="mb-3"><i class="bi bi-tag-fill"></i> Adicionar Tópico</h6>
            <select class="form-select mb-3" id="topicSelector">
                <option value="">— Selecione um tópico —</option>
                ${topics.map(t => `<option value="${t}">${t}</option>`).join('')}
                <option value="__new__">✏️ Novo tópico...</option>
            </select>
            <div id="newTopicRow" style="display:none;">
                <input type="text" class="form-control mb-3" id="newTopicInput" placeholder="Digite o novo tópico">
            </div>
            <div class="d-flex gap-2 justify-content-end">
                <button class="btn btn-sm btn-outline-secondary" id="cancelTopicBtn">Cancelar</button>
                <button class="btn btn-sm btn-primary" id="confirmTopicBtn">Adicionar</button>
            </div>
        `;
        wrapper.appendChild(card);
        document.body.appendChild(wrapper);

        const select = card.querySelector('#topicSelector');
        const newRow = card.querySelector('#newTopicRow');
        const newInput = card.querySelector('#newTopicInput');
        const confirmBtn = card.querySelector('#confirmTopicBtn');
        const cancelBtn = card.querySelector('#cancelTopicBtn');

        select.addEventListener('change', () => {
            newRow.style.display = select.value === '__new__' ? '' : 'none';
            if (select.value === '__new__') newInput.focus();
        });

        cancelBtn.onclick = () => wrapper.remove();

        confirmBtn.onclick = async () => {
            let topic = select.value;
            if (topic === '__new__') {
                topic = newInput.value.trim();
                if (!topic) return;
            }
            if (!topic) return;
            try {
                const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/topics`, {
                    method: 'POST',
                    headers: AUTH_HEADERS,
                    body: JSON.stringify({ topic })
                });
                if (res.ok) {
                    // Re-busca tópicos para atualizar o select
                    const res2 = await fetchWithTimeout(`${API_BASE}/topics`, { headers: AUTH_HEADERS });
                    if (res2.ok) {
                        const updated = await res2.json();
                        const currentVal = select.value;
                        select.innerHTML = `
                            <option value="">— Selecione um tópico —</option>
                            ${updated.map(t => `<option value="${t}">${t}</option>`).join('')}
                            <option value="__new__">✏️ Novo tópico...</option>
                        `;
                        select.value = currentVal === '__new__' ? '' : currentVal;
                    }
                    newInput.value = '';
                    newRow.style.display = 'none';
                    await fetchMentions();
                    loadTopicFilter();
                } else {
                    alert('Erro ao adicionar tópico.');
                }
            } catch (err) {
                alert('Erro ao conectar com a API.');
            }
        };
    });
});

// ─── Moderação de Sentimento ──────────────────────────

function openSentimentModal(mentionId) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:350px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="bi bi-pencil-fill"></i> Moderar Sentimento</h6>
        <p class="text-muted small mb-3">Altere o sentimento da menção <code>${mentionId}</code></p>
        <div class="mb-3">
            <label class="form-label">Novo Sentimento</label>
            <select class="form-select" id="sentimentSelect">
                <option value="positivo">Positivo</option>
                <option value="negativo">Negativo</option>
                <option value="neutro">Neutro</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Justificativa (opcional)</label>
            <input type="text" class="form-control" id="sentimentReason" placeholder="Ex: sarcasmo identificado">
        </div>
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" id="cancelSentimentBtn">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="confirmSentimentBtn">Salvar</button>
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    document.getElementById('cancelSentimentBtn').onclick = () => wrapper.remove();
    document.getElementById('confirmSentimentBtn').onclick = async () => {
        const sentiment = document.getElementById('sentimentSelect').value;
        const reason = document.getElementById('sentimentReason').value.trim();
        const btn = document.getElementById('confirmSentimentBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/sentiment`, {
                method: 'POST',
                headers: AUTH_HEADERS,
                body: JSON.stringify({ sentiment, reason })
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                wrapper.remove();
                fetchMentions();
            } else {
                const err = await res.json();
                alert(err.detail || 'Erro ao moderar sentimento.');
                btn.disabled = false;
                btn.innerHTML = 'Salvar';
            }
        } catch (err) {
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = 'Salvar';
        }
    };
}

// ─── Moderação de Emoção ──────────────────────────

async function openEmocaoModal(mentionId) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:350px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="bi bi-pencil-fill"></i> Moderar Emoção</h6>
        <p class="text-muted small mb-3">Altere a emoção da menção <code>${mentionId}</code></p>
        <div class="mb-3">
            <label class="form-label">Nova Emoção</label>
            <select class="form-select" id="emocaoSelect">
                <option value="" disabled selected>Carregando...</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Justificativa (opcional)</label>
            <input type="text" class="form-control" id="emocaoReason" placeholder="Ex: tom emocional evidente">
        </div>
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" id="cancelEmocaoBtn">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="confirmEmocaoBtn">Salvar</button>
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    const select = document.getElementById('emocaoSelect');
    try {
        const res = await fetchWithTimeout(`${API_BASE}/analytics/emotions-list`, { headers: AUTH_HEADERS });
        if (res.ok) {
            const emotions = await res.json();
            select.innerHTML = emotions.map(e =>
                `<option value="${e}">${e}</option>`
            ).join('');
        }
    } catch (_) { }
    if (select.options.length <= 1) {
        const fallback = ['Alegria', 'Tristeza', 'Raiva', 'Medo', 'Surpresa', 'Repulsa', 'Neutro', 'Carinho', 'Nenhum'];
        select.innerHTML = fallback.map(e =>
            `<option value="${e}">${e}</option>`
        ).join('');
    }

    document.getElementById('cancelEmocaoBtn').onclick = () => wrapper.remove();
    document.getElementById('confirmEmocaoBtn').onclick = async () => {
        const emocao = select.value;
        if (!emocao) { alert('Selecione uma emoção.'); return; }
        const reason = document.getElementById('emocaoReason').value.trim();
        const btn = document.getElementById('confirmEmocaoBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/emocao`, {
                method: 'POST',
                headers: AUTH_HEADERS,
                body: JSON.stringify({ emocao, reason })
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                wrapper.remove();
                fetchMentions();
            } else {
                const err = await res.json();
                alert(err.detail || 'Erro ao moderar emoção.');
                btn.disabled = false;
                btn.innerHTML = 'Salvar';
            }
        } catch (err) {
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = 'Salvar';
        }
    };
}

// ─── Responder a Comentário ─────────────────────────

function openReplyModal(mentionId) {
    const draft = _draftsMap[mentionId] || {};
    const isExisting = !!draft.id;
    const wasSent = draft.sent;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:450px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="bi bi-reply-fill"></i> Responder Comentário</h6>
        <p class="text-muted small mb-3">Menção: <code>${mentionId}</code></p>
        <div class="mb-3">
            <label class="form-label">Mensagem</label>
            <textarea class="form-control" id="replyMessage" rows="4" placeholder="Digite sua resposta..." maxlength="1000">${isExisting ? draft.message : ''}</textarea>
            <div class="d-flex justify-content-end mt-1">
                <span class="small text-muted" id="replyCharCount">${(draft.message || '').length}/1000</span>
            </div>
        </div>
        ${wasSent ? '<div class="alert alert-success py-2 small">✅ Resposta já foi enviada.</div>' : ''}
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" id="cancelReplyBtn">Cancelar</button>
            ${isExisting ? `<button class="btn btn-sm btn-outline-danger" id="deleteDraftReplyBtn"><i class="bi bi-trash me-1"></i>Excluir Rascunho</button>` : ''}
            <button class="btn btn-sm btn-outline-primary" id="saveDraftReplyBtn"><i class="bi bi-save me-1"></i>Salvar Rascunho</button>
            ${wasSent ? '' : `<button class="btn btn-sm btn-primary" id="confirmReplyBtn"><i class="bi bi-send me-1"></i>Enviar</button>`}
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    const textarea = card.querySelector('#replyMessage');
    const charCount = card.querySelector('#replyCharCount');
    textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length}/1000`;
    });

    document.getElementById('cancelReplyBtn').onclick = () => wrapper.remove();

    document.getElementById('saveDraftReplyBtn').onclick = async () => {
        const message = textarea.value.trim();
        if (!message) { alert('Digite uma mensagem.'); return; }
        const btn = document.getElementById('saveDraftReplyBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/draft`, {
                method: 'POST', headers: AUTH_HEADERS,
                body: JSON.stringify({ message })
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                const updated = await res.json();
                _draftsMap[mentionId] = updated;
                wrapper.remove();
                renderMentions(_allMentions);
            } else {
                const err = await res.json();
                alert('Erro: ' + (err.detail || 'Falha ao salvar rascunho.'));
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save me-1"></i>Salvar Rascunho';
            }
        } catch (err) {
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-save me-1"></i>Salvar Rascunho';
        }
    };

    const deleteBtn = document.getElementById('deleteDraftReplyBtn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm('Excluir rascunho?')) return;
            try {
                const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/draft`, {
                    method: 'DELETE', headers: AUTH_HEADERS
                });
                if (res.ok) {
                    delete _draftsMap[mentionId];
                    wrapper.remove();
                    renderMentions(_allMentions);
                } else {
                    alert('Erro ao excluir rascunho.');
                }
            } catch (err) {
                alert('Erro de conexão.');
            }
        };
    }

    const confirmBtn = document.getElementById('confirmReplyBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const message = textarea.value.trim();
            if (!message) { alert('Digite uma mensagem.'); return; }

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

            try {
                const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/reply`, {
                    method: 'POST',
                    headers: AUTH_HEADERS,
                    body: JSON.stringify({ message })
                });
                if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
                if (res.ok) {
                    wrapper.remove();
                    renderMentions(_allMentions);
                } else {
                    const err = await res.json();
                    alert('❌ Erro: ' + (err.detail || 'Falha ao enviar resposta.'));
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="bi bi-send me-1"></i>Enviar';
                }
            } catch (err) {
                alert('Erro de conexão: ' + err.message);
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-send me-1"></i>Enviar';
            }
        };
    }
}

// ─── Ocultar / Desocultar / Apagar Comentário ──────────

function toggleHideModal(mentionId, isHidden) {
    const action = isHidden ? 'unhide' : 'hide';
    const actionLabel = isHidden ? 'Desocultar' : 'Ocultar';
    const icon = isHidden ? 'bi-eye' : 'bi-eye-slash';
    const btnClass = isHidden ? 'btn-success' : 'btn-warning';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:350px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="${icon}"></i> ${actionLabel} Comentário</h6>
        <p class="text-muted small mb-3">Deseja ${actionLabel.toLowerCase()} a menção <code>${mentionId}</code> no Facebook/Instagram?</p>
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" id="cancelToggleHideBtn">Cancelar</button>
            <button class="btn btn-sm ${btnClass}" id="confirmToggleHideBtn">${actionLabel}</button>
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    document.getElementById('cancelToggleHideBtn').onclick = () => wrapper.remove();
    document.getElementById('confirmToggleHideBtn').onclick = async () => {
        const btn = document.getElementById('confirmToggleHideBtn');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${actionLabel}...`;

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/${action}`, {
                method: 'POST',
                headers: AUTH_HEADERS,
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                wrapper.remove();
                fetchMentions();
            } else {
                const err = await res.json();
                alert(err.detail || `Erro ao ${actionLabel.toLowerCase()} comentário.`);
                btn.disabled = false;
                btn.innerHTML = actionLabel;
            }
        } catch (err) {
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = actionLabel;
        }
    };
}

function openDeleteModal(mentionId) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:350px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="bi bi-trash text-danger"></i> Apagar Comentário</h6>
        <p class="text-muted small mb-3">Tem certeza que deseja apagar permanentemente a menção <code>${mentionId}</code> no Facebook/Instagram?<br><span class="text-danger">Esta ação não pode ser desfeita.</span></p>
        <div class="mb-3">
            <label class="form-label">Justificativa (opcional)</label>
            <input type="text" class="form-control" id="deleteReason" placeholder="Ex: spam, discurso de ódio">
        </div>
        <div class="mb-3">
            <label class="form-label">Digite <strong>"Sim eu desejo apagar!"</strong> para confirmar</label>
            <input type="text" class="form-control" id="deleteConfirmText" placeholder='Sim eu desejo apagar!' onpaste="return false" oncopy="return false" oncut="return false" autocomplete="off">
        </div>
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-danger" id="confirmDeleteBtn" disabled>Apagar</button>
            <button class="btn btn-sm btn-outline-secondary" id="cancelDeleteBtn">Cancelar</button>
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    document.getElementById('cancelDeleteBtn').onclick = () => wrapper.remove();

    const confirmInput = document.getElementById('deleteConfirmText');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmInput.addEventListener('input', () => {
        confirmBtn.disabled = confirmInput.value.trim() !== 'Sim eu desejo apagar!';
    });

    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Apagando...';

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}`, {
                method: 'DELETE',
                headers: AUTH_HEADERS,
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                wrapper.remove();
                fetchMentions();
            } else {
                const err = await res.json();
                alert(err.detail || 'Erro ao apagar comentário.');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Apagar';
            }
        } catch (err) {
            alert('Erro de conexão.');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Apagar';
        }
    };
}

// --- Logout ---
async function doLogout() {
    try {
        await fetchWithTimeout(`${API_BASE}/auth/logout`, { method: 'POST', headers: AUTH_HEADERS });
    } catch (_) { }
    sessionStorage.clear(); localStorage.clear(); localStorage.clear();
    localStorage.clear();
    window.location.href = 'login.html';
}

function toggleCustomDate() {
    const preset = document.getElementById('filterDatePreset').value;
    const dateInput = document.getElementById('filterDate');
    if (preset === 'custom') {
        dateInput.classList.remove('d-none');
    } else {
        dateInput.classList.add('d-none');
        loadDashboard();
    }
}

function toggleReportCustomDate() {
    const preset = document.getElementById('reportDatePreset').value;
    const dateInput = document.getElementById('reportDateCustom');
    if (preset === 'custom') {
        dateInput.classList.remove('d-none');
    } else {
        dateInput.classList.add('d-none');
    }
    updateReportPeriodBadge();
}

function updateReportPeriodBadge() {
    const preset = document.getElementById('reportDatePreset')?.value || '';
    const badge = document.getElementById('reportPeriodBadge');
    const label = document.getElementById('reportPeriodLabel');
    if (!badge || !label) return;
    if (!preset) {
        badge.classList.add('d-none');
        return;
    }
    const labels = { '1': 'Últimas 24h', '7': 'Última Semana', '30': 'Último Mês', '365': 'Último Ano', 'custom': 'Data Específica' };
    label.textContent = labels[preset] || '';
    badge.classList.remove('d-none');
}

function getReportDaysBack() {
    const preset = document.getElementById('reportDatePreset')?.value || '';
    if (!preset || preset === 'custom') {
        if (preset === 'custom') {
            const dateVal = document.getElementById('reportDateCustom')?.value;
            if (dateVal) {
                const diff = Math.ceil((new Date() - new Date(dateVal)) / (1000 * 60 * 60 * 24));
                return diff > 0 ? diff : null;
            }
        }
        return null;
    }
    return parseInt(preset, 10);
}

function getGlobalPeriodDate() {
    const period = document.getElementById('filterGlobalPeriod')?.value || '';
    if (!period) return '';
    const now = new Date();
    if (period === '1d') now.setHours(now.getHours() - 24);
    else if (period === '1w') now.setDate(now.getDate() - 7);
    else if (period === '1m') now.setMonth(now.getMonth() - 1);
    else if (period === '1y') now.setFullYear(now.getFullYear() - 1);
    return now.toISOString();
}

let sentimentChart = null;
let sentimentTimelineChart = null;
let engagementSummaryChart = null;
let topicRadarChart = null;
let hourlyChart = null;
let weekdayChart = null;
let topicDistributionChart = null;
let dailyMentionsChart = null;
let localityChart = null;
let localityPolarChart = null;
let lastReportMarkdown = '';

let topicDateRadarChart = null;
let metaCountdownInterval = null;

async function checkMetaStatus() {
    if (metaCountdownInterval) {
        clearInterval(metaCountdownInterval);
        metaCountdownInterval = null;
    }

    try {
        const res = await fetchWithTimeout(`${API_BASE}/config/meta/status`, { headers: AUTH_HEADERS });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        const banner = document.getElementById('metaApiWarning');
        const msgEl = document.getElementById('metaApiWarningMsg');
        const countdownEl = document.getElementById('metaApiCountdown');
        const timerEl = document.getElementById('metaApiCountdownTimer');

        if (data.status === 'error') {
            msgEl.textContent = data.message;
            countdownEl.classList.add('d-none');
            banner.classList.remove('d-none');
            banner.classList.add('show');
            return;
        }

        if (data.status === 'ok' && data.warnings && data.warnings.length > 0) {
            msgEl.textContent = data.warnings.join(' | ');
            countdownEl.classList.add('d-none');
            banner.classList.remove('d-none');
            banner.classList.add('show');
            return;
        }

        if (data.status === 'ok' && data.expires_at) {
            const expiresAt = data.expires_at * 1000;
            const remaining = expiresAt - Date.now();

            if (remaining <= 0) {
                msgEl.textContent = 'Token de acesso expirado.';
                countdownEl.classList.add('d-none');
                banner.classList.remove('d-none');
                banner.classList.add('show');
                return;
            }

            const daysRemaining = Math.floor(remaining / 86400000);
            if (daysRemaining > 15) {
                banner.classList.remove('show');
                banner.classList.add('d-none');
                return;
            }

            msgEl.textContent = daysRemaining <= 3
                ? 'Token da Meta API expira em (renove urgentemente):'
                : 'Token da Meta API expira em:';
            countdownEl.classList.remove('d-none');

            const updateTimer = () => {
                const diff = expiresAt - Date.now();
                if (diff <= 0) {
                    msgEl.textContent = 'Token de acesso expirado.';
                    timerEl.textContent = '0d 00h 00m 00s';
                    if (metaCountdownInterval) clearInterval(metaCountdownInterval);
                    return;
                }
                timerEl.textContent = formatCountdown(diff);
            };

            updateTimer();
            metaCountdownInterval = setInterval(updateTimer, 1000);
            banner.classList.remove('d-none');
            banner.classList.add('show');
        } else {
            banner.classList.remove('show');
            banner.classList.add('d-none');
        }
    } catch (err) {
        console.error("Erro ao verificar status da Meta API:", err);
    }
}

function formatCountdown(ms) {
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function checkMetaOnceDaily() {
    const lastCheck = localStorage.getItem('sg_meta_last_check');
    const today = new Date().toISOString().slice(0, 10);
    if (lastCheck !== today) {
        localStorage.setItem('sg_meta_last_check', today);
        checkMetaStatus();
    }
}

function fetchWithTimeout(url, options, timeout = 30000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${url}`)), timeout))
    ]);
}

async function loadDashboard() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
    const errors = [];

    const fetches = [
        fetchSummary().catch(e => { errors.push("fetchSummary"); console.error(e); }),
        fetchMentions().catch(e => { errors.push("fetchMentions"); console.error(e); }),
        fetchTopUsers().catch(e => { errors.push("fetchTopUsers"); console.error(e); }),
        fetchWordCloud().catch(e => { errors.push("fetchWordCloud"); console.error(e); }),
        fetchEmotionData().catch(e => { errors.push("fetchEmotionData"); console.error(e); }),
        fetchHateSpeechData().catch(e => { errors.push("fetchHateSpeechData"); console.error(e); }),
        fetchTopicRadar().catch(e => { errors.push("fetchTopicRadar"); console.error(e); }),
        fetchBestPosts().catch(e => { errors.push("fetchBestPosts"); console.error(e); }),
        fetchWorstPosts().catch(e => { errors.push("fetchWorstPosts"); console.error(e); }),
        fetchEngagementReport().catch(e => { errors.push("fetchEngagementReport"); console.error(e); }),
        fetchEngagementSummary().catch(e => { errors.push("fetchEngagementSummary"); console.error(e); }),
        fetchHourlyActivity().catch(e => { errors.push("fetchHourlyActivity"); console.error(e); }),
        fetchWeekdayActivity().catch(e => { errors.push("fetchWeekdayActivity"); console.error(e); }),
        fetchSentimentTimeline().catch(e => { errors.push("fetchSentimentTimeline"); console.error(e); }),
        fetchDailyMentions().catch(e => { errors.push("fetchDailyMentions"); console.error(e); }),
        fetchTopicSentiment().catch(e => { errors.push("fetchTopicSentiment"); console.error(e); }),
        fetchLocalitiesCount().catch(e => { errors.push("fetchLocalitiesCount"); console.error(e); }),
        fetchLocalitiesPolar().catch(e => { errors.push("fetchLocalitiesPolar"); console.error(e); }),
        fetchTopicDateRadar().catch(e => { errors.push("fetchTopicDateRadar"); console.error(e); }),
        loadTopicFilter().catch(e => { errors.push("loadTopicFilter"); console.error(e); }),
        loadEmotionFilter().catch(e => { errors.push("loadEmotionFilter"); console.error(e); })
    ];

    await Promise.allSettled(fetches);
    if (overlay) overlay.style.display = 'none';
    if (errors.length) console.warn("Dashboard parcial —", errors.length, "falhas:", errors);
}

async function fetchSummary() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/summary${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();

    document.getElementById('kpi-pos').textContent = data.positivo ?? 0;
    document.getElementById('kpi-neg').textContent = data.negativo ?? 0;
    document.getElementById('kpi-neu').textContent = data.neutro ?? 0;
    document.getElementById('kpi-total').textContent = data.total ?? 0;

    renderChart([data.positivo ?? 0, data.negativo ?? 0, data.neutro ?? 0]);
}

let _allMentions = [];
let _draftsMap = {};

async function fetchMentions() {
    const platform = document.getElementById('filterPlatform')?.value || '';
    const type = document.getElementById('filterType')?.value || '';
    const sentiment = document.getElementById('filterSentiment')?.value || '';
    const emotion = document.getElementById('filterEmotion')?.value || '';
    const topic = document.getElementById('filterTopic')?.value || '';
    const moderated = document.getElementById('filterModerated')?.value || '';

    const preset = document.getElementById('filterDatePreset')?.value || '';
    const customDate = document.getElementById('filterDate')?.value || '';

    const searchEl = document.getElementById('searchMention');
    if (!searchEl) return;
    let dateParam = '';

    if (preset === 'custom') {
        dateParam = customDate;
    } else if (preset) {
        const now = new Date();
        if (preset === '1d') now.setHours(now.getHours() - 24);
        else if (preset === '1w') now.setDate(now.getDate() - 7);
        else if (preset === '1m') now.setMonth(now.getMonth() - 1);
        else if (preset === '1y') now.setFullYear(now.getFullYear() - 1);
        dateParam = now.toISOString();
    }

    let queryParams = new URLSearchParams({ limit: 200 });
    if (platform) queryParams.append('platform', platform);
    if (type) queryParams.append('type', type);
    if (sentiment) queryParams.append('sentiment', sentiment);
    if (emotion) queryParams.append('emocao', emotion);
    if (topic) queryParams.append('topic', topic);
    if (moderated) queryParams.append('moderated', moderated);
    if (dateParam) queryParams.append('date', dateParam);

    const res = await fetchWithTimeout(`${API_BASE}/mentions?${queryParams.toString()}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    _allMentions = await res.json();

    // Carrega rascunhos se for moderador/admin
    if (USER_ROLE === 'moderator' || USER_ROLE === 'admin') {
        try {
            const dr = await fetchWithTimeout(`${API_BASE}/drafts`, { headers: AUTH_HEADERS });
            if (dr.ok) {
                const drafts = await dr.json();
                _draftsMap = {};
                for (const d of drafts) {
                    _draftsMap[d.mention_id] = d;
                }
            }
        } catch (_) { }
    }

    renderMentions(_allMentions);
}

function renderMentions(mentions) {
    const tbody = document.getElementById('mentionsList');
    const canModerate = USER_ROLE === 'moderator' || USER_ROLE === 'admin' || USER_ROLE === 'administrador';
    const hasHate = mentions.some(m => m.sentiment_odio === 'hate');
    const hasModerated = mentions.some(m => m.has_moderated_word);
    const hateHeader = document.getElementById('hateHeader');
    if (hateHeader) hateHeader.style.display = hasHate ? '' : 'none';
    const colCount = 8;

    if (!mentions.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>
                    Nenhuma menção encontrada. Execute o worker para popular o banco.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = mentions.map(m => {
        const date = new Date(m.date).toLocaleString('pt-BR');
        const score = m.sentiment_score != null ? m.sentiment_score.toFixed(2) : '';
        const topicsHTML = (m.topics || []).map(t =>
            `<span class="badge bg-secondary me-1">${t}</span>`
        ).join('');

        let sentBadge;
        if (m.sentiment === 'positivo')
            sentBadge = `<span class="badge" style="background-color:#004b80;">Positivo ${score}</span>`;
        else if (m.sentiment === 'negativo')
            sentBadge = `<span class="badge bg-danger">Negativo ${score}</span>`;
        else
            sentBadge = `<span class="badge" style="background-color:#ffc107; color:#000;">Neutro ${score}</span>`;

        if (canModerate) {
            sentBadge = `<a href="javascript:void(0)" onclick="openSentimentModal('${m.id}')" class="text-decoration-none">${sentBadge}</a>`;
        }

        const EMOTION_LABELS = {
            'joy': 'Alegria', 'sadness': 'Tristeza', 'anger': 'Raiva',
            'fear': 'Medo', 'surprise': 'Surpresa', 'disgust': 'Repulsa',
            'neutral': 'Neutro', 'none': 'N/A'
        };
        const EMOTION_BADGE_COLORS = {
            'joy': '#198754', 'sadness': '#0d6efd', 'anger': '#dc3545',
            'fear': '#6f42c1', 'surprise': '#ffc107', 'disgust': '#fd7e14',
            'neutral': '#6c757d'
        };
        const rawEmocao = (m.sentiment_emocao || 'none').toLowerCase();
        const emotionLabel = EMOTION_LABELS[rawEmocao] || rawEmocao;
        const emotionColor = EMOTION_BADGE_COLORS[rawEmocao] || '#adb5bd';
        const emocaoScore = m.sentiment_emocao_score != null ? m.sentiment_emocao_score.toFixed(2) : '';
        const emotionBadge = `<span class="badge" style="background-color:#6f42c1;">${emotionLabel}${emocaoScore ? ' ' + emocaoScore : ''}</span>`;
        let emotionBadgeHtml;
        if (canModerate) {
            emotionBadgeHtml = `<a href="javascript:void(0)" onclick="openEmocaoModal('${m.id}')" class="text-decoration-none">${emotionBadge}</a>`;
        } else {
            emotionBadgeHtml = emotionBadge;
        }

        const platformIcon = platformIconHtml(m.platform, m.url, m.media_url);
        const addTopicBtn = canModerate
            ? `<button class="btn btn-sm btn-outline-secondary add-topic-btn py-1 px-2" data-id="${m.id}" title="Adicionar tópico"><i class="bi bi-plus-circle"></i></button>`
            : '';

        const parentPostBtn = m.parent_id
            ? `<button class="btn btn-outline-info py-1 px-2 parent-post-preview-btn" data-parent-id="${m.parent_id}" title="Ver post associado"><i class="bi bi-layout-text-sidebar-reverse"></i></button>`
            : '';

        const actionCells = [];
        actionCells.push(`
            ${canModerate && (m.platform === 'facebook' || m.platform === 'instagram')
                ? `<button class="btn btn-outline-primary py-1 px-2" onclick="openReplyModal('${m.id}')" title="Responder"><i class="bi bi-reply"></i></button>`
                : '<div></div>'}
            ${canModerate && (m.platform === 'facebook' || m.platform === 'instagram')
                ? `<button class="btn ${m.is_hidden ? 'btn-secondary' : 'btn-outline-secondary'} py-1 px-2" onclick="toggleHideModal('${m.id}', ${m.is_hidden})" title="${m.is_hidden ? 'Desocultar' : 'Ocultar'}"><i class="bi ${m.is_hidden ? 'bi-eye' : 'bi-eye-slash'}"></i></button>`
                : '<div></div>'}
            ${canModerate && (m.platform === 'facebook' || m.platform === 'instagram')
                ? `<button class="btn btn-outline-danger py-1 px-2" onclick="openDeleteModal('${m.id}')" title="Apagar"><i class="bi bi-trash"></i></button>`
                : '<div></div>'}
            ${parentPostBtn || '<div></div>'}
        `);

        const hasDraft = _draftsMap[m.id] && !_draftsMap[m.id].sent;
        const sentDraft = _draftsMap[m.id] && _draftsMap[m.id].sent;
        const draftIndicator = hasDraft
            ? `<span class="badge bg-warning text-dark" style="font-size:.65rem;cursor:help;" title="Rascunho salvo">R</span>`
            : sentDraft
                ? `<span class="badge bg-success" style="font-size:.65rem;cursor:help;" title="Enviado">E</span>`
                : '';

        const moderatedBadge = m.has_moderated_word
            ? `<span class="badge bg-warning text-dark ms-1" style="font-size:.65rem;" title="Palavras moderadas: ${(m.moderated_words || []).join(', ')}"><i class="bi bi-shield-exclamation"></i> ${(m.moderated_words || []).join(', ')}</span>`
            : '';
        const textStyle = m.has_moderated_word
            ? 'max-width:320px; white-space:normal; font-size:.88rem; border-left:3px solid #ffc107; padding-left:4px;'
            : 'max-width:320px; white-space:normal; font-size:.88rem;';

        return `
            <tr>
                <td class="text-center">${platformIcon}</td>
                <td style="${textStyle}"
                    ${canModerate ? `oncontextmenu="showWordContextMenu(event)"` : ''}>
                  ${formatText(m.text)}${moderatedBadge}
                </td>
                <td>${sentBadge}</td>
                <td class="text-center">${emotionBadgeHtml}</td>
                ${hasHate ? `<td class="text-center">${m.sentiment_odio === 'hate' ? '<span class="badge bg-danger">Ódio</span>' : '<span class="badge bg-success">OK</span>'}</td>` : ''}
                <td class="text-center">${topicsHTML} ${addTopicBtn}</td>
                <td class="text-muted small">${date}</td>
                <td class="text-center align-middle">
                    ${draftIndicator}
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:2px;">
                        ${actionCells.join('')}
                    </div>
                </td>
            </tr>`;
    }).join('');
    initClampToggles();
}

function filterMentions() {
    const q = document.getElementById('searchMention').value.toLowerCase().trim();
    if (!q) {
        renderMentions(_allMentions);
        return;
    }
    const filtered = _allMentions.filter(m =>
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.topics || []).some(t => t.toLowerCase().includes(q))
    );
    renderMentions(filtered);
}

async function fetchTopUsers() {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/top-users?limit=10`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const users = await res.json();

    const tbody = document.getElementById('topUsersList');
    if (!users.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>
                    Nenhum dado disponível.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = users.map((u, i) => {
        const shortHash = u.author_pseudonym.substring(0, 12) + '…';
        const total = u.total_mentions;
        const pctPos = total > 0 ? ((u.positivo / total) * 100).toFixed(0) : 0;
        const pctNeg = total > 0 ? ((u.negativo / total) * 100).toFixed(0) : 0;
        const pctNeu = total > 0 ? ((u.neutro / total) * 100).toFixed(0) : 0;

        let medal = '';
        if (i === 0) medal = '🥇';
        else if (i === 1) medal = '🥈';
        else if (i === 2) medal = '🥉';

        return `
            <tr>
                <td class="fw-bold">${medal || (i + 1)}</td>
                <td><code title="${u.author_pseudonym}">${shortHash}</code></td>
                <td><span class="fw-semibold">${total}</span></td>
                <td style="white-space: nowrap;">
                    <span class="badge" style="background-color:#00bcd4; min-width:40px;">${u.positivo} (${pctPos}%)</span>
                    <span class="badge bg-danger ms-1" style="min-width:40px;">${u.negativo} (${pctNeg}%)</span>
                    <span class="badge bg-secondary ms-1" style="min-width:40px;">${u.neutro} (${pctNeu}%)</span>
                </td>
            </tr>`;
    }).join('');
}

async function fetchBestPosts() {
    const platform = document.getElementById('filterPlatformBest')?.value || '';
    const word = document.getElementById('filterWordBest')?.value || '';
    const period = document.getElementById('filterPeriodBest')?.value || '';
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (word) params.append('q', word);
    if (period) {
        const now = new Date();
        if (period === '1d') now.setHours(now.getHours() - 24);
        else if (period === '1w') now.setDate(now.getDate() - 7);
        else if (period === '1m') now.setMonth(now.getMonth() - 1);
        else if (period === '1y') now.setFullYear(now.getFullYear() - 1);
        params.append('date', now.toISOString());
    }
    if (!period) params.append('limit', '10');
    const res = await fetchWithTimeout(`${API_BASE}/analytics/best-posts?${params.toString()}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const posts = await res.json();

    const tbody = document.getElementById('bestPostsList');
    if (!posts.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>
                    Nenhum post positivo de destaque no momento.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = posts.map(p => {
        const date = new Date(p.date).toLocaleString('pt-BR');
        const score = (p.sentiment_score || 0).toFixed(2);
        const platformIcon = platformIconHtml(p.platform, p.url, p.media_url);
        const likes = p.likes || 0;
        const comments = p.comments || 0;
        const dissemination = p.dissemination || 0;
        const totalEng = likes + comments + dissemination;
        const likesNorm = likes > 0 ? (likes / (likes + 50) * 100).toFixed(1) : 0;
        const compScore = (parseFloat(score) * 10 + likes / (likes + 50) * 7 + dissemination / (dissemination + 50) * 3).toFixed(1);

        return `
            <tr>
                <td class="text-center">${platformIcon}</td>
                <td style="white-space:normal; font-size:.88rem; max-width:360px;">
                    <a href="#" class="post-eval-link" data-id="${p.id}" style="color:inherit; text-decoration:none; display:block;" title="Ver avaliação detalhada">
                        ${formatText(p.text)}
                    </a>
                </td>
                <td class="text-center align-middle" style="min-width:130px;">
                    <div class="d-flex flex-column gap-1 align-items-center">
                        <span class="badge" style="background-color:#00bcd4; padding:4px 8px; font-size:.75rem;">
                            <i class="bi bi-star-fill text-white"></i> Sentimento ${score}
                        </span>
                        <span class="badge bg-success" style="padding:4px 8px; font-size:.7rem;">
                            <i class="bi bi-heart-fill"></i> ${likes} curtidas
                        </span>
                        <span class="badge bg-secondary" style="padding:4px 8px; font-size:.7rem;">
                            <i class="bi bi-bar-chart-fill"></i> Comp. ${compScore}
                        </span>
                    </div>
                </td>
                <td class="text-muted small">${date}</td>
                <td class="text-center align-middle">
                    <button class="btn btn-outline-info py-1 px-2 parent-post-preview-btn" data-parent-id="${p.id}" title="Ver prévia"><i class="bi bi-layout-text-sidebar-reverse"></i></button>
                </td>
            </tr>`;
    }).join('');
    initClampToggles();
    document.querySelectorAll('.post-eval-link').forEach(el => {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            openPostEvaluation(this.dataset.id);
        });
    });
}

async function fetchWorstPosts() {
    const platform = document.getElementById('filterPlatformWorst')?.value || '';
    const word = document.getElementById('filterWordWorst')?.value || '';
    const period = document.getElementById('filterPeriodWorst')?.value || '';
    const params = new URLSearchParams();
    if (platform) params.append('platform', platform);
    if (word) params.append('q', word);
    if (period) {
        const now = new Date();
        if (period === '1d') now.setHours(now.getHours() - 24);
        else if (period === '1w') now.setDate(now.getDate() - 7);
        else if (period === '1m') now.setMonth(now.getMonth() - 1);
        else if (period === '1y') now.setFullYear(now.getFullYear() - 1);
        params.append('date', now.toISOString());
    }
    if (!period) params.append('limit', '10');
    const res = await fetchWithTimeout(`${API_BASE}/analytics/worst-posts?${params.toString()}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const posts = await res.json();

    const tbody = document.getElementById('worstPostsList');
    if (!posts.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>
                    Nenhum post negativo de destaque no momento.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = posts.map(p => {
        const date = new Date(p.date).toLocaleString('pt-BR');
        const score = (p.sentiment_score || 0).toFixed(2);
        const platformIcon = platformIconHtml(p.platform, p.url, p.media_url);
        const likes = p.likes || 0;
        const comments = p.comments || 0;
        const dissemination = p.dissemination || 0;
        const totalEng = likes + comments + dissemination;
        const likesNorm = likes > 0 ? (likes / (likes + 50) * 100).toFixed(1) : 0;
        const compScore = (Math.abs(parseFloat(score)) * 10 + likes / (likes + 50) * 7 + dissemination / (dissemination + 50) * 3).toFixed(1);

        return `
            <tr>
                <td class="text-center">${platformIcon}</td>
                <td style="white-space:normal; font-size:.88rem; max-width:360px;">
                    <a href="#" class="post-eval-link" data-id="${p.id}" style="color:inherit; text-decoration:none; display:block;" title="Ver avaliação detalhada">
                        ${formatText(p.text)}
                    </a>
                </td>
                <td class="text-center align-middle" style="min-width:130px;">
                    <div class="d-flex flex-column gap-1 align-items-center">
                        <span class="badge bg-danger" style="padding:4px 8px; font-size:.75rem;">
                            <i class="bi bi-star-fill text-white"></i> Sentimento ${score}
                        </span>
                        <span class="badge bg-success" style="padding:4px 8px; font-size:.7rem;">
                            <i class="bi bi-heart-fill"></i> ${likes} curtidas
                        </span>
                        <span class="badge bg-secondary" style="padding:4px 8px; font-size:.7rem;">
                            <i class="bi bi-bar-chart-fill"></i> Comp. ${compScore}
                        </span>
                    </div>
                </td>
                <td class="text-muted small">${date}</td>
                <td class="text-center align-middle">
                    <button class="btn btn-outline-info py-1 px-2 parent-post-preview-btn" data-parent-id="${p.id}" title="Ver prévia"><i class="bi bi-layout-text-sidebar-reverse"></i></button>
                </td>
            </tr>`;
    }).join('');
    initClampToggles();
    document.querySelectorAll('.post-eval-link').forEach(el => {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            openPostEvaluation(this.dataset.id);
        });
    });
}

async function fetchEngagementReport() {
    console.log("Buscando relatório de engajamento...");
    const platform = document.getElementById('filterPlatformEngagement')?.value || '';
    const datePreset = document.getElementById('filterDateEngagement')?.value || '';
    const params = new URLSearchParams({ limit: 10 });
    if (platform) params.append('platform', platform);
    if (datePreset) {
        const now = new Date();
        if (datePreset === '1d') now.setHours(now.getHours() - 24);
        else if (datePreset === '1w') now.setDate(now.getDate() - 7);
        else if (datePreset === '1m') now.setMonth(now.getMonth() - 1);
        else if (datePreset === '1y') now.setFullYear(now.getFullYear() - 1);
        params.append('date', now.toISOString());
    }
    const res = await fetchWithTimeout(`${API_BASE}/analytics/engagement?${params.toString()}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const reports = await res.json();
    console.log(`Relatório de engajamento recebido: ${reports.length} itens.`);

    const tbody = document.getElementById('engagementReportList');
    if (!tbody) {
        console.warn("Elemento engagementReportList não encontrado!");
        return;
    }

    if (!reports.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-bar-chart me-2"></i>
                    Nenhum dado de engajamento disponível.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = reports.map(r => {
        const date = new Date(r.date).toLocaleString('pt-BR');
        const total = r.engagement_total || 0;
        const er = r.engagement_rate !== null && r.engagement_rate !== undefined ? r.engagement_rate.toFixed(2) : null;
        const erDisplay = er !== null ? er + '%' : 'N/D';
        const reachDisplay = r.reach_estimated ? `<span>${r.reach.toLocaleString()}</span> <small class="text-warning">(est.)</small>` : r.reach.toLocaleString();

        return `
            <tr>
                <td class="text-center align-middle sticky-col" style="text-align:center!important;vertical-align:middle!important">${platformIconHtml(r.platform, r.url, r.media_url)}</td>
                <td style="max-width:280px; white-space:normal; font-size:.85rem;">${formatText(r.text)}</td>
                <td class="text-center align-middle"><span class="badge bg-light text-dark border">${reachDisplay}</span></td>
                <td class="text-center align-middle" style="font-size: .8rem;">
                    <div class="d-flex justify-content-between"><span>👍 Curtidas:</span> <span class="fw-bold">${r.likes || 0}</span></div>
                    <div class="d-flex justify-content-between"><span>💬 Comentários:</span> <span class="fw-bold">${r.comments || 0}</span></div>
                    <div class="d-flex justify-content-between"><span>📢 Disseminação:</span> <span class="fw-bold">${r.dissemination || 0}</span></div>
                </td>
                <td class="text-center align-middle fw-bold text-primary fs-5">${total.toLocaleString()}</td>
                <td class="text-center align-middle"><span class="badge bg-warning text-dark px-2 py-1">${erDisplay}</span></td>
                <td class="align-middle text-muted small">${date}</td>
            </tr>`;
    }).join('');
    initClampToggles();
}

async function fetchEngagementSummary() {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/engagement/summary`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const summary = await res.json();

    renderEngagementSummaryChart(summary);
}

function renderEngagementSummaryChart(summary) {
    const ctx = document.getElementById('engagementSummaryChart').getContext('2d');
    if (engagementSummaryChart) engagementSummaryChart.destroy();

    const labels = summary.map(s => s.platform.toUpperCase());
    const dataEngagement = summary.map(s => s.likes + s.comments + s.dissemination);

    engagementSummaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Engajamento Total',
                    data: dataEngagement,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            if (value >= 1000) return (value / 1000) + 'k';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

async function fetchWordCloud() {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/wordcloud?limit=50`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const words = await res.json();

    const canvas = document.getElementById('wordCloudCanvas');
    const emptyEl = document.getElementById('wordCloudEmpty');

    if (!words.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth || 300;
    canvas.height = parent.clientHeight || 260;

    const maxCount = words[0].count;
    const list = words.map(w => [w.topic, (w.count / maxCount) * 100]);

    if (window.WordCloud) {
        try {
            WordCloud(canvas, {
                list: list,
                weightFactor: 1.2,
                color: function () {
                    const colors = ['#00bcd4', '#dc3545', '#6c757d', '#ffc107', '#0d6efd', '#198754', '#fd7e14', '#d63384', '#0dcaf0'];
                    return colors[Math.floor(Math.random() * colors.length)];
                },
                backgroundColor: 'transparent',
                rotateRatio: 0.3,
                weightMode: 'size',
                shape: 'circle',
                ellipticity: 0.6,
                shrinkToFit: true
            });
        } catch (e) {
            console.error('WordCloud error:', e);
        }
    }
}

async function fetchEmotionData() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/emotion${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();
    renderEmotionChart(data);
}

const EMOTION_COLORS = {
    'alegria': '#198754',
    'raiva': '#dc3545',
    'tristeza': '#0d6efd',
    'medo': '#6f42c1',
    'repulsa': '#fd7e14',
    'surpresa': '#ffc107',
    'neutro': '#6c757d',
    'aprovação': '#20c997',
    'curiosidade': '#0dcaf0',
    'admiração': '#d63384',
    'otimismo': '#198754',
    'confusão': '#adb5bd',
    'desejo': '#e83e8c',
    'irritação / incômodo': '#dc3545',
    'empolgação / entusiasmo': '#ffc107',
    'carinho / cuidado / afeto': '#f06595',
    'none': '#adb5bd'
};

const EMOTION_PALETTE = [
    '#198754', '#dc3545', '#0d6efd', '#6f42c1', '#fd7e14',
    '#ffc107', '#20c997', '#0dcaf0', '#d63384', '#adb5bd',
    '#e83e8c', '#f06595', '#7950b2', '#12b886', '#fab005',
    '#fd7e14', '#339af0', '#f06595'
];

let emotionChart = null;

function renderEmotionChart(data) {
    const canvas = document.getElementById('emotionChart');
    if (!canvas) return;
    const emptyEl = document.getElementById('emotionChartEmpty');
    if (!data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }
    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    const sorted = data.sort((a, b) => b.count - a.count);

    const neutralCount = sorted.filter(d => d.emocao.toLowerCase().split(',')[0].trim() === 'neutro')
        .reduce((sum, d) => sum + d.count, 0);
    const neutralEl = document.getElementById('emotionNeutralCount');
    if (neutralEl) neutralEl.textContent = `Neutro: ${neutralCount}`;

    const withoutNeutralNone = sorted.filter(d => {
        const label = d.emocao.toLowerCase().split(',')[0].trim();
        return label !== 'neutro' && label !== 'none';
    });
    const main = withoutNeutralNone.slice(0, 10);
    const restCount = withoutNeutralNone.slice(10).reduce((sum, d) => sum + d.count, 0);
    if (restCount > 0) main.push({ emocao: 'Outros', count: restCount });

    const labels = main.map(d => {
        const e = d.emocao.split(',')[0].trim();
        return e.charAt(0).toUpperCase() + e.slice(1);
    });
    const values = main.map(d => d.count);
    const colors = main.map((d, i) => {
        const key = d.emocao.toLowerCase().split(',')[0].trim();
        return EMOTION_COLORS[key] || EMOTION_PALETTE[i % EMOTION_PALETTE.length];
    });

    const ctx = canvas.getContext('2d');
    if (emotionChart) emotionChart.destroy();
    emotionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.x} menções`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                y: {
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
}

let hateGaugeChart = null;

async function fetchHateSpeechData() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/hate-speech${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();
    renderHateGauge(data);
}

function renderHateGauge(data) {
    const canvas = document.getElementById('hateGaugeChart');
    if (!canvas) return;
    const emptyEl = document.getElementById('hateGaugeEmpty');
    const infoEl = document.getElementById('hateGaugeInfo');
    if (!data.total) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        if (infoEl) infoEl.textContent = '';
        return;
    }
    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    const pct = data.percentage;
    const ctx = canvas.getContext('2d');
    if (hateGaugeChart) hateGaugeChart.destroy();

    const color = pct < 5 ? '#198754' : pct < 15 ? '#ffc107' : '#dc3545';

    hateGaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: [color, '#e9ecef'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            cutout: '80%',
            rotation: -90,
            circumference: 180,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.parsed === 0 ? '' : ` ${pct}% de ódio`
                    }
                }
            }
        },
        plugins: [{
            id: 'gaugeCenterText',
            afterDraw(chart) {
                const { width, height } = chart.canvas;
                const ctx2 = chart.ctx;
                ctx2.save();
                const text = `${pct}%`;
                ctx2.font = 'bold 28px system-ui, sans-serif';
                ctx2.textAlign = 'center';
                ctx2.textBaseline = 'middle';
                ctx2.fillStyle = color;
                ctx2.fillText(text, width / 2, height / 2 + 8);
                ctx2.font = '12px system-ui, sans-serif';
                ctx2.fillStyle = '#6c757d';
                ctx2.fillText('ódio', width / 2, height / 2 + 36);
                ctx2.restore();
            }
        }]
    });

    if (infoEl) {
        infoEl.textContent = `${data.hate} de ${data.total} menções com discurso de ódio`;
    }
}

async function fetchTopicRadar() {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/wordcloud?limit=12`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const topics = await res.json();

    const canvas = document.getElementById('topicRadarChart');
    const emptyEl = document.getElementById('topicRadarEmpty');

    if (!topics.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderRadarChart(topics);
}

function renderRadarChart(topics) {
    const ctx = document.getElementById('topicRadarChart').getContext('2d');
    if (topicRadarChart) topicRadarChart.destroy();

    const labels = topics.map(t => t.topic);
    const data = topics.map(t => t.count);

    topicRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Menções',
                data: data,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: '#8b5cf6',
                borderWidth: 2,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: Math.ceil(Math.max(...data) / 4) || 1,
                        font: { size: 9 }
                    },
                    pointLabels: {
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function renderChart(dataValues) {
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    if (sentimentChart) sentimentChart.destroy();

    const total = dataValues.reduce((a, b) => a + b, 0);

    sentimentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positivo', 'Negativo', 'Neutro'],
            datasets: [{
                data: dataValues,
                backgroundColor: ['#004b80', '#dc3545', '#ffc107'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 13 },
                        padding: 16,
                        generateLabels: (chart) => {
                            const dataset = chart.data.datasets[0];
                            return chart.data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return {
                                    text: `${label} (${pct}%)`,
                                    fillStyle: dataset.backgroundColor[i],
                                    strokeStyle: '#fff',
                                    lineWidth: 2,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.parsed;
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return ` ${ctx.label}: ${pct}% (${value})`;
                        }
                    }
                }
            }
        }
    });
}

async function fetchHourlyActivity() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/hourly${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();

    const canvas = document.getElementById('hourlyChart');
    const emptyEl = document.getElementById('hourlyEmpty');

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderHourlyChart(data);
}

function renderHourlyChart(data) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    if (hourlyChart) hourlyChart.destroy();

    const hours = data.map(d => String(d.hour).padStart(2, '0') + 'h');
    const counts = data.map(d => d.count);
    const maxVal = Math.max(...counts, 1);

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Menções',
                data: counts,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, maxTicksLimit: 12 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxVal / 5) || 1
                    }
                }
            }
        }
    });
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

async function fetchWeekdayActivity() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/weekday${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();

    const canvas = document.getElementById('weekdayChart');
    const emptyEl = document.getElementById('weekdayEmpty');

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderWeekdayChart(data);
}

function renderWeekdayChart(data) {
    const ctx = document.getElementById('weekdayChart').getContext('2d');
    if (weekdayChart) weekdayChart.destroy();

    const labels = data.map(d => WEEKDAY_LABELS[d.weekday]);
    const counts = data.map(d => d.count);
    const maxVal = Math.max(...counts, 1);

    weekdayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Menções',
                data: counts,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxVal / 5) || 1
                    }
                }
            }
        }
    });
}

async function fetchSentimentTimeline() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/sentiment-timeline${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();

    const canvas = document.getElementById('sentimentTimelineChart');
    const emptyEl = document.getElementById('sentimentTimelineEmpty');

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderSentimentTimelineChart(data);
}

function renderSentimentTimelineChart(data) {
    const ctx = document.getElementById('sentimentTimelineChart').getContext('2d');
    if (sentimentTimelineChart) sentimentTimelineChart.destroy();

    const labels = data.map(d => {
        const parts = d.date.split('-');
        return `${parts[2]}/${parts[1]}`;
    });

    const saldo = data.map(d => (d.positivo || 0) - (d.negativo || 0));

    const zeroLinePlugin = {
        id: 'zeroLine',
        afterDraw: function (chart) {
            const yScale = chart.scales.y;
            const zeroPixel = yScale.getPixelForValue(0);
            const ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = '#6c757d';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.moveTo(chart.chartArea.left, zeroPixel);
            ctx.lineTo(chart.chartArea.right, zeroPixel);
            ctx.stroke();
            ctx.restore();
        }
    };

    sentimentTimelineChart = new Chart(ctx, {
        type: 'line',
        plugins: [zeroLinePlugin],
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Saldo (Pos - Neg)',
                    data: saldo,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.3,
                    fill: {
                        target: 'origin',
                        above: 'rgba(139, 92, 246, 0.35)',
                        below: 'rgba(220, 53, 69, 0.35)',
                    },
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 11 }, padding: 10, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return 'Saldo: ' + context.parsed.y;
                        }
                    }
                }
            },
            layout: {
                padding: { top: 4 }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 9 }, maxTicksLimit: 25 }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: { font: { size: 9 } }
                }
            }
        }
    });
}

// ─── Menções por Dia ──────────────────────────────

async function fetchDailyMentions() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/analytics/daily-top-post${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    if (!res.ok) return;
    const data = await res.json();

    const canvas = document.getElementById('dailyMentionsChart');
    const emptyEl = document.getElementById('dailyMentionsEmpty');

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderDailyMentionsChart(data);
}

function renderDailyMentionsChart(data) {
    const ctx = document.getElementById('dailyMentionsChart').getContext('2d');
    if (dailyMentionsChart) dailyMentionsChart.destroy();

    const labels = data.map(d => {
        const parts = d.date.split('-');
        return `${parts[2]}/${parts[1]}`;
    });
    const totals = data.map(d => d.total);

    dailyMentionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Menções',
                data: totals,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const entry = data[idx];
                    if (entry && entry.top_post_url) {
                        window.open(entry.top_post_url, '_blank');
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 11 }, padding: 10, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        afterBody: function (context) {
                            const idx = context[0].dataIndex;
                            const entry = data[idx];
                            if (entry && entry.top_post_text) {
                                return '📌 Post + comentado: ' + entry.top_post_text;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 9 }, maxTicksLimit: 25 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: { font: { size: 9 } }
                }
            }
        }
    });
}

// ─── Localidades ──────────────────────────────

async function loadTopicFilter() {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/topics`, { headers: AUTH_HEADERS });
        if (!res.ok) return;
        const topics = await res.json();
        const select = document.getElementById('filterTopic');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Tópico</option>' +
            topics.map(t => `<option value="${t}">${t}</option>`).join('');
        select.value = current;
    } catch (_) { }
}

async function loadEmotionFilter() {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/analytics/emotions-list`, { headers: AUTH_HEADERS });
        if (!res.ok) return;
        const emotions = await res.json();
        const select = document.getElementById('filterEmotion');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Emoção</option>' +
            emotions.map(e => `<option value="${e}">${e}</option>`).join('');
        select.value = current;
    } catch (_) { }
}

async function fetchLocalitiesCount() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/localities/counts${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    if (!res.ok) return;
    const data = await res.json();

    const canvas = document.getElementById('localityChart');
    const emptyEl = document.getElementById('localityEmpty');

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    renderLocalityChart(data);
}

function renderLocalityChart(data) {
    const ctx = document.getElementById('localityChart').getContext('2d');
    if (localityChart) localityChart.destroy();

    const top = data.map(d => ({
        ...d,
        mentions: (d.mentions || []).filter(m => m.parent_id === null || m.parent_id === ''),
        count: (d.mentions || []).filter(m => m.parent_id === null || m.parent_id === '').length
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);
    const labels = top.map(d => d.name);
    const counts = top.map(d => d.count);
    const total = counts.reduce((s, c) => s + c, 0);
    const pcts = counts.map(c => total > 0 ? (c / total) * 100 : 0);

    const polarColors = labels.map(n => _getLocalityColor(n));

    localityChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                label: 'Postagens',
                data: pcts,
                backgroundColor: polarColors.map(c => c.bg),
                borderColor: polarColors.map(c => c.border),
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 9 }, boxWidth: 12, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pct = context.parsed.r;
                            const realCount = counts[context.dataIndex];
                            return ` ${context.label}: ${realCount} (${pct.toFixed(1)}%)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 10,
                        font: { size: 9 },
                        callback: function (value) { return value + '%'; }
                    },
                    pointLabels: {
                        font: { size: 9 }
                    }
                }
            }
        }
    });

    ctx.canvas.onclick = function (ev) {
        const points = localityChart.getElementsAtEventForMode(ev, 'index', { intersect: true }, false);
        if (points && points.length) {
            const i = points[0].index;
            const entry = top[i];
            if (entry && entry.mentions && entry.mentions.length) {
                openLocalityMentionsModal({ ...entry, label: 'postagem' });
            }
        }
    };
}

const _localityColorsBg = {};
const _localityColorsBorder = {};
const _colorPaletteBg = [
    'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)',
    'rgba(239, 68, 68, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(236, 72, 153, 0.7)',
    'rgba(14, 165, 233, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)',
    'rgba(168, 85, 247, 0.7)', 'rgba(6, 182, 212, 0.7)', 'rgba(132, 204, 22, 0.7)',
    'rgba(244, 63, 94, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(251, 146, 60, 0.7)'
];
const _colorPaletteBorder = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#0ea5e9', '#22c55e', '#f97316', '#a855f7',
    '#06b6d4', '#84cc16', '#f43f5e', '#6366f1', '#fb923c'
];
let _colorIndex = 0;

function _getLocalityColor(name) {
    if (!_localityColorsBg[name]) {
        _localityColorsBg[name] = _colorPaletteBg[_colorIndex % _colorPaletteBg.length];
        _localityColorsBorder[name] = _colorPaletteBorder[_colorIndex % _colorPaletteBorder.length];
        _colorIndex++;
    }
    return { bg: _localityColorsBg[name], border: _localityColorsBorder[name] };
}

// ─── Polar de Menções por Localidade ──────────────

let _localityPolarData = null;

async function fetchLocalitiesPolar() {
    const date = getGlobalPeriodDate();
    const params = date ? '?' + new URLSearchParams({ date }).toString() : '';
    const res = await fetchWithTimeout(`${API_BASE}/localities/counts${params}`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    if (!res.ok) return;
    const data = await res.json();

    const canvas = document.getElementById('localityPolarChart');
    const emptyEl = document.getElementById('localityPolarEmpty');
    if (!canvas) return;

    if (!data || !data.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    _localityPolarData = data;
    renderLocalityPolarChart(data);
}

function renderLocalityPolarChart(data) {
    const ctx = document.getElementById('localityPolarChart').getContext('2d');
    if (localityPolarChart) localityPolarChart.destroy();

    const top = data.map(d => ({
        ...d,
        mentions: (d.mentions || []).filter(m => m.parent_id !== null && m.parent_id !== ''),
        count: (d.mentions || []).filter(m => m.parent_id !== null && m.parent_id !== '').length
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);
    const labels = top.map(d => d.name);
    const counts = top.map(d => d.count);
    const total = counts.reduce((s, c) => s + c, 0);
    const pcts = counts.map(c => total > 0 ? (c / total) * 100 : 0);

    const polarColors = labels.map(n => _getLocalityColor(n));
    localityPolarChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                label: 'Comentários',
                data: pcts,
                backgroundColor: polarColors.map(c => c.bg),
                borderColor: polarColors.map(c => c.border),
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { size: 9 }, boxWidth: 12, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pct = context.parsed.r;
                            const realCount = counts[context.dataIndex];
                            return ` ${context.label}: ${realCount} (${pct.toFixed(1)}%)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 10,
                        font: { size: 9 },
                        callback: function (value) { return value + '%'; }
                    },
                    pointLabels: {
                        font: { size: 9 }
                    }
                }
            }
        }
    });

    ctx.canvas.onclick = function (ev) {
        const rect = ctx.canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        const meta = localityPolarChart.getDatasetMeta(0);
        for (let i = 0; i < meta.data.length; i++) {
            if (meta.data[i].inRange(mx, my)) {
                const entry = top[i];
                if (entry && entry.mentions && entry.mentions.length) {
                    openLocalityMentionsModal(entry);
                }
                break;
            }
        }
    };
}

async function openPostEvaluation(postId) {
    const modalEl = document.getElementById('postEvalModal');
    const body = document.getElementById('postEvalModalBody');
    if (!modalEl || !body) return;

    const existing = bootstrap.Modal.getInstance(modalEl);
    if (existing) existing.hide();

    body.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info" role="status"></div><p class="mt-2 text-muted">Carregando avaliação...</p></div>`;

    const modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function cleanup() {
        modalEl.removeEventListener('hidden.bs.modal', cleanup);
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.style.overflow = '';
    });
    modal.show();

    try {
        const res = await fetchWithTimeout(`${API_BASE}/analytics/post/${postId}/evaluation`, { headers: AUTH_HEADERS });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        if (!res.ok) { body.innerHTML = `<div class="alert alert-danger">Erro ao carregar avaliação.</div>`; return; }
        const ev = await res.json();

        const date = new Date(ev.date).toLocaleString('pt-BR');
        const sentLabel = ev.sentiment === 'positivo' ? 'success' : ev.sentiment === 'negativo' ? 'danger' : 'secondary';
        const sentIcon = ev.sentiment === 'positivo' ? 'bi-emoji-smile' : ev.sentiment === 'negativo' ? 'bi-emoji-frown' : 'bi-emoji-neutral';
        const engPct = ev.engagement_rate !== null && ev.engagement_rate !== undefined ? ev.engagement_rate.toFixed(1) : null;
        const engTotal = ev.engagement_total;
        const sentScore = ev.score_sentiment.toFixed(1);
        const engScore = ev.score_engagement.toFixed(1);
        const compScore = ev.score_composite.toFixed(1);
        const erColor = engPct !== null ? (engPct > 5 ? 'text-success' : engPct > 1 ? 'text-warning' : 'text-danger') : 'text-muted';
        const erBarWidth = engPct !== null ? Math.min(engPct * 10, 100) : 0;
        const erDisplay = engPct !== null ? `${engPct}%` : '<span class="text-muted">N/D</span>';
        const reachLabel = ev.reach_estimated ? `<span class="text-muted">${ev.reach}</span> <small class="text-warning">(estimado)</small>` : `<span class="fw-bold">${ev.reach}</span>`;
        const topicsHtml = ev.topics && ev.topics.length
            ? ev.topics.map(t => `<span class="badge bg-info me-1">${t}</span>`).join('')
            : '<span class="text-muted small">Nenhum tópico</span>';

        body.innerHTML = `
            <div class="mb-2">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div>
                        <span class="badge bg-${sentLabel} fs-6 px-3 py-2">
                            <i class="bi ${sentIcon} me-1"></i> ${ev.sentiment}
                        </span>
                        <span class="badge bg-dark ms-2 fs-6 px-3 py-2">
                            <i class="bi bi-star-fill text-warning me-1"></i> ${ev.sentiment_score.toFixed(3)}
                        </span>
                    </div>
                    <a href="${ev.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-info">
                        <i class="bi bi-box-arrow-up-right me-1"></i>Abrir original
                    </a>
                </div>
                <div style="background:#1e1e1e; border-radius:6px; padding:8px 12px; margin-bottom:8px; max-height:120px; overflow-y:auto;">
                    <p style="color:#d4d4d4; margin:0; font-size:.85rem; white-space:pre-wrap; word-break:break-word;">${escapeHtml(ev.text)}</p>
                </div>
                <p class="text-muted small mb-1">${date} &middot; ${ev.platform}</p>
                <p class="mb-1 small">${topicsHtml}</p>
            </div>

            <div class="row g-2 mb-2">
                <div class="col-md-6">
                    <div class="card bg-transparent border-0 h-100">
                        <div class="card-body text-center py-2 px-2" style="background:rgba(0,0,0,0.15); border-radius:6px;">
                            <h6 class="card-title text-muted mb-2 small"><i class="bi bi-heart-fill text-danger me-1"></i>Engajamento</h6>
                            <div class="d-flex justify-content-around mb-1">
                                <div><span class="d-block fs-5 fw-bold text-info">${ev.likes}</span><small class="text-muted" style="font-size:.7rem;">Curtidas</small></div>
                                <div><span class="d-block fs-5 fw-bold text-info">${ev.comments}</span><small class="text-muted" style="font-size:.7rem;">Coment.</small></div>
                                <div><span class="d-block fs-5 fw-bold text-info">${ev.dissemination || 0}</span><small class="text-muted" style="font-size:.7rem;">Dissem.</small></div>
                            </div>
                            <hr class="border-secondary my-1">
                            <div class="d-flex justify-content-around mb-1">
                                <div><span class="d-block fw-bold small">${ev.reach}</span><small class="text-muted" style="font-size:.7rem;">Alcance</small></div>
                                <div><span class="d-block fw-bold small">${engTotal}</span><small class="text-muted" style="font-size:.7rem;">Eng. Total</small></div>
                            </div>
                            <div class="px-1">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span class="text-muted" style="font-size:.7rem;"><i class="bi bi-graph-up me-1"></i>ER</span>
                                    <span class="fw-bold small ${erColor}">${erDisplay}</span>
                                </div>
                                <div class="progress" style="height:6px;">
                                    <div class="progress-bar ${engPct !== null && engPct > 5 ? 'bg-success' : engPct !== null && engPct > 1 ? 'bg-warning' : 'bg-danger'}" role="progressbar" style="width:${erBarWidth}%"></div>
                                </div>
                                <small class="text-muted d-block mt-1" style="font-size:.65rem;">ER = (curtidas+comentários+disseminação+salvos) / alcance × 100 ${ev.reach_estimated ? '· alcance estimado' : ''}</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-transparent border-0 h-100">
                        <div class="card-body text-center py-2 px-2" style="background:rgba(0,0,0,0.15); border-radius:6px;">
                            <h6 class="card-title text-muted mb-2 small"><i class="bi bi-bar-chart-fill text-primary me-1"></i>Score</h6>
                            <div class="mb-1">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span class="text-muted" style="font-size:.75rem;">Sentimento</span>
                                    <span class="fw-bold small">${sentScore}/10</span>
                                </div>
                                <div class="progress" style="height:6px;">
                                    <div class="progress-bar bg-info" role="progressbar" style="width:${Math.min(sentScore * 10, 100)}%"></div>
                                </div>
                            </div>
                            <div class="mb-1">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span class="text-muted" style="font-size:.75rem;">Engajamento</span>
                                    <span class="fw-bold small">${engScore}/10</span>
                                </div>
                                <div class="progress" style="height:6px;">
                                    <div class="progress-bar bg-success" role="progressbar" style="width:${Math.min(engScore * 10, 100)}%"></div>
                                </div>
                            </div>
                            <div class="mt-2 pt-1 border-top border-secondary">
                                <span class="text-muted small">Score Final: </span>
                                <span class="fs-5 fw-bold ${compScore >= 10 ? 'text-success' : compScore >= 5 ? 'text-warning' : 'text-danger'}">${compScore}</span>
                                <span class="text-muted small">/ 20</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-2" style="background:rgba(0,0,0,0.15); border-radius:6px;">
                <small class="text-muted d-block mb-1" style="font-size:.7rem;"><i class="bi bi-info-circle me-1"></i>Como é calculado:</small>
                <ul class="small text-muted mb-0" style="padding-left:14px; font-size:.7rem;">
                    <li><strong>Score Sentimento</strong> = |sentimento| × 10 (máx 10)</li>
                    <li><strong>Score Engajamento</strong> = curtidas / (curtidas + 50) × 10 (máx 10)</li>
                    <li><strong>Score Composto</strong> = sentimento + engajamento (máx 20)</li>
                    <li><strong>ER</strong> = (curtidas + comentários + compart. + salvos) / alcance × 100</li>
                </ul>
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<div class="alert alert-danger">Erro de rede ao carregar avaliação.</div>`;
    }
}

function openLocalityMentionsModal(entry) {
    const modalEl = document.getElementById('localityMentionsModal');
    const labelEl = document.getElementById('localityMentionsModalLabel');
    const body = document.getElementById('localityMentionsModalBody');
    const openAll = document.getElementById('localityMentionsOpenAll');
    if (!modalEl || !body) return;

    const tipo = entry.label || 'comentário';
    const plural = tipo === 'postagem' ? 'postagens' : 'comentários';
    labelEl.innerHTML = `<i class="bi bi-chat-quote me-2"></i>${escapeHtml(entry.name)} — ${entry.count} ${plural}`;

    const items = entry.mentions.map(m => {
        const text = escapeHtml(m.text || '(sem texto)');
        const url = m.url || '#';
        return `<div style="padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.06);">
            <a href="${url}" target="_blank" rel="noopener" style="color:#495057; text-decoration:none; display:block; line-height:1.4;">
                <span style="color:#004b80;font-weight:500;">${text.substring(0, 120)}</span>
                <br><small style="color:#6c757d;"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir comentário →</small>
            </a>
        </div>`;
    }).join('');

    const allUrls = entry.mentions.map(m => m.url).filter(Boolean);

    if (allUrls.length > 1) {
        openAll.style.display = '';
        openAll.onclick = function () {
            allUrls.forEach(u => window.open(u, '_blank'));
        };
    } else {
        openAll.style.display = 'none';
    }

    body.innerHTML = items || '<div class="text-muted text-center py-3">Nenhum link disponível.</div>';

    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

// ─── Radar Tópico × Data ──────────────────────────

async function fetchTopicDateRadar() {
    const container = document.getElementById('topicDateRadarContainer');
    const emptyEl = document.getElementById('topicDateRadarEmpty');
    if (!container) return;

    try {
        const period = document.getElementById('filterRadarPeriod')?.value || '';
        const daysMap = { '1d': 1, '1w': 7, '1m': 30, '1y': 365 };
        const limitDays = daysMap[period] || 90;
        const res = await fetchWithTimeout(`${API_BASE}/analytics/topic-date-radar?limit_topics=15&limit_days=${limitDays}`, { headers: AUTH_HEADERS });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();

        if (!data || !data.dates || !data.dates.length || !data.topics || !data.topics.length) {
            container.style.display = 'none';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        container.style.display = '';
        if (emptyEl) emptyEl.style.display = 'none';

        renderTopicDateRadar(data, container);
    } catch (err) {
        console.error('fetchTopicDateRadar:', err);
        container.innerHTML = '<div class="text-center text-muted py-3"><i class="bi bi-exclamation-triangle me-1"></i>Erro ao carregar radar.</div>';
    }
}

function renderTopicDateRadar(data, container) {
    const { dates, topics, data: rows } = data;

    // Encontra o valor máximo para escala de cor
    let maxVal = 0;
    for (const row of rows) {
        for (const d of dates) {
            if (row[d] > maxVal) maxVal = row[d];
        }
    }
    maxVal = Math.max(maxVal, 1);

    // Formata datas para DD/MM
    const fmtDates = dates.map(d => {
        const p = d.split('-');
        return `${p[2]}/${p[1]}`;
    });

    let html = '<div style="overflow-x:auto;"><table class="table table-sm table-borderless mb-0" style="font-size:.78rem;">';

    // Cabeçalho
    html += '<thead><tr><th style="min-width:100px;position:sticky;left:0;background:#004b80;color:#fff;z-index:1;">Tópico</th>';
    for (const fd of fmtDates) {
        html += `<th class="text-center fw-normal" style="min-width:36px;writing-mode:vertical-lr;height:80px;font-size:.65rem;background:#004b80;color:#fff;">${fd}</th>`;
    }
    html += '<th class="text-center fw-normal" style="min-width:40px;background:#004b80;color:#fff;">Total</th></tr></thead>';

    // Corpo
    html += '<tbody>';
    for (const row of rows) {
        const topic = row.topic;
        let total = 0;
        let cells = '';
        for (const d of dates) {
            const val = row[d] || 0;
            total += val;
            const intensity = val / maxVal;
            const r = Math.round(255 - intensity * 200);
            const g = Math.round(255 - intensity * 100);
            const b = Math.round(255 - intensity * 50);
            const bg = val > 0 ? `rgba(0, 75, 128, ${Math.max(0.1, intensity)})` : '';
            const color = val > 0 ? '#fff' : '#adb5bd';
            cells += `<td class="text-center fw-semibold" style="background:${bg};color:${color};font-size:.75rem;border:1px solid #eee;">${val || ''}</td>`;
        }
        html += `<tr><td class="fw-semibold text-truncate" style="max-width:120px;position:sticky;left:0;background:#fff;">${topic}</td>${cells}<td class="text-center fw-bold">${total}</td></tr>`;
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;
}

async function fetchTopicSentiment() {
    const res = await fetchWithTimeout(`${API_BASE}/analytics/topic-sentiment?limit=15`, { headers: AUTH_HEADERS });
    if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
    const data = await res.json();

    const grid = document.getElementById('topicSentimentGrid');
    const canvas = document.getElementById('topicDistributionChart');
    const emptyMsg = document.getElementById('topicDistributionEmpty');

    if (!data || !data.length) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-3"><i class="bi bi-inbox me-2"></i>Nenhum tópico disponível.</div>';
        if (canvas) canvas.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }

    if (canvas) canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    grid.innerHTML = data.map(t => {
        const emoji = t.positivos >= t.negativos ? '🟢' : '🔴';
        const pctPos = t.total > 0 ? ((t.positivos / t.total) * 100).toFixed(0) : 0;
        const pctNeg = t.total > 0 ? ((t.negativos / t.total) * 100).toFixed(0) : 0;
        const pctNeu = t.total > 0 ? ((t.neutros / t.total) * 100).toFixed(0) : 0;
        return `
            <div class="col-md-4 col-sm-6 d-flex">
                <div class="d-flex flex-column justify-content-center w-100 p-3 rounded border" style="background:rgba(255,255,255,0.03); gap:6px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-semibold text-truncate" style="font-size:.9rem;">${emoji} ${t.topic}</span>
                        <span class="badge bg-secondary ms-2" style="font-size:.7rem;">${t.total} menções</span>
                    </div>
                    <div class="progress w-100" style="height:28px; font-size:.78rem; border-radius:6px;">
                        <div class="progress-bar bg-success fw-semibold d-flex align-items-center justify-content-center" style="width:${pctPos}%">${pctPos > 8 ? pctPos + '%' : ''}</div>
                        <div class="progress-bar bg-secondary fw-semibold d-flex align-items-center justify-content-center" style="width:${pctNeu}%">${pctNeu > 8 ? pctNeu + '%' : ''}</div>
                        <div class="progress-bar bg-danger fw-semibold d-flex align-items-center justify-content-center" style="width:${pctNeg}%">${pctNeg > 8 ? pctNeg + '%' : ''}</div>
                    </div>
                    <div class="d-flex gap-3 justify-content-center" style="font-size:.72rem; color:#666;">
                        <span><span style="color:#198754;">●</span> Pos ${pctPos}%</span>
                        <span><span style="color:#6c757d;">●</span> Neu ${pctNeu}%</span>
                        <span><span style="color:#dc3545;">●</span> Neg ${pctNeg}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderTopicDistributionChart(data);
}

function renderTopicDistributionChart(data) {
    const ctx = document.getElementById('topicDistributionChart').getContext('2d');
    if (topicDistributionChart) topicDistributionChart.destroy();

    const labels = data.map(d => d.topic);
    const values = data.map(d => d.total);
    const totalGeral = values.reduce((a, b) => a + b, 0);

    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#0ea5e9', '#22c55e', '#f97316', '#a855f7',
        '#06b6d4', '#84cc16', '#f43f5e', '#6366f1', '#fb923c'
    ];

    topicDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.parsed.x;
                            const pct = totalGeral > 0 ? ((value / totalGeral) * 100).toFixed(1) : '0.0';
                            return ` ${pct}% (${value} menções)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: {
                        font: { size: 10 },
                        callback: (value) => {
                            const pct = totalGeral > 0 ? ((value / totalGeral) * 100).toFixed(0) : '0';
                            return pct + '%';
                        }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}


// ─── Seções ──────────────────────────────────────

function showSection(section) {
    const dash = document.getElementById('dashboardSection');
    const report = document.getElementById('reportSection');
    if (dash) dash.style.display = 'none';
    if (report) report.style.display = 'none';

    if (section === 'report') {
        if (report) report.style.display = '';
        checkReportStatus();
    } else {
        if (dash) dash.style.display = '';
    }
}

// ─── Texto com "leia mais" ─────────────────────────

function formatText(text, maxLines = 4) {
    const id = 'txt-' + Math.random().toString(36).substr(2, 9);
    return `
        <span id="${id}" class="clamp-text">${escapeHtml(text)}</span>
        <a href="javascript:void(0)" class="toggle-text-link small text-decoration-none ms-1" id="${id}-toggle" onclick="toggleText('${id}')" data-expanded="false">... leia mais</a>
    `;
}

function toggleText(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const link = document.getElementById(id + '-toggle');
    if (!link) return;
    const expanded = link.dataset.expanded === 'true';
    if (expanded) {
        el.classList.remove('expanded');
        link.dataset.expanded = 'false';
        link.textContent = '... leia mais';
    } else {
        el.classList.add('expanded');
        link.dataset.expanded = 'true';
        link.textContent = 'mostrar menos';
    }
}

function initClampToggles() {
    document.querySelectorAll('.clamp-text').forEach(el => {
        const toggle = document.getElementById(el.id + '-toggle');
        if (toggle && el.scrollHeight <= el.clientHeight) {
            toggle.style.display = 'none';
        }
    });
}

function platformIconHtml(platform, url, mediaUrl) {
    const icon = platform === 'facebook'
        ? '<img src="https://www.svgrepo.com/show/475647/facebook-color.svg" width="36" height="36" alt="Facebook">'
        : platform === 'instagram'
            ? '<img src="https://www.svgrepo.com/show/349410/instagram.svg" width="36" height="36" alt="Instagram">'
            : `<span class="badge bg-secondary">${(platform || 'N/A').toUpperCase()}</span>`;

    const thumbnailAttr = mediaUrl
        ? ` data-thumb="${mediaUrl}"`
        : '';

    // Se houver URL, o link envolve o ícone. Se não, exibe apenas o ícone.
    const linkContent = url
        ? `<a href="${url}" target="_blank" rel="noopener">${icon}</a>`
        : icon;

    // Adicionamos a classe 'platform-container' e 'platform-icon-hover' no span principal
    const hoverClass = mediaUrl ? ' platform-icon-hover' : '';

    return `<span class="platform-container${hoverClass}"${thumbnailAttr}>${linkContent}</span>`;
}

// ─── Thumbnail Hover Tooltip ─────────────────

const thumbTooltipEl = document.createElement('div');
thumbTooltipEl.className = 'platform-thumb-tooltip';
thumbTooltipEl.style.display = 'none';
document.body.appendChild(thumbTooltipEl);

let thumbTooltipTimer = null;

document.addEventListener('mouseover', function (e) {
    const target = e.target.closest('.platform-icon-hover');
    if (!target) {
        clearThumbTooltip();
        return;
    }
    const thumbUrl = target.dataset.thumb;
    if (!thumbUrl) return;

    clearTimeout(thumbTooltipTimer);
    thumbTooltipTimer = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const img = new Image();
        img.onload = function () {
            thumbTooltipEl.innerHTML = '';
            thumbTooltipEl.appendChild(img);
            thumbTooltipEl.style.display = 'block';
            const top = rect.top - thumbTooltipEl.offsetHeight - 8;
            const left = rect.left + (rect.width / 2) - (thumbTooltipEl.offsetWidth / 2);
            thumbTooltipEl.style.top = Math.max(4, top) + 'px';
            thumbTooltipEl.style.left = Math.max(4, left) + 'px';
        };
        img.onerror = function () {
            thumbTooltipEl.style.display = 'none';
        };
        img.src = thumbUrl;
        img.alt = 'Thumbnail';
    }, 400);
});

document.addEventListener('mouseout', function (e) {
    if (e.target.closest('.platform-icon-hover')) {
        clearThumbTooltip();
    }
});

function clearThumbTooltip() {
    clearTimeout(thumbTooltipTimer);
    thumbTooltipEl.style.display = 'none';
    thumbTooltipEl.innerHTML = '';
}

// ─── Tooltip de Preview do Post Associado ────────────

const _parentPostCache = {};
let _parentPostTooltipEl = null;
let _parentPostTooltipTimer = null;
let _parentPostHideTimer = null;

function getParentPostTooltip() {
    if (!_parentPostTooltipEl) {
        _parentPostTooltipEl = document.createElement('div');
        _parentPostTooltipEl.id = 'parentPostTooltip';
        _parentPostTooltipEl.style.cssText = `
            position: fixed;
            z-index: 9998;
            display: none;
            max-width: 360px;
            min-width: 260px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
            border: 1px solid rgba(0,0,0,0.09);
            overflow: hidden;
            pointer-events: auto;
            transition: opacity 0.15s ease;
        `;
        document.body.appendChild(_parentPostTooltipEl);

        // Manter visível quando o mouse está sobre o tooltip
        _parentPostTooltipEl.addEventListener('mouseenter', () => {
            clearTimeout(_parentPostHideTimer);
        });
        _parentPostTooltipEl.addEventListener('mouseleave', () => {
            _parentPostHideTimer = setTimeout(() => {
                if (_parentPostTooltipEl) {
                    _parentPostTooltipEl.style.opacity = '0';
                    setTimeout(() => { if (_parentPostTooltipEl) _parentPostTooltipEl.style.display = 'none'; }, 150);
                }
            }, 150);
        });
    }
    return _parentPostTooltipEl;
}

function positionParentPostTooltip(triggerEl) {
    const tooltip = getParentPostTooltip();
    const rect = triggerEl.getBoundingClientRect();
    const tooltipW = 360;
    const tooltipEstH = 280;
    const margin = 8;

    let left = rect.right + margin;
    if (left + tooltipW > window.innerWidth - margin) {
        left = rect.left - tooltipW - margin;
    }
    if (left < margin) left = margin;

    let top = rect.top;
    if (top + tooltipEstH > window.innerHeight - margin) {
        top = window.innerHeight - tooltipEstH - margin;
    }
    if (top < margin) top = margin;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function showParentPostTooltip(triggerEl, post) {
    const tooltip = getParentPostTooltip();

    const platformLabel = post.platform === 'instagram' ? 'Instagram' : post.platform === 'facebook' ? 'Facebook' : post.platform;
    const platformColor = post.platform === 'instagram' ? '#e1306c' : post.platform === 'facebook' ? '#1877f2' : '#6c757d';
    const platformIcon = post.platform === 'instagram'
        ? '<img src="https://www.svgrepo.com/show/349410/instagram.svg" width="16" height="16" style="vertical-align:middle"> '
        : post.platform === 'facebook'
            ? '<img src="https://www.svgrepo.com/show/475647/facebook-color.svg" width="16" height="16" style="vertical-align:middle"> '
            : '';

    const date = new Date(post.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const sentColors = { positivo: '#004b80', negativo: '#dc3545', neutro: '#ffc107' };
    const sentLabels = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro' };
    const sentColor = sentColors[post.sentiment] || '#6c757d';
    const sentLabel = sentLabels[post.sentiment] || '–';
    const sentTextColor = post.sentiment === 'neutro' ? '#000' : '#fff';

    const postText = post.text ? post.text.substring(0, 220) + (post.text.length > 220 ? '…' : '') : '';

    const mediaHtml = post.media_url
        ? `<div style="width:100%; height:160px; overflow:hidden; background:#f8f9fa;">
              <img src="${post.media_url}" alt="Post" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
           </div>`
        : '';

    const statsHtml = (post.likes > 0 || post.comments > 0)
        ? `<div style="display:flex; gap:12px; padding:8px 14px; border-top:1px solid #f0f0f0; background:#fafafa;">
              ${post.likes > 0 ? `<span style="font-size:.78rem; color:#6c757d;"><i class="bi bi-heart-fill" style="color:#e1306c;"></i> ${post.likes.toLocaleString('pt-BR')}</span>` : ''}
              ${post.comments > 0 ? `<span style="font-size:.78rem; color:#6c757d;"><i class="bi bi-chat-fill" style="color:#6c757d;"></i> ${post.comments.toLocaleString('pt-BR')}</span>` : ''}
              ${post.shares > 0 ? `<span style="font-size:.78rem; color:#6c757d;"><i class="bi bi-share-fill" style="color:#6c757d;"></i> ${post.shares.toLocaleString('pt-BR')}</span>` : ''}
           </div>`
        : '';

    tooltip.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px 8px; border-bottom:1px solid #f0f0f0;">
            <span style="font-size:.78rem; font-weight:600; color:${platformColor};">${platformIcon}${platformLabel}</span>
            <div style="display:flex; align-items:center; gap:6px;">
                ${post.sentiment ? `<span style="font-size:.72rem; font-weight:600; padding:2px 7px; border-radius:20px; background:${sentColor}; color:${sentTextColor};">${sentLabel}</span>` : ''}
                ${post.url ? `<a href="${post.url}" target="_blank" rel="noopener" style="font-size:.8rem; color:#6c757d; text-decoration:none;" title="Abrir no ${platformLabel}"><i class="bi bi-box-arrow-up-right"></i></a>` : ''}
            </div>
        </div>
        ${mediaHtml}
        <div style="padding:10px 14px; font-size:.83rem; line-height:1.5; color:#212529; max-height:120px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical;">
            ${postText || '<em style="color:#adb5bd;">Sem texto disponível</em>'}
        </div>
        ${statsHtml}
        <div style="padding:6px 14px 10px; font-size:.72rem; color:#adb5bd;">
            <i class="bi bi-calendar3 me-1"></i>${date}
            <span style="float:right; background:#e9f4ff; color:#004b80; padding:1px 7px; border-radius:20px; font-size:.7rem; font-weight:600;">Post original</span>
        </div>
    `;

    positionParentPostTooltip(triggerEl);
    tooltip.style.display = 'block';
    tooltip.style.opacity = '0';
    requestAnimationFrame(() => { tooltip.style.opacity = '1'; });
}

async function handleParentPostHover(triggerEl, parentId) {
    clearTimeout(_parentPostHideTimer);
    clearTimeout(_parentPostTooltipTimer);

    _parentPostTooltipTimer = setTimeout(async () => {
        const tooltip = getParentPostTooltip();

        // Mostrar skeleton loading
        positionParentPostTooltip(triggerEl);
        tooltip.innerHTML = `
            <div style="padding:16px 14px; text-align:center; color:#6c757d; font-size:.85rem;">
                <div class="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>
                Carregando post...
            </div>`;
        tooltip.style.display = 'block';
        tooltip.style.opacity = '0';
        requestAnimationFrame(() => { tooltip.style.opacity = '1'; });

        // Verificar cache
        if (_parentPostCache[parentId]) {
            showParentPostTooltip(triggerEl, _parentPostCache[parentId]);
            return;
        }

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${encodeURIComponent(parentId)}`, { headers: AUTH_HEADERS });
            if (res.ok) {
                const post = await res.json();
                _parentPostCache[parentId] = post;
                showParentPostTooltip(triggerEl, post);
            } else {
                tooltip.innerHTML = `<div style="padding:14px; color:#dc3545; font-size:.83rem; text-align:center;"><i class="bi bi-exclamation-circle me-1"></i>Post não encontrado no banco.</div>`;
                positionParentPostTooltip(triggerEl);
            }
        } catch (err) {
            tooltip.innerHTML = `<div style="padding:14px; color:#dc3545; font-size:.83rem; text-align:center;"><i class="bi bi-wifi-off me-1"></i>Erro ao carregar post.</div>`;
            positionParentPostTooltip(triggerEl);
        }
    }, 350);
}

function hideParentPostTooltip() {
    clearTimeout(_parentPostTooltipTimer);
    _parentPostHideTimer = setTimeout(() => {
        const tooltip = getParentPostTooltip();
        tooltip.style.opacity = '0';
        setTimeout(() => { tooltip.style.display = 'none'; }, 150);
    }, 200);
}


// ─── Relatório IA ─────────────────────────────────

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const REPORT_SECTION_LABELS = {
    '1-resumo-executivo': 'Resumo Executivo',
    '2-panorama-geral': 'Panorama Geral',
    '3-analise-por-topico': 'Análise por Tópico',
    '4-destaques': 'Destaques',
    '5-tendencias': 'Tendências e Padrões',
    '6-recomendacoes': 'Recomendações',
    '7-conclusao': 'Conclusão',
};

function parseReportSections(markdown) {
    const sections = [];
    const lines = markdown.split('\n');
    let currentSection = null;

    for (const line of lines) {
        const hMatch = line.match(/^###\s+\d+\.\s+(.+)/);
        const h2Match = line.match(/^##\s+(.+)/);

        if (hMatch || h2Match) {
            const title = (hMatch || h2Match)[1].trim();
            const cleanTitle = title.replace(/\*\*/g, '').trim();
            const key = cleanTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            if (currentSection) sections.push(currentSection);
            currentSection = { title: cleanTitle, key, content: line, lines: [line] };
        } else if (currentSection) {
            currentSection.lines.push(line);
        }
    }
    if (currentSection) sections.push(currentSection);

    return sections;
}

function renderReportNav(sections) {
    const nav = document.getElementById('reportNavMenu');
    if (!nav) return;

    const iconMap = {
        'resumo': 'bi-clipboard-data',
        'panorama': 'bi-bar-chart',
        'analise': 'bi-search',
        'destaque': 'bi-star',
        'tendencia': 'bi-graph-up',
        'recomendaco': 'bi-check2-square',
        'conclusao': 'bi-journal-text',
    };

    nav.innerHTML = sections.map((s) => {
        const icon = Object.entries(iconMap).find(([k]) => s.key.includes(k))?.[1] || 'bi-dot';
        return `
            <a class="list-group-item list-group-item-action border-0 py-2 px-3" href="#report-${s.key}" onclick="scrollToReportSection('${s.key}');return false;">
                <i class="${icon} me-2"></i>
                <span class="small">${s.title}</span>
                <i class="bi bi-chevron-right float-end text-muted" style="font-size:.7rem;"></i>
            </a>
        `;
    }).join('');
}

function scrollToReportSection(key) {
    const el = document.getElementById(`report-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderReportContent(markdown) {
    lastReportMarkdown = markdown;
    const container = document.getElementById('reportContent');
    if (!container) return;

    const sections = parseReportSections(markdown);
    renderReportNav(sections);

    let html = '';

    if (sections.length > 1) {
        html = sections.map((s, i) => {
            const content = s.lines.join('\n');
            const rendered = marked ? marked.parse(content, { breaks: true, gfm: true }) : content.replace(/\n/g, '<br>');
            return `
                <div id="report-${s.key}" class="report-section mb-4">
                    ${rendered}
                </div>
                ${i < sections.length - 1 ? '<hr class="opacity-25">' : ''}
            `;
        }).join('');
    } else {
        html = marked
            ? marked.parse(markdown, { breaks: true, gfm: true })
            : markdown.replace(/\n/g, '<br>');
    }

    container.innerHTML = html;
}

// Animate progress bar during report generation
function animateReportProgress() {
    const bar = document.getElementById('reportProgressBar');
    let width = 0;
    const interval = setInterval(() => {
        width += Math.random() * 8;
        if (width >= 90) {
            width = 90;
            clearInterval(interval);
        }
        bar.style.width = width + '%';
    }, 800);
    return interval;
}

async function generateReport() {
    const query = document.getElementById('reportQuery').value.trim();
    if (!query || query.length < 5) {
        alert('Digite uma descrição para o relatório (mínimo 5 caracteres).');
        return;
    }

    document.getElementById('reportLoading').style.display = '';
    document.getElementById('reportResult').style.display = 'none';
    document.getElementById('btnGenerateReport').disabled = true;

    const days_back = getReportDaysBack();
    const body = { query };
    if (days_back !== null) body.days_back = days_back;

    updateReportPeriodBadge();

    const progressInterval = animateReportProgress();

    try {
        const res = await fetchWithTimeout(`${API_BASE}/reports/generate`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(body)
        }, 180000);
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        if (!res.ok) {
            const err = await res.json();
            alert('Erro: ' + (err.detail || 'Falha ao gerar relatório'));
            return;
        }
        const data = await res.json();

        clearInterval(progressInterval);
        document.getElementById('reportProgressBar').style.width = '100%';

        setTimeout(() => {
            document.getElementById('reportLoading').style.display = 'none';
            document.getElementById('reportResult').style.display = '';

            renderReportContent(data.report || '');

            const meta = document.getElementById('reportNavMeta');
            const periodInfo = days_back ? ` • Últimos ${days_back}d` : '';
            meta.textContent = `${data.llm_provider}/${data.llm_model} • ${new Date(data.generated_at).toLocaleString('pt-BR')}${periodInfo}`;
        }, 400);
    } catch (err) {
        clearInterval(progressInterval);
        alert('Erro de conexão: ' + err.message);
    } finally {
        document.getElementById('btnGenerateReport').disabled = false;
    }
}

async function generateRaioX() {
    document.getElementById('reportResult').style.display = 'none';
    document.getElementById('reportLoading').style.display = 'none';
    document.getElementById('raioXLoading').style.display = '';
    document.getElementById('btnRaioX').disabled = true;

    const days_back = getReportDaysBack();
    const body = {};
    if (days_back !== null) body.days_back = days_back;

    updateReportPeriodBadge();

    try {
        const res = await fetchWithTimeout(`${API_BASE}/reports/raio-x`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(body)
        }, 180000); // 3 minutos de timeout
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        if (!res.ok) {
            const err = await res.json();
            alert('Erro: ' + (err.detail || 'Falha ao gerar Raio-X'));
            return;
        }
        const data = await res.json();

        document.getElementById('raioXLoading').style.display = 'none';
        document.getElementById('reportResult').style.display = '';

        renderReportContent(data.report || '');

        const meta = document.getElementById('reportNavMeta');
        const periodInfo = days_back ? ` • Últimos ${days_back}d` : '';
        meta.textContent = `🔍 Raio-X • ${data.llm_provider}/${data.llm_model} • ${new Date(data.generated_at).toLocaleString('pt-BR')}${periodInfo}`;
    } catch (err) {
        document.getElementById('raioXLoading').style.display = 'none';
        alert('Erro de conexão: ' + err.message);
    } finally {
        document.getElementById('btnRaioX').disabled = false;
    }
}

function copyReport() {
    const container = document.getElementById('reportContent');
    const text = container.innerText || container.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Relatório copiado para a área de transferência!');
    }).catch(() => {
        alert('Não foi possível copiar. Selecione o texto manualmente.');
    });
}

function printReport() {
    const container = document.getElementById('reportContent');
    const content = container.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Relatório SentiGOV</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body{padding:40px;font-family:system-ui,sans-serif;}
            table{width:100%;border-collapse:collapse;margin-bottom:1rem;}
            table,th,td{border:1px solid #dee2e6;padding:8px;}
            th{background-color:#f8f9fa;}
        </style>
        </head><body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

async function exportDocx(btn) {
    const container = document.getElementById('reportContent');
    const markdown = lastReportMarkdown || container.innerText || container.textContent;

    if (!markdown || markdown.includes('Relatório será exibido aqui')) {
        alert('Nenhum relatório gerado para exportar.');
        return;
    }

    try {
        if (!btn) btn = document.activeElement;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Exportando...';

        const response = await fetchWithTimeout(`${API_BASE}/reports/export/docx`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ markdown })
        });

        if (!response.ok) throw new Error('Falha ao exportar DOCX');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_SentiGOV_${new Date().toISOString().slice(0, 10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        btn.disabled = false;
        btn.innerHTML = originalHtml;
    } catch (err) {
        alert('Erro ao exportar: ' + err.message);
    }
}

async function semanticSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) return;

    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="text-muted py-2"><span class="spinner-border spinner-border-sm me-1"></span>Buscando...</div>';

    try {
        const res = await fetchWithTimeout(`${API_BASE}/reports/search`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ query, limit: 8 })
        });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        if (!res.ok) { resultsDiv.innerHTML = '<span class="text-danger">Erro na busca</span>'; return; }
        const data = await res.json();

        if (!data.results || !data.results.length) {
            resultsDiv.innerHTML = '<span class="text-muted">Nenhuma menção encontrada.</span>';
            return;
        }

        resultsDiv.innerHTML = data.results.map(r => {
            const date = new Date(r.date).toLocaleDateString('pt-BR');
            const sentClass = r.sentiment === 'positivo' ? 'text-success' : r.sentiment === 'negativo' ? 'text-danger' : 'text-muted';
            return `
                <div class="border-bottom py-2">
                    <div class="fw-semibold small ${sentClass}">[${r.relevance_score}] ${r.sentiment || 'neutro'} • ${r.platform} • ${date}</div>
                    <div class="text-muted" style="font-size:.8rem;">${escapeHtml(r.text.substring(0, 150))}${r.text.length > 150 ? '...' : ''}</div>
                    <div class="mt-1">${(r.topics || []).map(t => '<span class="badge bg-secondary" style="font-size:.65rem;">' + t + '</span>').join(' ')}</div>
                </div>`;
        }).join('');
    } catch (err) {
        resultsDiv.innerHTML = '<span class="text-danger">Erro: ' + err.message + '</span>';
    }
}

async function checkReportStatus() {
    const badge = document.getElementById('reportStatusBadge');
    try {
        const res = await fetchWithTimeout(`${API_BASE}/reports/status`, { headers: AUTH_HEADERS });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        if (!res.ok) { badge.textContent = 'RAG: erro'; return; }
        const data = await res.json();
        const indexOk = data.index_built ? '✅' : '⚠️';
        const llmOk = data.llm_provider === 'openai' ? '🤖' : '🦙';
        badge.textContent = `${indexOk} ${data.total_mentions_db} menções • ${llmOk} ${data.llm_provider}/${data.llm_model}`;
        badge.title = `Índice: ${data.index_size} embeddings • Modelo: ${data.embedding_model}`;
    } catch {
        badge.textContent = 'RAG: offline';
    }
}

// --- Worker (Atualizar) ---
function initWorkerModal() {
    const el = document.getElementById('workerModal');
    if (!el) return;
    const existing = bootstrap.Modal.getInstance(el);
    if (existing) existing.dispose();
    workerModalBS = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
}

function triggerRefresh() {
    if (USER_ROLE !== 'moderator' && USER_ROLE !== 'admin' && USER_ROLE !== 'administrador') {
        return;
    }
    const el = document.getElementById('workerModal');
    if (!el) return;
    if (!workerModalBS || !bootstrap.Modal.getInstance(el)) {
        initWorkerModal();
    }
    workerModalBS.show();

    const logEl = document.getElementById('workerLog');
    const bar = document.getElementById('workerProgressBar');
    const pctLabel = document.getElementById('workerProgressPct');
    const statusLabel = document.getElementById('workerProgressLabel');
    const doneBtn = document.getElementById('workerDoneBtn');
    const timeLabel = document.getElementById('workerTimeLabel');

    logEl.textContent = '';
    bar.style.width = '0%';
    pctLabel.textContent = '0%';
    statusLabel.textContent = 'Iniciando coleta...';
    doneBtn.style.display = 'none';
    timeLabel.textContent = '';

    _appendLog('Iniciando worker...');

    fetchWithTimeout(`${API_BASE}/worker/run`, { method: 'POST', headers: AUTH_HEADERS })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'started') {
                _appendLog('Worker iniciado. Coletando menções...');
                workerPollInterval = setInterval(() => pollWorkerStatus(), 2000);
            } else if (res.status === 'already_running') {
                _appendLog('Worker já está em execução. Acompanhando progresso...');
                workerPollInterval = setInterval(() => pollWorkerStatus(), 2000);
            }
        })
        .catch(err => {
            _appendLog(`ERRO: ${err.message}`);
            bar.style.width = '100%';
            bar.classList.remove('progress-bar-animated');
            bar.classList.add('bg-danger');
        });
}

function stopWorkerPolling() {
    if (workerPollInterval) {
        clearInterval(workerPollInterval);
        workerPollInterval = null;
    }
}

function _appendLog(msg) {
    const logEl = document.getElementById('workerLog');
    if (logEl) {
        logEl.textContent += msg + '\n';
        logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
    }
}

function pollWorkerStatus() {
    fetchWithTimeout(`${API_BASE}/worker/status`, { headers: AUTH_HEADERS })
        .then(r => r.json())
        .then(data => {
            const logEl = document.getElementById('workerLog');
            const bar = document.getElementById('workerProgressBar');
            const pctLabel = document.getElementById('workerProgressPct');
            const statusLabel = document.getElementById('workerProgressLabel');
            const doneBtn = document.getElementById('workerDoneBtn');
            const timeLabel = document.getElementById('workerTimeLabel');

            if (data.logs && data.logs.length) {
                logEl.textContent = data.logs.join('\n') + '\n';
                logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
            }

            if (data.running) {
                const pct = data.progress || 50;
                bar.style.width = pct + '%';
                pctLabel.textContent = pct + '%';
                statusLabel.textContent = pct < 20 ? 'Iniciando coleta...' : 'Coletando menções...';
            }

            if (data.finished_at) {
                stopWorkerPolling();
                bar.style.width = '100%';
                pctLabel.textContent = '100%';
                bar.classList.remove('progress-bar-animated');
                bar.classList.add('bg-success');
                doneBtn.style.display = '';
                statusLabel.textContent = 'Concluído!';

                if (data.started_at) {
                    const secs = Math.round((new Date(data.finished_at) - new Date(data.started_at)) / 1000);
                    timeLabel.textContent = `Duração: ${secs}s`;
                }
            }
        })
        .catch(() => { });
}

function finishWorkerRefresh() {
    stopWorkerPolling();
    const modal = bootstrap.Modal.getInstance(document.getElementById('workerModal'));
    if (modal) modal.hide();
    loadDashboard();
}

async function refreshEngagement() {
    if (USER_ROLE !== 'moderator' && USER_ROLE !== 'admin' && USER_ROLE !== 'administrador') return;
    const btn = document.getElementById('refreshEngagementBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Atualizando...';
    try {
        const res = await fetchWithTimeout(`${API_BASE}/worker/refresh-engagement`, { method: 'POST', headers: AUTH_HEADERS });
        if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
        const data = await res.json();
        btn.innerHTML = `<i class="bi bi-check-lg me-1"></i> ${data.posts_atualizados} atualizados`;
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Atualizar Curtidas';
            loadDashboard();
        }, 2000);
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Atualizar Curtidas';
    }
}


// ───────────────────────────────────────────────
// Alerta de Comentários Críticos
// ───────────────────────────────────────────────
var _criticalCommentsCache = [];

function renderCriticalDropdown() {
    const section = document.getElementById('criticalDropdownSection');
    const divider = document.getElementById('criticalDropdownDivider');
    const body = document.getElementById('criticalDropdownBody');
    const bell = document.getElementById('criticalBell');
    const badge = document.getElementById('criticalBadge');
    if (!section || !divider || !body || !bell || !badge) return;

    const comments = _criticalCommentsCache;
    if (!comments || comments.length === 0) {
        section.style.display = 'none';
        divider.style.display = 'none';
        bell.style.display = 'none';
        const sidebarCritical = document.getElementById('sidebarCritical');
        if (sidebarCritical) sidebarCritical.style.display = 'none';
        return;
    }

    badge.textContent = comments.length;
    bell.style.display = 'inline';
    section.style.display = 'block';
    divider.style.display = 'block';

    const canModerate = USER_ROLE === 'moderator' || USER_ROLE === 'admin' || USER_ROLE === 'administrador';

    // Sidebar critical indicator (only for privileged users)
    const isPrivileged = USER_ROLE === 'moderator' || USER_ROLE === 'admin' || USER_ROLE === 'administrador';
    const sidebarCritical = document.getElementById('sidebarCritical');
    const sidebarCriticalCount = document.getElementById('sidebarCriticalCount');
    if (isPrivileged && sidebarCritical && sidebarCriticalCount) {
        sidebarCritical.style.display = 'block';
        sidebarCriticalCount.textContent = comments.length;
    }

    body.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-exclamation-triangle-fill text-danger"></i>
            <span class="fw-semibold small text-danger">${comments.length} crítico(s) na semana</span>
        </div>
        ${comments.map(c => {
        const date = new Date(c.date).toLocaleString('pt-BR');
        const score = c.sentiment_score != null ? c.sentiment_score.toFixed(2) : '';

        let sentBadge;
        if (c.sentiment === 'positivo')
            sentBadge = `<span class="badge" style="background-color:#004b80;">${score}</span>`;
        else if (c.sentiment === 'negativo')
            sentBadge = `<span class="badge bg-danger">${score}</span>`;
        else
            sentBadge = `<span class="badge" style="background-color:#ffc107; color:#000;">${score}</span>`;

        if (canModerate) {
            sentBadge = `<a href="javascript:void(0)" onclick="moderateFromCritical('${c.id}')" class="text-decoration-none">${sentBadge}</a>`;
        }

        const platformIcon = c.platform === 'facebook'
            ? `<span${c.media_url ? ` class="platform-icon-hover" data-thumb="${c.media_url}"` : ''}><i class="bi bi-facebook text-primary"></i></span>`
            : `<span${c.media_url ? ` class="platform-icon-hover" data-thumb="${c.media_url}"` : ''}><i class="bi bi-instagram text-danger"></i></span>`;

        return `
                <div class="d-flex align-items-start gap-2 py-2 border-bottom border-light">
                    <div class="flex-shrink-0 pt-1">${sentBadge}</div>
                    <div class="flex-grow-1 min-width-0">
                        <div class="d-flex align-items-center gap-1">
                            ${platformIcon}
                            <?-- ${c.author_pseudonym} --> 
                            ${date}
                        </div>
                        <p class="mb-0 small">${c.text.length > 50 ? c.text.substring(0, 120) + '…' : c.text}</p>
                        ${c.url ? `<a href="${c.url}" target="_blank" class="small">Abrir</a>` : ''}
                    </div>
                </div>
            `;
    }).join('')}
    `;
}

async function checkCriticalComments() {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/mentions/critical?days=7`, { headers: AUTH_HEADERS });
        if (!res.ok) return;
        _criticalCommentsCache = (await res.json()) || [];
        renderCriticalDropdown();
    } catch (err) {
        console.error('Erro ao verificar comentários críticos:', err);
    }
}

async function moderateFromCritical(mentionId) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';
    wrapper.onclick = (e) => { if (e.target === wrapper) wrapper.remove(); };

    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';
    card.style.cssText = 'min-width:350px;max-width:90vw;';
    card.innerHTML = `
        <h6 class="mb-3"><i class="bi bi-pencil-fill"></i> Moderar Sentimento</h6>
        <div class="mb-3">
            <label class="form-label">Novo Sentimento</label>
            <select class="form-select" id="sentimentSelect">
                <option value="positivo">Positivo</option>
                <option value="negativo" selected>Negativo</option>
                <option value="neutro">Neutro</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Justificativa (opcional)</label>
            <input type="text" class="form-control" id="sentimentReason" placeholder="Ex: sarcasmo identificado">
        </div>
        <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" id="cancelSentimentBtn">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="confirmSentimentBtn">Salvar</button>
        </div>
    `;
    wrapper.appendChild(card);
    document.body.appendChild(wrapper);

    document.getElementById('cancelSentimentBtn').onclick = () => wrapper.remove();
    document.getElementById('confirmSentimentBtn').onclick = async () => {
        const sentiment = document.getElementById('sentimentSelect').value;
        const reason = document.getElementById('sentimentReason').value.trim();
        const btn = document.getElementById('confirmSentimentBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        try {
            const res = await fetchWithTimeout(`${API_BASE}/mentions/${mentionId}/sentiment`, {
                method: 'POST',
                headers: AUTH_HEADERS,
                body: JSON.stringify({ sentiment, reason })
            });
            if (res.status === 401) { sessionStorage.clear(); localStorage.clear(); localStorage.clear(); window.location.href = 'login.html'; return; }
            if (res.ok) {
                wrapper.remove();
                const res2 = await fetchWithTimeout(`${API_BASE}/mentions/critical?days=7`, { headers: AUTH_HEADERS });
                if (res2.ok) {
                    _criticalCommentsCache = (await res2.json()) || [];
                    renderCriticalDropdown();
                }
            } else {
                const err = await res.json();
                alert(err.detail || 'Erro ao moderar sentimento.');
                btn.disabled = false;
                btn.innerHTML = 'Salvar';
            }
        } catch (err) {
            alert('Erro de conexão.');
            btn.disabled = false;
            btn.innerHTML = 'Salvar';
        }
    };
}

// ── Context Menu: Adicionar palavra ao léxico ──
let _contextWord = '';

function showWordContextMenu(event) {
    event.preventDefault();
    const menu = document.getElementById('wordContextMenu');
    if (!menu) return;

    let word = window.getSelection().toString().trim();
    if (!word) {
        let range = null;
        if ('caretRangeFromPoint' in document) {
            range = document.caretRangeFromPoint(event.clientX, event.clientY);
        } else if ('caretPositionFromPoint' in document) {
            const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
            if (pos) range = { startContainer: pos.offsetNode, startOffset: pos.offset };
        }
        if (range && range.startContainer) {
            const text = range.startContainer.textContent || '';
            const pos = range.startOffset;
            let start = pos;
            while (start > 0 && /\S/.test(text[start - 1])) start--;
            let end = pos;
            while (end < text.length && /\S/.test(text[end])) end++;
            word = text.slice(start, end).trim();
            word = word.replace(/[^a-zA-ZÀ-ÿ0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
        }
    }
    if (!word || word.length < 2) {
        word = prompt('Selecione ou digite a palavra para adicionar ao léxico:');
        if (!word || word.length < 2) return;
    }

    _contextWord = word.trim().toLowerCase();
    document.getElementById('contextSelectedWord').textContent = _contextWord;

    menu.style.display = 'block';
    menu.style.left = Math.min(event.clientX, window.innerWidth - 240) + 'px';
    menu.style.top = Math.min(event.clientY, window.innerHeight - 180) + 'px';
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('wordContextMenu');
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function _showLexiconFeedback(message, type) {
    const container = document.getElementById('lexiconSaveResult') || document.getElementById('saveResult');
    if (container) {
        const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-x-circle-fill';
        const cls = type === 'success' ? 'alert-success' : type === 'warning' ? 'alert-warning' : 'alert-danger';
        container.innerHTML = `<div class="alert ${cls} alert-dismissible fade show shadow-sm py-2 mb-2">
            <i class="${icon} me-1"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" style="font-size:.7rem;"></button>
        </div>`;
        setTimeout(() => { container.innerHTML = ''; }, 5000);
    } else {
        alert(message);
    }
}

async function addContextWord(type) {
    const menu = document.getElementById('wordContextMenu');
    if (menu) menu.style.display = 'none';

    const word = _contextWord;
    if (!word) return;

    try {
        const res = await fetch(`${API_BASE}/lexicon/sentiment`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ word, type })
        });
        if (res.ok) {
            _showLexiconFeedback(`"${word}" adicionada como ${type}!`, 'success');
        } else {
            const err = await res.json();
            _showLexiconFeedback(err.detail || 'Erro ao adicionar', 'warning');
        }
    } catch (err) {
        _showLexiconFeedback('Erro de conexão com a API.', 'danger');
    }
}

function openTopicPicker() {
    const menu = document.getElementById('wordContextMenu');
    if (menu) menu.style.display = 'none';

    document.getElementById('topicPickerWord').textContent = _contextWord;
    const select = document.getElementById('topicPickerSelect');

    fetch(`${API_BASE}/lexicon/topics`, { headers: AUTH_HEADERS })
        .then(r => r.json())
        .then(topics => {
            select.innerHTML = topics.map(t => `<option value="${t}">${t}</option>`).join('');
            new bootstrap.Modal(document.getElementById('topicPickerModal')).show();
        })
        .catch(() => {
            select.innerHTML = '<option value="">Erro ao carregar tópicos</option>';
        });
}

async function confirmAddToTopic() {
    const topic = document.getElementById('topicPickerSelect').value;
    const keyword = _contextWord;
    if (!topic || !keyword) return;

    bootstrap.Modal.getInstance(document.getElementById('topicPickerModal')).hide();

    try {
        const res = await fetch(`${API_BASE}/lexicon/topics/keywords`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ topic, keyword })
        });
        if (res.ok) {
            _showLexiconFeedback(`"${keyword}" adicionada ao tópico "${topic}"!`, 'success');
        } else {
            const err = await res.json();
            _showLexiconFeedback(err.detail || 'Erro ao adicionar', 'warning');
        }
    } catch (err) {
        _showLexiconFeedback('Erro de conexão com a API.', 'danger');
    }
}

function toggleModeratedFilter() {
    const sel = document.getElementById('filterModerated');
    const btn = document.getElementById('showModeratedOnly');
    if (!sel) return;
    if (sel.value === 'true') {
        sel.value = '';
        if (btn) btn.classList.remove('btn-warning');
        if (btn) btn.classList.add('btn-outline-warning');
    } else {
        sel.value = 'true';
        if (btn) btn.classList.remove('btn-outline-warning');
        if (btn) btn.classList.add('btn-warning');
    }
    loadDashboard();
}

async function addModeratedWord() {
    const menu = document.getElementById('wordContextMenu');
    if (menu) menu.style.display = 'none';

    const word = _contextWord;
    if (!word) return;

    try {
        const res = await fetch(`${API_BASE}/moderation/words`, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ word })
        });
        if (res.ok) {
            _showLexiconFeedback(`"${word}" adicionada à lista de moderação!`, 'success');
        } else {
            const err = await res.json();
            _showLexiconFeedback(err.detail || 'Erro ao moderar palavra', 'warning');
        }
    } catch (err) {
        _showLexiconFeedback('Erro de conexão com a API.', 'danger');
    }
}

// Auto-refresh a cada 5 minutos
setInterval(loadDashboard, 300000);
