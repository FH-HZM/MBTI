// v5 自测：
// A. 十六型逐型命中率
// B. 双高场景：Ne/Ni（及其他对立功能对）同时高位时，两者都必须得高分
// C. 维度独立性：只提高某功能的潜在强度，其他功能的测得分数应基本不变
// 运行：node sim/selfcheck.mjs
import {
  QUESTIONS, FUNCTION_ORDER, TYPES, TYPE_LIST, OPPOSITE, evaluate, answerQuestion,
} from '../public/assets/js/engine.js';

const PRESET = { D: 90, A: 72, T: 55, I: 35, S5: 45, S6: 52, S7: 40, S8: 28 };
const ROUNDS = Number(process.env.ROUNDS || 200);
const JITTER = 6;

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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
  for (const f of FUNCTION_ORDER) out[f] = clamp(levels[f] + (jitter && rng ? gauss(rng) * jitter : 0), 3, 97);
  return out;
}
const answersFrom = (profile, rng) => QUESTIONS.map((q) => answerQuestion(q, profile, rng));

// ---------- A. 十六型逐型 ----------
console.log('=== A. 十六型逐型自测（含个体差异与作答噪声）===');
const rng = mulberry32(20261128);
let total = 0, hit = 0, top3 = 0;
const fails = {};
for (const trueType of TYPE_LIST) {
  let h = 0;
  for (let k = 0; k < ROUNDS; k += 1) {
    const profile = presetProfile(trueType, { jitter: JITTER, rng });
    const res = evaluate(answersFrom(profile, rng));
    total += 1;
    if (res.type === trueType) { h += 1; hit += 1; }
    if (res.fits.slice(0, 3).some((f) => f.code === trueType)) top3 += 1;
  }
  console.log(`${trueType} 命中 ${(h / ROUNDS * 100).toFixed(1)}%${h / ROUNDS < 0.9 ? '  <-- 注意' : ''}`);
  fails[trueType] = h / ROUNDS;
}
console.log(`总命中: ${(hit / total * 100).toFixed(1)}%   前三命中: ${(top3 / total * 100).toFixed(1)}%`);

// ---------- B. 双高场景（本次修复的核心） ----------
console.log('\n=== B. 对立功能双高场景（v4 的致命缺陷，v5 必须两者都高）===');
const pairsToTest = [['Ne', 'Ni'], ['Se', 'Si'], ['Te', 'Ti'], ['Fe', 'Fi']];
let dualPass = 0, dualTotal = 0;
for (const [f1, f2] of pairsToTest) {
  const profile = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 30])); // 其余功能压低
  profile[f1] = 90;
  profile[f2] = 90; // 双高
  const r = mulberry32(7);
  let both = 0;
  const N = 50;
  let sum1 = 0, sum2 = 0;
  for (let k = 0; k < N; k += 1) {
    const res = evaluate(answersFrom(profile, r));
    sum1 += res.scores[f1].pct;
    sum2 += res.scores[f2].pct;
    if (res.scores[f1].pct >= 70 && res.scores[f2].pct >= 70) both += 1;
    dualTotal += 1;
  }
  dualPass += both;
  console.log(`${f1}+${f2} 双高：${f1} 均分 ${(sum1 / N).toFixed(1)}，${f2} 均分 ${(sum2 / N).toFixed(1)}，两者均≥70 的比例 ${(both / N * 100).toFixed(0)}%`);
}
console.log(`双高总通过: ${(dualPass / dualTotal * 100).toFixed(1)}%${dualPass === dualTotal ? ' ✓ 全部通过' : ''}`);

// ---------- C. 维度独立性 ----------
console.log('\n=== C. 维度独立性（只动一个功能，其他功能测得分数应保持不变）===');
const baseProfile = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 50]));
const highProfile = { ...baseProfile, Ne: 95 }; // 只把 Ne 拉高
const r2 = mulberry32(42);
const drift = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, []]));
for (let k = 0; k < 60; k += 1) {
  const a = evaluate(answersFrom(baseProfile, r2));
  const b = evaluate(answersFrom(highProfile, r2));
  for (const f of FUNCTION_ORDER) drift[f].push(b.scores[f].pct - a.scores[f].pct);
}
for (const f of FUNCTION_ORDER) {
  const mean = drift[f].reduce((x, y) => x + y, 0) / drift[f].length;
  const flag = f === 'Ne' ? '(被拉高的维度，应显著上升)' : (Math.abs(mean) < 5 ? '✓ 基本不变' : '✗ 出现耦合漂移');
  console.log(`${f}: 平均变化 ${mean >= 0 ? '+' : ''}${mean.toFixed(1)} 分 ${flag}`);
}
