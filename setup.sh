#!/usr/bin/env bash
#
# setup.sh — instala e coloca o coletor rodando, 100% local (sem nuvem).
#
# Faz, em sequência:
#   1. confere Node e Docker
#   2. instala as dependências (npm install)
#   3. sobe o Supabase local e preenche o .dev.vars (npm run db:start)
#   4. valida todo o pipeline sem depender do CNJ (npm run demo:djen)
#   5. tenta a primeira coleta real do DJEN (só funciona com IP do Brasil)
#
# Uso (a partir da pasta do projeto já clonado):
#   ./setup.sh
#
# Máquina nova? Clone primeiro (o repositório é privado, precisa do seu
# acesso ao GitHub) e então rode o setup:
#   git clone https://github.com/ironguga/Precatos.git
#   cd Precatos
#   git checkout claude/precatorios-origination-platform-wro99o
#   ./setup.sh
set -euo pipefail
cd "$(dirname "$0")"

azul()   { printf "\033[1;34m%s\033[0m\n" "$*"; }
verde()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
amarelo(){ printf "\033[1;33m%s\033[0m\n" "$*"; }
erro()   { printf "\033[1;31m%s\033[0m\n" "$*" >&2; }

# ---------------------------------------------------------------- pré-requisitos
azul "==> 1/5  Conferindo pré-requisitos"

if ! command -v node >/dev/null 2>&1; then
  erro "Node não encontrado. Instale o Node 18+ em https://nodejs.org e rode de novo."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  erro "Node $(node -v) é antigo. Precisa de 18+."
  exit 1
fi
echo "Node $(node -v) ok"

if ! command -v docker >/dev/null 2>&1; then
  erro "Docker não encontrado. Instale o Docker Desktop (Mac/Windows) ou o daemon (Linux) e rode de novo."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  erro "O Docker está instalado mas não está rodando. Abra o Docker Desktop (ou inicie o daemon) e rode de novo."
  exit 1
fi
echo "Docker ok"

# ---------------------------------------------------------------- dependências
azul "==> 2/5  Instalando dependências (npm install)"
npm install

# ---------------------------------------------------------------- banco local
azul "==> 3/5  Subindo o Supabase local e preenchendo o .dev.vars"
npm run db:start

# ---------------------------------------------------------------- validação
azul "==> 4/5  Validando o pipeline (offline, sem depender do CNJ)"
if npm run demo:djen; then
  verde "Pipeline validado."
else
  erro "A validação do pipeline falhou. Veja o erro acima."
  exit 1
fi

# ---------------------------------------------------------------- coleta real
azul "==> 5/5  Tentando a primeira coleta real do DJEN"
echo "(Só funciona com IP do Brasil — a API do CNJ bloqueia fora do país.)"
if npm run local:djen; then
  verde "Coleta real concluída."
else
  amarelo "A coleta real não passou agora."
  amarelo "Se apareceu erro de geobloqueio, é porque esta máquina está fora do Brasil."
  amarelo "Rode 'npm run local:djen' de uma máquina/conexão no Brasil."
fi

echo
verde "======================================================"
verde " Pronto. Supabase local no ar."
verde "   Studio (ver as tabelas): http://127.0.0.1:54323"
verde "   Coleta manual:           npm run local:djen"
verde "   Últimas execuções:       npm run local:status"
verde "   Parar o banco:           npm run db:stop"
verde "======================================================"
echo "Para rodar sozinho todo dia, veja a seção de agendamento no README."
