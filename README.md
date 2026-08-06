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

## Setup — tudo local (recomendado para começar)

Não precisa de conta na nuvem. O Supabase roda inteiro na sua máquina (Postgres + PostgREST + Studio via Docker) e o coletor roda no Node. Como seu IP é brasileiro, o geobloqueio da API do CNJ também deixa de ser problema.

**Requisitos:** Node 18+ e Docker rodando (Docker Desktop no Mac/Windows, ou o daemon no Linux).

```bash
npm install
npm run db:start      # sobe o Supabase local, aplica as migrations e escreve .dev.vars
npm run local:djen    # varredura do DJEN agora — o teste que importa
npm run local:status  # últimas execuções registradas
```

Pronto. `npm run db:start` é idempotente e deixa o `.dev.vars` preenchido com a URL (`http://127.0.0.1:54321`) e a `service_role` local automaticamente. Veja os dados em **http://127.0.0.1:54323** (Supabase Studio — interface visual das tabelas `targets`, `djen_comunicacoes`, etc.).

Comandos auxiliares:

```bash
npm run db:reset      # recria o banco do zero aplicando supabase/migrations
npm run db:stop       # para os containers
npm run smoke         # teste de parsing sem rede (nem precisa do banco)
npm run local:depre   # coleta da DEPRE (ver aviso em docs/depre-fonte.md)
```

Cada execução imprime o resultado no terminal e registra em `runs` (com `executor: "local"`). Os dados ficam num volume Docker do Postgres local — **nada sai da sua máquina, nada vai para a nuvem.**

### Deixar rodando sozinho na sua máquina (sem nuvem)

Para o coletor rodar todo dia sem você digitar nada, agende no sistema. O único pré-requisito é a máquina estar **ligada e com o Docker no ar** na hora agendada (num notebook que dorme, ou você roda manualmente, ou deixa um mini-PC/Raspberry ligado).

**macOS / Linux (cron):** `crontab -e` e adicione (ajuste o caminho absoluto do projeto e do `npm`):

```cron
# DJEN todo dia às 06:00; DEPRE no dia 2 de cada mês às 09:00 (horário local da máquina)
0 6 * * *  cd /CAMINHO/para/Precatos && /usr/local/bin/npm run local:djen  >> ~/precatos.log 2>&1
0 9 2 * *  cd /CAMINHO/para/Precatos && /usr/local/bin/npm run local:depre >> ~/precatos.log 2>&1
```

Descubra o caminho do npm com `which npm`. O `db:start` precisa ter rodado uma vez para o banco existir; deixe o Docker Desktop configurado para iniciar junto com o sistema.

**Windows:** use o Agendador de Tarefas (Task Scheduler) apontando para `npm run local:djen` no diretório do projeto, com o Docker Desktop iniciando no boot.

### Teste do pipeline sem depender do CNJ

A API do CNJ geobloqueia IPs fora do Brasil, então em CI (ou fora do país) o `local:djen` real não roda. Para validar todo o pipeline mesmo assim — parsing, filtro anti-RPV, dedupe, consolidação de alvos e log de `runs` — há um teste de integração offline que roda o código real do coletor com uma resposta sintética da API no lugar da rede:

```bash
npm run db:start   # se ainda não estiver no ar
npm run demo:djen  # roda runDjen() com fixture e valida o resultado em `targets`
```

Deve terminar com `✅ PIPELINE OK` e deixar 1 alvo em `targets` (o RPV do fixture é filtrado e a republicação duplicada é deduplicada).

### Alternativa: Supabase na nuvem

Se preferir a nuvem (para deixar rodando sem sua máquina ligada): crie um projeto em [supabase.com](https://supabase.com) (região São Paulo), aplique `supabase/migrations/0001_init.sql` no SQL Editor e coloque a Project URL e a chave `service_role` (Settings → API) no `.dev.vars`. O mesmo schema serve para os dois.

### Ambiente com Docker restrito / aninhado

Em máquinas normais o `npm run db:start` funciona direto. Em ambientes aninhados (alguns CIs, contêineres de dev), o `supabase start` pode falhar com `error setting rlimit type 7: operation not permitted` — o runc tenta elevar o limite de arquivos acima do teto permitido. Solução: fixe um `default-ulimits` seguro no daemon do Docker, dentro do teto do host (veja `ulimit -Hn`):

```json
// /etc/docker/daemon.json
{ "default-ulimits": { "nofile": { "Name": "nofile", "Hard": 20000, "Soft": 20000 } } }
```

Reinicie o daemon e rode `db:start` de novo. Se algum container secundário (analytics/vector) ainda travar, dá para desligar serviços não-essenciais no `supabase/config.toml` (`[analytics]`, `[realtime]`, `[storage]`, `[studio]` → `enabled = false`) — o coletor só precisa de `[api]` (PostgREST) e `[db]`.

## Deploy no Worker (Cloudflare) — para automação sem máquina ligada

Opcional. Só faz sentido com o **Supabase na nuvem** (o Worker não alcança um Postgres no seu `127.0.0.1`).

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

Os crons (DJEN diário, DEPRE mensal) ficam armados automaticamente. Atenção ao geobloqueio (seção abaixo): o Worker pode sair por um PoP fora do Brasil.

### Disparo manual e status do Worker

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
