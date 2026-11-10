# InvestIQ

Gerenciador de carteira de investimentos (ações, FIIs e ETFs da B3).

## Stack

Next.js (App Router) · TypeScript strict · Tailwind + shadcn/ui · Postgres (Neon) + Drizzle ORM · Better Auth · Zod · Vitest · brapi.dev · Vercel

## Como rodar

```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run dev
```

Scripts: `npm test`, `npm run typecheck`, `npm run build`.

## Decisões

### TypeScript `strict` + `noUncheckedIndexedAccess`
`strict` obriga a tratar `null`/`undefined` e proíbe `any` implícito. `noUncheckedIndexedAccess` faz `array[0]` ser `T | undefined`. Em um app financeiro, um `undefined` virando `NaN` no meio de uma conta mostraria valores errados sem erro visível.

### Login próprio com Better Auth (não o Neon Auth)
As tabelas de usuário/sessão ficam no nosso `schema.ts`, versionadas, com chave estrangeira direta para `transactions`. Sem dependência do provedor de banco e com o fluxo de autenticação visível no código.

### Branches do banco (Neon)
- `main`: produção (somente na Vercel).
- `hm`: homologação / desenvolvimento local (`DATABASE_URL`).
- `test`: testes automatizados, que apagam dados (`DATABASE_URL_TEST`).

### Dinheiro com `decimal.js`, nunca `number`
`0.1 + 0.2 !== 0.3` em ponto flutuante. Todo cálculo usa `Decimal` (`src/lib/money.ts`) com 40 dígitos de precisão; o arredondamento para centavos (`ROUND_HALF_UP`) acontece **apenas na exibição** (`formatBRL`, `formatPercent`). Usamos `Decimal.clone()` para não alterar a configuração global da biblioteca.

### Posição derivada das transações
A posição não é armazenada: `calculatePosition()` a recalcula a partir do histórico. Fonte única de verdade, sem risco de dessincronizar.

### Preço médio pelo método da Receita Federal
- Compra: custo += quantidade × preço + taxas; preço médio = custo ÷ quantidade.
- Venda: **não altera o preço médio**; baixa `quantidade × preço médio` do custo e gera lucro realizado = (quantidade × preço − taxas) − custo baixado.
- Transações são processadas em ordem cronológica; uma venda maior que a posição naquela data é rejeitada (`InsufficientQuantityError`).

### shadcn/ui
Os componentes são copiados para `src/components/ui` — código nosso, editável, sem atualizações externas quebrando o visual.

### Drizzle ORM com driver `pg` (node-postgres)
Escolhemos `drizzle-orm/node-postgres` em vez do driver HTTP do Neon porque precisamos de **transações interativas** (ler a posição e inserir a venda de forma atômica) e porque o mesmo driver funciona nos testes. Na Vercel (Fluid Compute) as instâncias são reutilizadas, então um `Pool` pequeno (`max: 5`) sobre a URL *pooled* do Neon é suficiente. Colunas de dinheiro são `numeric(20, 8)`, nunca `real`/`double`, e há `CHECK` constraints como última linha de defesa.

### Autenticação (Better Auth)
- `src/lib/auth.ts` (servidor) + `src/lib/auth-client.ts` (navegador) + rota catch-all `src/app/api/auth/[...all]/route.ts`.
- Tabelas geradas pelo CLI (`npx auth generate`) em `src/db/auth-schema.ts` e aplicadas pela migração `0001_auth`. `transactions.user_id` tem FK para `user` com `ON DELETE CASCADE`.
- **Duas camadas de proteção:** `src/proxy.ts` faz uma checagem otimista (só existência do cookie, sem banco) para redirecionar rápido; `requireUser()` em `src/lib/session.ts` valida a sessão no banco e é chamado em toda página e Server Action protegida. O proxy sozinho nunca é confiável.
- Com Cache Components (Next 16), ler a sessão é dado de requisição: o componente que chama `requireUser()` fica dentro de `<Suspense>`, e o resto da página é pré-renderizado (rota "Partial Prerender" no build).

### Cliente da brapi (`src/lib/market/brapi.ts`)
- Único ponto de acesso à brapi. Usa a API **v2** (`/v2/stocks/quote`, `/v2/tickers`), recomendada pela documentação, com token no header `Authorization: Bearer` (não em `?token=`, que vaza em logs).
- Respostas validadas com **Zod**: se o formato mudar, o erro aparece na fronteira, não como `undefined` na tela.
- **Cache em `price_cache`**: com pregão aberto a cotação vale 15 min; com pregão fechado vale se foi buscada após o último fechamento. Se a API falhar, devolvemos a última cotação salva marcada como `stale`.
- Pregão simplificado: seg–sex, 10h–18h (America/Sao_Paulo), **sem feriados**. Num feriado só fazemos chamadas a mais, nunca mostramos preço errado.
- Plano gratuito: 1 ticker por chamada e 1 requisição simultânea → cotações buscadas em sequência.
- Injeção de dependências (`createBrapiClient({ fetch, store, now })`) permite testar sem rede e sem banco.
- Tipo do ativo vem do `subType` da brapi: `stock`/`unit` → STOCK, `fii` → FII, `etf` → ETF; demais (BDR, FIDC...) ficam fora do escopo.

### Telas e Server Actions (fase 1)
- **Camadas:** página (Server Component) → Server Action (`actions.ts`: sessão, FormData, Zod, mensagens) → serviço (`create-transaction.ts`: regras de negócio, recebe `db`/`brapi` por parâmetro) → `calculatePosition` (lógica pura).
- **Venda maior que a posição:** a validação acontece dentro de uma transação do banco com `pg_advisory_xact_lock` por usuário+ativo, simulando a posição com a nova operação em ordem cronológica. Duas vendas simultâneas não conseguem passar juntas.
- **Ativo novo:** buscado na brapi pelo ticker exato e criado em `assets` com `onConflictDoNothing` (seguro contra corrida).
- **Client Components só onde há interatividade:** formulário (estado, debounce da busca, `useActionState`), links do menu (`usePathname`), botão de sair. Todo o resto é Server Component.
- **Sem `useEffect` para buscar dados:** as páginas leem o banco no servidor; após a mutação, `revalidatePath("/carteira", "layout")` atualiza as duas telas.
- **Cache Components:** partes que dependem da requisição (sessão, cotações, e o formulário que usa a data de hoje) ficam em `<Suspense>`; a moldura é pré-renderizada.
- **Rentabilidade exibida:** não realizada (valor de mercado − custo das posições abertas). Posições sem cotação não entram no patrimônio e geram um aviso.

### Visual (tema preto como principal)
- Baseado no design "Conferência de cotas e registrador": estilo shadcn/ui, paleta zinc, Inter + JetBrains Mono (números), cards com borda fina e cantos de 12px, abas segmentadas e badges.
- O `<html>` recebe `class="dark"` fixo: o tema preto é o padrão. Os tokens de `.dark` em `globals.css` usam a paleta zinc (fundo `#09090b`).
- Lucro e prejuízo usam tokens próprios (`--gain`, `--loss`), com tons mais claros no tema escuro para manter contraste ≥ 4.5:1.
- O total da operação é exibido em tempo real no formulário (prévia com `Decimal`); o valor oficial continua sendo calculado e validado no servidor.

### Modo visitante (`/visitante`)
- Botão "Entrar como visitante" no login. Nada do visitante vai para o banco: as transações ficam no `localStorage` do navegador (chave `investiq:visitante:v1`), como texto, e viram `Decimal` na leitura.
- **Mesma regra, dois lugares de gravação.** O cálculo da carteira saiu de `queries.ts` para `summarizePortfolio` (`src/lib/portfolio/summarize.ts`), função pura usada pelo servidor (logado) e pelo navegador (visitante). O formulário e a tabela são os mesmos; só muda quem grava (`submit`: Server Action × `guestSubmit`).
- O visitante passa pela mesma validação Zod e pela mesma checagem de venda maior que a posição (`calculatePosition`) — mas no navegador, então é só conveniência: dá para burlar, e tudo bem, porque o dado é só dele.
- Cotações e busca de ativos continuam no servidor (o `BRAPI_TOKEN` não pode ir ao navegador), por Server Actions sem login com limite de tamanho. A única escrita no banco nesse fluxo é o `price_cache`, que é compartilhado e não guarda dado de usuário.
- O React lê o `localStorage` com `useSyncExternalStore` (feito para fontes de dados externas; atualiza também em outra aba). No servidor ele devolve `null` e a tela mostra o esqueleto, por isso as páginas `/visitante` são estáticas.
