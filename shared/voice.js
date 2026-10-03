// Chat de voz por grupos — código isomórfico (servidor + navegador).
// O áudio vai direto entre os navegadores (WebRTC em malha dentro do grupo);
// o servidor só cuida dos grupos/convites e repassa a sinalização (SDP/ICE).
// Ver docs/PROTOCOL.md (vc_*) e docs/DECISIONS.md (D-020..).

export const VOICE = {
  MAX_GROUP: 8, // malha P2P: cada um envia 1 fluxo para cada outro (8 → 7 envios ≈ 220 kbps)
  ASK_TTL_MS: 30_000, // convite / pedido para entrar expira
  ASK_COOLDOWN_MS: 800, // entre convites/pedidos do mesmo player (anti-spam)
  MAX_PENDING_OUT: 6, // convites/pedidos pendentes enviados por um player
  SDP_MAX: 12_000, // caracteres
  ICE_BATCH_MAX: 24, // candidatos por mensagem
  CANDIDATE_MAX: 600, // caracteres de um candidato
  TURN_TTL_S: 12 * 3600, // validade das credenciais temporárias do TURN
  // qualidade do Opus (kbps) escolhida nas configurações de áudio
  QUALITY: { low: 16_000, normal: 32_000, high: 64_000 },
};

// Status de convites/pedidos (vc_status) → texto para o jogador.
export const VOICE_STATUS_TEXT = {
  sent: (n) => `Convite de voz enviado para ${n} 🎙️`,
  asked: (n) => `Pedido enviado — esperando ${n} responder 🎧`,
  declined: (n) => `${n} recusou 😕`,
  expired: (n) => `O convite de voz com ${n} expirou`,
  full: () => 'O grupo de voz está cheio',
  in_group: (n) => `${n} já está em outro grupo de voz — peça para entrar`,
  no_group: (n) => `${n} não está mais em um grupo de voz`,
  same: (n) => `${n} já está no seu grupo de voz`,
  gone: (n) => `${n} saiu da praça`,
  invalid: () => 'Não deu para fazer isso agora',
  cooldown: () => 'Calma! Espere um pouquinho para convidar de novo',
  too_many: () => 'Você tem convites demais esperando resposta',
  kicked: () => 'Você foi removido do grupo de voz',
  dissolved: () => 'O grupo de voz acabou (ficou só você)',
};

function isStr(v, max) {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

// Valida o pacote de sinalização WebRTC repassado entre dois membros do grupo.
// Retorna uma cópia limpa (só os campos conhecidos) ou null.
//   {sdp:{type:'offer'|'answer', sdp}}  |  {ice:[{candidate,sdpMid,sdpMLineIndex}]}  |  {restart:true}  |  {reset:true}
export function sanitizeSignal(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.sdp) {
    const { type, sdp } = d.sdp;
    if ((type !== 'offer' && type !== 'answer') || !isStr(sdp, VOICE.SDP_MAX)) return null;
    return { sdp: { type, sdp } };
  }
  if (Array.isArray(d.ice)) {
    if (!d.ice.length || d.ice.length > VOICE.ICE_BATCH_MAX) return null;
    const ice = [];
    for (const c of d.ice) {
      if (!c || typeof c !== 'object') return null;
      // candidato vazio = "fim dos candidatos"
      if (typeof c.candidate !== 'string' || c.candidate.length > VOICE.CANDIDATE_MAX) return null;
      const out = { candidate: c.candidate };
      if (c.sdpMid != null) {
        if (!isStr(String(c.sdpMid), 32)) return null;
        out.sdpMid = String(c.sdpMid);
      }
      if (c.sdpMLineIndex != null) {
        if (!Number.isInteger(c.sdpMLineIndex) || c.sdpMLineIndex < 0 || c.sdpMLineIndex > 16) return null;
        out.sdpMLineIndex = c.sdpMLineIndex;
      }
      ice.push(out);
    }
    return { ice };
  }
  if (d.restart === true) return { restart: true };
  if (d.reset === true) return { reset: true };
  return null;
}

// Ajusta os parâmetros do Opus no SDP: DTX (não envia nada no silêncio), FEC (aguenta
// perda de pacotes no 4G), mono e teto de bitrate. Mantém o resto do SDP intacto.
export function tuneOpusSdp(sdp, { maxBitrate = VOICE.QUALITY.high } = {}) {
  if (typeof sdp !== 'string') return sdp;
  const nl = sdp.includes('\r\n') ? '\r\n' : '\n';
  const lines = sdp.split(nl);
  const pts = new Set();
  for (const l of lines) {
    const m = /^a=rtpmap:(\d+) opus\/48000/i.exec(l);
    if (m) pts.add(m[1]);
  }
  if (!pts.size) return sdp;
  const want = { useinbandfec: '1', usedtx: '1', stereo: '0', 'sprop-stereo': '0', maxaveragebitrate: String(maxBitrate) };
  const seen = new Set();
  const out = lines.map((l) => {
    const m = /^a=fmtp:(\d+) (.*)$/.exec(l);
    if (!m || !pts.has(m[1])) return l;
    seen.add(m[1]);
    const params = new Map();
    for (const kv of m[2].split(';')) {
      const [k, v] = kv.trim().split('=');
      if (k) params.set(k, v ?? '');
    }
    for (const [k, v] of Object.entries(want)) params.set(k, v);
    return `a=fmtp:${m[1]} ${[...params].map(([k, v]) => `${k}=${v}`).join(';')}`;
  });
  // Opus sem linha fmtp (raro): cria logo depois do rtpmap
  for (const pt of pts) {
    if (seen.has(pt)) continue;
    const i = out.findIndex((l) => l.startsWith(`a=rtpmap:${pt} `));
    if (i >= 0) out.splice(i + 1, 0, `a=fmtp:${pt} ${Object.entries(want).map(([k, v]) => `${k}=${v}`).join(';')}`);
  }
  return out.join(nl);
}
