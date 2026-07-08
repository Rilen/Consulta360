# Consulta360

Consulta360 é um sistema avançado de transparência, inteligência e auditoria de folha de pagamento e dados públicos. O objetivo da aplicação é fornecer uma interface rápida, limpa e autônoma, processando grandes volumes de dados no lado do cliente com arquitetura colaborativa.

## 🚀 Arquitetura e Tecnologias

- **Frontend Core:** HTML5 Semântico e Vanilla JavaScript (Single Page Application via `router.js`).
- **Design System (Antigravity UI):** Tailwind CSS, layout focado em Data Grid, Glassmorphism e Lucide Icons.
- **Armazenamento Descentralizado:**
  - **IndexedDB:** Motor principal do sistema. Todo o processamento (filtros, paginação, totais) é realizado instantaneamente no banco de dados do navegador do usuário, suportando milhares de registros em milissegundos sem tráfego de rede.
  - **Cache Colaborativo Local (Intranet):** Utiliza o protocolo WebDAV do Nginx. Quando o primeiro usuário baixa dados pesados da API governamental, o sistema compartilha (*upload* silencioso) o arquivo `.json` no servidor Nginx (`/data/`). Os próximos usuários baixam a cópia local, minimizando requisições externas e garantindo ultra-velocidade.
- **Proxy em Borda:** Roteamento via Cloudflare Worker Serverless para contornar bloqueios CORS da API original de forma invisível.

## ⚙️ Funcionalidades Principais

- **Auto-Sincronização Invisível:** Baixa os dados disponíveis na intranet automaticamente para o IndexedDB em background.
- **Evolução Salarial:** Consome o IndexedDB do usuário para plotar o histórico real de ganhos ao longo do tempo, unificando matrículas diferentes por CPF.
- **Auditoria Inteligente (Upload PDF):** Lê contracheques e arquivos em tempo real no navegador, comparando rubricas contra os dados governamentais e alertando fraudes ou divergências.
- **Business Intelligence (Macro-Dashboard):** Processa milhares de registros para entregar métricas globais, cruzamento de vínculos (Efetivos x Comissionados) e ranking salarial na hora.
- **Máquina do Tempo (Diff Salarial):** Compara automaticamente a base de dados de dois meses distintos e exibe quem foi contratado, demitido ou recebeu aumentos/cortes.
- **Progressive Web App (PWA):** Instalável no desktop/mobile, permite navegação e consulta históricas mesmo 100% offline.

## 🛠️ Deploy Automático (CI/CD)

O pipeline roda via **Gitea Actions** e atualiza os subdiretórios estáticos do servidor Nginx local (`http://10.0.0.88:3005/consulta360/`). Apenas os arquivos HTML/JS/CSS são atualizados, garantindo que o diretório `/data/` de cache colaborativo não seja afetado pelas pipelines de deploy.


## Guia Rápido: Como Trabalhar com o Gitea e Actions

Este é um guia expresso de como baixar o código, trabalhar nele de forma segura e devolver para o servidor Gitea da Prefeitura, de modo que o fluxo de Deploy Contínuo (Gitea Actions) seja ativado corretamente.

### 1. Clonar (Baixar o código pela primeira vez)
```bash
git clone http://10.0.0.88:3001/rilen.lima/NOME_DO_REPOSITORIO.git
```

### 2. Puxar Atualizações (Sincronizar com o Servidor)
Antes de começar o dia de trabalho, garanta que seu código local está atualizado:
```bash
git pull origin main
```

### 3. A Regra de Ouro: Nunca trabalhe na `main`
Crie sempre uma ramificação (Branch) para a sua nova funcionalidade ou correção:
```bash
git checkout -b feature/minha-alteracao
```

### 4. Commit (Salvar o trabalho)
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

### 5. Push (Enviar para o Gitea e Acionar o Deploy)
```bash
git push -u origin feature/minha-alteracao
```

#### 🔄 O que acontece agora?
1. Acesse a interface web do Gitea (`http://10.0.0.88:3001`).
2. Aparecerá um botão verde de **"New Pull Request"**. Clique nele.
3. Ao aprovar e fazer o **Merge** dessa branch na `main`, o **Gitea Actions** acordará automaticamente e fará o deploy no `nginx-homologacao`.
