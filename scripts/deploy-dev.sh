#!/usr/bin/env bash
# Ambiente de TESTE na VPS, ao lado da produção — não mexe nela (outra pasta, projeto, container e porta):
#   testes → envia o código deste checkout → docker compose (projeto niltonpark-dev) → confere o /health.
# Serve para testar um branch "em produção" (internet de verdade, celular no 4G) antes de mergear e rodar o deploy.sh.
#
# Uso:  ./scripts/deploy-dev.sh           sobe/atualiza http://<VPS>:3001
#       ./scripts/deploy-dev.sh --down    derruba o ambiente de teste (a produção continua)
#       ./scripts/deploy-dev.sh --logs    últimas linhas do log
# Variáveis (opcionais): VPS_HOST, VPS_PORT (SSH), VPS_USER, VPS_DIR, GAME_PORT, PROD_DIR
set -euo pipefail

VPS_HOST="${VPS_HOST:-204.157.124.113}"
VPS_PORT="${VPS_PORT:-45392}"
VPS_USER="${VPS_USER:-daniel}"
VPS_DIR="${VPS_DIR:-servers/niltonpark-dev}"
PROD_DIR="${PROD_DIR:-servers/niltonpark}"   # só para ler o segredo do TURN (a voz usa o TURN da produção)
GAME_PORT="${GAME_PORT:-3001}"
SSH=(ssh -p "$VPS_PORT" -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST")

cd "$(dirname "$0")/.."
case "${1:-}" in
  --down) "${SSH[@]}" "cd $VPS_DIR && docker compose down"; echo "✔ ambiente de teste derrubado (produção intacta)"; exit 0 ;;
  --logs) "${SSH[@]}" "cd $VPS_DIR && docker compose logs --tail 60"; exit 0 ;;
esac

VERSION=$(node -p "require('./package.json').version")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo '?')
DIRTY=$(git status --porcelain 2>/dev/null | grep -qv '^??' && echo ' (+ alterações não commitadas)' || true)

echo "▶ 1/4 testes"
npm test --silent >/dev/null 2>&1 || { echo "✖ testes falharam (rode npm test)"; exit 1; }

echo "▶ 2/4 enviando v$VERSION ($BRANCH @ $COMMIT$DIRTY) para $VPS_USER@$VPS_HOST:~/$VPS_DIR"
"${SSH[@]}" "mkdir -p $VPS_DIR && cd $VPS_DIR && rm -rf server shared client"
tar czf - Dockerfile .dockerignore package.json package-lock.json server shared client deploy/compose.dev.yml \
  | "${SSH[@]}" "cd $VPS_DIR && tar xzf - && mv deploy/compose.dev.yml compose.yml && rmdir deploy 2>/dev/null; true"
# .env: porta + TURN da produção (o segredo fica só na VPS: lido de lá, nunca passa por aqui)
"${SSH[@]}" "cd $VPS_DIR && { echo GAME_PORT=$GAME_PORT; echo TURN_SECRET=\$(cat ~/$PROD_DIR/.turn-secret 2>/dev/null); echo TURN_HOST=$VPS_HOST; } > .env && chmod 600 .env \
  && echo '$BRANCH @ $COMMIT$DIRTY — $(date -u +%FT%TZ)' > DEPLOYED"

echo "▶ 3/4 build + subir container (projeto niltonpark-dev)"
"${SSH[@]}" "cd $VPS_DIR && docker compose up -d --build 2>&1 | tail -5 && docker image prune -f >/dev/null"

echo "▶ 4/4 conferindo http://$VPS_HOST:$GAME_PORT/health"
for i in $(seq 1 20); do
  if out=$(curl -fsS --max-time 4 "http://$VPS_HOST:$GAME_PORT/health" 2>/dev/null); then
    echo "✔ no ar: $out"
    echo "🧪 Teste em: http://$VPS_HOST:$GAME_PORT   (produção continua em https://park.magmacursosltda.com.br)"
    "${SSH[@]}" "docker ps --filter name=niltonpark --format '{{.Names}}: {{.Status}}'"
    exit 0
  fi
  sleep 2
done
echo "✖ /health não respondeu. Logs:"
"${SSH[@]}" "cd $VPS_DIR && docker compose logs --tail 30"
exit 1
