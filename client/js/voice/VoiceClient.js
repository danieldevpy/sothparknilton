// Chat de voz por grupos — lado do cliente.
// Recebe o estado do grupo do servidor (vc_group), mantém uma VoicePeer por membro,
// toca o áudio de cada um num <audio> (o caminho que o cancelamento de eco do navegador
// conhece), detecta quem está falando e cuida de mudo/ensurdecer/apertar-para-falar.
// A interface (painel, configurações, convites) fica em voice/ui.js.

import { MSG } from '/shared/constants.js';
import { VOICE, VOICE_STATUS_TEXT } from '/shared/voice.js';
import { play } from '../audio.js';
import { Mic, micErrorText } from './mic.js';
import { VoicePeer } from './peer.js';
import { loadSettings, saveSettings } from './settings.js';
import { VoiceUi } from './ui.js';

const SPEAK_LEVEL = 0.025; // nível RTP (0..1) a partir do qual alguém "está falando"
const SPEAK_HOLD_MS = 320;
const LEVEL_POLL_MS = 90;
const FALLBACK_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];

export class VoiceClient {
  constructor(game, hud) {
    this.game = game;
    this.hud = hud;
    this.s = loadSettings();
    this.group = null; // {id, owner, members:[{id,m,d}]}
    this.ice = FALLBACK_ICE;
    this.peers = new Map(); // id -> VoicePeer
    this.audio = new Map(); // id -> <audio>
    this.speakAt = new Map(); // id -> último momento falando (inclui o meu id)
    this.speaking = new Set();
    this.localMute = new Set(); // ids que EU silenciei (só para mim)
    this.deaf = false;
    this.mic = null;
    this.micPromise = null;
    this.micError = null;
    this.needsGesture = false; // navegador bloqueou o autoplay: precisa de um toque
    this.devices = { inputs: [], outputs: [] };
    this.canSink = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
    this.supported = typeof window.RTCPeerConnection === 'function';
    this.testing = false; // painel de configurações aberto com o teste de microfone
    this.box = document.createElement('div');
    this.box.id = 'voice-audio';
    this.box.hidden = true;
    document.body.appendChild(this.box);
    this.ui = new VoiceUi(this, hud);
    this.levelTimer = null;
    this.setupKeys();
    // qualquer toque destrava o áudio (autoplay / AudioContext suspenso)
    window.addEventListener('pointerdown', () => this.unlock(), true);
    window.addEventListener('keydown', () => this.unlock(), true);
    navigator.mediaDevices?.addEventListener?.('devicechange', () => this.refreshDevices());
  }

  get me() {
    return this.game.me;
  }

  inGroup() {
    return !!this.group;
  }

  member(id) {
    return this.group?.members.find((m) => m.id === id) || null;
  }

  isOwner() {
    return this.group?.owner === this.me;
  }

  nick(id) {
    return this.game.players.get(id)?.nick || `#${id}`;
  }

  // ---------- mensagens do servidor ----------

  onMessage(msg) {
    switch (msg.t) {
      case MSG.VC_ASK: this.onAsk(msg); return true;
      case MSG.VC_STATUS: this.onStatus(msg); return true;
      case MSG.VC_GROUP: this.onGroup(msg); return true;
      case MSG.VC_SIGNAL: {
        const peer = this.peers.get(msg.from);
        if (peer) peer.onSignal(msg.d);
        else this.lateSignal(msg);
        return true;
      }
      case MSG.VC_TAG: {
        const p = this.game.players.get(msg.id);
        if (p) p.vg = msg.g;
        return true;
      }
      default: return false;
    }
  }

  // sinal de um membro antes do vc_group chegar aqui (corrida rara): cria o par na hora
  lateSignal(msg) {
    if (!this.member(msg.from)) return;
    this.syncPeers();
    this.peers.get(msg.from)?.onSignal(msg.d);
  }

  onAsk(msg) {
    play('invite');
    this.ui.ask(msg);
  }

  onStatus(msg) {
    const text = VOICE_STATUS_TEXT[msg.status];
    const nick = msg.nick || (msg.with ? this.nick(msg.with) : '');
    if (msg.status === 'expired' || msg.status === 'gone') this.ui.removeAsk(msg.with);
    if (text) this.hud.toast(text(nick));
  }

  onGroup(msg) {
    if (msg.ice?.length) this.ice = msg.ice;
    const was = this.group;
    if (!msg.g) {
      this.group = null;
      const switching = msg.reason === 'switch'; // o grupo novo chega logo em seguida
      this.teardown(switching);
      if (was && !switching) {
        play('vc_off');
        const why = { kicked: 'kicked', dissolved: 'dissolved' }[msg.reason];
        if (why) this.hud.toast(VOICE_STATUS_TEXT[why]());
        else if (msg.reason === 'left') this.hud.toast('Você saiu do grupo de voz');
      }
      this.ui.render();
      return;
    }
    const before = new Set(was?.members.map((m) => m.id) || []);
    this.group = msg.g;
    if (!was || was.id !== msg.g.id) {
      play('vc_on');
      this.hud.toast(msg.g.members.length > 2 ? `Você entrou no grupo de voz (${msg.g.members.length} pessoas) 🎙️` : 'Grupo de voz ligado! 🎙️');
      if (!this.mic && !this.micPromise) this.ensureMic(); // ex.: entrou por pedido aprovado
    } else {
      for (const m of msg.g.members) if (!before.has(m.id)) { play('vc_on'); this.hud.log(null, `🎙️ ${this.nick(m.id)} entrou no grupo de voz`); }
      for (const id of before) if (!msg.g.members.some((m) => m.id === id)) { play('vc_off'); this.hud.log(null, `🎙️ ${this.nick(id)} saiu do grupo de voz`); }
    }
    this.syncPeers();
    this.sendMute(true);
    this.startLevels();
    this.ui.render();
  }

  // ---------- conexões ----------

  syncPeers() {
    const ids = new Set(this.group ? this.group.members.map((m) => m.id) : []);
    for (const [id, peer] of this.peers) {
      if (ids.has(id)) continue;
      peer.close();
      this.peers.delete(id);
      this.dropAudio(id);
    }
    for (const id of ids) {
      if (id === this.me || this.peers.has(id)) continue;
      this.peers.set(id, new VoicePeer({
        selfId: this.me,
        peerId: id,
        iceServers: this.ice,
        track: this.mic?.track || null,
        bitrate: VOICE.QUALITY[this.s.quality],
        signal: (d) => this.game.send({ t: MSG.VC_SIGNAL, to: id, d }),
        onTrack: (track, peer) => this.attachAudio(peer.id, track),
        onState: () => this.ui.renderMembers(),
      }));
    }
  }

  teardown(keepMic = false) {
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    for (const id of [...this.audio.keys()]) this.dropAudio(id);
    this.speaking.clear();
    this.speakAt.clear();
    this.stopLevels();
    if (!this.testing && !keepMic) this.stopMic(); // libera o microfone (some o "gravando" do navegador)
  }

  attachAudio(id, track) {
    let el = this.audio.get(id);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      el.playsInline = true;
      el.dataset.peer = id;
      this.box.appendChild(el);
      this.audio.set(id, el);
    }
    el.srcObject = new MediaStream([track]);
    this.applyVolume(id);
    if (this.canSink && this.s.outId) el.setSinkId(this.s.outId).catch(() => {});
    this.playEl(el);
  }

  playEl(el) {
    const p = el.play();
    if (p?.catch) {
      p.catch(() => this.askGesture());
    }
  }

  dropAudio(id) {
    const el = this.audio.get(id);
    if (!el) return;
    el.srcObject = null;
    el.remove();
    this.audio.delete(id);
  }

  // o navegador bloqueou o áudio até o próximo toque/clique (qualquer um destrava, ver unlock)
  askGesture() {
    if (this.needsGesture) return;
    this.needsGesture = true;
    this.hud.toast('🔈 Toque na tela para ativar o áudio da voz');
    this.ui.render();
  }

  unlock() {
    this.mic?.resume();
    if (!this.needsGesture) return;
    this.needsGesture = false;
    for (const el of this.audio.values()) this.playEl(el);
    this.ui.render();
  }

  // ---------- microfone ----------

  async ensureMic() {
    if (this.mic) {
      this.mic.resume();
      return true;
    }
    if (this.micPromise) return this.micPromise;
    this.micPromise = (async () => {
      const mic = new Mic(this.s);
      try {
        await mic.start();
        this.mic = mic;
        this.micError = null;
        mic.forceMute = this.deaf;
        mic.onEnded = () => this.onMicLost();
        for (const peer of this.peers.values()) peer.setTrack(mic.track);
        this.refreshDevices();
        this.sendMute();
        return true;
      } catch (err) {
        mic.stop();
        this.micError = micErrorText(err);
        this.hud.toast(`🎤 ${this.micError}`);
        return false;
      } finally {
        this.micPromise = null;
        this.ui.render();
      }
    })();
    return this.micPromise;
  }

  stopMic() {
    if (!this.mic) return;
    this.mic.stop();
    this.mic = null;
    for (const peer of this.peers.values()) peer.setTrack(null);
    this.sendMute();
  }

  // microfone desconectado (fone USB tirado): volta para o padrão do sistema
  async onMicLost() {
    if (!this.mic) return;
    this.hud.toast('🎤 O microfone foi desconectado — usando o padrão do sistema');
    try {
      await this.mic.setDevice('');
      this.afterTrackChange();
    } catch (err) {
      this.micError = micErrorText(err);
      this.stopMic();
    }
    this.ui.render();
  }

  afterTrackChange() {
    if (this.mic && !this.mic.processed) for (const peer of this.peers.values()) peer.setTrack(this.mic.track);
  }

  async refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      this.devices = {
        inputs: list.filter((d) => d.kind === 'audioinput' && d.deviceId),
        outputs: list.filter((d) => d.kind === 'audiooutput' && d.deviceId),
      };
    } catch { /* sem permissão ainda */ }
    this.ui.renderSettings();
  }

  // ---------- ações do jogador ----------

  async invite(id) {
    await this.ensureMic(); // pede o microfone já no clique (gesto do usuário)
    this.game.send({ t: MSG.VC_INVITE, to: id });
  }

  async request(id) {
    await this.ensureMic();
    this.game.send({ t: MSG.VC_REQUEST, to: id });
  }

  async reply(from, accept) {
    if (accept) await this.ensureMic();
    this.game.send({ t: MSG.VC_REPLY, from, accept });
  }

  leave() {
    this.game.send({ t: MSG.VC_LEAVE });
  }

  kick(id) {
    this.game.send({ t: MSG.VC_KICK, id });
  }

  toggleMute() {
    if (this.deaf) {
      this.toggleDeaf();
      return;
    }
    this.s.muted = !this.s.muted;
    saveSettings(this.s);
    this.mic?.tick();
    play(this.s.muted ? 'vc_mute' : 'vc_unmute');
    this.sendMute();
    this.ui.render();
  }

  toggleDeaf() {
    this.deaf = !this.deaf;
    if (this.mic) {
      this.mic.forceMute = this.deaf;
      this.mic.tick();
    }
    for (const id of this.audio.keys()) this.applyVolume(id);
    play(this.deaf ? 'vc_mute' : 'vc_unmute');
    this.sendMute();
    this.ui.render();
  }

  sendMute(force = false) {
    if (!this.group) return;
    const m = this.s.muted || this.deaf || !this.mic;
    const d = this.deaf;
    if (!force && this.sentMute?.m === m && this.sentMute?.d === d) return;
    this.sentMute = { m, d };
    this.game.send({ t: MSG.VC_MUTE, m, d });
  }

  // volume de uma pessoa (salvo pelo nick, vale nas próximas vezes)
  peerVolume(id) {
    const v = this.s.peerVol[this.nick(id)];
    return typeof v === 'number' ? v : 1;
  }

  setPeerVolume(id, v) {
    this.s.peerVol[this.nick(id)] = Math.max(0, Math.min(1, v));
    saveSettings(this.s);
    this.applyVolume(id);
  }

  toggleLocalMute(id) {
    if (this.localMute.has(id)) this.localMute.delete(id);
    else this.localMute.add(id);
    this.applyVolume(id);
    this.ui.renderMembers();
  }

  applyVolume(id) {
    const el = this.audio.get(id);
    if (!el) return;
    el.muted = this.deaf || this.localMute.has(id);
    el.volume = Math.max(0, Math.min(1, this.s.outputVol * this.peerVolume(id)));
  }

  // ---------- configurações ----------

  setSetting(key, value) {
    this.s[key] = value;
    saveSettings(this.s);
    if (key === 'outputVol') for (const id of this.audio.keys()) this.applyVolume(id);
    if (key === 'quality') for (const peer of this.peers.values()) peer.setBitrate(VOICE.QUALITY[value]);
    if (key === 'outId' && this.canSink) for (const el of this.audio.values()) el.setSinkId(value).catch(() => {});
    if (this.mic && ['inputGain', 'mode', 'vadDb'].includes(key)) this.mic.apply();
    if (this.mic && ['echo', 'noise', 'agc'].includes(key)) this.mic.applyProcessing().then(() => this.afterTrackChange()).catch(() => {});
    if (key === 'micId' && this.mic) {
      this.mic.setDevice(value).then(() => this.afterTrackChange()).catch((err) => {
        this.micError = micErrorText(err);
        this.hud.toast(`🎤 ${this.micError}`);
      });
    }
    if (key === 'mode') this.mic?.setPtt(false);
    this.ui.render(); // só reconstrói se algo visível mudou (modo, tecla...)
  }

  // teste do microfone na tela de configurações (abre o mic mesmo fora de grupo)
  async startTest() {
    this.testing = true;
    await this.ensureMic();
    this.refreshDevices();
  }

  stopTest() {
    this.testing = false;
    this.mic?.setMonitor(false);
    if (!this.group) this.stopMic();
  }

  // ---------- teclado: M = mudo, apertar-para-falar ----------

  setupKeys() {
    const typing = (ev) => ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target instanceof HTMLSelectElement;
    window.addEventListener('keydown', (ev) => {
      if (this.ui.capturingKey) return; // trocando a tecla nas configurações
      if (typing(ev) || ev.repeat) return;
      if (ev.code === 'KeyM' && this.group) {
        this.toggleMute();
        return;
      }
      if (ev.code === this.s.pttKey && this.s.mode === 'ptt' && this.mic) this.setPtt(true);
    });
    window.addEventListener('keyup', (ev) => {
      if (ev.code === this.s.pttKey) this.setPtt(false);
    });
    window.addEventListener('blur', () => this.setPtt(false));
  }

  setPtt(down) {
    if (!this.mic || this.mic.pttDown === down) return;
    this.mic.setPtt(down);
    this.ui.render();
  }

  // ---------- quem está falando ----------

  startLevels() {
    if (this.levelTimer) return;
    this.levelTimer = setInterval(() => this.pollLevels(), LEVEL_POLL_MS);
  }

  stopLevels() {
    clearInterval(this.levelTimer);
    this.levelTimer = null;
  }

  pollLevels() {
    const now = performance.now();
    // AudioContext do microfone suspenso (iOS/autoplay): sem um toque os outros só ouvem silêncio
    if (this.mic?.ctx && this.mic.ctx.state !== 'running' && !this.needsGesture) this.askGesture();
    if (this.mic?.speaking) this.speakAt.set(this.me, now);
    for (const [id, peer] of this.peers) {
      if (!this.deaf && !this.localMute.has(id) && peer.audioLevel() > SPEAK_LEVEL) this.speakAt.set(id, now);
    }
    let changed = false;
    const ids = [this.me, ...this.peers.keys()];
    for (const id of ids) {
      const on = now - (this.speakAt.get(id) || -1e9) < SPEAK_HOLD_MS;
      if (on !== this.speaking.has(id)) {
        changed = true;
        if (on) this.speaking.add(id);
        else this.speaking.delete(id);
      }
    }
    if (changed) this.ui.renderSpeaking();
    this.ui.tick();
  }

  isSpeaking(id) {
    return this.speaking.has(id);
  }

  // para o desenho no mapa: 'speak' | 'muted' | null (só membros do meu grupo)
  badge(id) {
    if (!this.group) return null;
    const m = this.member(id);
    if (!m) return null;
    if (this.speaking.has(id)) return 'speak';
    if (m.m || m.d) return 'muted';
    return null;
  }

  // botão de voz no cartão do player
  cardAction(p) {
    if (!this.supported) return null;
    const mine = this.group?.id || 0;
    const theirs = p.vg || 0;
    if (mine && theirs === mine) return { label: '🎙️ Está no seu grupo de voz', disabled: true };
    if (theirs) return { label: '🎧 Pedir para entrar no grupo de voz', onClick: () => this.request(p.id) };
    if (mine && this.group.members.length >= VOICE.MAX_GROUP) return { label: '🎙️ Seu grupo de voz está cheio', disabled: true };
    return { label: mine ? '🎙️ Convidar para o seu grupo de voz' : '🎙️ Chamar para conversar por voz', onClick: () => this.invite(p.id) };
  }
}
