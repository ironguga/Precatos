# Precatos — plataforma de originação de precatórios

Sistema de originação para **comprador** independente de precatórios (foco inicial: Fazenda do Estado de São Paulo / TJSP). Este repositório contém o **módulo 1 — captação de dados**, rodando como Cloudflare Worker com cron e gravando no Supabase.

## Módulos previstos

1. **Captação** *(este módulo)* — scraper da ordem cronológica da DEPRE + monitor diário do DJEN via API Comunica (CNJ)
2. Enriquecimento — e-SAJ, lookup de advogado (OAB/CNPJ), contatos
3. Scoring e precificação — deságio por posição na fila × natureza × prazo × Selic
4. CRM de abordagem — pipeline de alvos, disparo, follow-up
5. Diligence — checklist automatizado com leitura dos autos

## Arquitetura do módulo 1

```
cron diário (09:00 UTC) ──> DJEN / API Comunica ──┐
                                                   ├──> Supabase
cron mensal (dia 2)     ──> DEPRE / planilhas  ───┘
```

- **DJEN** (`src/sources/djen.ts`): consulta `https://comunicaapi.pje.jus.br/api/v1/comunicacao` com os termos de `src/config.ts` ("ofício requisitório", "expedição de precatório" etc. + termos nível 2 de desapropriação), filtra RPV, deduplica e grava em `djen_comunicacoes`; consolida um alvo por processo em `targets`. É a peça do "negociar na frente": detecta o precatório no dia em que a publicação sai.
- **DEPRE** (`src/sources/depre.ts`): baixa a página de listas da DEPRE, descobre os links das planilhas por ente devedor, faz o parse (cabeçalho localizado por heurística) e grava a foto mensal em `depre_entries`; entradas acima de `DEPRE_VALOR_MINIMO` viram alvos.
- **Dedupe/pipeline**: `targets.numero_processo` é único; inserções usam *ignore-duplicates*, então o trabalho manual de pipeline (status, anotações) nunca é sobrescrito pelo robô.

## Setup

### 1. Supabase

Crie um projeto e aplique `supabase/migrations/0001_init.sql` no SQL Editor. Tabelas criadas: `targets`, `djen_comunicacoes`, `depre_entries`, `runs` (todas com RLS ligado; o Worker usa a service role key).

### 2. Rodar localmente (recomendado antes do deploy)

Rodando da sua máquina no Brasil, o geobloqueio da API do CNJ não é problema — é o melhor jeito de validar tudo antes de subir o Worker. Requer Node 18+.

```bash
npm install
cp .dev.vars.example .dev.vars   # preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

npm run local:djen    # varredura do DJEN agora
npm run local:depre   # coleta da DEPRE agora
npm run local:status  # últimas execuções registradas
npm run smoke         # teste de parsing sem rede (não precisa de Supabase)
```

Cada execução imprime o resultado no terminal e registra em `runs` (com `executor: "local"`). Depois de validar, siga para o deploy do Worker para ter os crons automáticos — ou, se preferir, agende os comandos locais no cron da sua própria máquina e nem use o Cloudflare.

### 3. Worker (Cloudflare)

```bash
npm install
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

Para desenvolvimento local: copie `.dev.vars.example` para `.dev.vars` e rode `npm run dev`.

### 4. Disparo manual e status do Worker

```bash
curl -X POST https://<worker>.workers.dev/run/djen  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST https://<worker>.workers.dev/run/depre -H "Authorization: Bearer $ADMIN_TOKEN"
curl      https://<worker>.workers.dev/status       -H "Authorization: Bearer $ADMIN_TOKEN"
```

Cada execução (cron ou manual) registra uma linha em `runs` com contagens e erros.

## ⚠️ Geobloqueio da API Comunica

O CloudFront na frente de `comunicaapi.pje.jus.br` **bloqueia IPs fora do Brasil** (verificado: 403 "configured to block access from your country"). Consequências práticas:

- Requisições de Workers podem sair por PoPs fora do Brasil — se o run do DJEN falhar com o erro de geobloqueio (fica registrado em `runs.detalhes`), as opções são:
  1. **Smart Placement** (`[placement] mode = "smart"` no `wrangler.toml`) — pode ajudar, sem garantia;
  2. rodar o coletor DJEN em uma máquina/VPS no Brasil chamando os mesmos endpoints `POST /run/djen` — o código já funciona fora do Worker com pequenos ajustes;
  3. um proxy HTTP com egress no Brasil.
- O scraper da DEPRE (site do TJSP) pode ter a mesma restrição; o tratamento de erro é o mesmo.

O primeiro deploy deve ser tratado como teste: dispare `POST /run/djen` manualmente e confira `runs`.

## Pontos de calibração

- **Planilhas da DEPRE**: o layout muda de tempos em tempos. As heurísticas de cabeçalho estão em `MAPA_COLUNAS` (`src/sources/depre.ts`) e a URL da página em `DEPRE_LIST_URL` (`wrangler.toml`).
- **Termos de busca e filtros**: `src/config.ts` (`TERMOS_DJEN`, `TERMOS_DJEN_NIVEL2`, `FILTRO_TEXTO`, `DEPRE_VALOR_MINIMO`, `DEPRE_ENTES_INTERESSE`).
- **Shape da API Comunica**: o cliente cobre as variantes de nome de campo conhecidas (`camelCase`/`snake_case`); se a API mudar, ajustar `ComunicaItem` em `src/sources/djen.ts`.

## Estrutura de compra (nota jurídica, não é aconselhamento)

Para uso próprio (cessionário direto): escritura pública de cessão + habilitação nos autos, sem regulação especial. Se virar negócio recorrente (comprar para revender), estruturar via FIDC/securitizadora antes de escalar.
