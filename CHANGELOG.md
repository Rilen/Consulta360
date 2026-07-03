# Changelog

Todas as mudanças notáveis no projeto **Consulta360** serão documentadas neste arquivo.

## [v0.0.2] - 2026-07-03

### Modificado
- **Refatoração e Formatação:** Código HTML do projeto foi formatado e indentado de forma padronizada via formatador automático.

## [v0.0.1] - 2026-07-02

### Adicionado
- **Regras de Ouro (AGENTS.md):** Criação do arquivo de constituição arquitetural no diretório `.agents/` para blindar o conhecimento de infraestrutura (Nginx estático), Separação de Preocupações (SoC) e Design System.
- **Módulo Auditoria IA (`auditoria_ia.html`):** Criação de uma página dedicada à simulação preditiva de impacto orçamentário, radar de anomalias, e terminal assistente da IA com base nos dados cacheados do IndexedDB.

### Modificado
- **Arquitetura Modular (SoC):** As regras pesadas de JavaScript das páginas HTML foram extraídas e isoladas.
  - Criado `assets/js/db.js` (gerenciamento local do IndexedDB).
  - Criado `assets/js/api.js` (lógica de requisição de dados externos e helpers).
  - Centralização de estilos globais em `assets/css/global.css`.
- **Padronização UI/UX:** Alinhamento estrito do layout em todas as páginas (`index.html`, `graficos.html` e `auditoria_ia.html`):
  - **Navegação:** Menus do header unificados com os nomes: *Consulta*, *Análise de Dados*, e *Auditoria*.
  - **Identidade Visual:** Fundo *Clean Light* com orbs coloridos (Glassmorphism), e padronização do ícone primário (Consulta360) no canto superior esquerdo.
  - **Cards de Métricas:** Títulos dos cards internos padronizados para fonte maiúscula com espaçamento expandido (`text-slate-500 uppercase tracking-wider`) acompanhados de ícones em badges redondos.
  - **Filtros e Botões:** Classes CSS dos botões de ação (ex: *Gerar Análise*, *Gerar IA*) e inputs de formulário normalizados para garantir coerência visual ao alternar de tela.
