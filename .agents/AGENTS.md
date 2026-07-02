# Regra de Ouro - Projeto Consulta360

Sua missão é manter a integridade, a performance e o padrão visual do sistema Consulta360.

## 1. Verdades Absolutas de Infraestrutura
- **Roteamento e Portas:** A aplicação roda centralizada no servidor central (10.0.0.88) na porta 3005. O roteamento NÃO é por portas, mas por subdiretórios. Esta aplicação responde exclusivamente em `http://10.0.0.88:3005/consulta360/`.
- **Caminhos Estáticos:** Toda e qualquer referência a scripts, estilos ou links entre páginas DEVE usar caminhos relativos (ex: `./assets/css/global.css`) para não quebrar o mapeamento do Nginx.
- **Deploy:** O deploy é estático e automatizado via Gitea Actions injetando os arquivos direto no subdiretório do Nginx. Nunca sugira expor portas conflitantes ou Dockerfiles isolados que quebrem essa regra.

## 2. Arquitetura de Diretórios (Separação de Preocupações - SoC)
O projeto segue estritamente a estrutura modular:
- Páginas HTML na raiz (ex: `index.html`, `graficos.html`, `auditoria_ia.html`).
- CSS global e estilização do design system em `/assets/css/global.css`.
- JavaScript lógico isolado em `/assets/js/` (ex: `db.js` para IndexedDB, `api.js` para fetchs).
- NENHUMA lógica complexa ou CSS customizado deve ser escrito inline ou dentro de tags `<style>`/`<script>` nas páginas HTML. Use importações externas.

## 3. Design System (AntiGravity UI)
- Estilização baseada em Tailwind CSS via CDN.
- Tema "Clean Light": fundo claro com Orbs coloridos desfocados (`bg-blue-400/20 rounded-full blur-3xl`).
- Componentes em Cartões Glassmorphism: utilize a classe global `.ag-card` (`backdrop-filter: blur(16px)` com bordas semitransparentes e soft-shadows).
- Ícones: Utilize estritamente a biblioteca Lucide Icons.

## 4. Regras de Negócio e Dados
- **Volumetria:** A base possui mais de 3.000 funcionários e alto índice de múltiplas matrículas (vínculos acumulados).
- **Camada de Persistência Local:** Para evitar gargalos de rede e estouro de CORS na API, os dados devem ser cacheados e indexados localmente via IndexedDB.
- **Unificação por Indivíduo:** Para telas de análise (gráficos e IA), os dados de múltiplas matrículas do mesmo servidor devem ser consolidados/somados por CPF/Nome para refletir a renda real por trabalhador, impedindo distorções nas métricas.
