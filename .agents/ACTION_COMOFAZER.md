# Guia Rápido: Como Trabalhar com o Gitea e Actions

Este é um guia expresso de como baixar o código, trabalhar nele de forma segura e devolver para o servidor Gitea da Prefeitura, de modo que o fluxo de Deploy Contínuo (Gitea Actions) seja ativado corretamente.

---

## 1. Clonar (Baixar o código pela primeira vez)
Se você ou outro desenvolvedor for trabalhar no projeto em uma máquina nova:
```bash
git clone http://10.0.0.88:3001/rilen.lima/NOME_DO_REPOSITORIO.git
```
*Isso baixa o repositório inteiro, com todo o histórico e arquivos.*

## 2. Puxar Atualizações (Sincronizar com o Servidor)
Antes de começar o dia de trabalho, garanta que seu código local está idêntico ao do servidor:
```bash
git pull origin main
```
*Isso previne que você trabalhe em cima de uma versão desatualizada.*

## 3. A Regra de Ouro: Nunca trabalhe na `main`
Para proteger o código oficial em produção, crie sempre uma ramificação (Branch) para a sua nova funcionalidade ou correção:
```bash
git checkout -b feature/minha-alteracao
```
*Agora você está em um ambiente isolado. O que você quebrar aqui, não afeta a versão oficial.*

## 4. Commit (Salvar o trabalho)
Testou o código e está funcionando? É hora de salvar o pacote:
```bash
# Adiciona todos os arquivos modificados ao pacote:
git add .

# Cria o pacote com uma mensagem clara do que foi feito:
git commit -m "feat: adiciona nova funcionalidade X"
```

## 5. Push (Enviar para o Gitea e Acionar o Deploy)
Agora você deve mandar essa branch para o servidor Gitea:
```bash
git push -u origin feature/minha-alteracao
```

### 🔄 O que acontece agora?
1. Acesse a interface web do Gitea (`http://10.0.0.88:3001`).
2. Aparecerá um botão verde de **"New Pull Request"**. Clique nele.
3. Ao aprovar e fazer o **Merge** dessa branch na `main`, o **Gitea Actions** (definido no arquivo `.gitea/workflows/ci-cd.yaml`) acordará automaticamente!
4. Ele fará o build da aplicação e injetará os novos arquivos direto no container `nginx-homologacao` (porta 3005).

> **Atenção:** Se você enviar código diretamente para a branch `main` (`git push origin main`), a Action também será acionada automaticamente realizando o deploy para homologação.
