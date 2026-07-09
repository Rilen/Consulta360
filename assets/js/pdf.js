// assets/js/pdf.js

async function gerarPDFOficial(containerId, nomeArquivo, tituloStr = 'Relatório Oficial Consulta360') {
    const el = document.getElementById(containerId);
    if (!el || typeof html2pdf === 'undefined') {
        if(typeof updateStatusBanner === 'function') updateStatusBanner('error', 'Módulo de PDF não carregado ou contêiner inválido.');
        return;
    }

    if(typeof updateStatusBanner === 'function') updateStatusBanner('info', 'Gerando documento oficial... Aguarde.');

    // Prepara um clone para não bagunçar a tela do usuário
    const clone = el.cloneNode(true);
    
    // Remove botões de ação do clone (não queremos botões no PDF impresso)
    const botoes = clone.querySelectorAll('button, .btn, .no-print');
    botoes.forEach(b => b.remove());

    // Cria um Wrapper A4
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'Inter, sans-serif';
    wrapper.style.color = '#333';
    wrapper.style.backgroundColor = '#fff';

    // Cria o cabeçalho/timbre dinâmico
    const header = document.createElement('div');
    header.style.borderBottom = '2px solid #004b80';
    header.style.paddingBottom = '15px';
    header.style.marginBottom = '25px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const hoje = new Date().toLocaleString('pt-BR');
    const emissor = sessionStorage.getItem('sg_display_name') || 'Auditoria Consulta360';
    
    header.innerHTML = `
        <div>
            <h2 style="margin: 0; color: #004b80; font-size: 18px; font-weight: bold;">CONSULTA 360</h2>
            <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${tituloStr}</p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #666;">
            <p style="margin: 0;"><strong>Emitido por:</strong> ${emissor}</p>
            <p style="margin: 2px 0 0;"><strong>Data da Emissão:</strong> ${hoje}</p>
            <p style="margin: 2px 0 0;"><strong>Autenticidade:</strong> Gerado via Sistema PWA Intranet</p>
        </div>
    `;

    wrapper.appendChild(header);
    
    // Fix para o tailwind no clone: as classes dark mode precisam ser ignoradas no PDF
    // O html2pdf converte melhor quando forçamos estilos inline ou light mode
    clone.classList.remove('dark');
    const todosElementos = clone.querySelectorAll('*');
    todosElementos.forEach(child => {
        child.classList.remove('dark');
        if(child.classList.contains('text-white')) {
            child.classList.remove('text-white');
            child.style.color = '#333';
        }
    });

    wrapper.appendChild(clone);

    const opt = {
        margin:       10,
        filename:     `${nomeArquivo}_${new Date().getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(wrapper).save();
        if(typeof updateStatusBanner === 'function') updateStatusBanner('success', 'PDF Gerado e baixado com sucesso!');
        setTimeout(() => { if(typeof updateStatusBanner === 'function') updateStatusBanner('', ''); }, 4000);
    } catch(err) {
        console.error('Erro ao gerar PDF', err);
        if(typeof updateStatusBanner === 'function') updateStatusBanner('error', 'Falha ao compilar PDF.');
    }
}
