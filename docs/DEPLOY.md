# Deploy (produção)

Produção roda na **VPS** em Docker:

> 🎮 **https://park.magmacursosltda.com.br** (com HTTPS: chat de voz completo)
> 🎮 http://204.157.124.113:3000 (pelo IP: tudo funciona, mas a voz é só para ouvir)

| Item | Valor |
|---|---|
| VPS | `daniel@204.157.124.113`, SSH na porta `45392` (Debian 13, Docker + Compose) |
| Pasta | `~/servers/niltonpark` (só o necessário: `Dockerfile`, `compose.yml`, `server/`, `shared/`, `client/`) |
| Container | `niltonpark` (imagem `niltonpark:latest`, `node:22-alpine`), `restart: unless-stopped` |
| Porta | `3000` no host → `3000` no container (a 80/443 da VPS são de outros sistemas — não mexer) |
| Limites | 256 MB de RAM, 1 CPU, 100 processos, sistema de arquivos só-leitura, logs 3×10 MB |
| Saúde | `GET /health` → `{ok, version, players, fights, match, voice:{groups,inVoice}, uptime}` (também usado pelo HEALTHCHECK) |
| Voz | container `niltonpark-turn` (coturn) — ver "TURN do chat de voz" |

## Publicar uma versão nova (de uma vez)
```bash
./scripts/deploy.sh
```
O script: roda `npm test` → envia o código por SSH (tar) → escreve o `.env` (porta, segredo e endereço do TURN) →
`docker compose up -d --build` (jogo + TURN) → confere o `/health` pelo IP externo e pelo `https://` do domínio. Quem estiver jogando cai por ~2 s e **reconecta sozinho** (mesmo nick/visual).
Variáveis opcionais: `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_DIR`, `GAME_PORT`.

## Operação na VPS
```bash
ssh -p 45392 daniel@204.157.124.113
cd ~/servers/niltonpark
docker compose ps                 # estado (healthy?)
docker compose logs -f --tail 50  # logs (entradas/saídas de jogadores)
docker compose restart            # reiniciar
docker compose down               # tirar do ar
```

## Jogabilidade pela internet (o que já está feito)
- **Atraso de interpolação adaptativo** (`client/js/jitter.js`): mede o jitter das mensagens e aumenta o atraso só o
  necessário (praça 110–320 ms, Gol a Gol 70–260 ms, Karatê 60–240 ms). Sem "trava e pula" em Wi-Fi/4G.
- **Extrapolação curta**: se a rede engasgar e o buffer esvaziar, quem estava andando continua por até 100–120 ms
  em vez de congelar.
- **Ping** na tela (📶 verde < 90 ms, amarelo < 180 ms, vermelho), via `ping`/`pong` a cada 2 s.
- **Compensação de lag na praça** (`client/js/lagcomp.js`, D-030): com a mediana dos últimos 5 pings ≥ 100 ms (~10 s
  de ping alto, não um pico), o próprio boneco passa a andar na hora do clique/teclado/joystick (mesmo A* do servidor) e
  converge para o servidor quando para; desliga com a mediana < 70 ms. Aparece 🛟 no ping e um aviso no chat.
  Testar sem depender da rede: `?lag=300&jit=40` (soma ping/jitter no cliente) e `?comp=1` / `?comp=0` (força o modo).
- **Predição do Karatê** usa o ping: não "puxa" o lutador de volta por causa da latência e não repete a animação do golpe.
- **Reconexão automática**: queda de rede ou deploy → recarrega e entra de novo sozinho (até 8 tentativas a cada 3 s).
- **Vigia de carregamento** (`index.html`): troca Wi-Fi/4G no meio do carregamento (`ERR_NETWORK_CHANGED`) → recarrega
  sozinho (até 6 vezes) em vez de ficar com a tela de login quebrada.
- **Arquivos com gzip + ETag** (o JS cai para ~1/4; revisitas recebem 304 vazio) e WebSocket sem compressão
  (`perMessageDeflate: false`, menos latência/CPU).
- Heartbeat de 10 s (celular que perdeu o sinal sai da sala rápido), máximo de 12 conexões por IP,
  40 mensagens/s por conexão, `docker stop` fecha as conexões na hora (SIGTERM).

## Medir a rede
```bash
node scripts/netcheck.js ws://204.157.124.113:3000/ws 20
```
Mostra ping (mediana/p95), jitter dos snapshots e a % de quadros que "travariam" com atraso fixo vs. adaptativo.
Medições de 2026-10-02:

| De onde | Ping | Jitter p95 | Travadas (adaptativo) |
|---|---|---|---|
| Dentro da VPS (servidor isolado) | 1 ms | 4 ms | 0% — servidor envia certinho |
| PC no Wi-Fi de casa (55% de perda até o roteador!) | 46 ms mediana, picos de 6 s | 67 ms | 37% — culpa do Wi-Fi, não do jogo |
| 2026-10-04, PC no Wi-Fi | 30 ms mediana, p95 47, máx 132 | 6 ms | 0,7% |
| 2026-10-04, dentro da VPS | 2 ms mediana, p95 5 | 10 ms | 0% |

Diagnóstico de 2026-10-04 (queixa de lag): o piso PC → VPS é ~26 ms (ICMP mínimo) — a rota do provedor já leva 15–23 ms
no 1º salto (com 5% de perda) e o Wi-Fi soma ~9 ms em média (máx. 21) até o roteador. A VPS não é a causa: o jogo usa
~2% de CPU; o host tem *steal* médio ~2% (rajadas de 17%) e um stack de monitoramento de terceiros ocupado, que só gera
alguns ms de oscilação.

Simulação (`AdaptiveDelay` vs. atraso fixo, % de quadros com buffer vazio): karatê em 4G ruim 13,7% → 3,1%;
praça em 4G ruim 4,6% → 1,1%; Wi-Fi ruim 25,9% → 12% (o resto é coberto pela extrapolação curta).

## Domínio + HTTPS (obrigatório para o microfone do chat de voz)
> 🔒 **https://park.magmacursosltda.com.br** — no ar desde 2026-10-03 (Let's Encrypt, renovação automática pelo certbot da VPS)

O navegador só libera o microfone em HTTPS. Pelo `http://IP:3000` o chat de voz funciona **só para ouvir**.
O nginx da VPS (portas 80/443) é compartilhado com outros sistemas, então o domínio entra como **mais um site**,
igual aos outros (`sites-available` + symlink + `certbot --nginx`). Precisa de `sudo` (uma vez):
```bash
./scripts/deploy.sh                                   # envia o código + deploy/ + scripts/setup-domain.sh
ssh -t -p 45392 daniel@204.157.124.113 'sudo bash ~/servers/niltonpark/scripts/setup-domain.sh'
```
O `setup-domain.sh`: confere se o DNS aponta para a VPS e se o jogo responde em `127.0.0.1:3000` → copia
`deploy/park.magmacursosltda.com.br.conf` para `/etc/nginx/sites-available/` + symlink → `nginx -t` (se falhar,
**desfaz** e sai sem recarregar) → `reload` → `certbot --nginx -d park.magmacursosltda.com.br --redirect` → confere
`https://.../health`. A renovação do certificado já é automática (timer do certbot da VPS).
O site repassa o WebSocket (`Upgrade`/`Connection`) e o IP real (`X-Real-IP`) — o jogo só confia nesse cabeçalho
quando a conexão vem de endereço privado (o proxy local), então o limite de conexões por IP continua valendo.

## TURN do chat de voz (coturn)
Container `niltonpark-turn` (`coturn/coturn:4.18-alpine`, ~10 MB de RAM, 96 MB de limite) no mesmo `compose.yml`.
Só é usado quando dois jogadores não conseguem se ligar direto (NAT de operadora 4G, rede de empresa).
| Item | Valor |
|---|---|
| Portas | `3478/udp` e `3478/tcp` (sinalização TURN) + `49160–49199/udp` (relay), só IPv4, publicadas pelo Docker |
| Credenciais | temporárias (12 h), geradas pelo jogo com `TURN_SECRET` (`use-auth-secret`). O segredo é criado uma vez na VPS (`~/servers/niltonpark/.turn-secret`, `chmod 600`) e nunca sai de lá |
| Cotas | 24 alocações por jogador, 40 no total (= portas de relay), 128 kB/s por sessão |
| Segurança | sem relay TCP; relay proibido para redes internas (127/8, 10/8, 172.16/12, 192.168/16, 100.64/10...) → não alcança MySQL/containers da VPS; liberado só o IP do próprio container (relay↔relay) |

Por que as portas saem pelo Docker e não `network_mode: host`: o ufw da VPS bloqueia portas do host e mexer nele
exige `sudo`. Cada porta publicada vira um processo `docker-proxy` (~3,6 MB RSS, boa parte compartilhada) — por isso
a faixa é de 40 portas. **Com root**, o melhor é: `sudo ufw allow 3478 && sudo ufw allow 49160:49999/udp`, trocar o
serviço para `network_mode: host` (tirar `ports:`) e aumentar `TURN_MAX_PORT`/`TURN_TOTAL_QUOTA` no `.env`.

Testar o TURN de fora (força o Chrome a usar só relay; precisa de `npm i --no-save puppeteer`):
```bash
RELAY=1 QUICK=1 TURN_URLS="turn:204.157.124.113:3478?transport=udp" TURN_SECRET=<segredo da VPS> node scripts/voice-e2e.mjs
```
Logs: `docker logs --tail 50 niltonpark-turn` (erros de credencial aparecem como `credentials ... are wrong`).
