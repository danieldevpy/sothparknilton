// Uma conexão de voz WebRTC com outro membro do grupo (o grupo é uma malha: uma por par).
//
// Para nunca haver "glare" (os dois mandando oferta ao mesmo tempo), só o lado de MENOR id
// faz ofertas — inclusive as de reinício de ICE. O outro lado só responde e, se a conexão
// cair, pede um reinício (`restart`). Se nem reiniciando voltar, o lado de menor id recria
// a conexão do zero e avisa o outro (`reset`). Um vigia repete a recuperação enquanto não conectar.

import { VOICE, tuneOpusSdp } from '/shared/voice.js';

const ICE_FLUSH_MS = 60; // junta candidatos ICE numa mensagem só (o servidor limita msgs/s)
const DISCONNECT_GRACE_MS = 2500; // "disconnected" costuma voltar sozinho
const MAX_RESTARTS = 2;
const WATCHDOG_MS = 10_000; // não conectou nesse tempo → tenta recuperar de novo

export class VoicePeer {
  constructor({ selfId, peerId, iceServers, track, bitrate, signal, onTrack, onState }) {
    this.selfId = selfId;
    this.id = peerId;
    this.initiator = selfId < peerId;
    this.iceServers = iceServers;
    this.track = track;
    this.bitrate = bitrate;
    this.signal = signal;
    this.onTrack = onTrack;
    this.onState = onState;
    this.state = 'new';
    this.restarts = 0;
    this.closed = false;
    this.queue = Promise.resolve(); // processa a sinalização em ordem
    this.pendingIce = []; // candidatos que chegaram antes da descrição remota
    this.outIce = [];
    this.iceTimer = null;
    this.graceTimer = null;
    this.watchdog = null;
    this.create();
  }

  create() {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });
    this.pc = pc;
    this.pendingIce = [];
    pc.onicecandidate = (ev) => {
      if (pc !== this.pc) return;
      const c = ev.candidate;
      this.outIce.push(c ? { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex } : { candidate: '' });
      if (!this.iceTimer) this.iceTimer = setTimeout(() => this.flushIce(), ICE_FLUSH_MS);
    };
    pc.ontrack = (ev) => {
      if (pc === this.pc) this.onTrack?.(ev.track, this);
    };
    pc.onconnectionstatechange = () => {
      if (pc === this.pc) this.onConnState(pc.connectionState);
    };
    // Safari antigo não tem connectionState
    pc.oniceconnectionstatechange = () => {
      if (pc === this.pc && pc.connectionState === undefined) this.onConnState(pc.iceConnectionState);
    };
    if (this.initiator) {
      const tr = pc.addTransceiver('audio', { direction: 'sendrecv' });
      tr.sender.replaceTrack(this.track).catch(() => {});
      this.enqueue(() => this.offer(false));
    }
    this.setState('connecting');
    this.arm();
  }

  arm() {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      if (!this.closed && this.state !== 'connected') this.recover();
    }, WATCHDOG_MS);
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.onState?.(s, this);
  }

  onConnState(s) {
    if (this.closed) return;
    clearTimeout(this.graceTimer);
    if (s === 'connected' || s === 'completed') {
      this.restarts = 0;
      clearTimeout(this.watchdog);
      this.setState('connected');
      this.applyBitrate();
    } else if (s === 'disconnected') {
      this.setState('reconnecting');
      this.graceTimer = setTimeout(() => this.recover(), DISCONNECT_GRACE_MS);
    } else if (s === 'failed') {
      this.setState('reconnecting');
      this.recover();
    }
  }

  // a conexão caiu: reinicia o ICE algumas vezes; depois recria a conexão inteira
  recover() {
    if (this.closed) return;
    this.arm();
    if (!this.initiator) {
      this.signal({ restart: true }); // quem decide é o outro lado
      return;
    }
    if (this.restarts < MAX_RESTARTS) {
      this.restarts++;
      this.enqueue(() => this.offer(true));
      return;
    }
    this.restarts = 0;
    this.signal({ reset: true });
    this.rebuild();
  }

  rebuild() {
    if (this.closed) return;
    const old = this.pc;
    this.pc = null;
    old?.close();
    this.create();
  }

  enqueue(fn) {
    this.queue = this.queue.then(fn).catch((err) => console.warn('[voz] sinalização', this.id, err));
    return this.queue;
  }

  async offer(iceRestart) {
    const pc = this.pc;
    if (this.closed || !pc) return;
    // a resposta da oferta anterior se perdeu: desfaz e oferece de novo
    if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' });
    if (pc.signalingState !== 'stable') return;
    const offer = await pc.createOffer({ iceRestart });
    offer.sdp = tuneOpusSdp(offer.sdp);
    await pc.setLocalDescription(offer);
    this.signal({ sdp: { type: offer.type, sdp: pc.localDescription.sdp } });
  }

  // mensagem do outro lado (já validada pelo servidor)
  onSignal(d) {
    if (this.closed) return;
    if (d.reset) {
      this.rebuild();
      return;
    }
    if (d.restart) {
      if (this.initiator) this.recover();
      return;
    }
    this.enqueue(async () => {
      const pc = this.pc;
      if (!pc) return;
      if (d.sdp) {
        if (d.sdp.type === 'offer') {
          if (this.initiator) return; // nunca acontece (só o menor id oferece)
          await pc.setRemoteDescription({ type: 'offer', sdp: tuneOpusSdp(d.sdp.sdp) });
          const tr = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio') || pc.getTransceivers()[0];
          if (tr) {
            tr.direction = 'sendrecv';
            await tr.sender.replaceTrack(this.track);
          }
          const answer = await pc.createAnswer();
          answer.sdp = tuneOpusSdp(answer.sdp);
          await pc.setLocalDescription(answer);
          this.signal({ sdp: { type: answer.type, sdp: pc.localDescription.sdp } });
        } else if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: tuneOpusSdp(d.sdp.sdp) });
        }
        const queued = this.pendingIce;
        this.pendingIce = [];
        for (const c of queued) await this.addIce(c);
      } else if (d.ice) {
        for (const c of d.ice) {
          if (!pc.remoteDescription) this.pendingIce.push(c);
          else await this.addIce(c);
        }
      }
    });
  }

  async addIce(c) {
    try {
      await this.pc.addIceCandidate(c.candidate ? c : null);
    } catch {
      /* candidato de uma negociação antiga (reinício) — ignora */
    }
  }

  flushIce() {
    this.iceTimer = null;
    if (!this.outIce.length || this.closed) return;
    while (this.outIce.length) this.signal({ ice: this.outIce.splice(0, VOICE.ICE_BATCH_MAX) });
  }

  // troca a faixa enviada (ex.: navegador sem WebAudio trocou de microfone) sem renegociar
  setTrack(track) {
    this.track = track;
    for (const s of this.pc?.getSenders() || []) s.replaceTrack(track).catch(() => {});
  }

  setBitrate(bps) {
    this.bitrate = bps;
    this.applyBitrate();
  }

  applyBitrate() {
    for (const s of this.pc?.getSenders() || []) {
      if (!s.track && !this.track) continue;
      const p = s.getParameters();
      if (!p.encodings?.length) continue; // ainda não negociou
      p.encodings[0].maxBitrate = this.bitrate;
      p.encodings[0].priority = 'high';
      p.encodings[0].networkPriority = 'high';
      s.setParameters(p).catch(() => {});
    }
  }

  // nível de áudio recebido (0..1) sem precisar de WebAudio: vem dos pacotes RTP
  audioLevel() {
    const r = this.pc?.getReceivers()[0];
    const src = r?.getSynchronizationSources?.()[0];
    if (!src) return 0;
    // timestamp é relativo ao timeOrigin (spec atual) ou ao performance.now() (navegadores antigos)
    const now = src.timestamp > 1e11 ? performance.timeOrigin + performance.now() : performance.now();
    if (now - src.timestamp > 600) return 0; // DTX: sem pacotes = silêncio
    return src.audioLevel ?? 0;
  }

  async stats() {
    const out = { rtt: null, lost: 0, type: null, jitter: null };
    if (!this.pc) return out;
    const rep = await this.pc.getStats();
    let pairId = null;
    rep.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pairId = s.selectedCandidatePairId;
      if (s.type === 'inbound-rtp' && s.kind === 'audio') {
        out.lost = s.packetsLost || 0;
        out.received = s.packetsReceived || 0;
        out.bytes = s.bytesReceived || 0;
        out.jitter = s.jitter;
      }
    });
    rep.forEach((s) => {
      if (s.type === 'candidate-pair' && (s.id === pairId || (!pairId && s.nominated && s.state === 'succeeded'))) {
        out.rtt = s.currentRoundTripTime ?? null;
        const local = rep.get(s.localCandidateId);
        const remote = rep.get(s.remoteCandidateId);
        out.type = local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'relay' : local?.candidateType || null;
      }
    });
    return out;
  }

  close() {
    this.closed = true;
    clearTimeout(this.iceTimer);
    clearTimeout(this.graceTimer);
    clearTimeout(this.watchdog);
    this.pc?.close();
    this.pc = null;
    this.setState('closed');
  }
}
