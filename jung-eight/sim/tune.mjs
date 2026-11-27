// 拟合方式与权重实验
import { QUESTIONS, FUNCTION_ORDER, TYPES, TYPE_LIST, OPPOSITE, evaluate, DEFAULT_WEIGHTS } from '../public/assets/js/engine.js';

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
const BASE = { D: 1.18, A: 0.62, T: 0.02, I: -0.9, S5: -0.4, S6: -0.16, S7: -0.34, S8: -0.66 };
function makeLatent(type, rng, noise) {
  const stack = TYPES[type].stack;
  const shadow = stack.map((f) => OPPOSITE[f]);
  const l = {};
  const add = (f, v) => { l[f] = (l[f] ?? 0) + v; };
  add(stack[0], BASE.D); add(stack[1], BASE.A); add(stack[2], BASE.T); add(stack[3], BASE.I);
  add(shadow[0], BASE.S5); add(shadow[1], BASE.S6); add(shadow[2], BASE.S7); add(shadow[3], BASE.S8);
  for (const f of FUNCTION_ORDER) l[f] = (l[f] ?? 0) + gauss(rng) * noise;
  return l;
}
function answersFor(latent, rng, bias, itemNoise = 0.78) {
  return QUESTIONS.map((q) => Math.max(0, Math.min(4, Math.round(2 + 0.92 * (latent[q.fn] ?? 0) + bias + gauss(rng) * itemNoise))));
}
function accFor(weights, { seed = 777, rounds = 2500, noise = 0.42, strategy = 'template' } = {}) {
  const rng = mulberry32(seed);
  let hit = 0;
  for (let i = 0; i < rounds; i += 1) {
    const t = TYPE_LIST[Math.floor(rng() * TYPE_LIST.length)];
    const latent = makeLatent(t, rng, noise);
    const ans = answersFor(latent, rng, gauss(rng) * 0.26);
    const res = evaluate(ans, { strategy, weights });
    if (res.type === t) hit += 1;
  }
  return hit / rounds;
}

const candidates = {
  default: DEFAULT_WEIGHTS,
  base: BASE,
  strongerAux: { ...DEFAULT_WEIGHTS, A: 0.7, T: 0.05, I: -0.75 },
  weit: { D: 1.15, A: 0.66, T: 0.05, I: -0.8, S5: -0.35, S6: -0.1, S7: -0.3, S8: -0.55 },
  noShadow: { D: 1, A: 0.6, T: 0.05, I: -0.7, S5: 0, S6: 0, S7: 0, S8: 0 },
};
console.log('权重候选 / 训练集(seed777) / 验证集(seed 2026)');
for (const [name, w] of Object.entries(candidates)) {
  const a1 = accFor(w, { seed: 777, rounds: 3000 });
  const a2 = accFor(w, { seed: 2026, rounds: 3000 });
  console.log(name.padEnd(12), (a1 * 100).toFixed(1) + '%', (a2 * 100).toFixed(1) + '%');
}

// 逐参数微调 ±
console.log('\n单参数敏感性（验证集 seed 2026）');
for (const key of ['D', 'A', 'T', 'I', 'S5', 'S6', 'S7', 'S8']) {
  const row = [];
  for (const delta of [-0.2, 0, 0.2]) {
    const w = { ...candidates.weit, [key]: candidates.weit[key] + delta };
    row.push(`${delta > 0 ? '+' : ''}${delta.toFixed(1)}:${(accFor(w, { seed: 2026, rounds: 2000 }) * 100).toFixed(1)}%`);
  }
  console.log(key.padEnd(3), row.join('  '));
}
