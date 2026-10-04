// Conexão WebSocket com o servidor. Mensagens são JSON com campo `t` (ver docs/PROTOCOL.md).
// Teste de internet ruim: ?lag=300 soma 300 ms ao ping (metade na ida, metade na volta) e
// ?jit=40 soma até 40 ms aleatórios em cada sentido, mantendo a ordem das mensagens.

const sim = new URLSearchParams(location.search);
const SIM_LAG = Math.max(0, Number(sim.get('lag')) || 0) / 2;
const SIM_JIT = Math.max(0, Number(sim.get('jit')) || 0);

function delayer() {
  if (!SIM_LAG && !SIM_JIT) return (fn) => fn();
  let last = 0;
  return (fn) => {
    const at = Math.max(last, performance.now() + SIM_LAG + Math.random() * SIM_JIT);
    last = at;
    setTimeout(fn, at - performance.now());
  };
}

export function connect({ onOpen, onMessage, onClose }) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  const inbound = delayer();
  const outbound = delayer();
  ws.addEventListener('open', () => onOpen?.());
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    inbound(() => onMessage?.(msg));
  });
  ws.addEventListener('close', (ev) => onClose?.(ev));

  return {
    send(obj) {
      const data = JSON.stringify(obj);
      outbound(() => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
    },
    close() {
      ws.close();
    },
  };
}
