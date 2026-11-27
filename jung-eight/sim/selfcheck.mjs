// 十六型逐型自测：预设八维数值 -> 代入作答 -> 看能否判回原类型
// 运行：node sim/selfcheck.mjs
import {
  QUESTIONS, FUNCTION_ORDER, TYPES, TYPE_LIST, OPPOSITE,
  evaluate, DEFAULT_WEIGHTS,
} from '../public/assets/js/engine.js';

const PRESET = { D: 90, A: 72, T: 55, I: 35, S5: 45, S6: 52, S7: 40, S8: 28 };
const ROUNDS = Number(process.env.ROUNDS || 300);
const JITTER = Number(process.env.JITTER || 6);

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
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// 按类型的功能栈生成八维 0-100 预设分
function presetProfile(typeCode, { jitter = 0, rng } = {}) {
  const stack = TYPES[typeCode].stack;
  const shadow = stack.map((f) => OPPOSITE[f]);
  const levels = {};
  levels[stack[0]] = PRESET.D;
  levels[stack[1]] = PRESET.A;
  levels[stack[2]] = PRESET.T;
  levels[stack[3]] = PRESET.I;
  levels[shadow[0]] = PRESET.S5;
  levels[shadow[1]] = PRESET.S6;
  levels[shadow[2]] = PRESET.S7;
  levels[shadow[3]] = PRESET.S8;
  const out = {};
  for (const f of FUNCTION_ORDER) {
    out[f] = clamp(levels[f] + (jitter && rng ? gauss(rng) * jitter : 0), 3, 97);
  }
  return out;
}

// 预设分 -> 题目作答（0-4）
function answersFromProfile(profile, rng, { itemNoise = 0.8, biasSd = 0.18 } = {}) {
  const bias = rng ? gauss(rng) * biasSd : 0;
  return QUESTIONS.map((q) => {
    const mean = 2 + ((profile[q.fn] - 50) / 50) * 1.8;
    const v = mean + bias + (rng ? gauss(rng) * itemNoise : 0);
    return Math.round(clamp(v, 0, 4));
  });
}

function pearson(pairs) {
  const n = pairs.length;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, da = 0, db = 0;
  for (const [a, b] of pairs) { const x = a - ma, y = b - mb; num += x * y; da += x * x; db += y * y; }
  return num / (Math.sqrt(da * db) || 1);
}

console.log('预设强度:', PRESET, ' 每人抖动 σ:', JITTER, ' 每型人数:', ROUNDS);
console.log('引擎权重:', DEFAULT_WEIGHTS);

// ---------- A. 理想剖面：无噪声，直接代入 ----------
console.log('\n=== A. 理想剖面（无噪声，直接作答）===');
let idealHit = 0;
for (const type of TYPE_LIST) {
  const profile = presetProfile(type);
  const answers = answersFromProfile(profile, null);
  const res = evaluate(answers);
  const ok = res.type === type;
  if (ok) idealHit += 1;
  const stackHit = res.ranking.slice(0, 4).filter((f) => TYPES[type].stack.includes(f)).length;
  console.log(
    `${type} ${TYPES[type].name.padEnd(4, '　')} 判定=${res.type.padEnd(4)} 契合=${String(res.match).padStart(2)}% ` +
    `栈重合=${stackHit}/4 ${ok ? 'PASS' : 'FAIL -> ' + res.type}`
  );
}
console.log(`理想剖面：${idealHit}/16 命中`);

// ---------- B. 带个体差异与作答噪声的逐型自测 ----------
console.log('\n=== B. 逐型自测（含个体差异与作答噪声）===');
const rng = mulberry32(20261128);
const rows = {};
for (const type of TYPE_LIST) rows[type] = { n: 0, hit: 0, top3: 0, domHit: 0, overlap: 0, match: 0, conf: new Map() };
const predDist = Object.fromEntries(TYPE_LIST.map((t) => [t, 0]));
const fnPairs = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, []]));
let total = 0, hit = 0, top3 = 0, domHit = 0, overlapSum = 0;

for (const trueType of TYPE_LIST) {
  for (let k = 0; k < ROUNDS; k += 1) {
    const profile = presetProfile(trueType, { jitter: JITTER, rng });
    const answers = answersFromProfile(profile, rng);
    const res = evaluate(answers);
    const row = rows[trueType];
    row.n += 1; total += 1;
    predDist[res.type] += 1;
    const ok = res.type === trueType;
    if (ok) { row.hit += 1; hit += 1; }
    if (res.fits.slice(0, 3).some((f) => f.code === trueType)) { row.top3 += 1; top3 += 1; }
    if (res.ranking[0] === TYPES[trueType].stack[0]) { row.domHit += 1; domHit += 1; }
    const ov = res.ranking.slice(0, 4).filter((f) => TYPES[trueType].stack.includes(f)).length;
    row.overlap += ov; overlapSum += ov;
    row.match += res.match;
    if (!ok) {
      row.conf.set(res.type, (row.conf.get(res.type) || 0) + 1);
    }
    for (const f of FUNCTION_ORDER) fnPairs[f].push([res.scores[f].pct, profile[f]]);
  }
}

console.log('类型  命中率   前三率   主导命中  栈重合   平均契合  最常见误判');
for (const type of TYPE_LIST) {
  const r = rows[type];
  const conf = [...r.conf.entries()].sort((a, b) => b[1] - a[1])[0];
  console.log(
    `${type} ${(r.hit / r.n * 100).toFixed(1).padStart(5)}%  ${(r.top3 / r.n * 100).toFixed(1).padStart(5)}%  ` +
    `${(r.domHit / r.n * 100).toFixed(1).padStart(6)}%  ${(r.overlap / r.n).toFixed(2)}/4  ` +
    `${(r.match / r.n).toFixed(1).padStart(5)}  ${conf ? conf[0] + ' ' + (conf[1] / r.n * 100).toFixed(1) + '%' : '-'}`
  );
}
const fnR = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, pearson(fnPairs[f])]));
const fnMae = Object.fromEntries(FUNCTION_ORDER.map((f) => {
  const arr = fnPairs[f];
  return [f, arr.reduce((s, [est, trueV]) => s + Math.abs(est - trueV), 0) / arr.length];
}));
const avgR = FUNCTION_ORDER.reduce((s, f) => s + fnR[f], 0) / 8;
const avgMae = FUNCTION_ORDER.reduce((s, f) => s + fnMae[f], 0) / 8;

console.log(`\n总命中: ${(hit / total * 100).toFixed(1)}%   前三: ${(top3 / total * 100).toFixed(1)}%   主导功能命中: ${(domHit / total * 100).toFixed(1)}%   平均栈重合: ${(overlapSum / total).toFixed(2)}/4`);
console.log(`八维还原相关: ${FUNCTION_ORDER.map((f) => `${f} ${fnR[f].toFixed(2)}`).join('  ')}  平均 ${avgR.toFixed(3)}`);
console.log(`八维平均绝对误差: ${FUNCTION_ORDER.map((f) => `${f} ${fnMae[f].toFixed(1)}`).join('  ')}  平均 ${avgMae.toFixed(1)} 分`);
console.log(`预测类型分布: ${TYPE_LIST.map((t) => `${t} ${predDist[t]}`).join('  ')}`);
