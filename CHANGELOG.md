# Changelog and version

Todas as mudancas notaveis no projeto **Consulta360** serao documentadas neste arquivo.

## [v0.0.11] - 2026-07-09

### Adicionado
- **Extrator de Relatórios Oficiais (PDF Inteligente)**: Geração de relatórios com timbre oficial (Nome do Operador e Data/Hora) utilizando a biblioteca `html2pdf.js` nas abas de Contracheque e Auditoria IA.
- **Dashboard Analítico de Acessos**: Inclusão de 3 KPI Cards na aba de Configurações calculando em tempo real: Acessos Hoje, Cargo Mais Frequente e Pico de Movimento.

### Modificado
- **Otimização Extrema de Performance (Tailwind CSS CLI)**: Otimização PWA removendo o script via CDN de 3MB. Implementado pipeline CLI com Gitea Actions compilar o `global.css` nativo super leve.

## [v0.0.10] - 2026-07-09

### Removido
- **Clean Code**: Exclusão definitiva do arquivo legado `app.js` (mais de 160 KB e 3700 linhas) que pertencia a um projeto anterior de redes sociais e não era utilizado no Consulta360, mantendo a Separação de Preocupações (SoC) rígida.

### Adicionado
- **Desduplicação por CPF (IndexedDB V3)**: Criação da objectStore `folha_agregada_cpf`. O sistema agora consolida os valores (renda, descontos) de múltiplas matrículas pertencentes à mesma pessoa logo após a finalização do download pelo Auto-Sync.

### Modificado
- **Deploy Resiliente (CI/CD)**: Correção na rotina Docker do `ci-cd.yaml` com substituição de comando destrutivo `rm -rf` por `find`, protegendo assim o diretório `/data/` de apagamentos acidentais e mantendo o Cache Colaborativo intacto a cada push.
- **Nginx Autoindex**: Adicionada tag `autoindex on;` ao servidor central via script de deploy, desbloqueando a funcionalidade de Auto-Sync, que parou de dar falsos erros 403.
- **AntiGravity UI**: Substituição de blur pesado (`backdrop-filter`) nas classes de cards principais (`.glass-panel`, `.kpi-card`), implementando opacidade premium e efeitos hover nas tabelas e KPIs, resultando num salto de FPS.

## [v0.0.9] - 2026-07-08

### Adicionado
- **Arquitetura SPA (IdentidadeNPA)**: Implementação do App Shell (`index.html`) com injeção dinâmica de componentes (Sidebar, Footer e Views) via `router.js` em Vanilla JS.
- **Guia de Contribuição**: Inserção de tutorial corporativo do fluxo de Gitea Actions nativamente no `README.md` dos projetos.

### Modificado
- **Clean Code (Regras de Ouro)**: Otimização da pasta `.agents` focando estritamente nas instruções da IA, movendo a documentação humana (`ACTION_COMOFAZER.md`) para o escopo global.

## [v0.0.8] - 2026-07-08

### Adicionado
- **Repositório IDENTIDADE**: Inicialização da infraestrutura de arquivos base paralela no Gitea (IdentidadeNPA).

### Modificado
- **Identidade Visual NPA (Bootstrap+Tailwind)**: O CSS e a marcação HTML de todo o projeto Consulta360 foram refatorados para o Design System da Identidade Corporativa.
- **Glassmorphism**: Nova classe `.kpi-card` em substituição à `.ag-card`, implementando cantos retos, border-accent e shadow minimalista.
- **Performance de Ícones**: Remoção total do Lucide (`lucide.createIcons()`) em prol das webfonts injetadas nativamente via Bootstrap Icons.

### Corrigido
- **Funções perdidas em api.js**: Restauração pontual de `sanitize()` para proteção XSS e de `exportarCSV()` que haviam sido suprimidas em um git restore durante problemas de encoding.

## [v0.0.7] - 2026-07-08

### Adicionado
- **Helper getAllCache()** em db.js: encapsula a listagem completa do IndexedDB, eliminando acesso direto ao IDB em dashboard.js.
- **Helper listCacheKeys(prefix)** em db.js: filtra chaves por prefixo usando IDBKeyRange, substituindo cursores manuais em módulos.
- **Helper clearAllCache()** em db.js: encapsula limpeza atômica de olha_cache e metadata em uma única transação.
- **Helper 
esolveTimestampLabel(cacheKey, metaKey)** em db.js: elimina bloco de 8 linhas de resolução de timestamp duplicado em home.js, graficos.js e uditoria.js.
- **Função parseValorBR(str)** em pi.js: parser canônico de valores monetários BR, extraído de dashboard.js para eliminar lógica paralela.
- **Helpers indFormOnce() e indOnce()** em layout.js: substituem o anti-pattern cloneNode(true)+replaceChild para prevenção de duplicate event listeners.
- **Service Worker** agora inclui todos os fragmentos ody/*.html no cache, permitindo navegação offline completa em todas as rotas.

### Corrigido
- **Bug Crítico no utosync.js**: metaKey era construída com .replace('FolhaPagamento_', 'folha_') produzindo olha_entidade_mes em vez do padrão correto meta_folha_entidade_mes usado por config.js. O AutoSync baixava os arquivos mas o app nunca reconhecia como sincronizado.
- **Variável global implícita 	extData** em home.js: era atribuída sem declaração, tornando-se window.textData (bug em strict mode e vazamento entre módulos). Declarada como let textData no escopo local correto.
- **ormatBRL() duplicada** em uditoria.js (colisão silenciosa com graficos.js): removida a cópia de uditoria.js, que já usa a função canônica de graficos.js.
- **config.js acessava STORE_NAME diretamente** bypassando o encapsulamento de db.js. Corrigido para usar clearAllCache().
- **querySelector com string onclick** em dashboard.js e diff.js: substituídos por getElementById com IDs explícitos nos botões (tnRefreshDashboard, tnGerarDiff).
- **CACHE_NAME do Service Worker** estava em 2 (desatualizado desde v0.0.2), impedindo invalidação automática do cache. Atualizado para consulta360-v7.
- **Feedback visual do Auto-Sync**: adicionado indicador no Status Banner durante downloads em background.

### Removido (Dead Code)
- old_auditoria.html (69 KB) — arquivo legado sem nenhuma referência ativa.
- old_auditoria_utf8.html (35 KB) — idem.
- old_graficos.html (56 KB) — idem.
- old_graficos_utf8.html (28 KB) — idem.
- out.txt, out2.txt, 	emp_fetch.json — artefatos de debug/desenvolvimento.
- Funcao parseValorLocal() de dashboard.js (consolidada em parseValorBR no pi.js).

## [v0.0.6] - 2026-07-06

### Correcao
- Ajuste na formatacao da URL do OstrasPrev (duplicacao de parametros) no motor de sincronizacao.

## [v0.0.5] - 2026-07-06

### Adicionado
- Robo Extrator/Scraper Node.js (Puppeteer) para extracao automatizada em segundo plano de dados do TransparenciaBR.
- Nova entidade integrada: OstrasPrev com roteamento dinamico no motor de sincronizacao.
- Suporte multi-entidades nas consultas, filtrando dados de multiplas origens (Prefeitura e OstrasPrev).

## [v0.0.4] - 2026-07-06

### Adicionado
- **PWA (Progressive Web App):** Manifesto e Service Worker habilitados. A aplicacao agora pode ser Instalada no Desktop ou Celular, operando em tela cheia com total funcionalidade offline nativa.
- **Auto-Sync Inteligente (autosync.js):** Script em background que interroga diretamente o diretorio /data/ do servidor Nginx (via autoindex on) para baixar ativamente as bases de folha atualizadas, sem causar erros de rede falsos (404/403) no console.
- **Macro-Dashboard Global:** Painel consolidado agrupando todo o historico acumulado no cache local (IndexedDB) para metricas gerais de custo, ranking de maiores tetos pagos e evolucao macro ao longo dos anos.
- **Maquina do Tempo (Diff Analyzer):** Ferramenta focada no cruzamento de meses para deteccao automatica de Entradas (nomeacoes), Saidas (exoneracoes) e Movimentacoes Financeiras (aumentos/reducoes salariais).

### Modificado
- **Menu Principal Responsivo:** Agrupamento das ferramentas de Inteligencia de Negocio sob o novo Dropdown (Glassmorphism) BI, prevenindo quebras de linha horizontais (scroll overflow) indesejadas na versao Mobile.

## [v0.0.3] - 2026-07-03

### Adicionado
- **Arquitetura Offline-First Global:** As requisicoes de rede nas telas de Consulta, Analise de Dados, Auditoria IA, Evolucao, Receitas e Despesas foram totalmente eliminadas. Todas as telas agora consultam os dados exclusivamente do IndexedDB local.
- **Tarja de Status de Sincronizacao:** Banner inteligente indicando o timestamp de atualizacao da base ou bloqueando renderizacoes com Base Vazia, guiando o usuario para a Sincronizacao.
- **Motor de Sincronizacao com Injecao de Mock:** Refatoracao do config.js (motorSincronizacao). Ao detectar bloqueio CORS, o motor inteligentemente injeta os dados da Base de Demonstracao (Mock Local) garantindo a funcionalidade dos graficos e dashboards sem servidor.
- **GitHub Actions (CI/CD):** Configuracao do pipeline .github/workflows/deploy.yml que permite a copia de seguranca dupla (push para Gitea local + GitHub remoto) e o Deploy no GitHub Pages para acesso externo de demonstracao.

### Modificado
- **Estilizacao do Menu:** Alinhamento a direita dos botoes principais de navegacao.
- **Tratamento de Alerta de CORS:** Texto do alerta na tela de sincronizacao atualizado de Falha para Aviso de Rede com Injecao de Demo Ativada.

## [v0.0.2] - 2026-07-03

### Modificado
- **Refatoracao e Formatacao:** Codigo HTML do projeto foi formatado e indentado de forma padronizada via formatador automatico.

## [v0.0.1] - 2026-07-02

### Adicionado
- **Regras de Ouro (AGENTS.md):** Criacao do arquivo de constituicao arquitetural no diretorio .agents/ para blindar o conhecimento de infraestrutura (Nginx estatico), Separacao de Preocupacoes (SoC) e Design System.
- **Modulo Auditoria IA (auditoria_ia.html):** Criacao de uma pagina dedicada a simulacao preditiva de impacto orcamentario, radar de anomalias, e terminal assistente da IA com base nos dados cacheados do IndexedDB.

### Modificado
- **Arquitetura Modular (SoC):** As regras pesadas de JavaScript das paginas HTML foram extraidas e isoladas.
  - Criado assets/js/db.js (gerenciamento local do IndexedDB).
  - Criado assets/js/api.js (logica de requisicao de dados externos e helpers).
  - Centralizacao de estilos globais em assets/css/global.css.
