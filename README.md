# Consulta360

Consulta360 é um sistema de transparência e consulta de folha de pagamento para servidores e colaboradores. O objetivo principal da aplicação é fornecer uma interface rápida, limpa e responsiva para a visualização de dados financeiros, com suporte a filtros dinâmicos.

## 🚀 Tecnologias e UI

- **Frontend:** HTML5 semântico com Vanilla JavaScript.
- **Estilização:** Tailwind CSS (via CDN) utilizando o conceito de **Antigravity UI**.
- **Design System:**
  - Layout focado em Data Grid.
  - Cartões com soft-shadows e hover effects.
  - Tabela com formatação especializada para dados financeiros e scroll suave.
  - Tematização "Clean Light" para alta fidelidade e leitura de dados.
- **Ícones:** Lucide Icons.

## ⚙️ Funcionalidades

- **Integração de API:** Conexão nativa (`fetch`) ao endpoint RESTful para puxar dados da folha e de servidores dinamicamente, com suporte a tratamento de CORS via proxy.
- **Filtros de Busca:**
  - Mês de referência nativo (`type="month"`) convertido para períodos.
  - Entidade (Ex: PMRO - Efetivos e Comissionados).
  - Tipo de Consulta (Folha de Pagamento ou Servidores).
  - Busca por nome do colaborador (local e na API).
- **Métricas em Tempo Real:** Exibição dinâmica de total de colaboradores, páginas de API processadas, total bruto/proventos e total líquido, baseados no retorno da API.
- **Tabela e Paginação:** Visualização rica e paginada de dados (com paginação dupla API vs Local), com ordenação interativa de colunas geradas dinamicamente.
- **Exportação:** Exportação dos dados filtrados para CSV.

## 🛠️ Deploy Automático (CI/CD)

Este repositório está configurado com um pipeline de CI/CD via **Gitea Actions** (`.gitea/workflows/ci-cd.yaml`). 

O fluxo automatizado realiza as seguintes etapas a cada `push` na branch `main`:
1. Faz o checkout do código fonte.
2. Identifica automaticamente o container central `nginx` rodando na porta `3005`.
3. Injeta o código estático no subdiretório respectivo do Nginx (ex: `http://<IP>:3005/consulta360/`).
4. (Opcional) Cria um `index.html` de redirecionamento caso o nome do repositório possua maiúsculas.

## 🖥️ Instalação do Runner

Caso seja necessário configurar um novo Runner no servidor hospedeiro para executar as Actions do Gitea, utilize o script `setup_gitea_runner.sh` fornecido na raiz do projeto.

Execute no servidor Ubuntu:
```bash
chmod +x setup_gitea_runner.sh
sudo ./setup_gitea_runner.sh
```
