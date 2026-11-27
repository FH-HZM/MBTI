// 计分引擎 v5：八维独立累计 + 十六型模板匹配
//
// 与 v4 的根本区别：不再有强制二选一的对照题计分。
// v4 的 pairAdjustments 用 sums[a] += d; sums[b] -= d 让对立功能互搏，
// 数学上使 Ne/Ni 双高成为不可能——本次彻底移除该机制。
// 现在每个功能的得分只取决于它自己的 10 道题，完全解耦。

import { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, MAX_RAW_PER_FUNCTION } from './questions.js';
import { TYPES, TYPE_LIST, ROLE_LABELS } from './types.js';

export const OPPOSITE = { Ne: 'Ni', Ni: 'Ne', Se: 'Si', Si: 'Se', Te: 'Ti', Ti: 'Te', Fe: 'Fi', Fi: 'Fe' };
export const SHADOW_LABELS = ['对立', '批判', '欺骗', '恶魔'];

// 模板权重：主导/辅助/第三/劣势 + 四个影子功能（仅用于十六型匹配，不影响八维分数本身）
export const DEFAULT_WEIGHTS = {
  D: 1.15, A: 0.66, T: 0.05, I: -0.8,
  S5: -0.35, S6: -0.1, S7: -0.3, S8: -0.55,
};

export function buildTemplates(weights = DEFAULT_WEIGHTS) {
  const templates = {};
  for (const code of TYPE_LIST) {
    const stack = TYPES[code].stack;
    const shadow = stack.map((f) => OPPOSITE[f]);
    const vec = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
    vec[stack[0]] += weights.D;
    vec[stack[1]] += weights.A;
    vec[stack[2]] += weights.T;
    vec[stack[3]] += weights.I;
    vec[shadow[0]] += weights.S5;
    vec[shadow[1]] += weights.S6;
    vec[shadow[2]] += weights.S7;
    vec[shadow[3]] += weights.S8;
    templates[code] = vec;
  }
  return templates;
}

// 八维独立计分：每功能累加自己的 10 题，raw 0–40，再换算成百分比。
// 未作答的题不计入分母，避免漏答拉低分数（结果页会要求全部答完）。
export function scoreFunctions(answers) {
  const sums = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  const counts = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  QUESTIONS.forEach((q, i) => {
    const v = answers[i];
    if (typeof v === 'number' && v >= 0 && v <= 4) {
      sums[q.fn] += v;
      counts[q.fn] += 1;
    }
  });
  const scores = {};
  for (const f of FUNCTION_ORDER) {
    const raw = sums[f];
    const count = counts[f];
    const maxRaw = 4 * (count || 1);
    scores[f] = {
      raw,                                  // 原始累计分（全答完时满分 40）
      count,                                // 已答题数（全答完时为 10）
      likertPct: Math.round((raw / maxRaw) * 100),
      pct: Math.round((raw / maxRaw) * 100),
    };
  }
  const answered = QUESTIONS.filter((q, i) => typeof answers[i] === 'number').length;
  return { scores, answered };
}

function zScores(values) {
  const arr = FUNCTION_ORDER.map((f) => values[f]);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1;
  return Object.fromEntries(FUNCTION_ORDER.map((f) => [f, (values[f] - mean) / sd]));
}

// 雷达图用的相对强度：min-max 归一化到 46–97，仅用于可视化，不改变原始 pct。
export function relativeScores(scores) {
  const pcts = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, scores[f].pct]));
  const vals = FUNCTION_ORDER.map((f) => pcts[f]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const out = {};
  for (const f of FUNCTION_ORDER) {
    out[f] = span < 1 ? 72 : Math.round(46 + (51 * (pcts[f] - min)) / span);
  }
  return out;
}

export function classifyByLetters(scores) {
  const p = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, scores[f].pct]));
  const extro = p.Ne + p.Se + p.Te + p.Fe;
  const intro = p.Ni + p.Si + p.Ti + p.Fi;
  const nTotal = p.Ne + p.Ni;
  const sTotal = p.Se + p.Si;
  const tTotal = p.Te + p.Ti;
  const fTotal = p.Fe + p.Fi;
  const extroJudge = Math.max(p.Te, p.Fe);
  const extroPerceive = Math.max(p.Ne, p.Se);

  const letters = {
    E: extro >= intro,
    N: nTotal >= sTotal,
    T: tTotal >= fTotal,
    J: extroJudge >= extroPerceive,
  };
  const code = `${letters.E ? 'E' : 'I'}${letters.N ? 'N' : 'S'}${letters.T ? 'T' : 'F'}${letters.J ? 'J' : 'P'}`;
  return { code, letters };
}

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db) || 1;
  return num / den;
}

// 十六型判定：把八维剖面与 16 个认知功能栈模板做相关匹配。
// 注意：这一步只用于判型，不回写修改八维分数——分数始终独立呈现。
export function templateFits(scores, weights = DEFAULT_WEIGHTS) {
  const z = zScores(Object.fromEntries(FUNCTION_ORDER.map((f) => [f, scores[f].pct])));
  const userVec = FUNCTION_ORDER.map((f) => z[f]);
  const templates = buildTemplates(weights);
  return TYPE_LIST
    .map((code) => {
      const tvec = FUNCTION_ORDER.map((f) => templates[code][f]);
      const r = pearson(userVec, tvec);
      return { code, r, fit: Math.max(1, Math.min(99, Math.round(50 + 50 * r))) };
    })
    .sort((a, b) => b.r - a.r);
}

export function shadowRoles(code) {
  const stack = TYPES[code].stack;
  const roles = {};
  stack.forEach((f, i) => {
    roles[f] = { role: ROLE_LABELS[i], index: i, shadow: false };
  });
  stack.forEach((f, i) => {
    const sf = OPPOSITE[f];
    roles[sf] = { role: SHADOW_LABELS[i], index: i, shadow: true };
  });
  return roles;
}

export function evaluate(answers, options = {}) {
  const { weights = DEFAULT_WEIGHTS } = options;
  const { scores, answered } = scoreFunctions(answers);
  const rel = relativeScores(scores);
  const letter = classifyByLetters(scores);
  const fits = templateFits(scores, weights);
  const typeCode = fits[0].code;

  const primaryFit = fits[0].fit;
  const secondFit = fits[1]?.fit ?? 0;
  const clarity = Math.max(40, Math.min(98, Math.round(primaryFit * 0.5 + (primaryFit - secondFit) * 3)));

  const ranking = [...FUNCTION_ORDER].sort((a, b) => scores[b].pct - scores[a].pct);
  const spread = Math.max(...FUNCTION_ORDER.map((f) => scores[f].pct)) - Math.min(...FUNCTION_ORDER.map((f) => scores[f].pct));

  return {
    scores,
    rel,
    ranking,
    answered,
    letter,
    fits: fits.slice(0, 4),
    type: typeCode,
    typeData: TYPES[typeCode],
    roleByFn: shadowRoles(typeCode),
    match: primaryFit,
    clarity,
    spread,
    lowDifferentiation: spread < 9,
    leadingFunction: ranking[0],
    weakestFunction: ranking[ranking.length - 1],
  };
}

// 供模拟脚本使用：从潜在功能强度生成作答
export function answerQuestion(question, latent, rng, noise = 0.78) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const theta = latent[question.fn] ?? 50;
  const value = 2 + ((theta - 50) / 50) * 1.8 + gauss * noise;
  return Math.max(0, Math.min(4, Math.round(value)));
}

export { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, MAX_RAW_PER_FUNCTION, TYPES, TYPE_LIST };
