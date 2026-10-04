// Interface do chat de voz: botões no topo, painel do grupo (membros, quem fala, volume
// de cada um, mudo, sair), convites/pedidos e a janela de configurações de áudio.
// Desktop: pílulas no canto superior direito. Celular (body.mobile): ícone 🎙️ na barra do
// topo + botão de microfone (segurar = falar no modo "apertar para falar").
// Texto vindo de usuários (nicks) sempre por textContent.

import { VOICE } from '/shared/voice.js';
import { play } from '../audio.js';
import { DEFAULTS, RESERVED_KEYS, keyLabel, saveSettings } from './settings.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

function button(cls, text, onClick, title = '') {
  const b = el('button', cls, text);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

const STATE_TEXT = { connecting: '⏳ conectando…', reconnecting: '🔄 reconectando…', new: '⏳ conectando…' };
const METER_MIN_DB = -80;
const dbToPct = (db) => Math.max(0, Math.min(100, ((db - METER_MIN_DB) / -METER_MIN_DB) * 100));
const sensToDb = (s) => -20 - s * 0.6; // sensibilidade 0..100 → limiar -20..-80 dB
const dbToSens = (db) => Math.round((-20 - db) / 0.6);

export class VoiceUi {
  constructor(voice, hud) {
    this.v = voice;
    this.hud = hud;
    this.mounted = false;
    this.capturingKey = false;
    this.rendered = '';
    this.statsAt = 0;
  }

  get mobile() {
    return document.body.classList.contains('mobile');
  }

  // chamado quando o jogo começa (depois do HUD mobile existir)
  mount() {
    if (this.mounted) return;
    this.mounted = true;
    const v = this.v;

    this.panel = el('section', 'voice-panel');
    this.panel.id = 'voice-panel';
    this.panel.hidden = true;
    this.settings = el('div', '');
    this.settings.id = 'voice-settings';
    this.settings.hidden = true;
    this.settings.addEventListener('pointerdown', (ev) => { if (ev.target === this.settings) this.closeSettings(); });

    if (this.mobile) {
      this.panel.classList.add('m-panel');
      document.body.appendChild(this.panel);
      this.btn = button('m-icon m-voice', '🎙️', () => this.togglePanel());
      this.btn.setAttribute('aria-label', 'Chat de voz');
      this.btn.append(el('span', 'm-badge vc-count'));
      $('.m-top-left')?.appendChild(this.btn);
      // microfone redondo acima dos botões de ação (o polegar direito segura para falar)
      this.micBtn = el('button', 'm-voice-mic', '🎤');
      this.micBtn.type = 'button';
      this.micBtn.setAttribute('aria-label', 'Microfone');
      ($('#m-ui') || document.body).appendChild(this.micBtn);
      // abrir outro painel do celular fecha o da voz (e vice-versa)
      document.querySelectorAll('.m-top .m-icon').forEach((b) => {
        if (b !== this.btn) b.addEventListener('click', () => { this.panel.hidden = true; });
      });
    } else {
      $('#hud').appendChild(this.panel);
      const right = $('.top-right');
      this.btn = button('pill voice-btn', '🎙️ Voz', () => this.togglePanel(), 'Chat de voz por grupos');
      this.micBtn = el('button', 'pill voice-mic', '🎤');
      this.micBtn.type = 'button';
      right.insertBefore(this.micBtn, $('#mute-btn'));
      right.insertBefore(this.btn, this.micBtn);
    }
    document.body.appendChild(this.settings);

    // microfone: clique = mudo; no modo "apertar para falar" (celular) segurar = falar
    const holdToTalk = () => v.s.mode === 'ptt' && this.mobile && !v.s.muted && !v.deaf && !!v.mic;
    this.micBtn.addEventListener('click', () => {
      if (!holdToTalk()) v.toggleMute();
    });
    this.micBtn.addEventListener('pointerdown', (ev) => {
      if (!holdToTalk()) return;
      ev.preventDefault();
      try { this.micBtn.setPointerCapture(ev.pointerId); } catch { /* ok */ }
      v.setPtt(true);
    });
    const up = () => { if (v.s.mode === 'ptt' && this.mobile) v.setPtt(false); };
    this.micBtn.addEventListener('pointerup', up);
    this.micBtn.addEventListener('pointercancel', up);
    this.micBtn.addEventListener('lostpointercapture', up);
    this.render();
  }

  togglePanel(force) {
    const open = force ?? this.panel.hidden;
    if (open && this.mobile) document.querySelectorAll('.m-panel').forEach((p) => { if (p !== this.panel) p.hidden = true; });
    this.panel.hidden = !open;
    if (open) this.render(true);
    play('click');
  }

  // avisa o CSS dos minigames/telas: body.vc-on = em ligação (🎤 e painel da voz podem estar na tela).
  // Todo layout novo precisa funcionar com e sem ela (ver docs/UI_LAYOUT.md).
  syncBody() {
    document.body.classList.toggle('vc-on', !!this.v.group);
  }

  toast(text) {
    this.hud.toast(text);
  }

  // ---------- convites / pedidos ----------

  ask(msg) {
    const v = this.v;
    const invite = msg.kind === 'invite';
    let sub;
    if (invite) {
      sub = msg.size > 1 ? `Grupo de voz com ${msg.size} pessoas` : 'Conversa por voz (só quem está no grupo ouve)';
      if (v.inGroup()) sub += ' · você sai do grupo atual';
    } else {
      sub = `Seu grupo: ${msg.size}/${VOICE.MAX_GROUP} pessoas`;
    }
    this.hud.invite({
      from: msg.from,
      key: `v${msg.from}`,
      nick: msg.nick,
      ttl: msg.ttl,
      cls: 'voice',
      title: invite ? `🎙️ ${msg.nick} te chamou para a voz!` : `🎧 ${msg.nick} quer entrar no seu grupo de voz`,
      sub,
      onAccept: () => v.reply(msg.from, true),
      onDecline: () => v.reply(msg.from, false),
    });
  }

  removeAsk(from) {
    if (from != null) this.hud.removeInvite(`v${from}`);
  }

  // ---------- painel ----------

  // rebuild completo só quando muda a "estrutura" (membros, estado, erros)
  render(force = false) {
    if (!this.mounted) return;
    const v = this.v;
    const g = v.group;
    const muted = v.s.muted || v.deaf || !v.mic;
    // botões do topo
    const count = g ? g.members.length : 0;
    if (this.mobile) {
      const badge = this.btn.querySelector('.vc-count');
      badge.hidden = !count;
      badge.textContent = String(count);
    } else {
      this.btn.textContent = count ? `🎙️ Voz · ${count}` : '🎙️ Voz';
    }
    this.btn.classList.toggle('on', !!g);
    this.syncBody();
    this.micBtn.hidden = !g;
    this.micBtn.textContent = v.deaf ? '🔕' : muted ? '🔇' : '🎤';
    this.micBtn.classList.toggle('muted', muted);
    this.micBtn.classList.toggle('ptt', v.s.mode === 'ptt' && !muted);
    this.micBtn.classList.toggle('talking', !!v.mic?.open);
    this.micBtn.title = v.deaf ? 'Áudio desligado' : muted ? 'Microfone mudo (M)' : v.s.mode === 'ptt' ? `Apertar para falar: segure ${keyLabel(v.s.pttKey)}` : 'Microfone ligado (M = mudo)';

    const sig = JSON.stringify([g, v.deaf, v.s.muted, !!v.mic, v.micError, v.needsGesture, v.s.mode, v.s.pttKey, [...v.localMute], v.isOwner()]);
    if (!force && sig === this.rendered) return;
    this.rendered = sig;
    if (this.panel.hidden && !force) return;
    this.buildPanel();
  }

  buildPanel() {
    const v = this.v;
    const g = v.group;
    const p = this.panel;
    p.replaceChildren();
    const head = el('header', 'vp-head');
    head.append(el('b', '', '🎙️ Chat de voz'));
    if (g) head.append(el('span', 'vp-count', `${g.members.length}/${VOICE.MAX_GROUP}`));
    const close = button(this.mobile ? 'm-x' : 'vp-x', '✕', () => this.togglePanel(false));
    close.setAttribute('aria-label', 'Fechar');
    head.append(close);
    p.append(head);

    if (!v.supported) {
      p.append(el('p', 'vp-warn', 'Este navegador não tem chat de voz. Use Chrome, Edge, Firefox ou Safari atualizados.'));
      return;
    }
    if (!window.isSecureContext) {
      p.append(el('p', 'vp-warn', '🔒 Para FALAR, o jogo precisa estar em HTTPS (endereço com cadeado). Aqui você só consegue ouvir.'));
    }
    if (v.needsGesture) {
      p.append(button('vp-unlock', '🔈 Toque aqui para ativar o som das vozes', () => v.unlock()));
    }
    if (v.micError && g) {
      const w = el('div', 'vp-warn');
      w.append(el('span', '', `🎤 ${v.micError} Você está só ouvindo.`), button('vp-retry', 'Tentar de novo', () => v.ensureMic()));
      p.append(w);
    }

    if (!g) {
      const empty = el('div', 'vp-empty');
      empty.append(
        el('p', '', 'Você não está em nenhum grupo de voz.'),
        el('p', 'vp-tip', this.mobile
          ? 'Toque num boneco e escolha 🎙️ Chamar para conversar por voz. Se a pessoa já estiver num grupo, dá para pedir para entrar.'
          : 'Clique num boneco e escolha 🎙️ Chamar para conversar por voz. Se a pessoa já estiver num grupo, dá para pedir para entrar.'),
        el('p', 'vp-tip', 'Só quem está no grupo ouve a conversa. Quem tem 🎧 no nome já está num grupo.'),
      );
      p.append(empty);
    } else {
      this.list = el('ul', 'vp-members');
      const order = [...g.members].sort((a, b) => (a.id === v.me ? -1 : b.id === v.me ? 1 : a.id - b.id));
      for (const m of order) this.list.append(this.memberRow(m));
      p.append(this.list);
      if (v.s.mode === 'ptt' && v.mic) {
        p.append(el('p', 'vp-tip', this.mobile ? 'Apertar para falar: segure o botão 🎤 lá em cima.' : `Apertar para falar: segure a tecla ${keyLabel(v.s.pttKey)}.`));
      }
    }

    const row = el('div', 'vp-actions');
    if (g) {
      const muted = v.s.muted || v.deaf;
      row.append(
        button(`vp-act${muted ? ' off' : ''}`, muted ? '🔇 Mudo' : '🎤 Mic', () => v.toggleMute(), 'Liga/desliga seu microfone (M)'),
        button(`vp-act${v.deaf ? ' off' : ''}`, v.deaf ? '🔕 Sem som' : '🎧 Som', () => v.toggleDeaf(), 'Desliga o som de todo mundo (e seu microfone)'),
      );
    }
    row.append(button('vp-act', '⚙️ Ajustes', () => this.openSettings(), 'Configurações de áudio'));
    if (g) row.append(button('vp-act vp-leave', '📞 Sair', () => v.leave(), 'Sair do grupo de voz'));
    p.append(row);
    this.renderSpeaking();
  }

  memberRow(m) {
    const v = this.v;
    const me = m.id === v.me;
    const pl = v.game.players.get(m.id);
    const li = el('li', 'vp-member');
    li.dataset.id = m.id;
    const dot = el('span', 'vp-dot');
    dot.style.background = pl?.look?.hat || '#999';
    const name = el('span', 'vp-name', me ? `${v.nick(m.id)} (você)` : v.nick(m.id));
    if (v.group.owner === m.id) name.append(el('span', 'vp-crown', ' 👑'));
    const st = el('span', 'vp-state');
    li.append(dot, name, st);
    if (me) {
      const meter = el('div', 'vp-meter');
      meter.append(el('div', 'vp-fill'));
      li.append(meter);
    } else {
      const ctl = el('div', 'vp-ctl');
      const vol = el('input', 'vp-vol');
      vol.type = 'range';
      vol.min = '0';
      vol.max = '100';
      vol.value = String(Math.round(v.peerVolume(m.id) * 100));
      vol.title = 'Volume desta pessoa (só para você)';
      vol.setAttribute('aria-label', `Volume de ${v.nick(m.id)}`);
      vol.addEventListener('input', () => v.setPeerVolume(m.id, Number(vol.value) / 100));
      const lm = v.localMute.has(m.id);
      ctl.append(vol, button(`vp-small${lm ? ' off' : ''}`, lm ? '🔈̸' : '🔈', () => v.toggleLocalMute(m.id), lm ? 'Voltar a ouvir' : 'Silenciar só para você'));
      if (v.isOwner()) ctl.append(button('vp-small vp-kick', '✖', () => v.kick(m.id), 'Remover do grupo'));
      li.append(ctl);
    }
    this.updateRow(li, m);
    return li;
  }

  updateRow(li, m) {
    const v = this.v;
    const st = li.querySelector('.vp-state');
    const peer = v.peers.get(m.id);
    let text = '';
    if (m.d) text = '🔕';
    else if (m.m) text = '🔇';
    if (peer && peer.state !== 'connected') text = `${text} ${STATE_TEXT[peer.state] || ''}`.trim();
    if (peer?.lastStats?.type === 'relay' && peer.state === 'connected') text = `${text} 🛰️`.trim();
    st.textContent = text;
    st.title = peer?.lastStats?.rtt != null ? `ping de voz: ${Math.round(peer.lastStats.rtt * 1000)} ms${peer.lastStats.type === 'relay' ? ' (via servidor TURN)' : ''}` : '';
  }

  // estado das conexões mudou: atualiza só os textos (não atrapalha quem arrasta um volume)
  renderMembers() {
    if (!this.list || this.panel.hidden || !this.v.group) return;
    for (const m of this.v.group.members) {
      const li = this.list.querySelector(`[data-id="${m.id}"]`);
      if (li) this.updateRow(li, m);
    }
  }

  renderSpeaking() {
    if (!this.mounted) return;
    const v = this.v;
    this.btn.classList.toggle('speaking', [...v.speaking].some((id) => id !== v.me));
    this.micBtn.classList.toggle('talking', !!v.mic?.open && v.isSpeaking(v.me));
    if (!this.list) return;
    for (const li of this.list.children) li.classList.toggle('speaking', v.isSpeaking(Number(li.dataset.id)));
  }

  // ~11×/s: medidores e estatísticas
  tick() {
    const v = this.v;
    if (this.v.mic && this.micBtn) this.micBtn.classList.toggle('talking', v.mic.open && v.isSpeaking(v.me));
    if (!this.panel.hidden && this.list) {
      const fill = this.list.querySelector('.vp-fill');
      if (fill) fill.style.width = `${v.mic ? dbToPct(v.mic.level) : 0}%`;
      const now = performance.now();
      if (now - this.statsAt > 2000) {
        this.statsAt = now;
        for (const peer of v.peers.values()) peer.stats().then((s) => { peer.lastStats = s; this.renderMembers(); }).catch(() => {});
      }
    }
    if (!this.settings.hidden) this.tickSettings();
  }

  // ---------- configurações de áudio ----------

  openSettings() {
    this.settings.hidden = false;
    this.buildSettings();
    this.v.startTest().then(() => this.buildSettings());
    if (!this.v.levelTimer) this.testTimer = setInterval(() => this.tickSettings(), 60);
    play('click');
  }

  closeSettings() {
    this.settings.hidden = true;
    this.capturingKey = false;
    clearInterval(this.testTimer);
    this.testTimer = null;
    this.v.stopTest();
    this.render(true);
  }

  renderSettings() {
    if (this.settings && !this.settings.hidden) this.buildSettings();
  }

  buildSettings() {
    const v = this.v;
    const s = v.s;
    const box = this.settings;
    box.replaceChildren();
    const card = el('div', 'vs-card');
    const head = el('header', 'vs-head');
    head.append(el('b', '', '⚙️ Configurações de áudio'), button('vs-x', '✕', () => this.closeSettings()));
    card.append(head);
    const body = el('div', 'vs-body');
    card.append(body);

    const section = (title) => {
      const sec = el('section', 'vs-sec');
      sec.append(el('h4', '', title));
      body.append(sec);
      return sec;
    };
    const select = (label, options, value, onChange) => {
      const wrap = el('label', 'vs-field');
      wrap.append(el('span', '', label));
      const sel = el('select');
      for (const [val, text] of options) {
        const o = el('option', '', text);
        o.value = val;
        if (val === value) o.selected = true;
        sel.append(o);
      }
      sel.addEventListener('change', () => onChange(sel.value));
      wrap.append(sel);
      return wrap;
    };
    const range = (label, min, max, value, fmt, onInput) => {
      const wrap = el('label', 'vs-field');
      const out = el('b', 'vs-val', fmt(value));
      const top = el('span', '');
      top.append(document.createTextNode(`${label} `), out);
      const r = el('input');
      r.type = 'range';
      r.min = String(min);
      r.max = String(max);
      r.value = String(value);
      r.addEventListener('input', () => { out.textContent = fmt(Number(r.value)); onInput(Number(r.value)); });
      wrap.append(top, r);
      return wrap;
    };
    const check = (label, value, onChange) => {
      const wrap = el('label', 'vs-check');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = value;
      c.addEventListener('change', () => onChange(c.checked));
      wrap.append(c, el('span', '', label));
      return wrap;
    };
    const devName = (d, i, kind) => d.label || `${kind} ${i + 1}`;

    // microfone
    const mic = section('🎤 Microfone');
    if (!window.isSecureContext) mic.append(el('p', 'vp-warn', '🔒 O microfone só funciona em HTTPS.'));
    else if (v.micError) mic.append(el('p', 'vp-warn', v.micError));
    const inputs = [['', 'Padrão do sistema'], ...v.devices.inputs.filter((d) => d.deviceId !== 'default').map((d, i) => [d.deviceId, devName(d, i, 'Microfone')])];
    mic.append(select('Dispositivo', inputs, s.micId, (id) => v.setSetting('micId', id)));
    mic.append(range('Volume do microfone', 0, 200, Math.round(s.inputGain * 100), (x) => `${x}%`, (x) => v.setSetting('inputGain', x / 100)));
    const meter = el('div', 'vs-meter');
    this.meterFill = el('div', 'vs-fill');
    this.meterThr = el('div', 'vs-thr');
    meter.append(this.meterFill, this.meterThr);
    mic.append(el('span', 'vs-hint', 'Fale algo: a barra mostra o nível do seu microfone'), meter);
    mic.append(check('Ouvir meu microfone (use fone de ouvido!)', !!v.mic?.monitoring, (on) => v.mic?.setMonitor(on)));

    // modo
    const mode = section('🗣️ Quando transmitir');
    const radios = el('div', 'vs-radios');
    const modes = [
      ['vad', '🎚️ Ativação por voz', 'Transmite quando você fala (corta o ruído de fundo)'],
      ['open', '🎙️ Voz aberta', 'Microfone sempre ligado'],
      ['ptt', '👆 Apertar para falar', this.mobile ? 'Segure o botão 🎤 para falar' : 'Segure uma tecla para falar'],
    ];
    for (const [val, label, hint] of modes) {
      const r = el('label', `vs-radio${s.mode === val ? ' on' : ''}`);
      const inp = el('input');
      inp.type = 'radio';
      inp.name = 'vc-mode';
      inp.checked = s.mode === val;
      inp.addEventListener('change', () => { v.setSetting('mode', val); this.buildSettings(); v.ui.render(true); });
      const txt = el('span', '');
      txt.append(el('b', '', label), el('small', '', hint));
      r.append(inp, txt);
      radios.append(r);
    }
    mode.append(radios);
    if (s.mode === 'vad') {
      mode.append(range('Sensibilidade', 0, 100, dbToSens(s.vadDb), (x) => `${x}%`, (x) => v.setSetting('vadDb', sensToDb(x))));
      mode.append(el('span', 'vs-hint', 'A linha amarela no medidor é o limite: acima dela você transmite.'));
    }
    if (s.mode === 'ptt' && !this.mobile) {
      const row = el('div', 'vs-field vs-key');
      const keyBtn = button('vs-keybtn', this.capturingKey ? 'Aperte uma tecla…' : keyLabel(s.pttKey), () => this.captureKey(keyBtn));
      row.append(el('span', '', 'Tecla para falar'), keyBtn);
      mode.append(row);
    }

    // saída
    const out = section('🔊 Saída (vozes)');
    if (v.canSink && v.devices.outputs.length > 1) {
      const outputs = [['', 'Padrão do sistema'], ...v.devices.outputs.filter((d) => d.deviceId !== 'default').map((d, i) => [d.deviceId, devName(d, i, 'Saída')])];
      out.append(select('Dispositivo', outputs, s.outId, (id) => v.setSetting('outId', id)));
    }
    out.append(range('Volume das vozes', 0, 100, Math.round(s.outputVol * 100), (x) => `${x}%`, (x) => v.setSetting('outputVol', x / 100)));
    out.append(el('span', 'vs-hint', 'O volume de cada pessoa fica no painel 🎙️ (só muda para você).'));

    // processamento
    const proc = section('✨ Limpeza do som');
    proc.append(
      check('Cancelamento de eco', s.echo, (on) => v.setSetting('echo', on)),
      check('Supressão de ruído', s.noise, (on) => v.setSetting('noise', on)),
      check('Ganho automático', s.agc, (on) => v.setSetting('agc', on)),
    );

    // qualidade
    const q = section('📶 Qualidade');
    q.append(select('Qualidade da voz', [['low', 'Economia (16 kbps) — 4G fraco'], ['normal', 'Normal (32 kbps)'], ['high', 'Alta (64 kbps)']], s.quality, (val) => v.setSetting('quality', val)));

    const foot = el('footer', 'vs-foot');
    foot.append(
      button('vs-reset', 'Restaurar padrão', () => {
        const keep = { peerVol: s.peerVol, muted: s.muted };
        for (const [k, val] of Object.entries(DEFAULTS)) if (!(k in keep)) v.setSetting(k, val);
        saveSettings(s);
        this.buildSettings();
      }),
      button('vs-done', 'Pronto', () => this.closeSettings()),
    );
    card.append(foot);
    box.append(card);
    this.tickSettings();
  }

  captureKey(btn) {
    this.capturingKey = true;
    btn.textContent = 'Aperte uma tecla…';
    const onKey = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      this.capturingKey = false;
      if (ev.code !== 'Escape') {
        if (RESERVED_KEYS.has(ev.code)) this.hud.toast(`A tecla ${keyLabel(ev.code)} já é usada no jogo — escolha outra`);
        else this.v.setSetting('pttKey', ev.code);
      }
      this.buildSettings();
    };
    window.addEventListener('keydown', onKey, true);
  }

  tickSettings() {
    if (!this.meterFill) return;
    const v = this.v;
    const lvl = v.mic ? v.mic.level : -100;
    this.meterFill.style.width = `${dbToPct(lvl)}%`;
    this.meterFill.classList.toggle('open', !!v.mic?.open);
    this.meterThr.hidden = v.s.mode !== 'vad';
    this.meterThr.style.left = `${dbToPct(v.s.vadDb)}%`;
  }
}
