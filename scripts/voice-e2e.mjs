// E2E do chat de voz: sobe o servidor em processo + vários Chromes headless com microfone falso
// (bipes do Chrome) e confere convite, pedido para entrar, áudio chegando, quem fala, mudo,
// apertar-para-falar, recuperação de conexão, voz no dojo, troca de grupo e celular.
//
//   npm i --no-save puppeteer          (só para este teste; não é dependência do jogo)
//   node scripts/voice-e2e.mjs                         # tudo, porta 3110
//   RELAY=1 TURN_URLS="turn:IP:3478?transport=udp" TURN_SECRET=... node scripts/voice-e2e.mjs
//                                                      # força tudo pelo TURN (testa o coturn)
//   QUICK=1 ...  só até "áudio flui"     E2E_PORT=xxxx  outra porta     SHOTS=dir  capturas de tela
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.ROOT || fileURLToPath(new URL('..', import.meta.url));
const SHOTS = (process.env.SHOTS || '/tmp/np-voice-shots').replace(/\/?$/, '/');
mkdirSync(SHOTS, { recursive: true });
let url = process.argv[2];
let server;
if (!url) {
  const { createGameServer } = await import(`${ROOT}/server/index.js`);
  server = createGameServer({ port: Number(process.env.E2E_PORT || 3110), host: '127.0.0.1', log: () => {} });
  await server.ready;
  url = `http://localhost:${process.env.E2E_PORT || 3110}`;
}
const RELAY = process.env.RELAY === '1';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const errors = [];
const step = (s) => console.log(`▶ ${s}`);

async function player(nick, query = '?mobile=0', vp = { width: 1280, height: 800 }) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(vp);
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${nick}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${nick}] PAGEERROR ${e.message}`));
  await page.goto(url + query);
  await page.type('#nick', nick);
  await page.click('#login-btn');
  await page.waitForFunction(() => window.__voice && window.__game.me, { timeout: 8000 });
  const id = await page.evaluate(() => window.__game.me);
  if (RELAY) await page.evaluate(() => { const C = window.RTCPeerConnection; window.RTCPeerConnection = function (cfg) { return new C({ ...cfg, iceTransportPolicy: 'relay' }); }; window.RTCPeerConnection.prototype = C.prototype; });
  return { page, id, nick };
}

const peersConnected = (p, n) => p.page.waitForFunction((n) => {
  const v = window.__voice;
  return v.peers.size === n && [...v.peers.values()].every((x) => x.state === 'connected');
}, { timeout: 20000 }, n);

const inbound = (p, fromId) => p.page.evaluate(async (fromId) => {
  const peer = window.__voice.peers.get(fromId);
  const s = await peer.stats();
  return { bytes: s.bytes || 0, type: s.type, rtt: s.rtt, level: peer.audioLevel() };
}, fromId);

const maxLevel = (p, fromId, ms) => p.page.evaluate((fromId, ms) => new Promise((res) => {
  let max = 0;
  const t = setInterval(() => { max = Math.max(max, window.__voice.peers.get(fromId)?.audioLevel() || 0); }, 20);
  setTimeout(() => { clearInterval(t); res(max); }, ms);
}), fromId, ms);

const acceptAsk = async (p) => {
  await p.page.waitForSelector('.invite.voice .inv-yes', { timeout: 5000 });
  await p.page.click('.invite.voice .inv-yes');
};

const cardVoiceLabel = (p, target) => p.page.evaluate((pid) => {
  window.__game.interact({ id: 'player', pid });
  return document.querySelector('#player-card .pc-voice')?.textContent;
}, target.id);

try {
  const A = await player('Ana');
  const B = await player('Bia');
  const C = await player('Cris');
  // voz aberta: o microfone falso faz bipes; assim o sinal é contínuo
  for (const p of [A, B, C]) await p.page.evaluate(() => window.__voice.setSetting('mode', 'open'));

  step('cartão do player oferece "Chamar para conversar por voz"');
  assert.match(await cardVoiceLabel(A, B), /Chamar para conversar por voz/);

  step('convite recusado: o microfone de quem convidou é liberado');
  await A.page.evaluate((id) => window.__voice.invite(id), C.id);
  await A.page.waitForFunction(() => !!window.__voice.mic, { timeout: 4000 });
  await C.page.waitForSelector('.invite.voice .inv-no', { timeout: 5000 });
  await C.page.click('.invite.voice .inv-no');
  await A.page.waitForFunction(() => !window.__voice.mic && !window.__voice.group, { timeout: 4000 });
  await new Promise((r) => setTimeout(r, 900)); // anti-spam entre convites

  step('Ana convida Bia pelo cartão; Bia aceita pelo convite');
  await A.page.click('#player-card .pc-voice');
  await acceptAsk(B);
  await peersConnected(A, 1);
  await peersConnected(B, 1);
  console.log('   conectados');

  step('áudio flui nos dois sentidos');
  await new Promise((r) => setTimeout(r, 2500));
  const ab = await inbound(B, A.id);
  const ba = await inbound(A, B.id);
  console.log('   B<-A', ab, '  A<-B', ba);
  assert.ok(ab.bytes > 2000 && ba.bytes > 2000, 'bytes de áudio recebidos');
  if (RELAY) assert.equal(ab.type, 'relay');
  const lvl = await maxLevel(B, A.id, 2000);
  console.log('   nível máximo de A em B:', lvl.toFixed(3));
  assert.ok(lvl > 0.05, 'B ouve A');
  await B.page.waitForFunction((id) => window.__voice.isSpeaking(id), { timeout: 4000 }, A.id);
  console.log('   B vê A falando');

  if (process.env.QUICK) throw Object.assign(new Error('QUICK'), { quick: true });

  step('Ana fica muda: Bia vê 🔇 e para de receber som');
  await A.page.keyboard.press('KeyM');
  await B.page.waitForFunction((id) => window.__voice.member(id)?.m === 1, { timeout: 3000 }, A.id);
  await new Promise((r) => setTimeout(r, 400));
  const muted = await maxLevel(B, A.id, 1500);
  console.log('   nível com A muda:', muted.toFixed(3));
  assert.ok(muted < 0.01, 'mudo não transmite');
  await A.page.keyboard.press('KeyM');
  await B.page.waitForFunction((id) => window.__voice.member(id)?.m === 0, { timeout: 3000 }, A.id);

  step('Cris vê "Pedir para entrar" e pede; Ana aprova → malha de 3');
  assert.match(await cardVoiceLabel(C, A), /Pedir para entrar no grupo de voz/);
  await C.page.click('#player-card .pc-voice');
  await acceptAsk(A);
  for (const p of [A, B, C]) await peersConnected(p, 2);
  await new Promise((r) => setTimeout(r, 1500));
  const ca = await maxLevel(C, A.id, 1500);
  const cb = await maxLevel(C, B.id, 1500);
  console.log('   C ouve A:', ca.toFixed(3), ' C ouve B:', cb.toFixed(3));
  assert.ok(ca > 0.05 && cb > 0.05);
  assert.match(await cardVoiceLabel(C, B), /Está no seu grupo de voz/);

  step('painel e configurações (screenshots)');
  await A.page.click('.voice-btn');
  await A.page.waitForSelector('#voice-panel .vp-member', { timeout: 3000 });
  await new Promise((r) => setTimeout(r, 2500));
  await A.page.screenshot({ path: `${SHOTS}desktop-panel.png` });
  await A.page.click('#voice-panel .vp-act:nth-child(3)');
  await A.page.waitForSelector('.vs-card');
  await new Promise((r) => setTimeout(r, 800));
  await A.page.screenshot({ path: `${SHOTS}desktop-settings.png` });
  await A.page.click('.vs-done');
  assert.ok(await A.page.evaluate(() => !!window.__voice.mic), 'fechar ajustes no grupo mantém o mic');

  step('apertar para falar: sem tecla não transmite, segurando B transmite');
  await A.page.evaluate(() => window.__voice.setSetting('mode', 'ptt'));
  await new Promise((r) => setTimeout(r, 500));
  const ptt0 = await maxLevel(B, A.id, 1200);
  await A.page.keyboard.down('KeyB');
  await new Promise((r) => setTimeout(r, 300));
  const ptt1 = await maxLevel(B, A.id, 1500);
  await A.page.keyboard.up('KeyB');
  console.log('   ptt solto:', ptt0.toFixed(3), ' segurando:', ptt1.toFixed(3));
  assert.ok(ptt0 < 0.01 && ptt1 > 0.05);
  await A.page.evaluate(() => window.__voice.setSetting('mode', 'open'));

  step('trocar qualidade e microfone sem cair');
  await A.page.evaluate(() => { window.__voice.setSetting('quality', 'low'); window.__voice.setSetting('echo', false); });
  await new Promise((r) => setTimeout(r, 1500));
  assert.ok((await maxLevel(B, A.id, 1500)) > 0.05, 'continua ouvindo após mudar processamento');

  step('conexão cai e se recupera: reinício de ICE e depois recriação do zero');
  const t0 = Date.now();
  await A.page.evaluate((id) => window.__voice.peers.get(id).recover(), B.id);
  await new Promise((r) => setTimeout(r, 300));
  await peersConnected(A, 2);
  assert.ok((await maxLevel(B, A.id, 1200)) > 0.05, 'áudio volta após reinício de ICE');
  await A.page.evaluate((id) => { const p = window.__voice.peers.get(id); p.restarts = 99; p.recover(); }, B.id);
  await new Promise((r) => setTimeout(r, 300));
  await peersConnected(A, 2);
  await peersConnected(B, 2);
  assert.ok((await maxLevel(B, A.id, 1500)) > 0.05, 'áudio volta após recriar a conexão');
  assert.ok((await maxLevel(A, B.id, 1500)) > 0.05, 'nos dois sentidos');
  console.log(`   recuperado em ${Date.now() - t0} ms (com as medições)`);

  step('voz continua durante uma luta de Karatê');
  await A.page.evaluate((id) => window.__game.kt.challenge(id), B.id);
  await B.page.waitForSelector('.invite:not(.voice) .inv-yes', { timeout: 5000 });
  await B.page.click('.invite:not(.voice) .inv-yes');
  await A.page.waitForFunction(() => window.__game.kt.active(), { timeout: 5000 });
  await B.page.waitForFunction(() => window.__game.kt.active(), { timeout: 5000 });
  const ktLvl = await maxLevel(B, A.id, 1500);
  console.log('   nível no dojo:', ktLvl.toFixed(3));
  assert.ok(ktLvl > 0.05);
  await A.page.screenshot({ path: `${SHOTS}desktop-karate.png` });

  step('dono remove Cris; Bia sai → grupo acaba');
  await A.page.evaluate((id) => window.__voice.kick(id), C.id);
  await C.page.waitForFunction(() => !window.__voice.group && window.__voice.peers.size === 0 && !window.__voice.mic, { timeout: 3000 });
  await peersConnected(A, 1);
  await B.page.evaluate(() => window.__voice.leave());
  await A.page.waitForFunction(() => !window.__voice.group && window.__voice.peers.size === 0 && !window.__voice.mic, { timeout: 3000 });
  assert.equal(await B.page.evaluate(() => document.querySelectorAll('#voice-audio audio').length), 0);

  step('trocar de grupo: Bia pede para entrar no grupo do Cris e sai do grupo da Ana');
  const D = await player('Davi');
  await D.page.evaluate(() => window.__voice.setSetting('mode', 'open'));
  await C.page.evaluate((id) => window.__voice.invite(id), D.id);
  await acceptAsk(D);
  await peersConnected(C, 1);
  await A.page.evaluate((id) => window.__voice.invite(id), B.id);
  await acceptAsk(B);
  await peersConnected(B, 1);
  await B.page.evaluate((id) => window.__voice.request(id), C.id);
  await acceptAsk(C);
  await A.page.waitForFunction(() => !window.__voice.group, { timeout: 4000 });
  for (const p of [B, C, D]) await peersConnected(p, 2);
  assert.ok((await maxLevel(D, B.id, 1500)) > 0.05, 'Davi ouve a Bia no grupo novo');
  for (const p of [B, C, D]) await p.page.evaluate(() => window.__voice.leave());

  step('celular: ícone 🎙️, painel e convite');
  const M = await player('Mobi', '?mobile=1', { width: 375, height: 812, isMobile: true, hasTouch: true });
  await M.page.evaluate(() => window.__voice.setSetting('mode', 'open'));
  await A.page.evaluate((id) => window.__voice.invite(id), M.id);
  await acceptAsk(M);
  await peersConnected(M, 1);
  await M.page.click('.m-voice');
  await new Promise((r) => setTimeout(r, 1500));
  await M.page.screenshot({ path: `${SHOTS}mobile-panel.png` });
  await M.page.setViewport({ width: 812, height: 375, isMobile: true, hasTouch: true }); // pode recarregar
  await M.page.waitForFunction(() => window.__voice, { timeout: 8000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
  await M.page.screenshot({ path: `${SHOTS}mobile-landscape.png` });

  step('desconectar (fechar aba) tira do grupo');
  await M.page.close();
  await A.page.waitForFunction(() => !window.__voice.group, { timeout: 5000 });

  const bad = errors.filter((e) => !/favicon|fonts\.g/.test(e));
  if (bad.length) console.log('⚠ console:\n  ' + bad.join('\n  '));
  console.log('\n✔ E2E do chat de voz passou');
} catch (err) {
  if (!err.quick) throw err;
  console.log('\n✔ E2E rápido passou');
} finally {
  await browser.close();
  await server?.close();
}
