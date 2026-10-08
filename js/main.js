import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RISKS, CONFUSAVEIS, INCIDENTS, CORINGA, VMAP, COMPS, PCOLORS } from './data.js';

/* estado global usado pelos módulos reaproveitados */
let threat = null, logoImg = null, backCanvasCache = null, robotProto = null, die = null, podium = null;
let shake = 0;
const MOBILE = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
const haptic = pat => { try { if (MOBILE && navigator.vibrate) navigator.vibrate(pat); } catch (e) {} };
let zoomedOnce = false;
const imgs = {};
const villains = {};
let robot = null, villain = null; // robot = mascote da abertura e do título

/* ---- utilitários ---- */
const $ = s => document.querySelector(s);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => s.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

// motor de tween mínimo
const tweens = [];
const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2, back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, lin: t => t };
function tween(dur, fn, e = ease.out) {
  if (reduced) dur = Math.min(dur, 60);
  return new Promise(res => tweens.push({ t0: performance.now(), dur, fn, e, res }));
}
const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));

// som sintetizado (Web Audio)
let actx = null, muted = false;
function sfx(type) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime, g = actx.createGain(); g.connect(actx.destination);
    const tone = (f, t, d, wave = 'sine', v = .12, f2) => { const o = actx.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f, now + t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + t + d); const gg = actx.createGain(); gg.gain.setValueAtTime(0, now + t); gg.gain.linearRampToValueAtTime(v, now + t + .01); gg.gain.exponentialRampToValueAtTime(.0001, now + t + d); o.connect(gg); gg.connect(actx.destination); o.start(now + t); o.stop(now + t + d + .02); };
    if (type === 'deal') { tone(520, 0, .08, 'triangle', .06); tone(780, .05, .08, 'triangle', .05); }
    if (type === 'flip') tone(300, 0, .25, 'sawtooth', .04, 900);
    if (type === 'ok') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .07, .35, 'triangle', .09)); }
    if (type === 'bad') { tone(220, 0, .5, 'sawtooth', .08, 70); tone(233, .02, .45, 'square', .04, 80); }
    if (type === 'whoosh') tone(200, 0, .35, 'sine', .05, 1200);
    if (type === 'eek') { tone(700, 0, .12, 'triangle', .07, 1300); tone(1100, .1, .1, 'triangle', .05, 1500); }
    if (type === 'sad') { tone(440, 0, .35, 'triangle', .06, 330); tone(330, .3, .5, 'triangle', .06, 220); }
    if (type === 'laugh') { [0, .16, .32, .48, .64].forEach((t, i) => tone(260 - i * 18, t, .12, 'square', .045, 200 - i * 15)); }
    if (type === 'portal') { tone(90, 0, .6, 'sawtooth', .05, 420); tone(1400, .05, .5, 'sine', .03, 300); }
    if (type === 'zap') { tone(1200, 0, .5, 'sawtooth', .06, 60); tone(80, .05, .4, 'square', .05, 40); }
    if (type === 'sneak') { [0, .18, .36, .54].forEach(t => tone(180, t, .08, 'triangle', .06, 150)); }
    if (type === 'drop') { tone(160, 0, .3, 'sine', .12, 50); }
    if (type === 'pop') { tone(900, 0, .08, 'square', .06, 1600); tone(200, .02, .2, 'sine', .08, 60); }
    if (type === 'unlock') { tone(1200, 0, .05, 'square', .05); tone(1600, .08, .05, 'square', .05); [784, 1047].forEach((f, i) => tone(f, .18 + i * .08, .3, 'triangle', .07)); }
    if (type === 'dice') tone(700 + Math.random() * 700, 0, .035, 'square', .03);
    if (type === 'dieland') { tone(140, 0, .25, 'sine', .14, 60); tone(900, .02, .06, 'square', .04); }
    if (type === 'turn') { tone(660, 0, .12, 'triangle', .07); tone(880, .1, .16, 'triangle', .07); }
    if (type === 'laser') tone(1500, 0, .14, 'sawtooth', .05, 300);
    if (type === 'volt') { tone(80, 0, .4, 'sawtooth', .07, 1600); tone(2400, .05, .2, 'square', .03, 600); }
    if (type === 'power') { [440, 660, 880, 1320].forEach((f, i) => tone(f, i * .06, .3, 'sine', .07)); }
    if (type === 'tick') { tone(1000, 0, .05, 'square', .04); tone(1500, .08, .05, 'square', .04); }
    if (type === 'win') { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .09, .5, 'triangle', .08)); }
  } catch (e) {}
}
/* ---- cena ---- */
const canvas = $('#gl'), stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.6 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#07111F');
scene.fog = new THREE.Fog('#07111F', 14, 34);
const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
const camBase = new THREE.Vector3(0, .6, 10);
camera.position.copy(camBase);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .6, .5, .82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight('#8FC8FF', '#0A1020', .9));
const key = new THREE.DirectionalLight('#FFFFFF', 1.6); key.position.set(3, 6, 8); scene.add(key);
const rim = new THREE.PointLight('#2FD6F0', 30, 20); rim.position.set(-4, 3, -3); scene.add(rim);
const amberL = new THREE.PointLight('#F5A524', 18, 16); amberL.position.set(4, -1, 2); scene.add(amberL);

// piso de circuito
const floorY = -2.6;
const grid = new THREE.GridHelper(60, 60, '#1B4F7A', '#10284A'); grid.position.y = floorY; scene.add(grid);
function circuitTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
  const cols = ['#2FD6F0', '#F5A524', '#2FD6F0', '#B455F5'];
  for (let i = 0; i < 26; i++) {
    x.strokeStyle = cols[i % 4]; x.lineWidth = 2; x.globalAlpha = .55 + Math.random() * .45;
    let px = 180 + Math.random() * 150, py = 512; x.beginPath(); x.moveTo(px, py);
    while (py > 0) { py -= 20 + Math.random() * 60; if (Math.random() < .5) px += (Math.random() < .5 ? -1 : 1) * 40; x.lineTo(px, py); }
    x.stroke(); x.globalAlpha = 1; x.fillStyle = cols[i % 4]; x.beginPath(); x.arc(px, Math.max(py, 4), 4, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; return t;
}
const lane = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), new THREE.MeshBasicMaterial({ map: circuitTexture(), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
lane.rotation.x = -Math.PI / 2; lane.position.set(0, floorY + .01, -2); scene.add(lane);

// poeira luminosa
const DUST = MOBILE ? 380 : 700;
const dustGeo = new THREE.BufferGeometry();
const dp = new Float32Array(DUST * 3), dc = new Float32Array(DUST * 3);
const cCy = new THREE.Color('#2FD6F0'), cAm = new THREE.Color('#F5A524');
for (let i = 0; i < DUST; i++) { dp[i*3] = (Math.random() - .5) * 30; dp[i*3+1] = floorY + Math.random() * 12; dp[i*3+2] = -18 + Math.random() * 24; const col = Math.random() < .8 ? cCy : cAm; dc.set([col.r, col.g, col.b], i * 3); }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
dustGeo.setAttribute('color', new THREE.BufferAttribute(dc, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: .06, vertexColors: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

// explosões de partículas
const bursts = [];
function burst(pos, color, n = 160, speed = 5) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) { p.set([pos.x, pos.y, pos.z], i * 3); const d = new THREE.Vector3().randomDirection().multiplyScalar(speed * (.3 + Math.random() * .7)); v.push(d); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size: .09, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(g, m); scene.add(pts); bursts.push({ pts, v, life: 0 });
}

// núcleo (Blender) e escudo (Blender)
const loader = new GLTFLoader();
let core = null, coreGlow = null, shieldProto = null;
const coreGroup = new THREE.Group(); scene.add(coreGroup);
const nodes = new THREE.Group(); coreGroup.add(nodes);

// cartas 3D
const CARD_W = 2.16, CARD_H = 3.0;
function roundRect(x, w, h, r) { x.beginPath(); x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r); x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.closePath(); }
function wrap(x, text, px, py, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, px, py); py += lh; line = w; } else line = t; }
  if (line) { x.fillText(line, px, py); py += lh; }
  return py;
}
function makeTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
const W = 720, H = 1000;
function fitTitle(x, text, maxW, sizes) { for (const s of sizes) { x.font = `700 ${s}px "Chakra Petch"`; if (x.measureText(text.split(' ').sort((a, b) => b.length - a.length)[0]).width < maxW) return s; } return sizes[sizes.length - 1]; }
function backCanvas() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  roundRect(x, W, H, 44); x.save(); x.clip();
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0F2A4E'); g.addColorStop(1, '#06101F'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(47,214,240,.18)'; x.lineWidth = 2;
  for (let i = -H; i < W; i += 36) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); }
  x.restore();
  x.strokeStyle = '#2FD6F0'; x.lineWidth = 10; roundRect(x, W, H, 44); x.stroke();
  x.strokeStyle = '#F5A524'; x.lineWidth = 3; x.save(); x.translate(26, 26); roundRect(x, W - 52, H - 52, 28); x.stroke(); x.restore();
  if (logoImg) { const lw = 380, lh = lw * logoImg.height / logoImg.width; x.drawImage(logoImg, (W - lw) / 2, H / 2 - lh / 2 - 40, lw, lh); }
  x.fillStyle = '#E7F1FF'; x.font = '700 64px "Chakra Petch"'; x.textAlign = 'center'; x.fillText('RISKCARDS', W / 2, H / 2 + 140);
  x.fillStyle = '#F5A524'; x.font = '600 26px "Chakra Petch"'; x.fillText('IA SOB ATAQUE · LETRAMENTO IA', W / 2, H / 2 + 186);
  return c;
}
function threatCanvas(card) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  roundRect(x, W, H, 44); x.save(); x.clip();
  const base = new THREE.Color(card.c);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, card.c); g.addColorStop(1, '#' + base.clone().multiplyScalar(.35).getHexString());
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = .12; x.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) x.fillRect(Math.random() * W, Math.random() * H, Math.random() * 60 + 6, 3);
  x.globalAlpha = 1; x.restore();
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 10; roundRect(x, W, H, 44); x.stroke();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(96, 96, 60, 0, 7); x.fill();
  x.fillStyle = '#07111F'; x.font = '700 64px "Chakra Petch"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(card.n, 96, 100);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 24px "Chakra Petch"'; x.fillText('AMEAÇA LANÇADA', 178, 76);
  const fs = fitTitle(x, card.t.toUpperCase(), W - 210, [54, 46, 40]);
  x.fillStyle = '#fff'; x.font = `700 ${fs}px "Chakra Petch"`;
  let y = wrap(x, card.t.toUpperCase(), 178, 132, W - 210, fs + 2);
  y = Math.max(y, 190);
  x.fillStyle = 'rgba(255,255,255,.92)'; x.save(); x.translate(40, y); roundRect(x, W - 80, 112, 16); x.fill(); x.restore();
  x.fillStyle = '#07111F'; x.font = '600 30px "IBM Plex Sans"';
  wrap(x, card.s, 64, y + 46, W - 128, 36);
  y += 150;
  x.fillStyle = 'rgba(7,17,31,.55)'; x.save(); x.translate(40, y); roundRect(x, W - 80, H - y - 120, 18); x.fill(); x.restore();
  x.fillStyle = '#FFD27A'; x.font = '700 28px "Chakra Petch"'; x.fillText('RISCOS', 70, y + 50);
  y += 100;
  for (const r of card.ex) {
    x.fillStyle = '#FF4D63'; x.beginPath(); x.moveTo(84, y - 30); x.lineTo(106, y + 6); x.lineTo(62, y + 6); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.font = '700 22px "IBM Plex Sans"'; x.textAlign = 'center'; x.fillText('!', 84, y + 2); x.textAlign = 'left';
    x.font = '500 29px "IBM Plex Sans"'; y = wrap(x, r, 124, y, W - 180, 35) + 12;
    if (y > H - 150) break;
  }
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 24px "Chakra Petch"'; x.textAlign = 'center';
  x.fillText('QUAL DEFESA NEUTRALIZA ESTE RISCO?', W / 2, H - 62);
  return c;
}
function clueCanvas(sig) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  roundRect(x, W, H, 44); x.save(); x.clip();
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#06303D'); g.addColorStop(1, '#03111A'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(47,214,240,.14)'; x.lineWidth = 2;
  for (let i = 0; i < W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  const sg = x.createLinearGradient(0, 300, 0, 380); sg.addColorStop(0, 'rgba(47,214,240,0)'); sg.addColorStop(.5, 'rgba(47,214,240,.35)'); sg.addColorStop(1, 'rgba(47,214,240,0)');
  x.fillStyle = sg; x.fillRect(0, 300, W, 80);
  x.restore();
  x.strokeStyle = '#2FD6F0'; x.lineWidth = 10; roundRect(x, W, H, 44); x.stroke();
  // lupa
  x.strokeStyle = '#2FD6F0'; x.lineWidth = 12; x.beginPath(); x.arc(110, 118, 42, 0, 7); x.stroke(); x.beginPath(); x.moveTo(142, 150); x.lineTo(182, 190); x.stroke();
  x.fillStyle = '#2FD6F0'; x.font = '700 76px "Chakra Petch"'; x.fillText('RAIO-X', 210, 128);
  x.fillStyle = '#F5A524'; x.font = '600 28px "Chakra Petch"'; x.fillText('SINAL DETECTADO NO SISTEMA', 212, 172);
  x.fillStyle = 'rgba(255,255,255,.95)'; x.save(); x.translate(44, 250); roundRect(x, W - 88, 520, 22); x.fill(); x.restore();
  x.fillStyle = '#2FD6F0'; x.font = '700 150px "Chakra Petch"'; x.fillText('“', 70, 380);
  x.fillStyle = '#07111F'; const fs = sig.length > 70 ? 40 : 46; x.font = `600 ${fs}px "IBM Plex Sans"`;
  wrap(x, sig.replace(/^“|”$/g, ''), 84, 400, W - 168, fs + 12);
  x.fillStyle = 'rgba(255,255,255,.88)'; x.font = '600 26px "Chakra Petch"'; x.textAlign = 'center';
  x.fillText('QUAL RISKCARD EXPLICA ESTE SINAL?', W / 2, H - 120);
  x.fillStyle = '#2FD6F0'; x.font = '600 22px "Chakra Petch"'; x.fillText('ANALISE · CONECTE · DECIDA', W / 2, H - 76);
  return c;
}
function teaserCanvas(img, inc) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  roundRect(x, W, H, 44); x.save(); x.clip();
  x.fillStyle = '#081A33'; x.fillRect(0, 0, W, H);
  const ih = img.height * W / img.width, cut = .6, dh = ih * cut;
  x.drawImage(img, 0, 0, img.width, img.height * cut, 0, 0, W, dh);
  const fg = x.createLinearGradient(0, dh - 120, 0, dh); fg.addColorStop(0, 'rgba(8,26,51,0)'); fg.addColorStop(1, 'rgba(8,26,51,1)'); x.fillStyle = fg; x.fillRect(0, dh - 120, W, 120);
  x.restore();
  x.strokeStyle = '#F5A524'; x.lineWidth = 10; roundRect(x, W, H, 44); x.stroke();
  x.textAlign = 'center';
  x.fillStyle = '#F5A524'; x.font = '700 30px "Chakra Petch"'; x.fillText('INCIDENTE REAL · ' + inc.when.toUpperCase(), W / 2, dh + 64);
  x.fillStyle = '#E7F1FF'; x.font = '700 52px "Chakra Petch"'; x.fillText('QUAIS RISKCARDS', W / 2, dh + 150); x.fillText('SE CONECTAM?', W / 2, dh + 210);
  x.fillStyle = '#2FD6F0'; x.font = '600 24px "Chakra Petch"'; x.fillText(inc.rel.length + ' CONEXÕES ESCONDIDAS NESTE CASO', W / 2, dh + 280);
  return c;
}
function faceCanvas(type) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const e = EVENTS[type];
  let g;
  if (type === 'coringa') { g = x.createLinearGradient(0, 0, 256, 256); ['#FF4D63', '#F5A524', '#F2D43D', '#3DDC97', '#2FD6F0', '#A77BFF'].forEach((col, i) => g.addColorStop(i / 5, col)); }
  else { g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, e.c); g.addColorStop(1, '#0B1424'); }
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 8; x.save(); x.translate(12, 12); roundRect(x, 232, 232, 30); x.stroke(); x.restore();
  x.save(); x.translate(128, 104); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 12; x.lineJoin = 'round'; x.lineCap = 'round';
  x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8;
  if (type === 'ataque') { x.beginPath(); x.moveTo(0, -50); x.lineTo(42, -34); x.lineTo(42, 2); x.quadraticCurveTo(40, 38, 0, 54); x.quadraticCurveTo(-40, 38, -42, 2); x.lineTo(-42, -34); x.closePath(); x.fill(); }
  if (type === 'raiox') { x.beginPath(); x.arc(-10, -10, 32, 0, 7); x.stroke(); x.beginPath(); x.moveTo(14, 14); x.lineTo(44, 44); x.stroke(); }
  if (type === 'incidente') { x.beginPath(); x.moveTo(0, -52); x.lineTo(52, 42); x.lineTo(-52, 42); x.closePath(); x.fill(); x.shadowBlur = 0; x.fillStyle = e.c; x.font = '700 64px "Chakra Petch"'; x.textAlign = 'center'; x.fillText('!', 0, 34); }
  if (type === 'relampago') { x.beginPath(); x.moveTo(14, -54); x.lineTo(-32, 6); x.lineTo(-2, 6); x.lineTo(-16, 54); x.lineTo(34, -10); x.lineTo(4, -10); x.closePath(); x.fill(); }
  if (type === 'coringa') { x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 52, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); }
  x.restore();
  x.fillStyle = '#fff'; x.font = '700 34px "Chakra Petch"'; x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6;
  x.fillText(e.face, 128, 214);
  return c;
}
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  x.font = '700 58px "Chakra Petch"'; const w = Math.min(492, x.measureText(text).width + 70);
  x.save(); x.translate((512 - w) / 2, 14); x.fillStyle = 'rgba(7,17,31,.88)'; roundRect(x, w, 100, 50); x.fill(); x.strokeStyle = color; x.lineWidth = 8; x.stroke(); x.restore();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 66, 460);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTex(c), transparent: true, depthWrite: false }));
  sp.scale.set(1.9, .475, 1); return sp;
}

function imageCanvas(img, w = W, h = H, r = 44) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  roundRect(x, w, h, r); x.save(); x.clip();
  const s = Math.max(w / img.width, h / img.height); const iw = img.width * s, ih = img.height * s;
  x.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); x.restore(); return c;
}

function makeCard(frontCanvas, backC = backCanvasCache) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: makeTex(frontCanvas), transparent: true, roughness: .45, metalness: .05, emissive: '#ffffff', emissiveIntensity: .12, side: THREE.FrontSide }));
  front.material.emissiveMap = front.material.map;
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: makeTex(backC), transparent: true, roughness: .4, metalness: .1, emissive: '#ffffff', emissiveIntensity: .1 }));
  back.material.emissiveMap = back.material.map;
  back.rotation.y = Math.PI;
  // moldura brilhante
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + .12, CARD_H + .12), new THREE.MeshBasicMaterial({ color: '#2FD6F0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  edge.position.z = -.02;
  g.add(edge, front, back);
  g.userData = { front, back, edge, zoom: { canvas: frontCanvas } };
  return g;
}
function setFront(card3d, canvasOrImg, aspect) {
  const m = card3d.userData.front.material;
  m.map.dispose(); m.map = makeTex(canvasOrImg); m.emissiveMap = m.map; m.needsUpdate = true;
  const sx = aspect ? (aspect * CARD_H) / CARD_W : 1;
  card3d.userData.front.scale.x = sx; card3d.userData.back.scale.x = sx; card3d.userData.edge.scale.x = sx;
}
/* ---- personagens ---- */
let CY = 0, FEET = -2.3, VIS = 5;
const pointer = new THREE.Vector2();
addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); });

function poseTo(pose, tgt, dur = 300, e = ease.out) {
  const from = {}, g = pose.__gen || 0; for (const k in tgt) from[k] = pose[k];
  return tween(dur, t => { if ((pose.__gen || 0) !== g) return; for (const k in tgt) pose[k] = from[k] + (tgt[k] - from[k]) * t; }, e);
}
const cancelPose = pose => { pose.__gen = (pose.__gen || 0) + 1; };
function worldOf(obj) { const v = new THREE.Vector3(); obj.getWorldPosition(v); return v; }

function makeRobot(root) {
  const P = n => root.getObjectByName(n);
  const R = { root, body: P('robo_corpo_pivo'), head: P('robo_cabeca'), armL: P('robo_ombro_E'), armR: P('robo_ombro_D'), legL: P('robo_quadril_E'), legR: P('robo_quadril_D'), eyes: [P('robo_olho_E'), P('robo_olho_D')], hand: P('robo_mao_D') };
  R.y0 = R.body.position.y; R.yaw = .45; R.blinkAt = 2; R.gen = 0;
  const Z = { jump: 0, crouch: 0, lean: 0, spin: 0, lz: 0, rz: 0, lx: 0, rx: 0, tilt: 0, down: 0, shake: 0, walk: 0, wave: 0, sad: 0, dance: 0, look: 1 };
  R.pose = { ...Z };
  R.update = (dt, el) => {
    const p = R.pose, b = Math.sin(el * 2.4);
    R.body.position.y = R.y0 + b * .025 + p.jump - p.crouch * .14 - p.sad * .06 + Math.abs(Math.sin(el * 8)) * .08 * p.dance;
    R.body.rotation.x = p.lean + p.sad * .2;
    R.body.rotation.z = Math.sin(el * 1.1) * .03 + (Math.random() - .5) * p.shake * .25 + Math.sin(el * 8) * .18 * p.dance;
    root.rotation.y = R.yaw * (1 - p.dance) + p.spin;
    const lx = THREE.MathUtils.clamp(pointer.x - root.position.x / 6, -1, 1) * .5 * p.look, ly = THREE.MathUtils.clamp(-pointer.y, -1, 1) * .25 * p.look;
    R.head.rotation.y += ((lx - R.yaw * .5 * p.look) - R.head.rotation.y) * Math.min(1, dt * 6);
    R.head.rotation.x = ly + p.down * .55 + p.sad * .35;
    R.head.rotation.z = p.tilt + Math.sin(el * 1.3) * .05;
    const osc = Math.sin(el * 13) * .4 * p.wave, dn = Math.sin(el * 8);
    R.armR.rotation.z = .1 + b * .04 + p.rz + p.wave * 2.5 + osc + (p.dance * (1.2 + dn * 1.1));
    R.armL.rotation.z = -.1 - b * .04 + p.lz - (p.dance * (1.2 - dn * 1.1));
    R.armR.rotation.x = p.rx; R.armL.rotation.x = p.lx;
    const w = Math.sin(el * 11) * .55 * p.walk;
    R.legL.rotation.x = w; R.legR.rotation.x = -w;
    R.blinkAt -= dt;
    const bl = R.blinkAt < 0 ? .12 : 1; if (R.blinkAt < -.12) R.blinkAt = 2 + Math.random() * 3;
    const happy = p.jump > .1 ? 1.25 : 1, sadEye = 1 - p.sad * .45;
    R.eyes.forEach(e => { e.scale.y = e.userData.sy * bl * sadEye * happy; });
  };
  R.eyes.forEach(e => e.userData.sy = e.scale.y);
  const G = () => ++R.gen, alive = g => g === R.gen;
  R.reset = (d = 350) => { G(); return poseTo(R.pose, Z, d); };
  R.wave = async () => { const g = G(); await poseTo(R.pose, { ...Z, wave: 1 }, 350); await wait(1500); if (alive(g)) await poseTo(R.pose, { wave: 0 }, 350); };
  R.scared = async () => {
    const g = G(); sfx('eek');
    await poseTo(R.pose, { ...Z, lean: -.3, lx: -1.4, rx: -1.4, lz: -.3, rz: .3, crouch: .7, shake: 1, jump: .25 }, 160);
    await poseTo(R.pose, { jump: 0 }, 220, ease.inOut); await wait(350);
    if (alive(g)) await poseTo(R.pose, { shake: 0, lean: .08, lx: -.5, rx: -.5, lz: -.2, rz: .2, crouch: .35, down: .2 }, 400);
  };
  R.point = () => { G(); return poseTo(R.pose, { rx: -1.6, rz: .5, lean: .15, crouch: .2, lx: 0, lz: -.4, down: 0, shake: 0 }, 180); };
  R.cheer = async () => {
    const g = G();
    for (let k = 0; k < 2 && alive(g); k++) {
      await poseTo(R.pose, { crouch: .8, lx: 0, rx: 0, lz: -.5, rz: .5, lean: 0 }, 140);
      await poseTo(R.pose, { crouch: 0, jump: .75, lz: -2.8, rz: 2.8, spin: k === 1 ? Math.PI * 2 : 0 }, 280, ease.out);
      await poseTo(R.pose, { jump: 0 }, 260, ease.inOut);
    }
    R.pose.spin = 0;
    if (alive(g)) await poseTo(R.pose, { lz: -.9, rz: .9, crouch: 0 }, 300);
  };
  R.sad = () => { G(); sfx('sad'); return poseTo(R.pose, { ...Z, sad: 1, down: .5, lz: .12, rz: -.12, look: .3 }, 700, ease.inOut); };
  R.confused = async () => { const g = G(); await poseTo(R.pose, { ...Z, rz: 2.3, rx: -1.1, tilt: .38, down: .1 }, 300); await wait(1100); if (alive(g)) await poseTo(R.pose, Z, 400); };
  R.present = async () => { G(); await poseTo(R.pose, { ...Z, lx: -1.3, rx: -1.3, lean: .12, crouch: .2 }, 260); };
  R.dance = async () => { G(); await poseTo(R.pose, { ...Z, dance: 1, look: 0 }, 400); };
  R.walkTo = async (x, dur = 900) => { const x0 = root.position.x; R.pose.walk = 1; await tween(dur, t => { root.position.x = x0 + (x - x0) * t; }, ease.inOut); R.pose.walk = 0; };
  return R;
}

/* ---------- vilões: um por família de ameaça, tirados das ilustrações ---------- */
const VCFG = {
  invasor: { file: 'invasor', body: 'inv_corpo_pivo', head: 'inv_cabeca', arms: ['inv_ombro_E', 'inv_ombro_D'], hand: 'inv_mao_D', eye: 'inv_olho', enter: 'rise', float: 1, scale: 1.05 },
  ladrao:  { file: 'ladrao', body: 'lad_corpo', head: 'lad_cabeca', arms: ['lad_ombro_E', 'lad_ombro_D'], legs: ['lad_quadril_E', 'lad_quadril_D'], hand: 'lad_pasta', enter: 'sneak', scale: 1 },
  rebelde: { file: 'robo', body: 'robo_corpo_pivo', head: 'robo_cabeca', arms: ['robo_ombro_E', 'robo_ombro_D'], legs: ['robo_quadril_E', 'robo_quadril_D'], hand: 'chave_anel', eye: 'robo_olho', enter: 'drop', scale: 1 },
  caixa:   { file: 'caixa', body: 'cx_corpo', hand: 'cx_pergunta', enter: 'drop', hop: 1, scale: 1.3 },
  barril:  { file: 'barril', body: 'bar_corpo', hand: 'bar_alerta', enter: 'drop', hop: 1, scale: 1.2 },
  boato:   { file: 'boato', body: 'bt_corpo', hand: 'bt_texto', enter: 'rise', float: 1, scale: 1 },
  balanca: { file: 'balanca', body: 'bal_corpo', hand: 'bal_prato_D', enter: 'drop', scale: 1.25 },
  cadeado: { file: 'cadeado', body: 'cad_corpo', hand: 'cad_arco', enter: 'drop', hop: 1, scale: 1.35 },
};
function makeVillain(type, root) {
  const c = VCFG[type], P = n => n && root.getObjectByName(n);
  const V = { type, c, root, body: P(c.body), head: P(c.head), hand: P(c.hand), shown: false, gen: 0, mats: {} };
  V.arms = (c.arms || []).map(P); V.legs = (c.legs || []).map(P);
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); const n = o.material.name || ''; (V.mats[n] = V.mats[n] || []).push(o.material); } });
  V.matsBy = pre => Object.keys(V.mats).filter(k => k.startsWith(pre)).flatMap(k => V.mats[k]);
  V.eyeMats = c.eye ? V.matsBy(c.eye) : [];
  V.y0 = V.body.position.y; V.yaw = -.45; V.x0 = 0; V.z0 = 0; V.s0 = 1;
  // peças especiais
  V.x = { tampa: P('cx_tampa'), perg: P('cx_pergunta'), alerta: P('bar_alerta'), orbita: P('bt_orbita'), braco: P('bal_braco'),
    pE: P('bal_prato_E'), pD: P('bal_prato_D'), arco: P('cad_arco'), corrente: P('cad_corrente'), pasta: P('lad_pasta'), folha: P('lad_folha'), chave: null };
  for (const k in V.x) if (V.x[k]) V.x[k].userData.p0 = V.x[k].position.clone();
  V.notas = []; root.traverse(o => { if (/^bar_nota_/.test(o.name)) { o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); V.notas.push(o); } });
  const Z = { rise: 0, lean: 0, lz: 0, rz: 0, lx: 0, rx: 0, laugh: 0, menace: 0, fade: 1, spin: 0, push: 0, walk: 0, spec: 0, taunt: 0, dx: 0 };
  V.pose = { ...Z };
  const cRed = new THREE.Color('#FF1030'), cCy = new THREE.Color('#2FD6F0');

  V.update = (dt, el) => {
    const p = V.pose, X = V.x;
    root.visible = p.rise > .01 && p.fade > .02;
    if (!root.visible) return;
    let y = V.y0 + Math.abs(Math.sin(el * 17)) * .09 * p.laugh;
    if (c.enter === 'drop') y += (1 - p.rise) * 5; else y += (p.rise - 1) * 2.6;
    if (c.float) y += Math.sin(el * 1.7) * .08;
    if (c.hop) y += Math.abs(Math.sin(el * 5)) * .1 * (p.menace + p.taunt);
    V.body.position.y = y;
    V.body.rotation.z = Math.sin(el * .9) * .06 + Math.sin(el * 17) * .07 * p.laugh;
    V.body.rotation.x = p.lean + p.menace * .15 - p.laugh * .12 - p.push * .5;
    root.rotation.y = V.yaw + p.spin;
    root.position.set(V.x0 + p.dx, CINE.on ? FEET : VFEET, V.z0 - p.push * 2.2);
    root.scale.setScalar(V.s0 * p.fade);
    if (V.head) { V.head.rotation.x = -p.laugh * .45 + Math.sin(el * 17) * .08 * p.laugh + p.menace * .1; V.head.rotation.y = Math.sin(el * .7) * .25 * (1 - p.laugh); }
    if (V.arms.length) {
      const m = Math.sin(el * 2.6) * .15 * p.menace, sw = Math.sin(el * 10) * .5 * p.walk;
      V.arms[1].rotation.z = .15 + p.rz + p.laugh * .3; V.arms[0].rotation.z = -.15 + p.lz - p.laugh * .3;
      V.arms[1].rotation.x = p.rx - p.menace * .9 + m - p.laugh * .7 - sw; V.arms[0].rotation.x = p.lx - p.menace * .9 - m - p.laugh * .7 + sw;
    }
    if (V.legs.length) { const w = Math.sin(el * 10) * .6 * p.walk; V.legs[0].rotation.x = w; V.legs[1].rotation.x = -w; }
    V.eyeMats.forEach(m => { m.emissiveIntensity = (6 + Math.sin(el * 23) * 2 * Math.random()) * (1 + p.laugh + p.menace * .4); });
    // comportamentos próprios
    if (type === 'rebelde') V.eyeMats.forEach(m => { m.emissive.lerpColors(cRed, cCy, p.spec); m.color.copy(m.emissive); });
    if (X.chave) { X.chave.rotation.z = Math.sin(el * 3) * .2 * (p.menace + p.taunt); X.chave.position.y = X.chave.userData.p0.y + p.spec * 3; X.chave.rotation.y = p.spec * 12; X.chave.visible = p.spec < .95; }
    if (X.tampa) { const open = Math.max(p.spec, p.taunt * (.6 + Math.sin(el * 12) * .3), p.menace * (.12 + Math.sin(el * 4) * .1)); X.tampa.rotation.x = -open * 1.7; X.perg.position.y = X.perg.userData.p0.y + open * .75; X.perg.rotation.y = el * 3 * open; V.matsBy('cx_preto').forEach(m => { m.transparent = p.spec > .01; m.opacity = 1 - p.spec * .8; }); }
    if (X.alerta) { X.alerta.position.y = X.alerta.userData.p0.y + Math.sin(el * 3) * .06; X.alerta.rotation.y = Math.sin(el * 2) * .5 + p.taunt * el * 8; X.alerta.visible = p.spec < .6;
      V.matsBy('bar_racha').forEach(m => { m.emissive.lerpColors(cRed, cCy, p.spec); m.color.copy(m.emissive); m.emissiveIntensity = 3 + p.taunt * 6 + Math.sin(el * 9) * 1.5 * (1 - p.spec); });
      V.notas.forEach((n, i) => { const f = Math.max(p.spec, p.taunt * .5 * (1 + Math.sin(el * 7 + i))); n.position.y = n.userData.p0.y - p.spec * (1.2 + i * .3) + Math.sin(el * 9 + i) * .04 * p.taunt; n.rotation.z = n.userData.r0.z + f * (i % 2 ? 2 : -2); }); }
    if (X.orbita) { X.orbita.rotation.y += dt * (1.5 + p.taunt * 6 + p.menace); X.orbita.scale.setScalar(1 + p.taunt * .25); V.body.scale.setScalar(1 + p.taunt * .15 + p.spec * .5); }
    if (X.braco) { const tilt = (.34 + p.taunt * .22 + Math.sin(el * 2.2) * .05) * (1 - p.spec); X.braco.rotation.z = -tilt; X.pE.rotation.z = tilt; X.pD.rotation.z = tilt;
      V.matsBy('bal_ouro').forEach(m => { m.emissive.set('#3DDC97'); m.emissiveIntensity = p.spec * .8; }); }
    if (X.arco) { X.arco.position.y = X.arco.userData.p0.y + p.spec * .3; X.arco.rotation.y = p.spec * 1.4; X.corrente.rotation.y = Math.sin(el * 22) * .06 * (p.menace + p.taunt * 2);
      X.corrente.position.y = X.corrente.userData.p0.y - p.spec * .5; X.corrente.scale.set(1 + p.spec * .5, 1, 1 + p.spec * .5); }
    if (X.pasta) { X.pasta.position.y = X.pasta.userData.p0.y - p.spec * .6; X.pasta.rotation.z = p.spec * 1.2; X.pasta.rotation.x = Math.sin(el * 10) * .25 * p.taunt; X.folha.position.y = X.pasta.position.y + (X.folha.userData.p0.y - X.pasta.userData.p0.y); X.folha.rotation.copy(X.pasta.rotation); }
  };

  const G = () => ++V.gen;
  V.appear = async () => {
    G(); if (V.shown) return; V.shown = true;
    Object.assign(V.pose, { ...Z }); root.visible = true;
    if (type === 'rebelde') { V.matsBy('robo_branco').forEach(m => m.color.set('#5A5F6E')); V.matsBy('robo_azul').forEach(m => m.color.set('#7A0F1E')); }
    const at = new THREE.Vector3(V.x0, (CINE.on ? FEET : VFEET) + .1, V.z0);
    if (c.enter === 'sneak') {
      sfx('sneak'); V.pose.rise = 1; V.pose.dx = 3.5; V.pose.walk = 1; V.pose.lean = .25;
      await poseTo(V.pose, { dx: 0 }, 1100, ease.inOut); await poseTo(V.pose, { walk: 0, lean: 0 }, 200);
    } else if (c.enter === 'drop') {
      sfx('drop'); await poseTo(V.pose, { rise: 1 }, 600, ease.inOut);
      shake = .35; burst(at, new THREE.Color('#9B4DFF'), 90, 2.5); burst(at, new THREE.Color('#FF3355'), 60, 2);
      await poseTo(V.pose, { lean: -.2 }, 100); await poseTo(V.pose, { lean: 0 }, 250, ease.back);
    } else {
      sfx('portal'); burst(at, new THREE.Color('#FF3355'), 140, 3); burst(at, new THREE.Color('#9B4DFF'), 90, 2.5);
      await poseTo(V.pose, { rise: 1, spin: Math.PI * 2 }, 850, ease.back); V.pose.spin = 0;
    }
  };
  V.throwCard = async () => {
    G();
    if (V.arms.length) {
      await poseTo(V.pose, { rx: 1.5, rz: .4, lean: -.15, menace: 0 }, 300, ease.inOut);
      await poseTo(V.pose, { rx: -2.2, rz: .2, lean: .2 }, 130, ease.lin);
      setTimeout(() => poseTo(V.pose, { rx: 0, rz: 0, lean: 0 }, 400), 150);
    } else {
      await poseTo(V.pose, { lean: -.3, taunt: .6, menace: 0 }, 280, ease.inOut);
      await poseTo(V.pose, { lean: .3, taunt: 1 }, 120, ease.lin);
      setTimeout(() => poseTo(V.pose, { lean: 0, taunt: 0 }, 400), 150);
    }
  };
  V.menace = () => { G(); return poseTo(V.pose, { menace: 1, laugh: 0 }, 500); };
  V.laugh = async () => {
    G(); sfx('laugh');
    await poseTo(V.pose, { laugh: 1, taunt: 1, menace: 0, rx: type === 'rebelde' || type === 'ladrao' ? -2.6 : 0, lx: 0 }, 220);
    await wait(1500); await poseTo(V.pose, { laugh: 0, taunt: 0, rx: 0, menace: .6 }, 400);
  };
  V.defeat = async () => {
    G(); if (!V.shown) return;
    const at = worldOf(V.body); at.y += 1;
    if (type === 'invasor') {
      sfx('zap'); await poseTo(V.pose, { push: 1, spin: Math.PI * 3, fade: .05, menace: 0, laugh: 0, lz: -2, rz: 2 }, 750, ease.inOut);
      burst(at, new THREE.Color('#FF3355'), 200, 5); burst(at, new THREE.Color('#9B4DFF'), 120, 4);
    } else if (type === 'ladrao') {
      sfx('drop'); await poseTo(V.pose, { spec: 1, menace: 0, lz: -2.4, rz: 2.4, rx: 0, lx: 0 }, 350, ease.out);
      burst(worldOf(V.hand), new THREE.Color('#F5A524'), 80, 2.5);
      V.yaw = .9; sfx('sneak'); V.pose.walk = 1;
      await poseTo(V.pose, { dx: 4, lean: .3 }, 900, ease.inOut); V.yaw = -.45;
    } else if (type === 'rebelde') {
      sfx('ok'); const cw = new THREE.Color('#EDF2FA'), cb = new THREE.Color('#0F3399'), c0 = V.matsBy('robo_branco').map(m => m.color.clone()), c1 = V.matsBy('robo_azul').map(m => m.color.clone());
      tween(700, t => { V.matsBy('robo_branco').forEach((m, i) => m.color.lerpColors(c0[i], cw, t)); V.matsBy('robo_azul').forEach((m, i) => m.color.lerpColors(c1[i], cb, t)); });
      await poseTo(V.pose, { spec: 1, menace: 0, rx: 0 }, 700, ease.inOut);
      await poseTo(V.pose, { lean: .45 }, 300); await wait(400);
      burst(at, new THREE.Color('#2FD6F0'), 140, 3); await poseTo(V.pose, { fade: .05, rise: .5 }, 450, ease.inOut);
    } else if (type === 'boato') {
      await poseTo(V.pose, { spec: 1, menace: 0 }, 350, ease.in || ease.inOut); sfx('pop');
      burst(at, new THREE.Color('#FFFFFF'), 220, 6); burst(at, new THREE.Color('#FF3355'), 120, 5); V.pose.fade = .02;
    } else {
      sfx('unlock'); await poseTo(V.pose, { spec: 1, menace: 0, taunt: 0 }, 800, ease.inOut); await wait(500);
      burst(at, new THREE.Color('#3DDC97'), 140, 3.5); await poseTo(V.pose, { fade: .05 }, 400, ease.inOut);
    }
    Object.assign(V.pose, { ...Z }); V.shown = false; root.visible = false;
  };
  V.hide = async () => { G(); if (!V.shown) return; V.shown = false; await poseTo(V.pose, { fade: .02, menace: 0, laugh: 0 }, 400, ease.inOut); Object.assign(V.pose, { ...Z }); };
  return V;
}
/* ---- nós da AI Factory (abertura) ---- */
const nodeMeshes = [];
function buildNodes() {
  nodes.clear(); nodeMeshes.length = 0;
  COMPS.forEach((c, i) => {
    const a = i / COMPS.length * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.22, 0), new THREE.MeshStandardMaterial({ color: '#1B3354', emissive: '#2FD6F0', emissiveIntensity: 0, metalness: .6, roughness: .3 }));
    m.position.set(Math.cos(a) * 2.1, 1.6, Math.sin(a) * 2.1);
    // rótulo
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 96; const x = lc.getContext('2d');
    x.fillStyle = 'rgba(7,17,31,.8)'; roundRect(x, 512, 96, 18); x.fill(); x.strokeStyle = '#F5A524'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#F5A524'; x.font = '700 52px "Chakra Petch"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(c.toUpperCase(), 256, 52);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTex(lc), transparent: true, opacity: 0, depthWrite: false }));
    sp.scale.set(1.05, .2, 1); sp.position.set(0, .5, 0); m.add(sp);
    // feixe até o núcleo
    const beamGeo = new THREE.BufferGeometry().setFromPoints([m.position.clone(), new THREE.Vector3(0, 0.3, 0)]);
    const beam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: '#2FD6F0', transparent: true, opacity: 0 }));
    nodes.add(beam);
    m.userData = { sp, beam, lit: false };
    nodes.add(m); nodeMeshes.push(m);
  });
}
function lightNode(idx) {
  const m = nodeMeshes[idx]; m.userData.lit = true;
  tween(900, t => { m.material.emissiveIntensity = t * 2.2; m.userData.sp.material.opacity = t; m.userData.beam.material.opacity = t * .8; m.scale.setScalar(1 + Math.sin(t * Math.PI) * .8); });
  const wp = new THREE.Vector3(); m.getWorldPosition(wp); burst(wp, new THREE.Color('#2FD6F0'), 120, 3);
}

let coreAlert = 0, coreCalm = 0;
function setCoreAlert(on, calm) { coreAlert = on ? 1 : 0; if (calm) coreCalm = 1; }
/* ---- abertura ---- */
const ORIGIN = new THREE.Vector3();
const CINE = { on: false, pos: new THREE.Vector3(), tgt: new THREE.Vector3(), skip: false };
function cineWait(ms) { return new Promise(r => { const t0 = performance.now(); (function k() { if (CINE.skip || performance.now() - t0 >= ms) r(); else requestAnimationFrame(k); })(); }); }
function camTo(pos, tgt, dur, e = ease.inOut) {
  if (CINE.skip) return Promise.resolve();
  const p0 = CINE.pos.clone(), t0 = CINE.tgt.clone();
  return tween(dur, t => { if (CINE.skip) return; CINE.pos.lerpVectors(p0, pos, t); CINE.tgt.lerpVectors(t0, tgt, t); }, e);
}
function orbit(center, r, h, a0, a1, dur) {
  if (CINE.skip) return Promise.resolve();
  return tween(dur, t => { if (CINE.skip) return; const a = a0 + (a1 - a0) * t; CINE.pos.set(center.x + Math.sin(a) * r, center.y + h, center.z + Math.cos(a) * r); CINE.tgt.copy(center); }, ease.inOut);
}
function caption(txt, eyebrow = '', alert = false, side = false) {
  if (CINE.skip) return;
  const c = $('#cap'); c.classList.toggle('side', side);
  const words = txt.split(' ').map((w, i) => `<span class="w" style="animation-delay:${i * 70}ms">${esc(w)}</span>`).join(' ');
  c.classList.remove('out');
  c.innerHTML = `${eyebrow ? `<span class="ey">${esc(eyebrow)}</span>` : ''}<span class="tx${alert ? ' alert' : ''}">${words}</span>`;
}
function captionOut() { $('#cap').classList.add('out'); }
function coreCenter() { const s = coreGroup.scale.x; return coreGroup.position.clone().add(new THREE.Vector3(0, .35 * s, 0)); }

async function runIntro() {
  if (reduced) return;
  CINE.on = true; CINE.skip = false; CINE.ending = false; document.body.classList.add('cine'); $('#skipWrap').hidden = false;
  $('#gate').hidden = true; $('#setup').hidden = true;
  Object.values(villains).forEach(v => { v.root.visible = false; v.shown = false; }); villain = null;
  if (robot) { robot.root.visible = false; robot.reset(0); }
  const c = coreCenter(), s = coreGroup.scale.x;
  CINE.pos.set(c.x + 1.2, c.y + .6, c.z + 3.2); CINE.tgt.copy(c);
  if (coreGlow) coreGlow.emissiveIntensity = 0;
  buildNodes();

  // 1 · a máquina acorda
  sfx('portal'); coreCalm = 1.4;
  caption('IA não é apenas um LLM. É uma grande indústria.', 'Letramento IA');
  const o1 = orbit(c, 3.4 * s, .5 * s, .35, -.55, 3600);
  await cineWait(1800); burst(c, new THREE.Color('#2FD6F0'), 160, 3);
  await o1; captionOut();

  // 2 · as engrenagens se ligam
  caption('Tecnologia + Dados + Agentes + Ferramentas + Governança + Pessoas', 'A AI Factory é um ecossistema');
  const o2 = orbit(c, 6.2 * s, 2.2 * s, -.55, .55, 3800);
  for (let i = 0; i < COMPS.length && !CINE.skip; i++) { lightNode(i); sfx('deal'); await cineWait(360); }
  await o2; captionOut();

  // 3 · alarme e invasão
  setCoreAlert(true); sfx('bad'); flash(false);
  caption('Alerta: a AI Factory está sob ataque.', 'Integridade do sistema em risco', true);
  const halfW = VIS * aspect / 2, span = Math.min(halfW * .9, 4.2);
  const parade = ['invasor', 'ladrao', 'barril', 'boato', 'cadeado'].map(k => villains[k]).filter(Boolean);
  const wide = CINE.pos.clone(); camTo(new THREE.Vector3(0, 1.2, camBase.z * 1.05), new THREE.Vector3(0, FEET + 1.6, 0), 900);
  await cineWait(700);
  for (let i = 0; i < parade.length && !CINE.skip; i++) {
    const v = parade[i]; v.x0 = -span + (2 * span) * (i / Math.max(1, parade.length - 1)); v.z0 = -1.2 - (i % 2) * .6; v.yaw = -v.x0 * .08;
    v.appear().then(() => { if (!CINE.skip) v.menace(); }); shake = .5; await cineWait(520);
  }
  await cineWait(900);
  if (!CINE.skip) { parade.forEach((v, i) => setTimeout(() => !CINE.skip && v.laugh(), i * 120)); await cineWait(1300); }
  captionOut();

  // 4 · o robô convoca o aluno
  parade.forEach(v => { if (!CINE.skip) v.hide(); });
  const cs = robot ? robot.root.scale.x : 1;
  if (robot && !CINE.skip) {
    const rx = robot.root.position.x; robot.root.visible = true; robot.root.position.x = rx - 5;
    const narrow = aspect < 1; const rt = new THREE.Vector3(rx + (narrow ? 0 : 1.5 * cs), FEET + (narrow ? 1.9 : 1.3) * cs, .3);
    camTo(new THREE.Vector3(rx + 1.4 * cs, FEET + 1.6 * cs, 4.2 * cs + 1.5), rt, 1100);
    sfx('sneak'); await robot.walkTo(rx, 1100);
    caption('Não basta aprender a usar IA. Precisamos aprender a pensar com IA.', 'Letramento IA', false, true);
    robot.wave(); await cineWait(2800); captionOut();
  }
  await endIntro();
}
async function endIntro() {
  if (!CINE.on || CINE.ending) return;
  CINE.ending = true; CINE.skip = true;
  Object.values(villains).forEach(v => cancelPose(v.pose)); if (robot) cancelPose(robot.pose);
  $('#skipWrap').hidden = true; $('#cap').innerHTML = '';
  // devolve o palco ao estado de jogo
  Object.values(villains).forEach(v => { Object.assign(v.pose, { rise: 0, fade: 1, menace: 0, laugh: 0, taunt: 0, spec: 0, dx: 0, push: 0, spin: 0, walk: 0 }); v.root.visible = false; v.shown = false; v.yaw = -.45; });
  nodes.clear(); nodeMeshes.length = 0; setCoreAlert(false, true);
  if (robot) { robot.root.visible = true; robot.pose.walk = 0; robot.reset(0); }
  resize();
  const p0 = CINE.pos.clone(), t0 = CINE.tgt.clone();
  await tween(900, t => { CINE.pos.lerpVectors(p0, camBase, t); CINE.tgt.lerpVectors(t0, ORIGIN, t); }, ease.inOut);
  CINE.on = false; CINE.ending = false; document.body.classList.remove('cine');
}

/* ============================================================
   JOGO — RiskCards: IA sob Ataque (multijogador local)
   ============================================================ */
const EVENTS = {
  ataque:    { t: 'Ataque!',        d: 'Um vilão lançou uma RiskCard',             c: '#FF4D63', face: 'ATAQUE' },
  raiox:     { t: 'Raio-X',         d: 'Descubra o risco pelo sinal',              c: '#2FD6F0', face: 'RAIO-X' },
  incidente: { t: 'Incidente real', d: 'Conecte o caso às RiskCards',              c: '#F5A524', face: 'INCIDENTE' },
  relampago: { t: 'Relâmpago!',     d: 'Todos jogam: bata quando combinar',        c: '#F2D43D', face: 'RELÂMPAGO' },
  coringa:   { t: 'Coringa',        d: 'Conecte dois riscos e ganhe um poder',     c: '#C77DFF', face: 'CORINGA' },
};
const FACES = ['ataque', 'raiox', 'incidente', 'relampago', 'coringa', 'ataque']; // +x −x +y −y +z −z
const FACE_ROT = [[0, -Math.PI / 2], [0, Math.PI / 2], [Math.PI / 2, 0], [-Math.PI / 2, 0], [0, 0], [0, Math.PI]];

const S = { players: [], rounds: 5, round: 1, turn: 0, integ: 100, busy: false, playing: false, mode: null, lastEv: [], deck: [], incDeck: [], quickDeck: [] };
const T = { on: false, t0: 0, ms: 1, cb: null };
const pick = a => a[Math.random() * a.length | 0];
const byN = n => RISKS.find(r => r.n === n);
const pad = n => String(n).padStart(2, '0');
const rsrc = (n, s = 'f') => `assets/rc/r${pad(n)}${s}.jpg`;
const isrc = (n, s = 'f') => `assets/rc/i${pad(n)}${s}.jpg`;
const confusable = (a, b) => a === b || CONFUSAVEIS.some(g => g.includes(a) && g.includes(b));
const distractors = (n, k) => shuffle(RISKS.filter(r => !confusable(n, r.n))).slice(0, k);
const defText = d => Array.isArray(d) ? d.join(' · ') : d;
const defHTML = d => Array.isArray(d) ? `<ul>${d.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(d)}</p>`;
const cur = () => S.players[S.turn];
const mult = p => p.streak >= 5 ? 2 : p.streak >= 3 ? 1.5 : 1;
function drawRisk() { if (!S.deck.length) S.deck = shuffle(RISKS.map(r => r.n)); return byN(S.deck.pop()); }
function drawInc() { if (!S.incDeck.length) S.incDeck = shuffle(INCIDENTS.map(i => i.n)); const n = S.incDeck.pop(); return INCIDENTS.find(i => i.n === n); }
function dock(html, pop = true) {
  const d = $('#dock'); d.innerHTML = html; d.scrollTop = 0;
  if (pop && html) { d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
  return d;
}
function dockStatus(txt, color = 'var(--ink)') { dock(`<div class="status" style="color:${color}">${txt}</div>`, false); }
const DOTS = '<span class="dots"><i></i><i></i><i></i></span>';
function toast(txt, color) { const t = $('#toast'); t.textContent = txt; t.style.color = color; t.classList.remove('go'); void t.offsetWidth; t.classList.add('go'); }
function flash(ok) { const f = $('#flash'); f.classList.toggle('ok', ok); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function splash(type) { const e = EVENTS[type]; $('#splash').innerHTML = `<div style="--ec:${e.c}"><b>${e.t}</b><span>${e.d}</span></div>`; }
function startTimer(ms, cb) { T.lastSec = 0; $('#timer').classList.remove('hurry'); T.on = true; T.t0 = performance.now(); T.ms = ms; T.cb = cb; $('#timer').classList.add('on'); }
function stopTimer() { const was = T.on; T.on = false; T.cb = null; $('#timer').classList.remove('on'); return was ? Math.max(0, 1 - (performance.now() - T.t0) / T.ms) : 0; }

/* ---------------- placar e HUD ---------------- */
const ICON = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="#3DDC97" stroke-width="2.4" aria-label="Escudo"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/></svg>',
  double: '<svg viewBox="0 0 24 24" aria-label="Dobro"><text x="12" y="17" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="13" fill="#F5A524">×2</text></svg>',
};
function hud() {
  $('#integTxt').textContent = Math.max(0, Math.round(S.integ)) + '%';
  $('#integFill').style.transform = `scaleX(${Math.max(0, S.integ) / 100})`;
  const b = $('#integBar'); b.classList.toggle('warn', S.integ <= 60 && S.integ > 30); b.classList.toggle('crit', S.integ <= 30);
  $('#roundBox').hidden = !S.playing; $('#roundTxt').textContent = `${Math.min(S.round, S.rounds)}/${S.rounds}`;
  renderScores();
}
function renderScores() {
  const el = $('#scores'); el.hidden = !S.players.length;
  el.innerHTML = S.players.map((p, i) => `<div class="pchip${i === S.turn && S.playing ? ' on' : ''}" data-i="${i}" style="--pc:${p.color}"><i class="dot"></i><b>${esc(p.name)}</b><span class="meta"><span class="pts">${p.score.toLocaleString('pt-BR')}</span>${p.streak >= 2 ? `<span class="stk">seq ${p.streak}${mult(p) > 1 ? ' · ×' + mult(p) : ''}</span>` : ''}<span class="pw">${p.power.shield ? ICON.shield : ''}${p.power.double ? ICON.double : ''}</span></span></div>`).join('');
  const on = el.querySelector('.pchip.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function bump(p, ok) { renderScores(); const c = $(`.pchip[data-i="${S.players.indexOf(p)}"]`); if (c) { c.classList.remove('bump', 'hurt'); void c.offsetWidth; c.classList.add(ok ? 'bump' : 'hurt'); } }
function whose() { const p = cur(), w = $('#whose'); w.hidden = !p || !S.playing; if (p) w.innerHTML = `<i style="background:${p.color};box-shadow:0 0 10px ${p.color}"></i><span>Vez de ${esc(p.name)}</span>`; }
function award(p, base, left = 0) {
  let pts = Math.round((base + 50 * left) * mult(p));
  if (p.power.double) { pts *= 2; p.power.double = 0; }
  p.score += pts; p.streak++; p.best = Math.max(p.best, p.streak); return pts;
}
function penalize(p, dmg = 8) {
  if (p.power.shield) { p.power.shield = 0; return { shielded: true, dmg: 0 }; }
  p.streak = 0; S.integ = Math.max(0, S.integ - dmg); return { shielded: false, dmg };
}

/* ---------------- robôs dos jogadores ---------------- */
function tintRobot(root, color) {
  const c = new THREE.Color(color);
  root.traverse(o => {
    if (!o.isMesh) return; o.material = o.material.clone(); const n = o.material.name || '';
    if (n.startsWith('robo_azul')) o.material.color.copy(c).multiplyScalar(.8);
    if (n.startsWith('robo_emblema')) { o.material.color.copy(c); o.material.emissive.copy(c); }
    if (n.startsWith('robo_olho')) { o.material.color.copy(c); o.material.emissive.copy(c); o.material.emissiveIntensity = 4; }
  });
}
function makePlayerRobot(color, name) {
  const root = robotProto.clone(true);
  if (color) tintRobot(root, color); else root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if ((o.material.name || '').startsWith('robo_olho')) o.material.emissiveIntensity = 4; } });
  const R = makeRobot(root);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.42, .6, 48), new THREE.MeshBasicMaterial({ color: color || '#2FD6F0', transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03; root.add(ring); R.ring = ring;
  if (name) { const sp = labelSprite(name, color); sp.position.set(0, 2.45, 0); root.add(sp); R.label = sp; }
  R.s0 = 1; R.home = new THREE.Vector3(); R.active = false;
  scene.add(root); return R;
}
function clearPlayerRobots() { S.players.forEach(p => { if (p.R) { scene.remove(p.R.root); p.R = null; } }); }
let halfW = 4;
function layoutRobots() {
  const list = S.players.map(p => p.R).filter(Boolean);
  const n = list.length;
  if (robot) { robot.root.visible = !n && !podium; }
  if (!n) { if (robot) { const cs = Math.min(1.9, VIS * .3) / 2.1; robot.root.scale.setScalar(cs); robot.root.position.set(-Math.min(halfW - .55 * cs - .15, 3.6), FEET, .3); } return; }
  if (podium) return;
  const portrait = aspect < .9, rows = portrait && n > 4 ? 2 : 1;
  const counts = rows === 2 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
  const per = counts[0];
  const span = Math.max(0, Math.min(halfW * (portrait ? .74 : .86) - .4, .6 + per * .8)), gap = per > 1 ? 2 * span / (per - 1) : 1.6;
  const s = Math.min(VIS * (portrait ? .15 : .23) / 2.4, gap / (rows === 2 ? .82 : 1.1), .95);
  POP = portrait ? 1.12 : 1.22; POPZ = portrait ? .45 : .9;
  list.forEach((R, i) => {
    const r = rows === 2 ? i % 2 : 0, j = rows === 2 ? Math.floor(i / 2) : i, c = counts[r];
    let x = c > 1 ? -span + j * (2 * span / (c - 1)) : 0;
    if (r === 1) x = c > 1 ? -span + gap / 2 + j * ((2 * span - gap) / Math.max(1, c - 1)) : 0;
    const z = r === 0 ? 1.0 : -.5, sc = r === 0 ? s : s * .92;
    R.home.set(x, FEET, z); R.s0 = sc; R.yaw = -x * .09;
    R.root.position.set(x, FEET, R.active ? z + POPZ : z); R.root.scale.setScalar(R.active ? sc * POP : sc);
    if (R.label) R.label.scale.set(portrait && n > 3 ? 1.5 : 1.9, portrait && n > 3 ? .375 : .475, 1);
  });
}
function setActive(idx) {
  S.players.forEach((p, k) => {
    const R = p.R, on = k === idx; R.active = on;
    const f = { s: R.root.scale.x, z: R.root.position.z, o: R.ring.material.opacity };
    const ts = on ? R.s0 * POP : R.s0, tz = on ? R.home.z + POPZ : R.home.z, to = on ? 1 : .25;
    tween(450, t => { R.root.scale.setScalar(f.s + (ts - f.s) * t); R.root.position.z = f.z + (tz - f.z) * t; R.ring.material.opacity = f.o + (to - f.o) * t; }, ease.back);
  });
}

/* ---------------- cartas em cena ---------------- */
function removeThreat() {
  if (!threat) return; const old = threat; threat = null; old.userData.anim = true;
  const y0 = old.position.y, s0 = old.scale.x;
  tween(450, t => { old.position.y = y0 - t * 6; old.rotation.z = t * .6; old.scale.setScalar(s0 * (1 - t * .5)); }, ease.inOut).then(() => scene.remove(old));
}
function hideVillain() { if (villain && villain.shown) villain.hide(); }
async function throwCard(g, vtype) {
  removeThreat();
  const want = villains[vtype] || villains.invasor;
  if (villain && villain !== want && villain.shown) await villain.hide();
  villain = want; g.userData.anim = true;
  if (villain) {
    await villain.appear();
    const th = villain.throwCard(); await wait(380);
    const from = worldOf(villain.hand || villain.body);
    g.position.copy(from); g.scale.setScalar(.2); g.rotation.set(0, Math.PI, 0); scene.add(g);
    sfx('whoosh'); if (cur()) cur().R.scared();
    await tween(750, t => { g.position.set(from.x * (1 - t), from.y + (CY - from.y) * t + Math.sin(t * Math.PI) * 1.6, from.z * (1 - t)); g.rotation.z = (1 - t) * Math.PI * 4; g.scale.setScalar(.2 + .8 * t); }, ease.out);
    await th; villain.menace();
  } else { scene.add(g); g.position.set(0, CY, 0); g.rotation.set(0, Math.PI, 0); }
  sfx('flip');
  await tween(520, t => { g.rotation.y = Math.PI * (1 - t); g.position.z = Math.sin(t * Math.PI) * .8; }, ease.inOut);
  g.userData.anim = false; threat = g;
}
async function dropCard(g, color = '#2FD6F0') {
  removeThreat(); g.userData.anim = true; scene.add(g);
  g.position.set(0, CY + VIS, 0); g.rotation.set(0, Math.PI, 0); g.scale.setScalar(1);
  sfx('whoosh');
  await tween(700, t => { g.position.y = CY + VIS * (1 - t); }, ease.back);
  burst(new THREE.Vector3(0, CY, .3), new THREE.Color(color), 140, 3.5);
  sfx('flip'); await tween(500, t => { g.rotation.y = Math.PI * (1 - t); }, ease.inOut);
  g.userData.anim = false; threat = g;
}
async function revealImage(img, front, back) {
  if (!threat || !img) return;
  const a = img.width / img.height, ch = Math.round(720 / a);
  sfx('flip'); threat.userData.anim = true;
  await tween(260, t => { threat.rotation.y = t * Math.PI / 2; }, ease.inOut);
  setFront(threat, imageCanvas(img, 720, ch, 30), a);
  if (front) threat.userData.zoom = { front, back };
  await tween(320, t => { threat.rotation.y = Math.PI / 2 * (1 - t); }, ease.out);
  threat.userData.anim = false;
}
function edgeGlow(color) { if (!threat) return; const m = threat.userData.edge.material; m.color.set(color); tween(400, t => { m.opacity = t * .9; }); }

/* ---------------- golpes ---------------- */
function beam(from, to, color, w = .06) {
  const len = from.distanceTo(to); const geo = new THREE.CylinderGeometry(w, w, len, 10, 1, true); geo.translate(0, len / 2, 0); geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.copy(from); m.lookAt(to); scene.add(m);
  tween(480, t => { m.material.opacity = 1 - t; m.scale.x = m.scale.y = 1 + t * 2.5; }).then(() => { scene.remove(m); geo.dispose(); });
}
function targetPoint() { return villain && villain.shown ? worldOf(villain.body).add(new THREE.Vector3(0, 1.1 * villain.s0, 0)) : new THREE.Vector3(0, CY, .3); }
async function robotStrike(p, defeat = true) {
  const R = p.R; R.point(); await wait(160);
  const to = targetPoint(), from = worldOf(R.hand);
  for (let k = 0; k < 3; k++) { beam(from, to, p.color); sfx('laser'); await wait(110); }
  burst(to, new THREE.Color(p.color), 220, 5); burst(to, new THREE.Color('#FFFFFF'), 80, 3); shake = .35;
  if (defeat && villain && villain.shown) villain.defeat();
  setTimeout(() => R.cheer(), 250);
}
async function villainStrike(p) {
  const R = p.R; const from = villain && villain.shown ? worldOf(villain.hand || villain.body) : new THREE.Vector3(0, CY, .3);
  const to = worldOf(R.body).add(new THREE.Vector3(0, .5 * R.root.scale.x, 0));
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), new THREE.MeshBasicMaterial({ color: '#FF3355' })); scene.add(orb);
  sfx('whoosh');
  await tween(450, t => { orb.position.lerpVectors(from, to, t); orb.position.y += Math.sin(t * Math.PI) * .8; orb.scale.setScalar(1 + t); }, ease.inOut);
  scene.remove(orb); burst(to, new THREE.Color('#FF3355'), 180, 4); shake = .8; R.sad();
  if (villain && villain.shown) villain.laugh(); else sfx('laugh');
}
function confetti(n = 5) { const cols = ['#2FD6F0', '#F5A524', '#3DDC97', '#FF5A8A', '#A77BFF', '#F2D43D']; for (let k = 0; k < n; k++) setTimeout(() => burst(new THREE.Vector3((Math.random() - .5) * halfW * 1.6, CY + Math.random() * 1.5, Math.random()), new THREE.Color(pick(cols)), 180, 5), k * 200); }

/* ---------------- dado ---------------- */
function makeDie() {
  const mats = FACES.map(f => { const t = makeTex(faceCanvas(f)); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: .35, roughness: .35, metalness: .1 }); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats); m.visible = false; scene.add(m); return m;
}
function pickEvent() {
  const w = { ataque: 30, raiox: 24, incidente: 20, relampago: 14, coringa: 12 };
  const L = S.lastEv;
  if (L.length >= 2 && L[L.length - 1] === L[L.length - 2]) w[L[L.length - 1]] = 0;
  L.slice(-2).forEach(e => { if (e === 'relampago' || e === 'coringa') w[e] = 0; });
  if (L.slice(-3).includes('incidente')) w.incidente *= .4;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'ataque';
}
async function rollDie(type) {
  const idxs = FACES.map((f, i) => f === type ? i : -1).filter(i => i >= 0);
  const [rx, ry] = FACE_ROT[pick(idxs)];
  const s = Math.min(1.3, VIS * .2);
  die.visible = true; die.scale.setScalar(.01);
  const top = CY + VIS * .55, rest = CY - .1;
  die.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); const r0 = die.rotation.clone();
  const tx = rx + Math.PI * 2 * (3 + (Math.random() * 2 | 0)), ty = ry + Math.PI * 2 * (2 + (Math.random() * 2 | 0));
  let lastT = 0;
  await tween(1500, t => {
    die.rotation.x = r0.x + (tx - r0.x) * t; die.rotation.y = r0.y + (ty - r0.y) * t; die.rotation.z = r0.z * (1 - t);
    const b = Math.abs(Math.cos(t * Math.PI * 2.5)) * (1 - t);
    die.position.set(Math.sin(t * 9) * .3 * (1 - t), rest + (top - rest) * (1 - t) * (1 - t) + b * 1.1, 2);
    die.scale.setScalar(s * Math.min(1, t * 4));
    if (t - lastT > .1 && t < .85) { lastT = t; sfx('dice'); }
  }, ease.out);
  die.rotation.set(rx, ry, 0);
  sfx('dieland'); burst(die.position.clone(), new THREE.Color(EVENTS[type].c), 180, 4);
  await tween(260, t => die.scale.setScalar(s * (1 + Math.sin(t * Math.PI) * .25)));
  await wait(450);
  await tween(320, t => { die.scale.setScalar(s * (1 - t)); die.position.y = rest + t * .6; }, ease.inOut);
  die.visible = false;
}

/* ---------------- turnos ---------------- */
function showTurn() {
  const p = cur(); if (!p) return;
  S.mode = null; hud(); whose(); setActive(S.turn);
  const pw = [p.power.shield ? 'Escudo' : '', p.power.double ? 'Dobro' : ''].filter(Boolean).join(' e ');
  dock(`<div class="turn" style="--pc:${p.color}"><div><h3>Vez de <i>${esc(p.name)}</i></h3><p>Rodada ${S.round} de ${S.rounds}${pw ? ' · Poder guardado: ' + pw : ''}. Toque no dado para descobrir o desafio.</p></div><button class="dicebtn" id="go" aria-label="Rolar o dado"><svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="6" fill="#1A1204"/><g fill="#FFC14D"><circle cx="10" cy="10" r="2.6"/><circle cx="22" cy="10" r="2.6"/><circle cx="16" cy="16" r="2.6"/><circle cx="10" cy="22" r="2.6"/><circle cx="22" cy="22" r="2.6"/></g></svg>Rolar</button></div>`);
  $('#go').onclick = rollTurn; if (!MOBILE) $('#go').focus({ preventScroll: true });
  setTimeout(() => p.R && p.R.wave(), 200); sfx('turn'); haptic(20);
}
async function rollTurn() {
  if (S.busy) return; S.busy = true;
  dockStatus(`O dado está rolando ${DOTS}`, 'var(--amber)'); haptic([15, 40, 15, 40, 15]);
  const ev = pickEvent(); S.lastEv.push(ev);
  removeThreat(); if (ev === 'relampago' || ev === 'raiox' || ev === 'coringa') hideVillain();
  await rollDie(ev); splash(ev); sfx(ev === 'relampago' ? 'volt' : 'power'); await wait(1000);
  S.busy = false;
  await ({ ataque: evAtaque, raiox: evRaioX, incidente: evIncidente, relampago: evRelampago, coringa: evCoringa })[ev](cur());
}
function isLastTurn() { return S.round >= S.rounds && S.turn >= S.players.length - 1; }
function nextLabel() { return S.integ <= 0 || isLastTurn() ? 'Ver o pódio' : 'Próximo jogador'; }
function nextTurn() {
  if (S.busy) return;
  hideVillain(); removeThreat(); $('#quick').hidden = true;
  if (S.integ <= 0) return endGame(false);
  S.turn++;
  if (S.turn >= S.players.length) { S.turn = 0; S.round++; if (S.round > S.rounds) return endGame(true); toast(`Rodada ${S.round}`, '#2FD6F0'); }
  showTurn();
}
function feedback({ cls, verdict, title, body = '', more = '', front, back }) {
  dock(`<div class="fb"><div class="fb-top"><span class="verdict ${cls}">${verdict}</span></div><h3>${title}</h3>${body}${more ? `<div class="more">${more}</div><button class="linkbtn moreBtn" id="moreBtn">Ver detalhes</button>` : ''}<div class="acts"><button class="btn pri" id="go">${nextLabel()}</button>${front ? '<button class="btn sec" id="seeCard">Ver carta</button>' : ''}</div></div>`);
  $('#go').onclick = nextTurn; if (!MOBILE) $('#go').focus({ preventScroll: true });
  if (front) $('#seeCard').onclick = () => lightbox(front, back);
  if (more) $('#moreBtn').onclick = () => { const f = $('.fb'); f.classList.toggle('open'); $('#moreBtn').textContent = f.classList.contains('open') ? 'Ocultar detalhes' : 'Ver detalhes'; };
}
function optButton(i, inner, cls = '') {
  const b = document.createElement('button'); b.className = 'opt ' + cls; b.style.animationDelay = (i * 90) + 'ms';
  b.innerHTML = (cls.includes('img') ? '' : `<span class="num">${i + 1}</span>`) + inner; setTimeout(() => sfx('deal'), i * 90); return b;
}
function markOpts(rightN, chosenN) { document.querySelectorAll('#hand .opt').forEach(b => { const n = +b.dataset.n; b.classList.add(n === rightN ? 'right' : n === chosenN ? 'wrong' : 'dim'); }); }

/* ---------------- ATAQUE ---------------- */
async function evAtaque(p) {
  const card = drawRisk(); S.busy = true;
  await throwCard(makeCard(threatCanvas(card)), VMAP[card.n]); S.busy = false;
  const opts = shuffle([card, ...distractors(card.n, 2)]);
  dock(`<div class="prompt"><span>${esc(p.name)}, qual defesa neutraliza <b style="color:var(--ink)">${esc(card.t)}</b>?</span><kbd class="kbd-only">teclas 1 · 2 · 3</kbd></div><div class="hand" id="hand"></div>`);
  let done = false;
  const answer = async o => {
    if (done) return; done = true; S.busy = true;
    const left = stopTimer(), ok = !!o && o.n === card.n; markOpts(card.n, o && o.n); p.st.atkN++; track(p, card.n, ok);
    haptic(ok ? 35 : [70, 50, 70]); await wait(650); dockStatus(ok ? 'Defesa certa!' : (o ? 'Defesa errada' : 'Tempo esgotado'), ok ? 'var(--ok)' : 'var(--bad)');
    let v;
    if (ok) { p.st.atk++; const pts = award(p, 100, left); sfx('ok'); flash(true); toast('+' + pts, '#3DDC97'); bump(p, true); edgeGlow('#3DDC97'); await robotStrike(p); v = { cls: 'ok', verdict: `Defendido +${pts}` }; }
    else { const r = penalize(p); sfx('bad'); flash(false); toast(o ? 'Defesa errada' : 'Tempo esgotado', '#FF4D63'); bump(p, false); edgeGlow('#FF4D63'); await villainStrike(p); v = r.shielded ? { cls: 'neu', verdict: 'Escudo absorveu' } : { cls: 'bad', verdict: `Integridade −${r.dmg}%` }; }
    hud(); await wait(350); await revealImage(imgs['r' + card.n], rsrc(card.n), rsrc(card.n, 'b')); S.busy = false;
    feedback({ ...v, title: `${card.n}. ${esc(card.t)}`, body: `<p><span class="lab">Defesa</span>${esc(defText(card.d))}</p>`, front: rsrc(card.n), back: rsrc(card.n, 'b') });
  };
  opts.forEach((o, i) => { const b = optButton(i, `<p>${esc(defText(o.d))}</p>`); b.dataset.n = o.n; b.onclick = () => answer(o); $('#hand').append(b); });
  startTimer(20000, () => answer(null));
}

/* ---------------- RAIO-X ---------------- */
async function evRaioX(p) {
  const card = drawRisk(), sig = pick(card.sig); S.busy = true;
  await dropCard(makeCard(clueCanvas(sig)), '#2FD6F0'); S.busy = false;
  const opts = shuffle([card, ...distractors(card.n, 3)]);
  dock(`<p class="story"><b>Sinal</b>${esc(sig)}</p><div class="prompt"><span>${esc(p.name)}, qual RiskCard explica este sinal?</span><kbd class="kbd-only">teclas 1 a 4</kbd></div><div class="hand four" id="hand"></div>`);
  let done = false;
  const answer = async o => {
    if (done) return; done = true; S.busy = true;
    const left = stopTimer(), ok = !!o && o.n === card.n; markOpts(card.n, o && o.n); p.st.rxN++; track(p, card.n, ok);
    haptic(ok ? 35 : [70, 50, 70]); await wait(750); dockStatus(ok ? 'Diagnóstico certo!' : (o ? 'Diagnóstico errado' : 'Tempo esgotado'), ok ? 'var(--ok)' : 'var(--bad)');
    let v;
    if (ok) { p.st.rx++; const pts = award(p, 120, left); sfx('ok'); flash(true); toast('+' + pts, '#3DDC97'); bump(p, true); edgeGlow('#3DDC97'); await robotStrike(p, false); v = { cls: 'ok', verdict: `Diagnóstico certo +${pts}` }; }
    else { const r = penalize(p); sfx('bad'); flash(false); toast(o ? 'Diagnóstico errado' : 'Tempo esgotado', '#FF4D63'); bump(p, false); edgeGlow('#FF4D63'); await villainStrike(p); v = r.shielded ? { cls: 'neu', verdict: 'Escudo absorveu' } : { cls: 'bad', verdict: `Integridade −${r.dmg}%` }; }
    hud(); await wait(300); await revealImage(imgs['r' + card.n], rsrc(card.n), rsrc(card.n, 'b')); S.busy = false;
    feedback({ ...v, title: `${card.n}. ${esc(card.t)}`, body: `<p><span class="lab">Defesa</span>${esc(defText(card.d))}</p>`, more: `<p><span class="lab">Sinal</span>${esc(sig)}</p>`, front: rsrc(card.n), back: rsrc(card.n, 'b') });
  };
  opts.forEach((o, i) => { const b = optButton(i, `<img src="${rsrc(o.n)}" alt=""><span>${esc(o.t)}</span>`, 'img'); b.setAttribute('aria-label', `RiskCard ${o.n}: ${o.t}`); b.dataset.n = o.n; b.onclick = () => answer(o); $('#hand').append(b); });
  startTimer(25000, () => answer(null));
}

/* ---------------- INCIDENTE ---------------- */
async function evIncidente(p) {
  const inc = drawInc(); S.busy = true;
  await throwCard(makeCard(teaserCanvas(imgs['i' + inc.n], inc)), inc.v); S.busy = false;
  const extra = shuffle(RISKS.filter(r => !inc.rel.includes(r.n))).slice(0, 8 - inc.rel.length);
  const pool = shuffle([...inc.rel.map(byN), ...extra]);
  dock(`<p class="story${MOBILE ? ' clamp' : ''}" id="story"><b>${esc(inc.t)} · ${esc(inc.when)}</b>${esc(inc.what)}</p><div class="prompt"><span>${esc(p.name)}, marque as ${inc.rel.length} RiskCards ligadas ao caso</span></div><div class="chips" id="chips"></div><div class="row" style="margin-top:10px"><button class="btn pri wide" id="go" disabled>Confirmar conexões</button><span class="note" id="selN">0 de ${inc.rel.length}</span></div>`);
  $('#story').onclick = () => $('#story').classList.toggle('clamp');
  const sel = new Set(); let done = false;
  pool.forEach((r, i) => {
    const b = document.createElement('button'); b.className = 'chip'; b.style.animationDelay = (i * 50) + 'ms'; b.setAttribute('aria-pressed', 'false'); b.dataset.n = r.n;
    b.innerHTML = `<img src="${rsrc(r.n)}" alt=""><span><small>${pad(r.n)}</small>${esc(r.t)}</span>`;
    b.onclick = () => { if (done) return; sel.has(r.n) ? sel.delete(r.n) : sel.add(r.n); b.setAttribute('aria-pressed', sel.has(r.n)); sfx('deal'); $('#go').disabled = !sel.size; $('#selN').textContent = `${sel.size} de ${inc.rel.length}`; haptic(10); };
    $('#chips').append(b);
  });
  const confirm = async () => {
    if (done) return; done = true; S.busy = true; stopTimer();
    const hits = [...sel].filter(n => inc.rel.includes(n)).length, wrong = sel.size - hits, total = inc.rel.length;
    document.querySelectorAll('#chips .chip').forEach(b => { const n = +b.dataset.n, isRel = inc.rel.includes(n), chosen = sel.has(n); b.classList.add(isRel && chosen ? 'ok' : chosen ? 'bad' : isRel ? 'miss' : 'dim'); });
    p.st.incN++; p.st.incHits += hits; inc.rel.forEach(n => track(p, n, sel.has(n)));
    haptic(hits === total && !wrong ? 35 : [70, 50, 70]); await wait(1300); dockStatus(`${hits} de ${total} conexões certas`, hits === total && !wrong ? 'var(--ok)' : hits >= Math.ceil(total / 2) ? 'var(--volt)' : 'var(--bad)');
    let v; const perfect = hits === total && wrong === 0;
    if (perfect) { const pts = award(p, hits * 60 + 100); sfx('ok'); flash(true); toast('Caso resolvido +' + pts, '#3DDC97'); bump(p, true); confetti(3); await robotStrike(p); v = { cls: 'ok', verdict: `Conexões perfeitas +${pts}` }; }
    else if (hits >= Math.ceil(total / 2)) { const pts = Math.max(0, hits * 60 - wrong * 30); p.score += pts; sfx('deal'); toast('+' + pts, '#F2D43D'); bump(p, true); p.R.confused(); hideVillain(); v = { cls: 'neu', verdict: `${hits}/${total} conexões +${pts}` }; }
    else { const pts = Math.max(0, hits * 60 - wrong * 30); p.score += pts; const r = penalize(p); sfx('bad'); flash(false); toast('Caso sem solução', '#FF4D63'); bump(p, false); await villainStrike(p); v = r.shielded ? { cls: 'neu', verdict: `Escudo · ${hits}/${total} conexões` } : { cls: 'bad', verdict: `${hits}/${total} · Integridade −${r.dmg}%` }; }
    hud(); await wait(350); await revealImage(imgs['i' + inc.n], isrc(inc.n), isrc(inc.n, 'b')); S.busy = false;
    const relTxt = inc.rel.map(n => `${pad(n)} ${byN(n).t}`).join(' · ');
    feedback({ ...v, title: `Incident Card ${pad(inc.n)} · ${esc(inc.t)}`, body: `<p class="quote">“${esc(inc.lesson)}”</p><p><span class="lab">Conexões</span>${esc(relTxt)}</p>`, more: `<p><span class="lab">Como poderia ter sido evitado</span></p><ul>${inc.fix.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`, front: isrc(inc.n), back: isrc(inc.n, 'b') });
  };
  $('#go').onclick = confirm;
  startTimer(45000, confirm);
}

/* ---------------- RELÂMPAGO ---------------- */
let buzzHandler = null;
function buzz(i) { if (S.mode !== 'buzz' || !buzzHandler) return; haptic(25); const b = document.querySelector(`.buzz[data-i="${i}"]`); if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 140); } buzzHandler(i); }
async function evRelampago() {
  const n = S.players.length, PAIRS = 6; S.mode = 'buzz';
  setActive(-1); S.players.forEach(p => poseTo(p.R.pose, { crouch: .5, lean: .12, lx: -.4, rx: -.4 }, 300));
  dock(`<div class="prompt"><span>Bata no seu botão quando combinar</span><kbd class="kbd-only">teclas 1 a ${n}</kbd></div><div class="buzzers" id="buzz">${S.players.map((p, i) => `<button class="buzz" data-i="${i}" style="--pc:${p.color}"><b>${esc(p.name)}</b><kbd>${i + 1}</kbd><span class="sc" id="bsc${i}">0</span></button>`).join('')}</div>`);
  document.querySelectorAll('.buzz').forEach(b => { b.addEventListener('pointerdown', e => { e.preventDefault(); buzz(+b.dataset.i); }); b.onclick = e => { if (e.detail === 0) buzz(+b.dataset.i); }; });
  const gains = S.players.map(() => 0), q = $('#quick');
  if (S.quickDeck.length < PAIRS) S.quickDeck = shuffle(RISKS.map(r => r.n));
  for (let k = 0; k < PAIRS; k++) {
    const card = byN(S.quickDeck.pop()), match = Math.random() < .5;
    const def = match ? card.d : pick(distractors(card.n, 4)).d;
    q.hidden = false; q.classList.remove('pop'); void q.offsetWidth; q.classList.add('pop');
    q.innerHTML = `<div class="q-ey">Relâmpago ${k + 1} de ${PAIRS}</div><div class="q-risk" style="color:${card.c};text-shadow:0 0 18px ${card.c}">${pad(card.n)} · ${esc(card.t)}</div><div class="q-vs">COMBINA COM A DEFESA?</div><div class="q-def">${esc(defText(def))}</div><div class="q-bar"><i id="qbar"></i></div><div class="q-res" id="qres"></div>`;
    sfx('tick');
    const bar = $('#qbar'); bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)'; void bar.offsetWidth; bar.style.transition = 'transform 5s linear'; bar.style.transform = 'scaleX(0)';
    document.querySelectorAll('.buzz').forEach(b => b.classList.remove('lock'));
    const locked = new Set();
    const res = await new Promise(resolve => {
      const to = setTimeout(() => resolve({}), 5000);
      buzzHandler = i => {
        if (locked.has(i)) return;
        const p = S.players[i];
        if (match) { clearTimeout(to); resolve({ winner: i }); }
        else { locked.add(i); document.querySelector(`.buzz[data-i="${i}"]`).classList.add('lock'); p.score = Math.max(0, p.score - 30); gains[i] -= 30; track(p, card.n, false); p.R.confused(); sfx('bad'); bump(p, false); $('#qres').innerHTML = `<span style="color:var(--bad)">${esc(p.name)} caiu na armadilha · −30</span>`; $(`#bsc${i}`).textContent = gains[i]; }
      };
    });
    buzzHandler = null;
    const bar2 = $('#qbar'); if (bar2) { const m = getComputedStyle(bar2).transform; bar2.style.transition = 'none'; bar2.style.transform = m; }
    if (res.winner != null) {
      const p = S.players[res.winner]; p.score += 60; gains[res.winner] += 60; p.st.rel++; track(p, card.n, true);
      sfx('ok'); p.R.cheer(); burst(worldOf(p.R.body).add(new THREE.Vector3(0, .6, 0)), new THREE.Color(p.color), 160, 4); bump(p, true);
      $('#qres').innerHTML = `<span style="color:${p.color}">${esc(p.name)} bateu primeiro · +60</span>`; $(`#bsc${res.winner}`).textContent = gains[res.winner];
    } else if (match) { $('#qres').innerHTML = `<span style="color:var(--amber)">Combinava! Ninguém bateu a tempo.</span>`; sfx('sad'); }
    else if (!$('#qres').textContent) { $('#qres').innerHTML = `<span style="color:var(--ok)">Não combinava. Boa leitura, ninguém caiu!</span>`; }
    renderScores(); await wait(1500);
  }
  q.hidden = true; S.mode = null;
  S.players.forEach(p => p.R.reset());
  const order = S.players.map((p, i) => ({ p, g: gains[i] })).sort((a, b) => b.g - a.g);
  const top = order[0];
  feedback({ cls: 'neu', verdict: 'Relâmpago encerrado', title: top && top.g > 0 ? `${esc(top.p.name)} foi o reflexo mais rápido` : 'Rodada relâmpago concluída',
    body: `<p>${order.map(o => `<b style="color:${o.p.color}">${esc(o.p.name)}</b> ${o.g >= 0 ? '+' : ''}${o.g}`).join(' · ')}</p>` });
}

/* ---------------- CORINGA ---------------- */
async function evCoringa(p) {
  S.busy = true;
  const img = imgs.coringa, a = img.width / img.height;
  const g = makeCard(imageCanvas(img, 720, Math.round(720 / a), 30)); setFront(g, imageCanvas(img, 720, Math.round(720 / a), 30), a);
  g.userData.zoom = { front: 'assets/rc/coringa_f.jpg', back: 'assets/rc/coringa_b.jpg' };
  await dropCard(g, '#C77DFF'); confetti(2); S.busy = false; haptic([20, 30, 20]);
  const A = drawRisk(); let B = drawRisk(); while (B.n === A.n) B = drawRisk();
  dock(`<div class="cor"><div class="pair"><img src="${rsrc(A.n)}" alt="RiskCard ${A.n}: ${esc(A.t)}" data-n="${A.n}"><img src="${rsrc(B.n)}" alt="RiskCard ${B.n}: ${esc(B.t)}" data-n="${B.n}"></div><div><h4>Carta Coringa · conecte os riscos</h4><p><b style="color:var(--ink)">${esc(A.t)} + ${esc(B.t)}</b>. ${esc(pick(CORINGA.q))} Explique para a turma em até um minuto.</p><p class="note">Exemplo do baralho: ${esc(pick(CORINGA.ex))}</p><div class="row" style="margin-top:10px"><button class="btn pri wide" id="go">A turma aprovou · +100</button><button class="btn sec" id="no">Sem pontos</button></div></div></div>`);
  document.querySelectorAll('.pair img').forEach(im => im.onclick = () => lightbox(rsrc(+im.dataset.n), rsrc(+im.dataset.n, 'b')));
  startTimer(60000, null);
  await new Promise(res => {
    $('#go').onclick = () => { stopTimer(); const pts = award(p, 100); p.st.cor++; track(p, A.n, true); track(p, B.n, true); sfx('ok'); flash(true); toast('Conexão aprovada +' + pts, '#C77DFF'); bump(p, true); p.R.cheer(); confetti(4); res(); };
    $('#no').onclick = () => { stopTimer(); sfx('deal'); res(); };
  });
  hud();
  const others = S.players.filter(o => o !== p).sort((x, y) => y.score - x.score), leader = others[0];
  const canMag = leader && leader.score > p.score && leader.score > 0;
  dock(`<div class="prompt"><span>${esc(p.name)}, escolha um poder</span></div><div class="powers">
    <button class="power" id="pwShield">${ICON.shield}<div><b>Escudo</b><span>O próximo erro não tira pontos nem integridade.</span></div></button>
    <button class="power" id="pwDouble">${ICON.double}<div><b>Dobro</b><span>O próximo acerto vale o dobro.</span></div></button>
    <button class="power" id="pwMag" ${canMag ? '' : 'disabled style="opacity:.4"'}><svg viewBox="0 0 24 24" fill="none" stroke="#FF5A8A" stroke-width="2.4"><path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4"/></svg><div><b>Ímã</b><span>${canMag ? `Puxe até 100 pontos de ${esc(leader.name)}, que está na frente.` : 'Disponível quando alguém estiver à sua frente.'}</span></div></button></div>`);
  await new Promise(res => {
    $('#pwShield').onclick = () => { p.power.shield = 1; sfx('power'); res('Escudo ativado'); };
    $('#pwDouble').onclick = () => { p.power.double = 1; sfx('power'); res('Dobro guardado'); };
    if (canMag) $('#pwMag').onclick = async () => { const amt = Math.min(100, leader.score); leader.score -= amt; p.score += amt; sfx('power'); beam(worldOf(leader.R.body), worldOf(p.R.body), '#FF5A8A', .1); leader.R.sad(); p.R.cheer(); bump(leader, false); bump(p, true); res(`Ímã: +${amt} de ${leader.name}`); };
  }).then(msg => { toast(msg, '#C77DFF'); burst(worldOf(p.R.body).add(new THREE.Vector3(0, .8, 0)), new THREE.Color('#C77DFF'), 160, 3.5); });
  hud();
  feedback({ cls: 'neu', verdict: 'Coringa usado', title: 'Mais do que identificar riscos, é conectá-los', body: `<p>${esc(A.t)} + ${esc(B.t)}. Riscos raramente acontecem sozinhos: a carta Coringa pede uma visão sistêmica.</p>` });
}

/* ---------------- fim de jogo e pódio ---------------- */
function buildPodium(rank) {
  podium = new THREE.Group(); scene.add(podium);
  const PB = CY - CARD_H * .55;
  const PW = Math.min(1.35, halfW * .42, CARD_H * .36), hs = [1.0, .7, .45].map(h => h * PW), xs = [0, -PW * 1.08, PW * 1.08];
  const cols = ['#FFD24A', '#D6E2F0', '#E0955A'];
  rank.slice(0, 3).forEach((p, i) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(PW, hs[i], PW * .8), new THREE.MeshStandardMaterial({ color: '#13294A', emissive: cols[i], emissiveIntensity: .12, metalness: .5, roughness: .4 }));
    box.position.set(xs[i], PB + hs[i] / 2, .6); podium.add(box);
    const top = new THREE.Mesh(new THREE.BoxGeometry(PW * 1.02, .05, PW * .82), new THREE.MeshBasicMaterial({ color: cols[i] })); top.position.set(xs[i], PB + hs[i], .6); podium.add(top);
    const lc = document.createElement('canvas'); lc.width = lc.height = 128; const x = lc.getContext('2d'); x.fillStyle = cols[i]; x.font = '700 110px "Chakra Petch"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(i + 1, 64, 70);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTex(lc), transparent: true })); sp.scale.setScalar(PW * .45); sp.position.set(xs[i], PB + hs[i] * .5, .6 + PW * .42); podium.add(sp);
  });
  const rs = PW * .62 / 1;
  rank.forEach((p, i) => {
    const R = p.R; R.active = false; R.ring.material.opacity = .25;
    let tgt, sc;
    if (i < 3) { tgt = new THREE.Vector3(xs[i], PB + hs[i], .6); sc = rs; }
    else { const k = i - 3, m = rank.length - 3, span = Math.min(halfW * .8, m * .7); tgt = new THREE.Vector3(m > 1 ? -span + k * (2 * span / (m - 1)) : 0, PB, -1.6); sc = rs * .8; }
    const f = R.root.position.clone(), s0 = R.root.scale.x; R.yaw = 0; R.pose.walk = 1;
    tween(1100, t => { R.root.position.lerpVectors(f, tgt, t); R.root.position.y = f.y + (tgt.y - f.y) * t + Math.sin(t * Math.PI) * .8; R.root.scale.setScalar(s0 + (sc - s0) * t); }, ease.inOut).then(() => { R.pose.walk = 0; if (i === 0) R.dance(); else if (i < 3) R.cheer(); else R.wave(); });
  });
}
function endGame(survived) {
  S.playing = false; S.mode = null; stopTimer(); $('#quick').hidden = true; removeThreat(); hideVillain(); $('#whose').hidden = true; hud();
  const rank = [...S.players].sort((a, b) => b.score - a.score);
  buildPodium(rank);
  haptic(survived ? [40, 60, 40, 60, 120] : [200]);
  if (survived) { sfx('win'); confetti(8); setTimeout(() => confetti(6), 1800); }
  else { setTimeout(() => { villain = villains.invasor; villain && villain.appear().then(() => villain.laugh()); }, 900); sfx('sad'); }
  const AW = [
    ['Escudo de Ouro', 'mais ataques defendidos', p => p.st.atk],
    ['Olho de Raio-X', 'mais sinais decifrados', p => p.st.rx],
    ['Detetive de Incidentes', 'mais conexões certas em casos reais', p => p.st.incHits],
    ['Reflexo Relâmpago', 'mais acertos no relâmpago', p => p.st.rel],
    ['Mente Coringa', 'conexões aprovadas pela turma', p => p.st.cor],
    ['Sequência imbatível', 'maior sequência de acertos', p => p.best],
  ].map(([t, d, f]) => { const best = Math.max(...S.players.map(f)); return best > 0 ? { t, d, best, who: S.players.filter(p => f(p) === best).map(p => p.name).join(', ') } : null; }).filter(Boolean);
  dock(`<div class="endgrid">
    <div><div class="eyebrow" style="margin-bottom:8px">${survived ? 'AI Factory protegida' : 'A integridade chegou a zero'}</div>
      <h3>${survived ? `${esc(rank[0].name)} venceu a partida` : 'O sistema caiu. Revejam as defesas e tentem de novo.'}</h3>
      <ol class="rank">${rank.map((p, i) => `<li style="animation-delay:${i * 90}ms"><span class="pos">${i + 1}</span><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}<small class="tname">${tierOf(p).t}</small></b>${tierChip(p)}<span class="pts">${p.score.toLocaleString('pt-BR')}</span></li>`).join('')}</ol>
      <div class="row" style="margin-top:12px"><button class="btn post wide" id="postBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>Postar resultado</button></div><div class="row" style="margin-top:8px"><button class="btn pri wide" id="go">Jogar de novo</button><button class="btn sec" id="newGroup">Novo grupo</button><button class="btn sec" id="endLib">Cartas</button><button class="btn sec installBtn" hidden>Instalar app</button></div></div>
    <div>${AW.length ? `<div class="eyebrow" style="margin-bottom:8px">Destaques</div><div class="awards">${AW.map(a => `<div class="award"><small>${a.t}</small><b>${esc(a.who)}</b><span>${a.d} · ${a.best}</span></div>`).join('')}</div>` : ''}
      <div class="eyebrow" style="margin:14px 0 6px">Níveis de domínio</div><ol class="tiers">${TIERS.map((t, i) => `<li style="--lc:${LVL_COLOR[t.lvl]}"><b>N${i + 1}</b> ${t.t} <span>${t.lvl}</span></li>`).join('')}</ol>
      <div class="eyebrow" style="margin:14px 0 6px">Para aprofundar</div>
      <ol class="refs"><li>Jogo e cartas RiskCards e Incident Cards © 2026 Alexandre Caramelo Pinto, Caio Flavio Stettiner, Enos Luiz da Silva Corrêa e Fernando Pedro de Moraes · Letramento.ai.</li>
      <li>PINTO, A. C.; CORREA, E. L. S.; MORAES, F. P. Letramento em Inteligência Artificial: fundamentos, práticas, epistemologia e implicações éticas para a cognição contemporânea. <i>SADSJ</i>, v. 11, n. 33, p. 52-98, 2025.</li>
      <li>PINTO, A. C.; CORREA, E. L. S.; MORAES, F. P. Framework P.E.N.S.A.: uma proposição metodológica para a educação executiva mediada por inteligência artificial. <i>SADSJ</i>, v. 11, n. 33, 2025.</li>
      <li><a href="https://www.letramento.ai" target="_blank" rel="noopener">www.letramento.ai</a></li></ol></div></div>`);
  $('#go').onclick = () => restart(false); $('#newGroup').onclick = () => restart(true); $('#endLib').onclick = () => openLib('r');
  $('#postBtn').onclick = () => openShare(0);
  document.querySelectorAll('.installBtn').forEach(b => b.onclick = doInstall); refreshInstall();
}
function restart(newGroup) {
  if (podium) { scene.remove(podium); podium = null; }
  hideVillain();
  if (newGroup) { clearPlayerRobots(); S.players = []; S.playing = false; hud(); dock(''); resize(); showSetup(); return; }
  S.players.forEach(p => { Object.assign(p, freshStats()); p.R.reset(0); });
  startGame();
}

/* ---------------- configuração ---------------- */
const SETUP = { n: 2, names: [], colors: PCOLORS.slice(), rounds: 5 };
try { const s = JSON.parse(localStorage.getItem('rc-setup') || 'null'); if (s && s.n) Object.assign(SETUP, s); } catch (e) {}
function freshStats() { return { score: 0, streak: 0, best: 0, power: { shield: 0, double: 0 }, st: { atk: 0, atkN: 0, rx: 0, rxN: 0, incHits: 0, incN: 0, rel: 0, cor: 0, cards: {} } }; }
function renderSetup() {
  $('#pCount').textContent = SETUP.n;
  $('#plist').innerHTML = Array.from({ length: SETUP.n }, (_, i) => `<div class="prow"><button class="swatch" data-i="${i}" style="background:${SETUP.colors[i]};--pc:${SETUP.colors[i]}" aria-label="Trocar a cor do jogador ${i + 1}"></button><input id="pname${i}" maxlength="16" autocomplete="off" placeholder="Jogador ${i + 1}" value="${esc(SETUP.names[i] || '')}" aria-label="Nome do jogador ${i + 1}"></div>`).join('');
  document.querySelectorAll('.swatch').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, used = new Set(SETUP.colors.slice(0, SETUP.n)); let k = PCOLORS.indexOf(SETUP.colors[i]);
    for (let t = 0; t < PCOLORS.length; t++) { k = (k + 1) % PCOLORS.length; if (!used.has(PCOLORS[k])) break; }
    const j = SETUP.colors.indexOf(PCOLORS[k]); if (j >= 0) SETUP.colors[j] = SETUP.colors[i];
    SETUP.colors[i] = PCOLORS[k]; saveNames(); renderSetup(); sfx('deal');
  });
  document.querySelectorAll('#plist input').forEach((inp, i) => inp.oninput = () => { SETUP.names[i] = inp.value; });
  document.querySelectorAll('#roundsSeg button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.r === SETUP.rounds));
}
function saveNames() { document.querySelectorAll('#plist input').forEach((inp, i) => SETUP.names[i] = inp.value); try { localStorage.setItem('rc-setup', JSON.stringify(SETUP)); } catch (e) {} }
function showSetup() {
  $('#gate').hidden = true; $('#setup').hidden = false; renderSetup();
  if (robot) { robot.root.visible = true; robot.wave(); }
  villain = villains.invasor; if (villain && !villain.shown) villain.appear().then(() => villain.menace());
}
$('#pMinus').onclick = () => { saveNames(); SETUP.n = Math.max(1, SETUP.n - 1); renderSetup(); sfx('deal'); };
$('#pPlus').onclick = () => { saveNames(); SETUP.n = Math.min(8, SETUP.n + 1); renderSetup(); sfx('deal'); };
document.querySelectorAll('#roundsSeg button').forEach(b => b.onclick = () => { SETUP.rounds = +b.dataset.r; renderSetup(); sfx('deal'); });
$('#startBtn').onclick = () => {
  saveNames();
  clearPlayerRobots();
  S.players = Array.from({ length: SETUP.n }, (_, i) => {
    const name = (SETUP.names[i] || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 16) || `Jogador ${i + 1}`;
    return { name, color: SETUP.colors[i], ...freshStats() };
  });
  S.players.forEach(p => { p.R = makePlayerRobot(p.color, p.name); });
  S.rounds = SETUP.rounds; $('#setup').hidden = true; hideVillain();
  startGame();
};
function startGame() {
  S.round = 1; S.turn = 0; S.integ = 100; S.lastEv = []; S.busy = false; S.playing = true;
  if (podium) { scene.remove(podium); podium = null; }
  resize(); hud(); sfx('win'); toast('Partida iniciada', '#2FD6F0');
  S.players.forEach((p, i) => setTimeout(() => p.R.wave(), i * 120));
  setTimeout(showTurn, 700);
}

/* ============================================================
   RESULTADOS: domínio por área, nível do jogador e cartão para postar
   ============================================================ */
const SITE_URL = 'https://enosluiz.github.io/ia-sob-ataque/';
const IS_ARTIFACT = !!(window.claude && window.claude.use);
// Agrupamento das 30 RiskCards em cinco áreas de domínio (organização didática do jogo).
const DOMAINS = [
  { k: 'dados', t: 'Dados e Modelos', c: '#2FD6F0', n: [1, 2, 3, 6, 7, 15] },
  { k: 'seg', t: 'Segurança e Ataques', c: '#FF4D63', n: [4, 5, 10, 13, 21, 24, 30] },
  { k: 'gov', t: 'Governança e Conformidade', c: '#F5A524', n: [8, 9, 12, 14, 16, 20, 22] },
  { k: 'soc', t: 'Sociedade e Confiança', c: '#C77DFF', n: [17, 19, 25, 26, 27] },
  { k: 'ops', t: 'Operação e Futuro', c: '#3DDC97', n: [11, 18, 23, 28, 29] },
];
// Patentes do básico ao avançado
const TIERS = [
  { t: 'Recruta da AI Factory', lvl: 'Básico', d: 'Começou a reconhecer os riscos da IA.' },
  { t: 'Vigia de Sinais', lvl: 'Básico', d: 'Já identifica sinais de risco no dia a dia.' },
  { t: 'Analista de Riscos', lvl: 'Intermediário', d: 'Conecta riscos às defesas certas na maior parte das vezes.' },
  { t: 'Estrategista de Defesas', lvl: 'Avançado', d: 'Escolhe defesas com precisão e liga riscos a casos reais.' },
  { t: 'Guardião da AI Factory', lvl: 'Avançado', d: 'Domínio pleno: protege a AI Factory com consistência.' },
];
const LVL_COLOR = { 'Básico': '#7FB2E5', 'Intermediário': '#F5A524', 'Avançado': '#3DDC97' };
function track(p, n, ok) { const c = p.st.cards[n] || (p.st.cards[n] = { ok: 0, miss: 0 }); ok ? c.ok++ : c.miss++; }
function domainOf(p, D) {
  let ok = 0, miss = 0; D.n.forEach(n => { const c = p.st.cards[n]; if (c) { ok += c.ok; miss += c.miss; } });
  const att = ok + miss, acc = att ? ok / att : 0;
  const lvl = !att ? null : acc >= .8 && att >= 2 ? 'Avançado' : acc >= .5 ? 'Intermediário' : 'Básico';
  return { ...D, ok, miss, att, acc, lvl };
}
function tierOf(p) {
  let ok = 0, miss = 0; Object.values(p.st.cards).forEach(c => { ok += c.ok; miss += c.miss; });
  const att = ok + miss, acc = att ? ok / att : 0;
  let i = acc >= .9 ? 4 : acc >= .75 ? 3 : acc >= .55 ? 2 : acc >= .35 ? 1 : 0;
  if (att < 4) i = Math.min(i, 2); if (att < 2) i = Math.min(i, 1);
  return { i, ...TIERS[i], att, ok, acc };
}
function cardsOf(p) {
  const e = Object.entries(p.st.cards).map(([n, c]) => ({ n: +n, ...c }));
  return { mastered: e.filter(c => c.ok > 0 && c.ok >= c.miss).sort((a, b) => b.ok - a.ok).map(c => c.n), review: e.filter(c => c.miss > c.ok).map(c => c.n) };
}
function tierChip(p) { const T = tierOf(p); return `<span class="tier" style="--lc:${LVL_COLOR[T.lvl]}">N${T.i + 1} · ${T.lvl}</span>`; }

/* ---------- cartão 1080 × 1350 ---------- */
function rr(x, X, Y, w, h, r) { x.save(); x.translate(X, Y); roundRect(x, w, h, r); x.restore(); }
function drawShareCard(p, rankPos, total) {
  const Wc = 1080, Hc = 1350, c = document.createElement('canvas'); c.width = Wc; c.height = Hc; const x = c.getContext('2d');
  const T = tierOf(p), doms = DOMAINS.map(D => domainOf(p, D)), { mastered, review } = cardsOf(p);
  // fundo
  const g = x.createLinearGradient(0, 0, 0, Hc); g.addColorStop(0, '#0C2244'); g.addColorStop(.55, '#07111F'); g.addColorStop(1, '#050B16'); x.fillStyle = g; x.fillRect(0, 0, Wc, Hc);
  x.strokeStyle = 'rgba(47,214,240,.07)'; x.lineWidth = 2; for (let i = 0; i < Wc; i += 54) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, Hc); x.stroke(); } for (let i = 0; i < Hc; i += 54) { x.beginPath(); x.moveTo(0, i); x.lineTo(Wc, i); x.stroke(); }
  const glow = x.createRadialGradient(Wc * .78, 250, 10, Wc * .78, 250, 420); glow.addColorStop(0, p.color + '55'); glow.addColorStop(1, 'transparent'); x.fillStyle = glow; x.fillRect(0, 0, Wc, 700);
  x.strokeStyle = p.color; x.lineWidth = 8; rr(x, 22, 22, Wc - 44, Hc - 44, 40); x.stroke();
  // cabeçalho
  if (logoImg) x.drawImage(logoImg, 66, 62, 104, 104 * logoImg.height / logoImg.width);
  x.fillStyle = '#E7F1FF'; x.font = '700 46px "Chakra Petch"'; x.fillText('RISKCARDS', 190, 106);
  x.fillStyle = '#F5A524'; x.font = '600 26px "Chakra Petch"'; x.fillText('IA SOB ATAQUE · LETRAMENTO IA', 192, 144);
  // jogador
  x.fillStyle = '#A6BCD9'; x.font = '600 28px "Chakra Petch"'; x.fillText(total > 1 ? `${rankPos}º LUGAR DE ${total} · ${p.score.toLocaleString('pt-BR')} PONTOS` : `${p.score.toLocaleString('pt-BR')} PONTOS`, 66, 236);
  x.fillStyle = p.color; let fs = 92; x.font = `700 ${fs}px "Chakra Petch"`; while (x.measureText(p.name.toUpperCase()).width > Wc - 140 && fs > 50) { fs -= 4; x.font = `700 ${fs}px "Chakra Petch"`; }
  x.shadowColor = p.color; x.shadowBlur = 30; x.fillText(p.name.toUpperCase(), 62, 236 + fs + 6); x.shadowBlur = 0;
  // selo de nível
  let y = 236 + fs + 46;
  const lc = LVL_COLOR[T.lvl];
  rr(x, 62, y, Wc - 124, 190, 26); x.fillStyle = 'rgba(14,29,51,.92)'; x.fill(); x.strokeStyle = lc; x.lineWidth = 4; x.stroke();
  // hexágono com o número do nível
  const hx = 160, hy = y + 95; x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; x.lineTo(hx + Math.cos(a) * 70, hy + Math.sin(a) * 70); } x.closePath(); x.fillStyle = lc; x.fill();
  x.fillStyle = '#07111F'; x.font = '700 30px "Chakra Petch"'; x.textAlign = 'center'; x.fillText('NÍVEL', hx, hy - 8); x.font = '700 58px "Chakra Petch"'; x.fillText(T.i + 1, hx, hy + 46); x.textAlign = 'left';
  x.fillStyle = lc; x.font = '700 28px "Chakra Petch"'; x.fillText(T.lvl.toUpperCase() + ' · DOMÍNIO EM RISCOS DE IA', 262, y + 62);
  x.fillStyle = '#FFFFFF'; x.font = '700 50px "Chakra Petch"'; x.fillText(T.t.toUpperCase(), 262, y + 118, Wc - 340);
  x.fillStyle = '#A6BCD9'; x.font = '500 26px "IBM Plex Sans"'; x.fillText(T.att ? `${T.ok} de ${T.att} jogadas certas · ${T.d}` : T.d, 262, y + 160, Wc - 340);
  // domínios
  y += 236;
  x.fillStyle = '#2FD6F0'; x.font = '700 26px "Chakra Petch"'; x.fillText('DOMÍNIO POR ÁREA', 66, y); y += 22;
  doms.forEach(D => {
    y += 52;
    x.fillStyle = '#E7F1FF'; x.font = '600 28px "IBM Plex Sans"'; x.fillText(D.t, 66, y);
    const lab = D.lvl || 'Não explorado', col = D.lvl ? LVL_COLOR[D.lvl] : '#56708F';
    x.font = '700 24px "Chakra Petch"'; const lw = x.measureText(lab.toUpperCase()).width + 30;
    rr(x, Wc - 66 - lw, y - 30, lw, 40, 20); x.fillStyle = col + '33'; x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.stroke();
    x.fillStyle = col; x.textAlign = 'center'; x.fillText(lab.toUpperCase(), Wc - 66 - lw / 2, y - 2); x.textAlign = 'left';
    rr(x, 66, y + 14, Wc - 132, 12, 6); x.fillStyle = '#132846'; x.fill();
    if (D.att) { rr(x, 66, y + 14, Math.max(14, (Wc - 132) * D.acc), 12, 6); x.fillStyle = D.c; x.fill(); }
    y += 18;
  });
  // cartas dominadas e a revisar
  y += 58;
  const thumbs = (list, x0, maxN, label, col) => {
    x.fillStyle = col; x.font = '700 26px "Chakra Petch"'; x.fillText(label, x0, y);
    const tw = 112, th = 150, gap = 14;
    if (!list.length) { x.fillStyle = '#56708F'; x.font = '500 24px "IBM Plex Sans"'; x.fillText(label.startsWith('CARTAS') ? 'Jogue mais rodadas para dominar cartas' : 'Nenhuma carta pendente', x0, y + 56, 470); return; }
    list.slice(0, maxN).forEach((n, k) => {
      const im = imgs['r' + n], X = x0 + k * (tw + gap), Y = y + 20;
      x.save(); rr(x, X, Y, tw, th, 12); x.clip(); if (im) x.drawImage(im, 0, 0, im.width, im.width / tw * th, X, Y, tw, th); x.restore();
      x.strokeStyle = col; x.lineWidth = 4; rr(x, X, Y, tw, th, 12); x.stroke();
    });
  };
  thumbs(mastered, 66, 4, `CARTAS DOMINADAS · ${mastered.length}`, '#3DDC97');
  thumbs(review, 594, 3, `PARA REVISAR · ${review.length}`, '#F5A524');
  // rodapé
  x.fillStyle = 'rgba(7,17,31,.9)'; x.fillRect(22, Hc - 140, Wc - 44, 118);
  x.fillStyle = '#E7F1FF'; x.font = '600 28px "IBM Plex Sans"'; x.fillText('Jogue também e teste seu letramento em IA', 66, Hc - 86);
  x.fillStyle = '#2FD6F0'; x.font = '600 26px "IBM Plex Mono"'; x.fillText(SITE_URL.replace('https://', ''), 66, Hc - 48);
  x.fillStyle = '#F5A524'; x.font = '700 24px "Chakra Petch"'; x.textAlign = 'right'; x.fillText('#LetramentoIA', Wc - 66, Hc - 48); x.textAlign = 'left';
  return c;
}
function captionFor(p, rankPos, total) {
  const T = tierOf(p), doms = DOMAINS.map(D => domainOf(p, D)).filter(d => d.lvl), { mastered, review } = cardsOf(p);
  const top = doms.sort((a, b) => b.acc - a.acc)[0];
  return [
    `Alcancei o Nível ${T.i + 1} (${T.lvl}) · ${T.t} no RiskCards: IA sob Ataque, do Letramento IA!`,
    total > 1 ? `${rankPos}º lugar entre ${total} jogadores, com ${p.score} pontos.` : `${p.score} pontos.`,
    top ? `Área mais forte: ${top.t} (${top.lvl}).` : '',
    mastered.length ? `Cartas que dominei: ${mastered.slice(0, 5).map(n => byN(n).t).join(', ')}.` : '',
    review.length ? `Vou revisar: ${review.slice(0, 3).map(n => byN(n).t).join(', ')}.` : '',
    `Jogue também: ${SITE_URL}`,
    '#LetramentoIA #RiskCards #InteligenciaArtificial #GovernancaDeIA',
  ].filter(Boolean).join('\n');
}
async function openShare(idx) {
  const rank = [...S.players].sort((a, b) => b.score - a.score);
  let p = rank[idx || 0];
  const d = document.createElement('div'); d.className = 'sharebox'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Postar resultado');
  d.innerHTML = `<div class="sb-in"><div class="sb-head"><div><div class="eyebrow">Postar resultado</div><h3>Seu cartão de domínio</h3></div><button class="iconbtn" id="sbClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${rank.length > 1 ? `<div class="sb-players" id="sbPl">${rank.map((q, i) => `<button class="pchip${q === p ? ' on' : ''}" data-i="${i}" style="--pc:${q.color}"><i class="dot"></i><b>${esc(q.name)}</b></button>`).join('')}</div>` : ''}
    <img class="sb-img" id="sbImg" alt="Cartão de resultado">
    <label class="sb-lab" for="sbCap">Legenda</label><textarea id="sbCap" rows="5"></textarea>
    <div class="sb-acts">
      <button class="btn pri wide" id="sbShare" hidden>Compartilhar</button>
      <button class="btn pri wide" id="sbSave">Salvar imagem</button>
      <button class="btn sec" id="sbCopy">Copiar legenda</button>
    </div>
    <div class="sb-net"><span class="note">Poste em:</span><a class="btn sec" id="sbLi" target="_blank" rel="noopener">LinkedIn</a><a class="btn sec" id="sbWa" target="_blank" rel="noopener">WhatsApp</a><a class="btn sec" id="sbX" target="_blank" rel="noopener">X</a></div>
    <p class="note" id="sbMsg">Salve a imagem e anexe ao post; a legenda já leva o link do jogo.</p></div>`;
  document.body.appendChild(d); sfx('power');
  const close = () => d.remove();
  d.querySelector('#sbClose').onclick = close; d.onclick = e => { if (e.target === d) close(); };
  d.onkeydown = e => { if (e.key === 'Escape') close(); };
  let blob = null;
  const render = async () => {
    const pos = rank.indexOf(p) + 1, cv = drawShareCard(p, pos, rank.length);
    const cap = captionFor(p, pos, rank.length); $('#sbCap').value = cap;
    $('#sbImg').src = cv.toDataURL('image/jpeg', .85);
    blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const short = `Alcancei o ${tierOf(p).t} (${tierOf(p).lvl}) no RiskCards: IA sob Ataque, do Letramento IA!`;
    $('#sbLi').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(SITE_URL);
    $('#sbWa').href = 'https://wa.me/?text=' + encodeURIComponent(cap);
    $('#sbX').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(short + ' ' + SITE_URL + ' #LetramentoIA');
    const file = new File([blob], `riskcards-${p.name.replace(/[^\w-]+/g, '_')}.png`, { type: 'image/png' });
    $('#sbShare').hidden = IS_ARTIFACT || !(navigator.canShare && navigator.canShare({ files: [file] }));
    $('#sbShare').onclick = async () => { try { await navigator.share({ files: [file], text: $('#sbCap').value, title: 'RiskCards: IA sob Ataque' }); } catch (e) {} };
    $('#sbSave').onclick = async () => {
      const name = file.name;
      if (IS_ARTIFACT) {
        try { const dl = await window.claude.use('downloads'); if (!dl) throw 0; await dl.save({ filename: name, data: blob }); $('#sbMsg').textContent = 'Imagem salva. Anexe ao post e cole a legenda.'; }
        catch (e) { $('#sbMsg').textContent = e && e.code === 'declined' ? 'Download cancelado.' : 'Neste acesso não dá para salvar direto. Toque e segure a imagem acima para salvá-la.'; }
      } else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); $('#sbMsg').textContent = 'Imagem salva. Anexe ao post e cole a legenda.'; }
    };
  };
  $('#sbCopy').onclick = () => { const t = $('#sbCap'); const ok = () => { $('#sbCopy').textContent = 'Legenda copiada'; setTimeout(() => $('#sbCopy').textContent = 'Copiar legenda', 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(ok, () => { t.select(); }); else t.select(); };
  if (d.querySelector('#sbPl')) d.querySelectorAll('#sbPl .pchip').forEach(b => b.onclick = () => { p = rank[+b.dataset.i]; d.querySelectorAll('#sbPl .pchip').forEach(x => x.classList.toggle('on', x === b)); render(); sfx('deal'); });
  await render();
  d.querySelector('#sbClose').focus();
}

/* ---------- PWA: instalação ---------- */
let installEvt = null;
const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function refreshInstall() {
  const can = !IS_ARTIFACT && !STANDALONE && (installEvt || IOS);
  document.querySelectorAll('.installBtn').forEach(b => b.hidden = !can);
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refreshInstall(); });
addEventListener('appinstalled', () => { installEvt = null; refreshInstall(); toast('App instalado', '#3DDC97'); });
async function doInstall() {
  if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; refreshInstall(); return; }
  const d = document.createElement('div'); d.className = 'sharebox'; d.setAttribute('role', 'dialog');
  d.innerHTML = `<div class="sb-in"><div class="sb-head"><div><div class="eyebrow">Instalar no iPhone ou iPad</div><h3>Leve o jogo na tela inicial</h3></div><button class="iconbtn" id="ioClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <ol class="steps"><li>No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O RiskCards abre em tela cheia e funciona mesmo sem internet depois da primeira partida.</li></ol></div>`;
  document.body.appendChild(d); d.querySelector('#ioClose').onclick = () => d.remove(); d.onclick = e => { if (e.target === d) d.remove(); };
}
if (!IS_ARTIFACT && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ---------------- biblioteca e lightbox ---------------- */
function lightbox(front, back) {
  const d = document.createElement('div'); d.className = 'lb'; d.tabIndex = 0; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Carta ampliada');
  d.innerHTML = `<img src="${front}" alt="Frente da carta">${back ? `<img src="${back}" alt="Verso da carta">` : ''}<button class="btn pri close">Fechar</button>`;
  const close = () => d.remove();
  d.querySelector('.close').onclick = e => { e.stopPropagation(); close(); };
  d.onclick = e => { if (!MOBILE || e.target === d) close(); };
  d.onkeydown = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); close(); } };
  document.body.appendChild(d); d.focus();
}
function openLib(tab = 'r') {
  $('#libScreen').hidden = false;
  document.querySelectorAll('#libTabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tab));
  const items = tab === 'r' ? RISKS.map(r => [rsrc(r.n), rsrc(r.n, 'b'), `RiskCard ${r.n}: ${r.t}`])
    : tab === 'i' ? INCIDENTS.map(i => [isrc(i.n), isrc(i.n, 'b'), `Incident Card ${i.n}: ${i.t}`])
    : [['assets/rc/coringa_f.jpg', 'assets/rc/coringa_b.jpg', 'Carta Coringa'], ['assets/rc/coringa2_f.jpg', 'assets/rc/coringa_b.jpg', 'Carta Coringa (variação)']];
  $('#libGrid').innerHTML = items.map(([f, b, a], k) => `<button data-k="${k}"><img src="${f}" alt="${esc(a)}" loading="lazy"></button>`).join('');
  $('#libGrid').querySelectorAll('button').forEach(btn => btn.onclick = () => { const [f, b] = items[+btn.dataset.k]; lightbox(f, b); });
}
document.querySelectorAll('#libTabs button').forEach(b => b.onclick = () => openLib(b.dataset.t));
$('#libBtn').onclick = () => openLib('r');
$('#setupLib').onclick = () => openLib('r');
$('#libClose').onclick = () => { $('#libScreen').hidden = true; };

/* ============================================================
   LAYOUT, LOOP, TECLADO E BOOT
   ============================================================ */
let aspect = 1, SIDE = false, RES = 140, POP = 1.22, POPZ = .9, VFEET = 0;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  SIDE = innerWidth > innerHeight && innerHeight <= 520;
  const fw = SIDE ? .54 : 1;
  camera.aspect = w / h; aspect = w * fw / h;
  if (SIDE) camera.setViewOffset(w, h, w * (1 - fw) / 2, 0, w, h); else camera.clearViewOffset();
  RES = SIDE ? 0 : Math.round(Math.min(Math.max(h * .2, 118), 168));
  const portrait = aspect < .9;
  const k = SIDE ? .52 : portrait ? .40 : .46, wf = portrait ? .64 : .42, topM = .045;
  VIS = Math.max(CARD_H / k, CARD_W / (wf * aspect));
  const dist = (VIS / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camBase.set(0, .1, dist); if (!CINE.on) camera.position.copy(camBase);
  camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  halfW = VIS * aspect / 2;
  CY = VIS / 2 - topM * VIS - CARD_H / 2;
  FEET = -VIS / 2 + (RES / h + .03) * VIS;
  grid.position.y = FEET; lane.position.y = FEET + .01;
  const cardFrac = topM + CARD_H / VIS;
  stage.style.setProperty('--reserve', RES + 'px');
  stage.style.setProperty('--toast-y', ((topM + CARD_H / VIS / 2) * 100).toFixed(1) + '%');
  stage.style.setProperty('--hint-y', ((cardFrac + .012) * 100).toFixed(1) + '%');
  const vs = Math.min(1.8, VIS * (portrait ? .15 : .3)) / 2.1;
  VFEET = portrait ? CY - CARD_H * .62 : FEET;
  Object.values(villains).forEach(v => { v.s0 = vs * v.c.scale; v.x0 = portrait ? halfW * .76 : Math.min(halfW - .6 * vs - .1, 3.9); v.z0 = portrait ? .35 : -1.3; });
  const wide = aspect > 1.4, coreS = wide ? 1.1 : portrait ? .85 : 1.3;
  coreGroup.scale.setScalar(coreS);
  if (portrait) coreGroup.position.set(-halfW * .62, FEET + 2.1, -9); else coreGroup.position.set(wide ? -Math.min(halfW * .55, 4.6) : 0, FEET + 1.2 * coreS, wide ? -4.5 : -7);
  layoutRobots();
}
new ResizeObserver(resize).observe(stage);
addEventListener('orientationchange', () => setTimeout(resize, 250));

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(clock.getDelta(), .05), el = clock.elapsedTime;
  for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; const t = Math.min(1, (now - tw.t0) / tw.dur); tw.fn(tw.e(t)); if (t >= 1) { tweens.splice(i, 1); tw.res(); } }
  const p = dustGeo.attributes.position.array;
  for (let i = 0; i < DUST; i++) { p[i*3+1] += dt * (.15 + (i % 7) * .03); if (p[i*3+1] > FEET + 12) p[i*3+1] = FEET; }
  dustGeo.attributes.position.needsUpdate = true;
  lane.material.map.offset.y = (el * .08) % 1;
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.life += dt; const a = b.pts.geometry.attributes.position.array;
    b.v.forEach((v, k) => { v.y -= dt * 2.2; v.multiplyScalar(.985); a[k*3] += v.x * dt; a[k*3+1] += v.y * dt; a[k*3+2] += v.z * dt; });
    b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.3);
    if (b.life > 1.3) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(i, 1); }
  }
  if (core) {
    core.rotation.y += dt * .25; nodes.rotation.y += dt * .12;
    if (coreGlow) {
      coreCalm = Math.max(0, coreCalm - dt * .8);
      const danger = Math.max(coreAlert, S.playing ? (S.integ <= 30 ? 1 : S.integ <= 60 ? .5 : 0) : 0);
      const pulse = 1 + Math.sin(el * (danger ? 7 + danger * 3 : 2.2)) * (danger ? .3 : .12);
      coreGlow.emissive.lerpColors(new THREE.Color('#2FD6F0'), new THREE.Color('#FF3355'), danger * .85);
      coreGlow.emissiveIntensity = (.8 + coreCalm * 2.2) * pulse;
    }
  }
  nodeMeshes.forEach((m, i) => { m.rotation.y += dt * 1.2; m.position.y = 1.6 + Math.sin(el * 1.5 + i) * .08; m.userData.beam.geometry.attributes.position.setY(0, m.position.y); m.userData.beam.geometry.attributes.position.needsUpdate = true; });
  if (threat && !threat.userData.anim) { threat.position.y = CY + Math.sin(el * 1.4) * .06; threat.rotation.x = Math.sin(el * .9) * .03; }
  if (die && die.visible === false) {}
  if (T.on) {
    const f = Math.max(0, 1 - (now - T.t0) / T.ms);
    const secs = Math.ceil(f * T.ms / 1000); $('#timerFill').style.transform = `scaleX(${f})`; $('#timerLbl').textContent = secs + ' s';
    if (secs <= 3 && secs > 0 && secs !== T.lastSec) { T.lastSec = secs; sfx('tick'); haptic(12); $('#timer').classList.add('hurry'); }
    if (f <= 0) { const cb = T.cb; stopTimer(); if (cb) cb(); }
  }
  const hintOn = !!(threat && !threat.userData.anim && S.playing && !CINE.on && !zoomedOnce && !document.querySelector('.lb'));
  if (hintOn === $('#zoomhint').hidden) $('#zoomhint').hidden = !hintOn;
  camera.position.copy(CINE.on ? CINE.pos : camBase);
  if (shake > 0) { camera.position.x += (Math.random() - .5) * shake * .35; camera.position.y += (Math.random() - .5) * shake * .35; shake = Math.max(0, shake - dt * 2); }
  if (!CINE.on) camera.position.x += Math.sin(el * .3) * .15;
  camera.lookAt(CINE.on ? CINE.tgt : ORIGIN);
  if (robot && robot.root.visible) robot.update(dt, el);
  S.players.forEach(pl => pl.R && pl.R.update(dt, el));
  for (const k in villains) villains[k].update(dt, el);
  composer.render();
}

const ray = new THREE.Raycaster(), tapPt = new THREE.Vector2(); let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY, performance.now()]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || CINE.on) return; const [x0, y0, t0] = downAt; downAt = null;
  if (Math.hypot(e.clientX - x0, e.clientY - y0) > 14 || performance.now() - t0 > 700) return;
  if (!threat || threat.userData.anim) return;
  const r = canvas.getBoundingClientRect(); tapPt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(tapPt, camera);
  if (ray.intersectObject(threat, true).length) zoomThreat();
});
function zoomThreat() {
  const z = threat && threat.userData.zoom; if (!z) return; zoomedOnce = true; sfx('flip'); haptic(10);
  if (z.front) lightbox(z.front, z.back); else lightbox(z.canvas.toDataURL('image/jpeg', .9));
}
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT')) return;
  const lb = document.querySelector('.lb'); if (lb) return;
  if (CINE.on) { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); endIntro(); } return; }
  if (!$('#libScreen').hidden) { if (e.key === 'Escape') $('#libScreen').hidden = true; return; }
  const n = parseInt(e.key, 10);
  if (S.mode === 'buzz') { if (n >= 1 && n <= S.players.length) { e.preventDefault(); buzz(n - 1); } return; }
  if (n >= 1 && n <= 4) { const b = document.querySelectorAll('#hand .opt')[n - 1]; if (b && !b.classList.contains('dim') && !b.classList.contains('right') && !b.classList.contains('wrong')) b.click(); }
  const go = $('#go');
  if ((e.key === ' ' || e.key === 'Enter') && go && !go.disabled && document.activeElement !== go && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); go.click(); }
});
$('#muteBtn').onclick = () => { muted = !muted; $('#waves').style.opacity = muted ? .15 : 1; };
$('#skipBtn').onclick = () => endIntro();

function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
(async function boot() {
  resize(); loop();
  try { await Promise.all(['700 40px "Chakra Petch"', '600 20px "Chakra Petch"', '500 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"'].map(f => document.fonts.load(f))); } catch (e) {}
  const list = [...RISKS.map(r => ['r' + r.n, rsrc(r.n)]), ...INCIDENTS.map(i => ['i' + i.n, isrc(i.n)]), ['coringa', 'assets/rc/coringa_f.jpg']];
  let done = 0;
  const [logo] = await Promise.all([loadImg('assets/logo.png'), ...list.map(([k, s]) => loadImg(s).then(im => { imgs[k] = im; done++; $('#loading').textContent = `Carregando cartas ${done}/${list.length}`; }))]);
  logoImg = logo; backCanvasCache = backCanvas();
  $('#loading').textContent = 'Montando a AI Factory…';
  const files = ['nucleo', 'robo', 'chave', ...Object.values(VCFG).map(c => c.file)];
  const [nuc, rob, chv, ...vg] = await Promise.all(files.map(n => loader.loadAsync('assets/' + n + '.gltf.json').catch(e => { console.warn(e); return null; })));
  if (nuc) {
    core = nuc.scene; coreGroup.add(core);
    core.traverse(o => { if (!o.isMesh) return; const n = o.material.name || '';
      if (n.startsWith('vidro')) { o.material.transparent = true; o.material.opacity = .16; o.material.depthWrite = false; o.material.roughness = .05; }
      if (n.startsWith('luz_ciano')) coreGlow = o.material;
      if (n.startsWith('friso')) o.material.emissiveIntensity = 1.1; });
    core.position.y = -1.2;
  }
  if (rob) { robotProto = rob.scene; robot = makePlayerRobot(null, null); robot.ring.visible = false; }
  Object.keys(VCFG).forEach((k, i) => {
    const g = vg[i]; if (!g) return; const r = k === 'rebelde' ? g.scene.clone(true) : g.scene;
    if (k === 'rebelde' && chv) { const key = chv.scene; key.position.set(.08, -.56, .1); key.rotation.z = -.2; r.getObjectByName('robo_ombro_D').add(key); }
    r.visible = false; scene.add(r); villains[k] = makeVillain(k, r);
    if (k === 'rebelde') { const v = villains[k]; v.x.chave = r.getObjectByName('chave'); if (v.x.chave) v.x.chave.userData.p0 = v.x.chave.position.clone(); v.matsBy('robo_emblema').forEach(m => { m.emissive.set('#FF2040'); m.color.set('#FF2040'); }); }
    if (k === 'caixa') villains[k].matsBy('cx_preto').forEach(m => { m.color.set('#1A2233'); m.emissive.set('#0B2A4A'); m.emissiveIntensity = .9; m.metalness = .7; m.roughness = .25; });
  });
  die = makeDie();
  resize(); hud();
  $('#loading').hidden = true; $('#gate').hidden = false;
  if (robot) robot.wave();
  $('#gateBtn').focus({ preventScroll: true });
  $('#gateBtn').onclick = async () => { sfx('deal'); $('#gate').hidden = true; await runIntro(); showSetup(); };
  $('#gateSkip').onclick = () => showSetup();
  document.querySelectorAll('.installBtn').forEach(b => b.onclick = doInstall); refreshInstall();
})();
