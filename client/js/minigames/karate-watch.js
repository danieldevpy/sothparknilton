// Interface de quem ASSISTE uma luta de Karatê (plateia do Dojo), em DOM por cima do canvas:
// letreiro "AO VIVO" + contagem da plateia + medidor de empolgação, locutor narrando os
// golpes, barra de torcida (📣 por um lado + reações) e botões de trocar de luta / sair.
// Nada aqui mexe na luta: só manda `kt_cheer` (o servidor limita a frequência).

import { MSG } from '/shared/constants.js';
import { ARENA, CHEERS } from '/shared/arena.js';
import { KT } from '/shared/karate.js';
import { play } from '../audio.js';

// teclas no desktop: 1 = torcer pelo da esquerda, 6 = pelo da direita, 2..5 = reações
const KEYS = { Digit1: 'goA', Digit2: 'clap', Digit3: 'fire', Digit4: 'wow', Digit5: 'lol', Digit6: 'goB' };
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function el(tag, cls = '', text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  return e;
}

export class WatchUi {
  constructor(kt) {
    this.kt = kt;
    this.root = null;
    this.coolUntil = 0;
    this.lineAt = 0;
    this.shown = '';
  }

  get game() {
    return this.kt.game;
  }

  build() {
    if (this.root) return;
    const r = el('div');
    r.id = 'kt-watch';
    r.hidden = true;

    const top = el('div', 'kw-top');
    const live = el('span', 'kw-live');
    live.append(el('i'), document.createTextNode('AO VIVO'));
    this.countEl = el('span', 'kw-count', '👀 1');
    this.hypeEl = el('span', 'kw-hype');
    this.hypeEl.title = 'Empolgação da torcida';
    this.hypeFill = el('b');
    this.hypeEl.append(el('small', '', '🔥'), this.hypeFill);
    top.append(live, this.countEl, this.hypeEl);

    this.casterEl = el('div', 'kw-caster');
    this.casterEl.hidden = true;

    const bar = el('div', 'kw-bar');
    this.sideA = el('button', 'kw-go kw-a');
    this.sideB = el('button', 'kw-go kw-b');
    this.sideA.addEventListener('click', () => this.cheer('go', this.kt.fight?.a.id));
    this.sideB.addEventListener('click', () => this.cheer('go', this.kt.fight?.b.id));
    const reacts = el('div', 'kw-reacts');
    ['clap', 'fire', 'wow', 'lol'].forEach((id, i) => {
      const b = el('button', 'kw-r');
      b.dataset.r = id;
      b.title = `${CHEERS[id].label} (${i + 2})`;
      b.append(el('span', '', CHEERS[id].icon), el('kbd', '', String(i + 2)));
      b.addEventListener('click', () => this.cheer(id));
      reacts.append(b);
    });
    bar.append(this.sideA, reacts, this.sideB);
    this.buttons = [this.sideA, this.sideB, ...reacts.children];

    const nav = el('div', 'kw-nav');
    // rótulo curto no celular (o topo esquerdo já tem 4 ícones: ☰ 💬 👥 🎙️)
    const label = (icon, long, short) => [el('span', '', icon), el('span', 'kw-long', ` ${long}`), el('span', 'kw-short', short ? ` ${short}` : '')];
    this.nextBtn = el('button', 'kw-next');
    this.nextBtn.append(...label('⇄', 'Outra luta', ''));
    this.nextBtn.title = 'Assistir outra luta (N)';
    this.nextBtn.addEventListener('click', () => this.nextFight());
    const exit = el('button', 'kw-exit');
    exit.append(...label('🚪', 'Sair do dojo', 'Sair'));
    exit.title = 'Voltar para a praça (Esc)';
    exit.addEventListener('click', () => this.kt.leaveWatch());
    nav.append(this.nextBtn, exit);

    r.append(top, this.casterEl, bar, nav);
    r.addEventListener('contextmenu', (ev) => ev.preventDefault());
    document.body.appendChild(r);
    this.root = r;
  }

  show(fight) {
    this.build();
    const label = (btn, nick, key) => {
      btn.replaceChildren(el('span', '', '📣'), el('b', '', nick), el('kbd', '', key));
      btn.title = `Torcer por ${nick} (${key})`;
    };
    label(this.sideA, fight.a.nick, '1');
    label(this.sideB, fight.b.nick, '6');
    this.root.hidden = false;
    document.body.classList.add('kt-watch');
    this.coolUntil = 0;
    this.casterEl.hidden = true;
    this.lineAt = 0;
    this.say(pick([
      `Boa noite, torcida! No tatame: ${fight.a.nick} × ${fight.b.nick}!`,
      `Você chegou na hora! ${fight.a.nick} contra ${fight.b.nick}, ao vivo do Dojo!`,
      `Senta que lá vem pancada: ${fight.a.nick} × ${fight.b.nick}!`,
    ]), true);
  }

  hide() {
    if (this.root) this.root.hidden = true;
    document.body.classList.remove('kt-watch');
  }

  // ---------- torcida ----------

  cheer(r, side) {
    const now = performance.now();
    if (!this.kt.fight || now < this.coolUntil) return;
    this.coolUntil = now + ARENA.CHEER_COOLDOWN_MS + 40;
    this.game.send(side ? { t: MSG.KT_CHEER, r, side } : { t: MSG.KT_CHEER, r });
    this.root.classList.add('cool');
    clearTimeout(this.coolTimer);
    this.coolTimer = setTimeout(() => this.root?.classList.remove('cool'), ARENA.CHEER_COOLDOWN_MS);
    play('click');
  }

  // true = tecla consumida
  key(ev, down) {
    const code = ev.code;
    if (!down) return /^(Digit|Key)/.test(code);
    if (ev.repeat) return true;
    if (code === 'Escape') {
      this.kt.leaveWatch();
      return true;
    }
    if (code === 'KeyN') {
      this.nextFight();
      return true;
    }
    const k = KEYS[code];
    if (k === 'goA') this.cheer('go', this.kt.fight.a.id);
    else if (k === 'goB') this.cheer('go', this.kt.fight.b.id);
    else if (k) this.cheer(k);
    return /^(Digit|Key)/.test(code);
  }

  nextFight() {
    const ids = [...this.game.arena.fights.keys()].sort((a, b) => a - b);
    if (ids.length < 2) {
      this.game.hud.toast('Só tem essa luta rolando agora 🥋');
      return;
    }
    const cur = this.kt.fight?.id;
    const next = ids.find((id) => id > cur) ?? ids[0];
    this.kt.watch(next);
    play('click');
  }

  // ---------- por frame ----------

  update(now) {
    if (!this.root || this.root.hidden) return;
    const n = this.kt.crowd.length;
    const txt = `👀 ${n} na plateia`;
    if (txt !== this.shown) {
      this.shown = txt;
      this.countEl.textContent = txt;
    }
    this.hypeFill.style.width = `${Math.round(this.kt.hype * 100)}%`;
    this.hypeEl.classList.toggle('hot', this.kt.hype > 0.55);
    this.nextBtn.hidden = this.game.arena.fights.size < 2;
    void now;
  }

  // ---------- locutor ----------

  say(text, force = false) {
    const now = performance.now();
    if (!force && now - this.lineAt < 1500) return;
    this.lineAt = now;
    const c = this.casterEl;
    c.hidden = false;
    c.textContent = `🎙️ ${text}`;
    c.classList.remove('pop');
    void c.offsetWidth; // reinicia a animação
    c.classList.add('pop');
    clearTimeout(this.casterTimer);
    this.casterTimer = setTimeout(() => { c.hidden = true; }, 4200);
  }

  // narra os eventos da luta (só para a plateia; os lutadores têm o sensei)
  narrate(e) {
    const n = (id) => this.kt.nickOf(id);
    switch (e.kind) {
      case 'round': {
        const final = e.wins.every((w) => w === KT.ROUNDS_TO_WIN - 1);
        this.say(final ? `ROUND FINAL! ${e.wins[0]}×${e.wins[1]}... quem leva?` : `Round ${e.round}! Placar: ${e.wins[0]}×${e.wins[1]}.`, true);
        break;
      }
      case 'fight':
        this.say(pick(['Começou! Quem piscar, perde!', 'LUTEM! A torcida tá de pé!', 'Valendo! Olha o tatame tremendo!']));
        break;
      case 'hit':
        if (e.kd && e.combo >= 4) this.say(`COMBO FINAL de ${n(e.by)}! ${n(e.to)} foi pro chão!`, true);
        else if (e.counter) this.say(pick([`Contra-ataque de ${n(e.by)}! Leu o golpe!`, `${n(e.by)} pegou ${n(e.to)} no contrapé!`]));
        else if (e.m === 'hkick') this.say(pick([`QUE CHUTAÇO de ${n(e.by)}!`, `${n(e.to)} viu passarinho!`, `${n(e.to)} beijou o tatame!`]), true);
        else if (e.combo >= 3) this.say(`${e.combo} HITS! ${n(e.by)} tá on fire! 🔥`);
        else if (e.m === 'punch') this.say(pick([`Soco forte de ${n(e.by)}! Doeu até aqui na cabine.`, `Pancada de ${n(e.by)}!`]));
        else if (e.dash) this.say(`Investida de ${n(e.by)}! Veio voando!`);
        else if (e.stale) this.say(`${n(e.by)} tá repetindo golpe... previsível!`);
        else if (e.slow) this.say(`Chute na perna! ${n(e.to)} tá mancando.`);
        break;
      case 'parry':
        this.say(`DEFESA PERFEITA de ${n(e.by)}! Que reflexo!`, true);
        break;
      case 'guardbreak':
        this.say(`${n(e.by)} QUEBROU a guarda de ${n(e.to)}!`, true);
        break;
      case 'whiff':
        if (e.m === 'hkick') this.say(pick([`${n(e.by)} chutou o vento... a plateia ri 😂`, `Errou feio, ${n(e.by)}!`]));
        break;
      case 'ko':
        if (e.reason === 'time') this.say(`Tempo! ${n(e.winner)} leva o round nos pontos.`, true);
        else if (e.perfect) this.say(`PERFEITO! ${n(e.winner)} nem suou! ✨`, true);
        else this.say(pick([`K.O.! ${n(e.winner)} leva o round!`, `NOCAUTE! ${n(e.loser)} tá contando estrelinhas!`]), true);
        break;
      default:
        break;
    }
  }
}
