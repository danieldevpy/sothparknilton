# Deploy (produção)

Produção roda na **VPS** em Docker, acessada só pelo **IP externo** (sem domínio/HTTPS):

> 🎮 **http://204.157.124.113:3000**

| Item | Valor |
|---|---|
| VPS | `daniel@204.157.124.113`, SSH na porta `45392` (Debian 13, Docker + Compose) |
| Pasta | `~/servers/niltonpark` (só o necessário: `Dockerfile`, `compose.yml`, `server/`, `shared/`, `client/`) |
| Container | `niltonpark` (imagem `niltonpark:latest`, `node:22-alpine`), `restart: unless-stopped` |
| Porta | `3000` no host → `3000` no container (a 80/443 da VPS são de outros sistemas — não mexer) |
| Limites | 256 MB de RAM, 1 CPU, 100 processos, sistema de arquivos só-leitura, logs 3×10 MB |
| Saúde | `GET /health` → `{ok, version, players, fights, match, uptime}` (também usado pelo HEALTHCHECK) |

## Publicar uma versão nova (de uma vez)
```bash
./scripts/deploy.sh
```
O script: roda `npm test` → envia o código por SSH (tar) → `docker compose up -d --build` → confere o `/health`
pelo IP externo. Quem estiver jogando cai por ~2 s e **reconecta sozinho** (mesmo nick/visual).
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
- **Ping** na tela (📶 verde < 90 ms, amarelo < 180 ms, vermelho), via `ping`/`pong` a cada 2 s.
- **Predição do Karatê** usa o ping: não "puxa" o lutador de volta por causa da latência e não repete a animação do golpe.
- **Reconexão automática**: queda de rede ou deploy → recarrega e entra de novo sozinho (até 8 tentativas a cada 3 s).
- **Arquivos com gzip + ETag** (o JS cai para ~1/4; revisitas recebem 304 vazio) e WebSocket sem compressão
  (`perMessageDeflate: false`, menos latência/CPU).
- Heartbeat de 10 s (celular que perdeu o sinal sai da sala rápido), máximo de 12 conexões por IP,
  40 mensagens/s por conexão, `docker stop` fecha as conexões na hora (SIGTERM).

## Se precisar de domínio/HTTPS no futuro
Apontar um domínio para a VPS e adicionar um `server {}` no nginx existente fazendo proxy para `127.0.0.1:3000`
com `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` (o cliente já usa `wss://`
automaticamente quando a página é https). Aí dá para trocar `ports` por `127.0.0.1:3000:3000` no `compose.yml`.
