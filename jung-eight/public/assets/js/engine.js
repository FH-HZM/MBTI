// 计分引擎：八维得分、类型判定、契合度与影子功能
import { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, PAIR_QUESTIONS } from './questions.js';
import { TYPES, TYPE_LIST, ROLE_LABELS } from './types.js';

export const OPPOSITE = { Ne: 'Ni', Ni: 'Ne', Se: 'Si', Si: 'Se', Te: 'Ti', Ti: 'Te', Fe: 'Fi', Fi: 'Fe' };
export const SHADOW_LABELS = ['对立', '批判', '欺骗', '恶魔'];

// 权重来自模拟调优：主导/辅助/第三/劣势 + 四个影子功能
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

const QUESTION_FN = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.fn]));

// 对照题占最终八维分的权重。行为频率题容易被“场景机会”影响，
// 对照题让相邻功能直接竞争，权重略低但足以校正 Fi/Fe 这类偏差。
export const PAIR_WEIGHT = 0.28;

// 0 = A 明显更像，1 = A 稍微更像，2 = B 稍微更像，3 = B 明显更像
export function pairAdjustments(pairs) {
  const sums = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  const counts = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  PAIR_QUESTIONS.forEach((p, i) => {
    const v = Array.isArray(pairs) ? pairs[i] : null;
    if (typeof v !== 'number' || v < 0 || v > 3) return;
    const aDelta = v === 0 ? 2 : v === 1 ? 1 : v === 2 ? -1 : -2;
    sums[p.a] += aDelta;
    sums[p.b] -= aDelta;
    counts[p.a] += 1;
    counts[p.b] += 1;
  });
  const out = {};
  for (const f of FUNCTION_ORDER) {
    out[f] = counts[f] ? Math.round((sums[f] / (counts[f] * 2)) * 100) : null;
  }
  return out;
}

export function scoreFunctions(answers, pairs = null) {
  const sums = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  const counts = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, 0]));
  QUESTIONS.forEach((q, i) => {
    const v = answers[i];
    if (typeof v === 'number' && v >= 0 && v <= 4) {
      sums[q.fn] += v;
      counts[q.fn] += 1;
    }
  });
  const pair = pairAdjustments(pairs);
  const scores = {};
  for (const f of FUNCTION_ORDER) {
    const n = counts[f] || 1;
    const raw = sums[f];
    const likertPct = Math.round((raw / (4 * n)) * 100);
    const adj = pair[f];
    const pct = adj === null
      ? likertPct
      : Math.round(likertPct * (1 - PAIR_WEIGHT) + (50 + adj / 2) * PAIR_WEIGHT);
    scores[f] = { raw, count: counts[f], likertPct, pct, pair: adj };
  }
  const pairsAnswered = Array.isArray(pairs)
    ? pairs.filter((v) => typeof v === 'number' && v >= 0 && v <= 3).length
    : 0;
  return { scores, answered: QUESTIONS.filter((q, i) => typeof answers[i] === 'number').length, pairsAnswered };
}

function zScores(values) {
  const arr = FUNCTION_ORDER.map((f) => values[f]);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1;
  return Object.fromEntries(FUNCTION_ORDER.map((f) => [f, (values[f] - mean) / sd]));
}

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
  const margins = {
    EI: Math.abs(extro - intro) / (extro + intro || 1),
    NS: Math.abs(nTotal - sTotal) / (nTotal + sTotal || 1),
    TF: Math.abs(tTotal - fTotal) / (tTotal + fTotal || 1),
    JP: Math.abs(extroJudge - extroPerceive) / (extroJudge + extroPerceive || 1),
  };
  return { code, letters, margins };
}

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
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
  const { strategy = 'template', weights = DEFAULT_WEIGHTS, pairs = null } = options;
  const { scores, answered, pairsAnswered } = scoreFunctions(answers, pairs);
  const rel = relativeScores(scores);
  const letter = classifyByLetters(scores);
  const fits = templateFits(scores, weights);
  const templateTop = fits[0];

  let typeCode = letter.code;
  let method = 'letter';
  if (strategy === 'template') {
    typeCode = templateTop.code;
    method = 'template';
  } else if (strategy === 'hybrid') {
    if (letter.code === templateTop.code) {
      typeCode = letter.code;
      method = 'both';
    } else {
      const letterFit = fits.find((f) => f.code === letter.code)?.r ?? 0;
      const gap = templateTop.r - letterFit;
      if (gap > 0.16) {
        typeCode = templateTop.code;
        method = 'template-tiebreak';
      }
    }
  }

  const orderedFits = [fits.find((f) => f.code === typeCode), ...fits.filter((f) => f.code !== typeCode)].filter(Boolean);
  const primaryFit = orderedFits[0].fit;
  const secondFit = orderedFits[1]?.fit ?? 0;
  const clarity = Math.max(40, Math.min(98, Math.round(primaryFit * 0.5 + (primaryFit - secondFit) * 3)));

  const ranking = [...FUNCTION_ORDER].sort((a, b) => rel[b] - rel[a]);
  const spread = Math.max(...FUNCTION_ORDER.map((f) => scores[f].pct)) - Math.min(...FUNCTION_ORDER.map((f) => scores[f].pct));

  return {
    scores,
    rel,
    ranking,
    answered,
    pairsAnswered,
    pairApplied: pairsAnswered > 0,
    letter,
    fits: orderedFits.slice(0, 4),
    type: typeCode,
    typeData: TYPES[typeCode],
    roleByFn: shadowRoles(typeCode),
    match: primaryFit,
    clarity,
    method,
    spread,
    lowDifferentiation: spread < 9,
    leadingFunction: ranking[0],
    weakestFunction: ranking[ranking.length - 1],
  };
}

// 供模拟脚本使用：从潜在功能强度生成作答
export function answerQuestion(question, latent, rng, bias = 0, noise = 0.78) {
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const theta = latent[question.fn] ?? 0;
  const value = 2 + 0.92 * theta + bias + gauss() * noise;
  return Math.max(0, Math.min(4, Math.round(value)));
}

export { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, PAIR_QUESTIONS, TYPES, TYPE_LIST };
