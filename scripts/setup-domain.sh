#!/usr/bin/env bash
# Liga o domínio com HTTPS no nginx da VPS (precisa de sudo). Rodar NA VPS:
#   sudo bash ~/servers/niltonpark/scripts/setup-domain.sh [dominio]
# ou do seu PC (pede a senha do sudo):
#   ssh -t -p 45392 daniel@204.157.124.113 'sudo bash ~/servers/niltonpark/scripts/setup-domain.sh'
#
# Só ADICIONA um site novo (sites-available + symlink). Confere o DNS antes, valida com `nginx -t`
# e desfaz se der erro — os outros sites da VPS não são tocados. Depois pede o certificado (certbot --nginx).
set -euo pipefail

DOMAIN="${1:-park.magmacursosltda.com.br}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$DIR/deploy/$DOMAIN.conf"
AVAIL="/etc/nginx/sites-available/$DOMAIN.conf"
ENABLED="/etc/nginx/sites-enabled/$DOMAIN.conf"

[ "$(id -u)" = 0 ] || { echo "✖ rode com sudo"; exit 1; }
[ -f "$CONF_SRC" ] || { echo "✖ não achei $CONF_SRC"; exit 1; }

echo "▶ 1/5 DNS de $DOMAIN"
MYIP=$(curl -4fsS --max-time 5 https://ifconfig.me || hostname -I | awk '{print $1}')
DNSIP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
if [ "$DNSIP" != "$MYIP" ]; then
  echo "✖ $DOMAIN aponta para '${DNSIP:-nada}', mas esta VPS é $MYIP."
  echo "  Crie o registro DNS:  $DOMAIN  A  $MYIP   (espere propagar e rode de novo)"
  exit 1
fi
echo "  ok → $DNSIP"

echo "▶ 2/5 jogo respondendo em 127.0.0.1:3000"
curl -fsS --max-time 4 http://127.0.0.1:3000/health >/dev/null || { echo "✖ o container niltonpark não respondeu (rode o deploy antes)"; exit 1; }

echo "▶ 3/5 site no nginx"
if [ -f "$AVAIL" ] && grep -q "managed by Certbot" "$AVAIL"; then
  echo "  já existe com certificado — mantendo ($AVAIL)"
else
  cp "$CONF_SRC" "$AVAIL"
  ln -sf "$AVAIL" "$ENABLED"
  if ! nginx -t 2>&1; then
    echo "✖ nginx -t falhou — desfazendo (nenhum site foi afetado)"
    rm -f "$ENABLED" "$AVAIL"
    exit 1
  fi
  systemctl reload nginx
fi

echo "▶ 4/5 certificado (Let's Encrypt)"
certbot --nginx -d "$DOMAIN" --non-interactive --redirect --keep-until-expiring
nginx -t && systemctl reload nginx

echo "▶ 5/5 conferindo https://$DOMAIN/health"
sleep 1
curl -fsS --max-time 6 "https://$DOMAIN/health" && echo && echo "✔ pronto: https://$DOMAIN  (microfone liberado 🎙️)"
