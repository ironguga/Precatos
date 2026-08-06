#!/usr/bin/env bash
# Sobe o Supabase local (Docker) e escreve .dev.vars com as credenciais reais
# impressas pelo próprio Supabase. Idempotente: pode rodar quantas vezes quiser.
#
# Uso:
#   ./scripts/db-local.sh          # start + preenche .dev.vars
#   ./scripts/db-local.sh stop     # para os containers
#   ./scripts/db-local.sh reset    # recria o banco aplicando as migrations
#
# Requisitos: Docker rodando e a CLI do Supabase (usamos via npx).
set -euo pipefail

cd "$(dirname "$0")/.."
SUPABASE="npx --yes supabase@2.111.0"

case "${1:-start}" in
  stop)
    $SUPABASE stop
    exit 0
    ;;
  reset)
    # aplica supabase/migrations do zero
    $SUPABASE db reset
    ;;
  start)
    if ! docker info >/dev/null 2>&1; then
      echo "ERRO: o Docker não está rodando. Abra o Docker Desktop (ou inicie o daemon) e tente de novo." >&2
      exit 1
    fi
    # start é idempotente; se já estiver de pé, apenas segue
    $SUPABASE start || true
    ;;
  *)
    echo "uso: $0 [start|stop|reset]" >&2
    exit 1
    ;;
esac

echo "Lendo credenciais locais do Supabase..."
# `status -o env` imprime API_URL, SERVICE_ROLE_KEY, ANON_KEY, DB_URL, etc.
ENV_OUT="$($SUPABASE status -o env)"

get() { echo "$ENV_OUT" | grep -E "^$1=" | head -1 | cut -d= -f2- | tr -d '"'; }

API_URL="$(get API_URL)"
SERVICE_ROLE_KEY="$(get SERVICE_ROLE_KEY)"

if [ -z "$API_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERRO: não consegui ler API_URL/SERVICE_ROLE_KEY do 'supabase status'." >&2
  echo "$ENV_OUT" >&2
  exit 1
fi

cat > .dev.vars <<EOF
# Gerado por scripts/db-local.sh — Supabase LOCAL. Não commitar.
SUPABASE_URL=$API_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
ADMIN_TOKEN=local-dev-token
EOF

echo
echo "✅ Supabase local no ar."
echo "   API:    $API_URL"
echo "   Studio: http://127.0.0.1:54323  (interface visual das tabelas)"
echo "   .dev.vars preenchido. Agora rode:  npm run local:djen"
