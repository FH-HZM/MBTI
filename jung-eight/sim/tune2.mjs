// 探索不同相似度算法
import { QUESTIONS, FUNCTION_ORDER, TYPES, TYPE_LIST, OPPOSITE, scoreFunctions, buildTemplates } from '../public/assets/js/engine.js';

function mulberry32(seed) {
  return function rng() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const BASE = { D: 1.15, A: 0.66, T: 0.05, I: -0.8, S5: -0.35, S6: -0.1, S7: -0.3, S8: -0.55 };
const GEN = { D: 1.18, A: 0.62, T: 0.02, I: -0.9, S5: -0.4, S6: -0.16, S7: -0.34, S8: -0.66 };
function makeLatent(type, rng, noise) {
  const stack = TYPES[type].stack; const shadow = stack.map((f) => OPPOSITE[f]); const l = {};
  const add = (f, v) => { l[f] = (l[f] ?? 0) + v; };
  add(stack[0], GEN.D); add(stack[1], GEN.A); add(stack[2], GEN.T); add(stack[3], GEN.I);
  add(shadow[0], GEN.S5); add(shadow[1], GEN.S6); add(shadow[2], GEN.S7); add(shadow[3], GEN.S8);
  for (const f of FUNCTION_ORDER) l[f] = (l[f] ?? 0) + gauss(rng) * noise;
  return l;
}
function answersFor(latent, rng, bias) {
  return QUESTIONS.map((q) => Math.max(0, Math.min(4, Math.round(2 + 0.92 * (latent[q.fn] ?? 0) + bias + gauss(rng) * 0.78))));
}
function zs(scores) {
  const vals = FUNCTION_ORDER.map((f) => scores[f].pct);
  const m = vals.reduce((a, b) => a + b, 0) / 8;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / 8) || 1;
  return Object.fromEntries(FUNCTION_ORDER.map((f) => [f, (scores[f].pct - m) / sd]));
}
function pearson(a, b) {
  const ma = a.reduce((x, y) => x + y, 0) / a.length; const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i += 1) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return num / (Math.sqrt(da * db) || 1);
}
function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
  const r = new Array(a.length);
  idx.forEach(([, i], k) => { r[i] = k; });
  return r;
}
const T = buildTemplates(BASE);
const F = Object.fromEntries(TYPE_LIST.map((c) => [c, FUNCTION_ORDER.map((f) => T[c][f])]));
const methods = {
  pearson: (u, t) => pearson(u, t),
  spearman: (u, t) => pearson(ranks(u), ranks(t)),
  cosine: (u, t) => {
    let n = 0, du = 0, dt = 0;
    for (let i = 0; i < u.length; i += 1) { n += u[i] * t[i]; du += u[i] ** 2; dt += t[i] ** 2; }
    return n / (Math.sqrt(du * dt) || 1);
  },
  euclid: (u, t) => {
    let d = 0;
    for (let i = 0; i < u.length; i += 1) d += (u[i] - t[i]) ** 2;
    return -Math.sqrt(d);
  },
  contrast: (u, t) => pearson(u, t),
};
function evalMethod(method, rounds, seed, noise = 0.42) {
  const rng = mulberry32(seed);
  let hit = 0;
  for (let i = 0; i < rounds; i += 1) {
    const t = TYPE_LIST[Math.floor(rng() * TYPE_LIST.length)];
    const latent = makeLatent(t, rng, noise);
    const ans = answersFor(latent, rng, gauss(rng) * 0.26);
    const { scores } = scoreFunctions(ans);
    const z = zs(scores);
    let uv = FUNCTION_ORDER.map((f) => z[f]);
    if (method === 'contrast') {
      const c = {};
      for (const f of FUNCTION_ORDER) c[f] = z[f] - z[OPPOSITE[f]];
      uv = FUNCTION_ORDER.map((f) => c[f]);
    }
    let best = null, bestR = -Infinity;
    for (const code of TYPE_LIST) {
      let r = methods[method](uv, F[code]);
      if (method === 'contrast') {
        const tv = FUNCTION_ORDER.map((f) => T[code][f] - T[code][OPPOSITE[f]]);
        r = pearson(uv, tv);
      }
      if (r > bestR) { bestR = r; best = code; }
    }
    if (best === t) hit += 1;
  }
  return hit / rounds;
}
for (const m of Object.keys(methods)) {
  const a = evalMethod(m, 3000, 2026);
  const b = evalMethod(m, 3000, 99);
  console.log(m.padEnd(9), (a * 100).toFixed(1) + '%', (b * 100).toFixed(1) + '%');
}
