# Diretrizes de UI/UX - Ecossistema Antigravity

Este documento descreve as decisões de design, padrões visuais e arquitetura de interface aplicados no projeto (como visto no Consulta360), servindo como guia para futuras implementações, manutenções e novos módulos.

---

## 1. O Conceito "Antigravity Clean Light"
A interface foi projetada para transmitir leveza, velocidade e clareza na visualização de grande volume de dados. O conceito de "antigravidade" reflete a forma como os elementos parecem flutuar sobre o fundo, sem criar poluição visual ou fadiga cognitiva.

- **Fundo Limpo:** Evitamos o uso excessivo de temas escuros onde não são estritamente necessários. Usamos um fundo claro (`#f8fafc` - `slate-50`) que melhora o contraste com os textos e dados financeiros.
- **Glassmorphism (Efeito Vidro):** Os cartões principais não são blocos sólidos. Eles possuem um fundo ligeiramente translúcido (`bg-white/70`) com um forte desfoque de fundo (`backdrop-blur-md`), o que cria uma sensação de profundidade em relação aos "orbs" (esferas de cor desfocadas) posicionadas no fundo da tela.
- **Micro-interações:** Toda ação do usuário deve ter uma resposta fluida. Botões encolhem ligeiramente ao serem clicados (`active:scale-95`), e as cores mudam suavemente (`transition-all`).

---

## 2. Paleta de Cores (Tailwind CSS)

Optamos por usar a paleta padrão de altíssima qualidade do Tailwind CSS, focando em tons semânticos:

*   **Texto Principal e Fundos Neutros:** Escala de `slate` (`slate-50` para fundos sutis, `slate-400` para labels/ícones secundários, `slate-600` para textos em tabelas, `slate-800` para títulos).
*   **Ações Principais:** Escala de `blue` (`blue-600` para botões primários, `blue-50/50` para hover nas linhas da tabela).
*   **Valores Positivos/Proventos:** Escala de `emerald` (`emerald-600`), garantindo legibilidade e uma cor verde menos agressiva que a cor tradicional.
*   **Valores Negativos/Descontos:** Escala de `red` (`red-500`).
*   **Avisos (Alertas):** Escala de `amber` (para erros não críticos como avisos de CORS).

---

## 3. Padrões de Componentes

### 3.1. Tipografia e Ícones
- **Fonte Padrão:** *Inter* (Google Fonts) - `font-family: 'Inter', sans-serif;`. Perfeita para painéis de dados por possuir excelente legibilidade nos números.
- **Ícones:** *Lucide Icons* (traços finos e arredondados, que complementam o design limpo).

### 3.2. Data Grids (Tabelas de Dados)
O foco central do sistema. A tabela não deve possuir linhas verticais ou bordas pesadas que pareçam "tabelas do Excel antigas".
- **Cabeçalhos:** Texto minúsculo convertido para maiúsculo (`uppercase`), pequeno (`text-[11px]`), com forte espaçamento entre letras (`tracking-wider`) e cor suave (`slate-500`).
- **Scroll e Overflow:** Tabelas largas utilizam overflow horizontal com barra de rolagem customizada para não quebrar o layout da página.
- **Hover na Linha:** Ao passar o mouse sobre a linha, toda a área ganha uma cor de fundo sutil (`hover:bg-blue-50/50`) para que o usuário não perca o alinhamento da leitura, sem usar linhas guias fortes.

### 3.3. Inputs e Formulários
- **Inputs Arredondados:** Utilização de `rounded-xl` (raio de 12px).
- **Sem Bordas Agressivas:** Bordas finas e sutis (`border-slate-200`) e fundos levemente acinzentados (`bg-slate-50`) que ficam brancos e recebem um "anel de brilho" (`focus:ring-2 focus:ring-blue-500/20`) quando recebem o foco do usuário.

### 3.4. Cards de Métricas (Dashboard)
- Para facilitar a leitura no topo, informações consolidadas são expostas em *Cards*. O título da métrica é sempre discreto, dando prioridade e fonte grande e forte (`text-3xl font-bold`) ao número em si.

---

## 4. Como Replicar
Para replicar esta UI em um novo módulo HTML puro utilizando a estrutura técnica atual, você precisa de:

1. Importação do **Tailwind CSS** (via CDN).
2. Importação da fonte **Inter**.
3. Importação do **Lucide Icons**.
4. A seguinte classe CSS no seu arquivo para construir a "casca" do vidro (Glassmorphism):

```css
.ag-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 24px -8px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}
```

Qualquer `div` ou `section` que receber as classes `ag-card rounded-2xl` automaticamente assumirá o padrão visual limpo, moderno e com percepção de profundidade do Antigravity.
