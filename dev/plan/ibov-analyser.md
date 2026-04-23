# IBov Analyser

## Contexto

Criar uma aplicação Node.js com um dashboard web que exibe gráficos da cotação e performance de 3 ações da B3 (PETR3, ITUB3, VALE3) durante o ano de 2025. O usuário quer analisar visualmente os dados históricos, sem usar Python.

## Arquitetura

- **Backend:** Node.js com Express para servir dados via API REST
- **Frontend:** HTML/CSS/JS puro com Chart.js para os gráficos
- **Dados:** Yahoo Finance API direto via `fetch` nativo (Node 24)

## Arquivos a criar/modificar

- Renomear ou substituir `calculator.html` com o novo `index.html`
  - `package.json` — dependências do projeto
  - `server.js` — servidor Express
  - `data/petr3.json`, `data/itub3.json`, `data/vale3.json` — dados cacheados em JSON
  - `index.html` — dashboard com gráficos

## Dependências

- `express` — servidor web
- `chart.js` — gráficos no frontend (via CDN, sem instalar no backend)
- Sem outras dependências (usar `fetch` nativo do Node 24 e `fs/promises`)

## Passos de Execução

### 1. Inicializar projeto e instalar dependências

```bash
npm init -y
npm install express
```

### 2. Criar `server.js`

- Endpoint `GET /api/stocks/:ticker` — retorna dados JSON históricos
- Endpoint `GET /api/stocks/:ticker?refresh=true` — força rebusca do Yahoo Finance
- Servir `index.html` como página principal via `express.static`
- 3 symbols: `PETR3.SA`, `ITUB3.SA`, `VALE3.SA`
- Se dados não existem em cache (ou `refresh=true`), buscar do Yahoo Finance via `fetch` nativo, salvar em `data/*.json`
- URL Yahoo Finance: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&period1={timestamp_start}&period2={timestamp_end}`

### 3. Cache local

- `data/petr3.json`, `data/itub3.json`, `data/vale3.json`
- Formato: `[{date, open, high, close, volume}, ...]`

### 4. Criar `index.html` (dashboard)

- Header com título "IBov Analyser — PETR3, ITUB3, VALE3"
- **3 gráficos individuais separados** (Chart.js), um para cada ação:
  - Gráfico de linha/área com preço de fechamento ao longo de 2025
  - Cores: PETR3 (verde #2ecc71), ITUB3 (azul #3498db), VALE3 (vermelho #e74c3c)
- **KPIs por ação no frontend:**
  - Variação % no ano, Máximo, Mínimo, Preço médio, Desvio padrão (volatilidade)
- **Gráfico de comparação de performance:** Retorno % acumulado (normalizado a 100 no início do ano) — gráfico único com 3 linhas para comparar as 3 ações
- Botão "Atualizar dados" para force-refresh do Yahoo Finance

### 5. Estilizar o dashboard

- Layout em grid responsivo
- Tema escuro/clean
- Tooltips nos gráficos com data e valores

## Verificação

1. `node server.js` — servidor inicia sem erros
2. Abrir `http://localhost:3000` — dashboard carrega
3. Verificar que os 4 gráficos aparecem com dados (3 individuais + 1 comparativo)
4. Verificar que os KPIs calculam corretamente
5. Verificar botão de atualização
6. Verificar responsividade
