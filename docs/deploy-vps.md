# Deploy num VPS no Brasil (Oracle Cloud Always Free)

Guia para rodar o coletor sozinho, todo dia, sem seu PC ligado. Escolhemos a
**Oracle Cloud "Always Free"** por ser a única opção **grátis para sempre** com
**datacenter no Brasil** (necessário: a API do CNJ bloqueia IPs de fora do país).

## Passo 0 — o teste que decide tudo (2 minutos)

Um IP de datacenter *deveria* passar no bloqueio do CNJ (que é por país), mas
IPs de nuvem às vezes são bloqueados à parte. **Antes de configurar qualquer
coisa**, assim que a VPS estiver de pé, rode:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://comunicaapi.pje.jus.br/api/v1/comunicacao?pagina=1&itensPorPagina=1&siglaTribunal=TJSP"
```

- **`200`** → o IP passou. Siga o guia.
- **`403`** → esse IP foi bloqueado. Não adianta seguir nessa VPS; use sua
  conexão residencial (caminho local) ou um provedor com IP diferente.

## Passo 1 — criar a conta e a instância

1. Crie a conta em <https://www.oracle.com/cloud/free/> (exige cartão, mas o
   tier Always Free não cobra). **Ao escolher a *home region*, selecione
   "Brazil East (São Paulo)"** — os recursos Always Free ficam presos à região
   escolhida no cadastro.
2. No console: **Compute → Instances → Create Instance**.
   - **Image:** Canonical Ubuntu 22.04 (ou 24.04).
   - **Shape:** clique em "Change Shape" → **Ampere (ARM)** `VM.Standard.A1.Flex`
     se quiser rodar o Supabase local junto (peça 1 OCPU / 6 GB — cabe no free);
     ou **`VM.Standard.E2.1.Micro`** (AMD, 1 GB) se for só o coletor apontando
     para um Supabase na nuvem. Se der "out of capacity" na ARM, use a E2.1.Micro.
   - **SSH keys:** faça upload da sua chave pública (ou gere e baixe a privada).
3. Anote o **IP público** da instância.

## Passo 2 — abrir/entrar e preparar a máquina

```bash
ssh ubuntu@SEU_IP_PUBLICO

# Node 20 + git
sudo apt-get update && sudo apt-get install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version   # deve mostrar v20.x
```

**Agora rode o teste do Passo 0.** Se der `200`, prossiga.

## Passo 3 — clonar e configurar

```bash
git clone https://github.com/ironguga/Precatos.git
cd Precatos
git checkout claude/precatorios-origination-platform-wro99o
npm install
```

Configure o `.dev.vars`. Duas opções para o banco:

- **Supabase na nuvem (recomendado nesta VPS):** crie o projeto em supabase.com
  (região São Paulo), aplique `supabase/migrations/0001_init.sql` no SQL Editor,
  e preencha:
  ```bash
  cat > .dev.vars <<'EOF'
  SUPABASE_URL=https://SEU-PROJETO.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
  ADMIN_TOKEN=um-token-qualquer
  EOF
  ```
- **Supabase local na VPS (só na shape ARM, precisa de RAM):** instale o Docker
  e rode `npm run db:start`.

Valide o pipeline sem depender do CNJ:

```bash
npm run demo:djen   # deve terminar com ✅ PIPELINE OK (se usar Supabase local)
```

E o coletor de verdade (agora com IP brasileiro):

```bash
npm run local:djen
npm run local:status
```

## Passo 4 — agendar no cron (rodar sozinho)

```bash
crontab -e
```

Adicione (ajuste o caminho absoluto do projeto). Roda o DJEN todo dia às 6h e a
DEPRE no dia 2 de cada mês, gravando log em `~/precatos-cron.log`:

```cron
0 9 * * *  cd /home/ubuntu/Precatos && /usr/bin/npm run local:djen  >> /home/ubuntu/precatos-cron.log 2>&1
0 12 2 * * cd /home/ubuntu/Precatos && /usr/bin/npm run local:depre >> /home/ubuntu/precatos-cron.log 2>&1
```

> Os horários estão em UTC (padrão do cron em servidores). 09:00 UTC = 06:00 em
> Brasília. Para usar horário local, rode antes:
> `sudo timedatectl set-timezone America/Sao_Paulo`.

## Manutenção

- Ver os últimos runs: `npm run local:status` (ou consulte a tabela `runs` no
  Supabase Studio).
- Atualizar o código: `cd ~/Precatos && git pull`.
- Logs do cron: `tail -f ~/precatos-cron.log`.

## Plano B

Se o IP da Oracle for bloqueado (Passo 0 = 403) ou faltar capacidade Always
Free: um provedor brasileiro com teste rápido (ex.: VPS Brasil, 7 dias com
reembolso) serve para validar; ou rode o coletor pela sua própria conexão
residencial, que usa IP que o CNJ não costuma bloquear.
