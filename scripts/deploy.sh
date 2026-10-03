#!/usr/bin/env bash
# Deploy de produção do Nilton Park na VPS (Docker), de uma vez:
#   testes → envia o código → docker compose up --build → confere o /health pelo IP externo.
#
# Uso:  ./scripts/deploy.sh
# Variáveis (opcionais): VPS_HOST, VPS_PORT (SSH), VPS_USER, VPS_DIR, GAME_PORT, DOMAIN, TURN_HOST, TURN_EXTERNAL_IP
set -euo pipefail

VPS_HOST="${VPS_HOST:-204.157.124.113}"
VPS_PORT="${VPS_PORT:-45392}"
VPS_USER="${VPS_USER:-daniel}"
VPS_DIR="${VPS_DIR:-servers/niltonpark}"
GAME_PORT="${GAME_PORT:-3000}"
DOMAIN="${DOMAIN:-park.magmacursosltda.com.br}"   # domínio com HTTPS (microfone do chat de voz)
TURN_HOST="${TURN_HOST:-$VPS_HOST}"          # endereço do TURN que os navegadores usam (IP ou domínio)
TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP:-$VPS_HOST}"  # IP público da VPS (o coturn anuncia este)
SSH=(ssh -p "$VPS_PORT" -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST")

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")

echo "▶ 1/4 testes"
npm test --silent >/dev/null 2>&1 || { echo "✖ testes falharam (rode npm test)"; exit 1; }

echo "▶ 2/4 enviando v$VERSION para $VPS_USER@$VPS_HOST:~/$VPS_DIR"
"${SSH[@]}" "mkdir -p $VPS_DIR && cd $VPS_DIR && rm -rf server shared client deploy scripts"
tar czf - Dockerfile .dockerignore compose.yml package.json package-lock.json README.md server shared client \
    deploy scripts/setup-domain.sh \
  | "${SSH[@]}" "cd $VPS_DIR && tar xzf -"
# .env: porta do jogo + TURN do chat de voz. O segredo do TURN é gerado uma vez na VPS e nunca sai de lá.
"${SSH[@]}" "cd $VPS_DIR && { test -s .turn-secret || (umask 077; head -c 32 /dev/urandom | base64 | tr -d '/+=\n' > .turn-secret); } \
  && { echo GAME_PORT=$GAME_PORT; echo TURN_SECRET=\$(cat .turn-secret); echo TURN_HOST=$TURN_HOST; echo TURN_EXTERNAL_IP=$TURN_EXTERNAL_IP; } > .env && chmod 600 .env"

echo "▶ 3/4 build + subir container"
"${SSH[@]}" "cd $VPS_DIR && docker compose up -d --build --remove-orphans 2>&1 | tail -5 && docker image prune -f >/dev/null"

echo "▶ 4/4 conferindo http://$VPS_HOST:$GAME_PORT/health"
for i in $(seq 1 20); do
  if out=$(curl -fsS --max-time 4 "http://$VPS_HOST:$GAME_PORT/health" 2>/dev/null); then
    echo "✔ no ar: $out"
    echo "🎮 Jogue em: http://$VPS_HOST:$GAME_PORT"
    "${SSH[@]}" "cd $VPS_DIR && docker compose ps --format '{{.Name}}: {{.Status}}'"
    # com o domínio ligado (scripts/setup-domain.sh), confere também o HTTPS (o microfone só funciona nele)
    if [ -n "$DOMAIN" ] && https=$(curl -fsS --max-time 6 "https://$DOMAIN/health" 2>/dev/null); then
      echo "🔒 https://$DOMAIN ok: $https"
    elif [ -n "$DOMAIN" ]; then
      echo "⚠ https://$DOMAIN ainda não responde (DNS/certificado: ver docs/DEPLOY.md → Domínio)"
    fi
    exit 0
  fi
  sleep 2
done
echo "✖ /health não respondeu pelo IP externo. Logs:"
"${SSH[@]}" "cd $VPS_DIR && docker compose logs --tail 30"
exit 1
