// Microfone do chat de voz: captura (getUserMedia) + processamento em WebAudio.
//
//   mic → [volume de entrada] → analisador (nível / ativação por voz)
//                             → [atraso 40 ms só na ativação por voz] → [porteira] → faixa enviada
//
// A faixa enviada (`track`) é sempre a mesma: trocar de microfone ou mudar eco/ruído/ganho
// só troca a fonte por dentro, sem renegociar as conexões. A "porteira" (gate) abre e fecha
// com rampas curtas (sem estalos) conforme o modo: voz aberta, ativação por voz ou apertar para falar.
// Sem WebAudio (navegador antigo) a faixa crua é enviada e o mudo vira `track.enabled`.

const TICK_MS = 25;
const VAD_HOLD_MS = 450; // segura a porteira aberta depois da última sílaba
const VAD_PREROLL_S = 0.04; // atraso para não cortar o começo da fala na ativação por voz
const SPEAK_FLOOR_DB = -56; // abaixo disso não conta como "falando" (indicador)

export function micErrorText(err) {
  const name = err?.name || err?.message || '';
  if (name === 'insecure') return 'O microfone só funciona em HTTPS (endereço com cadeado 🔒).';
  if (name === 'unsupported') return 'Este navegador não tem chat de voz (WebRTC).';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permissão do microfone negada — libere no cadeado 🔒 da barra de endereço.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Nenhum microfone encontrado.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'O microfone está ocupado por outro programa.';
  return 'Não foi possível abrir o microfone.';
}

export class Mic {
  constructor(settings) {
    this.s = settings;
    this.ctx = null;
    this.raw = null; // MediaStream do getUserMedia
    this.track = null; // faixa enviada aos outros
    this.level = -100; // dBFS do microfone (depois do volume de entrada)
    this.open = false; // porteira aberta (estou transmitindo)
    this.speaking = false;
    this.pttDown = false;
    this.forceMute = false; // áudio desligado (ensurdecer) também fecha o microfone
    this.lastLoud = 0;
    this.monitoring = false;
    this.onEnded = null; // microfone sumiu (desconectado)
    this.timer = null;
    this.buf = null;
  }

  get processed() {
    return !!this.dest;
  }

  constraints() {
    const s = this.s;
    return {
      audio: {
        deviceId: s.micId ? { ideal: s.micId } : undefined,
        echoCancellation: s.echo,
        noiseSuppression: s.noise,
        autoGainControl: s.agc,
        channelCount: 1,
      },
      video: false,
    };
  }

  async start() {
    if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { name: 'insecure' });
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw Object.assign(new Error('unsupported'), { name: 'unsupported' });
    // o AudioContext nasce ainda dentro do clique (iOS só deixa tocar/capturar se for criado num gesto)
    const AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = AC ? new AC({ latencyHint: 'interactive' }) : null; } catch { this.ctx = null; }
    this.resume();
    try {
      await this.acquire();
    } catch (err) {
      this.ctx?.close().catch(() => {});
      this.ctx = null;
      throw err;
    }
    try {
      this.buildGraph();
    } catch {
      this.dest = null; // sem WebAudio: manda a faixa crua
    }
    if (!this.dest) this.track = this.raw.getAudioTracks()[0];
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.apply();
    return this.track;
  }

  async acquire() {
    const old = this.raw;
    // iOS: abrir um microfone novo com o antigo aberto silencia o antigo — fecha antes
    old?.getTracks().forEach((t) => t.stop());
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(this.constraints());
    } catch (err) {
      // microfone salvo sumiu: tenta o padrão
      if (this.s.micId && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        this.s.micId = '';
        stream = await navigator.mediaDevices.getUserMedia(this.constraints());
      } else throw err;
    }
    this.raw = stream;
    const t = stream.getAudioTracks()[0];
    t.addEventListener('ended', () => { if (this.raw === stream) this.onEnded?.(); });
    if (this.src) {
      this.src.disconnect();
      this.src = this.ctx.createMediaStreamSource(stream);
      this.src.connect(this.inGain);
    } else if (this.track && !this.dest) {
      this.track = t; // modo sem WebAudio: quem chamou faz replaceTrack
    }
    return stream;
  }

  buildGraph() {
    const { ctx } = this;
    if (!ctx) throw new Error('no webaudio');
    this.src = ctx.createMediaStreamSource(this.raw);
    this.inGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0;
    this.delay = ctx.createDelay(0.2);
    this.gate = ctx.createGain();
    this.gate.gain.value = 0;
    this.dest = ctx.createMediaStreamDestination();
    this.src.connect(this.inGain);
    this.inGain.connect(this.analyser);
    this.inGain.connect(this.delay).connect(this.gate).connect(this.dest);
    this.track = this.dest.stream.getAudioTracks()[0];
    this.buf = new Float32Array(this.analyser.fftSize);
    this.resume();
  }

  // AudioContext precisa de um gesto do usuário para rodar (chamado também em cliques)
  resume() {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.ctx.resume().catch(() => {});
  }

  // aplica as configurações atuais (volume, modo, mudo)
  apply() {
    if (this.inGain) this.inGain.gain.setTargetAtTime(this.s.inputGain, this.ctx.currentTime, 0.02);
    if (this.delay) this.delay.delayTime.setTargetAtTime(this.s.mode === 'vad' ? VAD_PREROLL_S : 0, this.ctx.currentTime, 0.01);
    this.tick();
  }

  // eco/ruído/ganho automático: tenta mudar na faixa aberta; se o navegador não deixar, reabre o microfone
  async applyProcessing() {
    const t = this.raw?.getAudioTracks()[0];
    if (!t) return;
    const c = this.constraints().audio;
    try {
      await t.applyConstraints({ echoCancellation: c.echoCancellation, noiseSuppression: c.noiseSuppression, autoGainControl: c.autoGainControl });
      const st = t.getSettings();
      if (st.echoCancellation !== undefined && st.echoCancellation !== c.echoCancellation) throw new Error('ignored');
    } catch {
      await this.acquire();
    }
  }

  async setDevice(id) {
    this.s.micId = id;
    await this.acquire();
  }

  setPtt(down) {
    this.pttDown = down;
    this.tick();
  }

  measure() {
    if (!this.analyser) return -100;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    return rms > 0 ? Math.max(-100, 20 * Math.log10(rms)) : -100;
  }

  tick() {
    const now = performance.now();
    const db = this.measure();
    // nível suavizado para o medidor (sobe rápido, desce devagar)
    this.level = db > this.level ? db : this.level + (db - this.level) * 0.25;
    const s = this.s;
    if (db > s.vadDb) this.lastLoud = now;
    let open;
    if (s.muted || this.forceMute) open = false;
    else if (s.mode === 'ptt') open = this.pttDown;
    else if (s.mode === 'vad') open = now - this.lastLoud < VAD_HOLD_MS;
    else open = true;
    if (open !== this.open) {
      this.open = open;
      if (this.gate) this.gate.gain.setTargetAtTime(open ? 1 : 0, this.ctx.currentTime, open ? 0.008 : 0.05);
      else if (this.track) this.track.enabled = open;
    }
    // sem analisador (modo sem WebAudio) só dá para saber se a porteira está aberta
    this.speaking = open && (this.analyser ? this.level > Math.max(SPEAK_FLOOR_DB, s.mode === 'vad' ? s.vadDb : -100) : true);
  }

  // "ouvir meu microfone" (teste com fone): manda o áudio processado para a saída local
  setMonitor(on) {
    if (!this.ctx || on === this.monitoring) return;
    this.monitoring = on;
    if (on) this.gate.connect(this.ctx.destination);
    else {
      try { this.gate.disconnect(this.ctx.destination); } catch { /* já desconectado */ }
    }
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.raw?.getTracks().forEach((t) => t.stop());
    this.track?.stop();
    this.ctx?.close().catch(() => {});
    this.raw = this.track = this.ctx = this.src = this.dest = this.analyser = this.gate = null;
    this.open = this.speaking = this.monitoring = false;
    this.level = -100;
  }
}
