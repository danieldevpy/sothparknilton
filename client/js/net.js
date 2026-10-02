// Conexão WebSocket com o servidor. Mensagens são JSON com campo `t` (ver docs/PROTOCOL.md).

export function connect({ onOpen, onMessage, onClose }) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener('open', () => onOpen?.());
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    onMessage?.(msg);
  });
  ws.addEventListener('close', (ev) => onClose?.(ev));

  return {
    send(obj) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    },
    close() {
      ws.close();
    },
  };
}
