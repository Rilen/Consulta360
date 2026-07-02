# Política de Uso de Portas no Ecossistema

Este documento visa padronizar e esclarecer o funcionamento da alocação de portas na infraestrutura de aplicações web. 

## A Porta 3005 🚪
Em nosso ambiente central (Nginx), a **porta 3005** atua como um *Gateway / Reverse Proxy Central* de uso **compartilhado**. 

Isso significa que **não dedicamos uma porta diferente para cada projeto**. Ao invés disso, todos os projetos frontend (ex: AuditorIA, SentiGOV, Consulta360) respondem na mesma porta 3005, e a separação dos projetos é feita exclusivamente através de **subdiretórios na URL**.

**Exemplos Reais:**
- ✅ `http://10.0.0.88:3005/sentigov/`
- ✅ `http://10.0.0.88:3005/consulta360/`
- ✅ `http://10.0.0.88:3005/auditoria/`

---

## 🤖 Prompt para Contextualizar o AntiGravity (IA)
Caso esteja em um novo projeto ou precise lembrar o AntiGravity (ou outras IAs) de como a infraestrutura funciona para evitar que ele gere configurações de Nginx ou Docker incorretas (ex: mapeando portas locais erradas), utilize o *prompt* abaixo:

> **Prompt de Contexto de Infraestrutura:**
> "Atenção: Na nossa infraestrutura, a porta 3005 é de uso compartilhado no servidor central (10.0.0.88). O roteamento entre as aplicações não é feito por portas diferentes, mas sim por subdiretórios (ex: /sentigov, /consulta360). Ao gerar Dockerfiles, workflows de CI/CD ou configurações de servidor, lembre-se de que nossa aplicação deve apenas injetar seus arquivos de build (HTML/estáticos) na respectiva subpasta. Nunca suba um container novo expondo portas conflitantes na rede, apenas injete os arquivos da aplicação no Nginx já existente que opera na 3005."
