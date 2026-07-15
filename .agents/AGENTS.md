# Regra de Ouro - Projeto Consulta360 (Versão 2.0 - Híbrida)

Sua missão é manter a integridade, a performance e o padrão visual do sistema Consulta360.

## 1. Verdades Absolutas de Infraestrutura
- **Roteamento e Portas:** A aplicação frontend roda centralizada no servidor central (10.0.0.88) na porta 3005. O roteamento externo NÃO é por portas, mas por subdiretórios. Esta aplicação responde exclusivamente em `http://10.0.0.88:3005/consulta360/`[cite: 2, 3].
- **Permissão de Backend Local (SQLite & Portainer):** Fica expressamente autorizada a criação de uma API local replicadora em Node.js com banco de dados SQLite, rodando de forma isolada via contêiner (gerenciado via Portainer/Docker Compose) no servidor na porta interna `3006`[cite: 2]. 
- **Roteamento Seguro da API:** Para evitar conflitos de portas expostas externamente, a chamada do frontend para a API deve ser feita de forma relativa através do subdiretório `/consulta360/api/`[cite: 2, 3]. O Nginx na porta 3005 fará o proxy reverso interno apontando para a porta `3006` do contêiner[cite: 2].
- **Nginx Autoindex:** A pasta `/data/` no servidor Nginx DEVE ter a diretiva `autoindex on;` habilitada para que o script de Auto-Sync (`autosync.js`) consiga ler a lista de arquivos de cache disponíveis sem gerar erros 403 ou 404.
- **Caminhos Estáticos:** Toda e qualquer referência a scripts, estilos ou links entre páginas DEVE usar caminhos relativos (ex: `./assets/css/global.css`) para não quebrar o mapeamento do Nginx[cite: 2].
- **Deploy do Frontend:** O deploy da parte estática é automatizado via Gitea Actions injetando os arquivos direto no subdiretório do Nginx[cite: 3]. Nunca sugira expor portas adicionais externamente que quebrem o fluxo centralizado do Nginx na 3005[cite: 2].

## 2. Arquitetura de Diretórios (Separação de Preocupações - SoC)
O projeto segue estritamente a estrutura modular:
- Páginas HTML na raiz (ex: `index.html`, `graficos.html`, `auditoria_ia.html`, `evolucao_salarial.html`)[cite: 3].
- CSS global e estilização do design system em `/assets/css/global.css`[cite: 1, 3].
- JavaScript lógico do frontend isolado em `/assets/js/` (ex: `db.js` para IndexedDB, `api.js` para fetchs, `evolucao.js` para gráficos históricos)[cite: 1, 3].
- NENHUMA lógica complexa ou CSS customizado deve ser escrito inline ou dentro de tags `<style>`/`<script>` nas páginas HTML. Use importações externas de arquivos em `/assets/`.

## 3. Design System (AntiGravity UI & NPA Standard)
- Estilização baseada em Tailwind CSS via CDN e componentes Bootstrap 5 para grids/tabelas no padrão NPA (Núcleo de Pesquisas Avançadas)[cite: 3].
- Tema "Clean Light" ou "NPA Deep Blue", utilizando cartões glassmorphism com a classe `.ag-card` (`backdrop-filter: blur(16px)` com bordas semitransparentes e soft-shadows)[cite: 1, 3].
- Ícones: Utilize as bibliotecas Bootstrap Icons (`bi-*)` e Lucide Icons de forma integrada[cite: 3].
- **Padronização UI/UX:**
  - Cabeçalho (Header): Deve usar o ícone principal azul e os mesmos links de navegação ativa do painel[cite: 1].
  - Títulos de Cards de Métrica: Devem usar `<h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider">`[cite: 1].
  - Botões de Ação: O botão primário de buscar/gerar deve ser arredondado (`rounded-xl`), ter fundo preenchido (`bg-blue-600` ou similar), sombra e animação de clique (`active:scale-95 transition-all`)[cite: 1].

## 4. Regras de Negócio e Dados
- **Volumetria:** A base possui mais de 3.000 funcionários e alto índice de múltiplas matrículas (vínculos acumulados)[cite: 1].
- **Cache Colaborativo (Replicador Estático / API SQLite):** O sistema opera em modelo híbrido. Pode ler o cache estático do Nginx via WebDAV (pasta `/data/`) ou consumir a API replicadora local em `/consulta360/api/` que unifica e limpa os dados do SQLite[cite: 1, 2].
- **Camada de Persistência Local (Browser):** Para performance instantânea da UI, os dados baixados devem ser salvos no IndexedDB do usuário[cite: 1].
- **Unificação por Indivíduo:** Para telas de análise (gráficos, evolução salarial e IA), os dados de múltiplas matrículas do mesmo servidor devem ser consolidados/somados por CPF ou Nome Completo para refletir a renda real por trabalhador, impedindo distorções estatísticas nas métricas de cargo[cite: 1].

## 5. Arquitetura PWA e Background Sync
- **PWA e Modo Offline:** O sistema funciona como um Progressive Web App (PWA). O arquivo `manifest.json` e o `service-worker.js` garantem que a interface estática esteja sempre disponível, permitindo a navegação no painel (consultando o IndexedDB) mesmo sem rede.
- **Auto-Sync:** Sempre priorize o carregamento invisível de dados em background para popular o IndexedDB de forma proativa.

## 6. Fluxo de Encerramento (Finalizar Sessão)
- **Versionamento:** Sempre que o usuário solicitar "finalizar sessão" ou equivalente, você DEVE incrementar a versão do sistema (ex: v0.0.1 -> v0.0.2).
- **Atualização:** O número da versão deve ser substituído no rodapé (`<footer>`) de todas as páginas HTML.
- **Changelog:** Registre automaticamente todas as mudanças e melhorias da sessão no arquivo `CHANGELOG.md` e espelhe visualmente em `changelog.html` ao encerrar.

## Temas (Modo Claro e Escuro)
- **Dual Theme Engine:** O projeto utiliza suporte a temas dinâmicos controlados pela classe `.dark` no elemento html via Tailwind CSS. Nunca fixe cores nativas como `bg-[#0B0F19]` no HTML. Use sempre as variantes `dark:`.

## CI/CD e Gitea Actions
- **Automação de Deploy:** O arquivo de workflow `.gitea/workflows/ci-cd.yaml` deve manter a extração do nome do repositório via `${{ github.repository }}` para manter a portabilidade da action[cite: 3].
- **Múltiplos Runners (Paralelismo):** Para executar deploys em paralelo sem conflitos no servidor Linux, registre usando o Token Global, use pastas distintas (ex: `/opt/runner-projeto1`) e crie serviços systemd isolados[cite: 4].