// 模拟答题，评估题库与计分引擎的准确度
// 运行：node sim/simulate.mjs
import {
  QUESTIONS, FUNCTION_ORDER, TYPES, TYPE_LIST, OPPOSITE,
  evaluate, scoreFunctions, DEFAULT_WEIGHTS,
} from '../public/assets/js/engine.js';

function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const BASE = { D: 1.18, A: 0.62, T: 0.02, I: -0.9, S5: -0.4, S6: -0.16, S7: -0.34, S8: -0.66 };

function makeLatent(typeCode, rng, personNoise) {
  const stack = TYPES[typeCode].stack;
  const shadow = stack.map((f) => OPPOSITE[f]);
  const latent = {};
  const assign = (f, level) => {
    latent[f] = (latent[f] ?? 0) + level;
  };
  assign(stack[0], BASE.D);
  assign(stack[1], BASE.A);
  assign(stack[2], BASE.T);
  assign(stack[3], BASE.I);
  assign(shadow[0], BASE.S5);
  assign(shadow[1], BASE.S6);
  assign(shadow[2], BASE.S7);
  assign(shadow[3], BASE.S8);
  for (const f of FUNCTION_ORDER) latent[f] = (latent[f] ?? 0) + gauss(rng) * personNoise;
  return latent;
}

function simulateAnswers(latent, rng, { bias = 0, itemNoise = 0.78 } = {}) {
  return QUESTIONS.map((q) => {
    const v = 2 + 0.92 * (latent[q.fn] ?? 0) + bias + gauss(rng) * itemNoise;
    return Math.max(0, Math.min(4, Math.round(v)));
  });
}

function pearsonPairs(pairs) {
  const n = pairs.length;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (const [a, b] of pairs) {
    const x = a - ma;
    const y = b - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / (Math.sqrt(da * db) || 1);
}

function cronbachAlpha(matrix) {
  // matrix: respondents × items
  const k = matrix[0].length;
  const itemVar = [];
  for (let j = 0; j < k; j += 1) {
    const col = matrix.map((row) => row[j]);
    const m = col.reduce((a, b) => a + b, 0) / col.length;
    itemVar.push(col.reduce((a, b) => a + (b - m) ** 2, 0) / col.length);
  }
  const totals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const mt = totals.reduce((a, b) => a + b, 0) / totals.length;
  const totalVar = totals.reduce((a, b) => a + (b - mt) ** 2, 0) / totals.length;
  return (k / (k - 1)) * (1 - itemVar.reduce((a, b) => a + b, 0) / totalVar);
}

function runScenario(name, { rounds = 4000, seed = 20261127, personNoise = 0.42, itemNoise = 0.78, biasSd = 0.26, strategy = 'template' } = {}) {
  const rng = mulberry32(seed);
  const perType = { total: {}, correct: {} };
  for (const t of TYPE_LIST) { perType.total[t] = 0; perType.correct[t] = 0; }
  let exact = 0;
  let top3 = 0;
  let bothAgree = 0;
  const confusions = new Map();
  const fnPairs = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, []]));
  const itemMatrix = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, []]));

  for (let i = 0; i < rounds; i += 1) {
    const trueType = TYPE_LIST[Math.floor(rng() * TYPE_LIST.length)];
    const latent = makeLatent(trueType, rng, personNoise);
    const bias = gauss(rng) * biasSd;
    const answers = simulateAnswers(latent, rng, { bias, itemNoise });
    const result = evaluate(answers, { strategy });
    if (result.letter.code === result.fits[0]?.code) bothAgree += 1;

    perType.total[trueType] += 1;
    if (result.type === trueType) {
      exact += 1;
      perType.correct[trueType] += 1;
    } else {
      const key = `${trueType}→${result.type}`;
      confusions.set(key, (confusions.get(key) || 0) + 1);
    }
    if (result.fits.slice(0, 3).some((f) => f.code === trueType)) top3 += 1;

    for (const f of FUNCTION_ORDER) {
      const items = QUESTIONS.filter((q) => q.fn === f);
      fnPairs[f].push([result.scores[f].pct, latent[f]]);
      itemMatrix[f].push(items.map((q) => 4 - (answers[QUESTIONS.indexOf(q)] ?? 0)));
    }
  }

  const fnCorr = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, pearsonPairs(fnPairs[f])]));
  const alpha = Object.fromEntries(FUNCTION_ORDER.map((f) => [f, cronbachAlpha(itemMatrix[f])]));
  const recall = Object.fromEntries(TYPE_LIST.map((t) => [t, perType.total[t] ? perType.correct[t] / perType.total[t] : 0]));
  const topConfusions = [...confusions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  console.log(`\n=== ${name} ===`);
  console.log(`样本: ${rounds}  策略: ${strategy}`);
  console.log(`类型完全命中: ${(exact / rounds * 100).toFixed(1)}%   真实类型在前三: ${(top3 / rounds * 100).toFixed(1)}%   字母法与模板法一致: ${(bothAgree / rounds * 100).toFixed(1)}%`);
  console.log(`八维得分与潜在强度相关: ${FUNCTION_ORDER.map((f) => `${f} ${fnCorr[f].toFixed(2)}`).join('  ')}`);
  console.log(`平均相关: ${(FUNCTION_ORDER.reduce((s, f) => s + fnCorr[f], 0) / 8).toFixed(3)}`);
  console.log(`内部一致性 α: ${FUNCTION_ORDER.map((f) => `${f} ${alpha[f].toFixed(2)}`).join('  ')}`);
  console.log(`各型召回: ${TYPE_LIST.map((t) => `${t} ${(recall[t] * 100).toFixed(0)}%`).join(' ')}`);
  console.log('主要混淆:', topConfusions.map(([k, v]) => `${k} ${(v / rounds * 100).toFixed(1)}%`).join('  '));
  return { exact: exact / rounds, top3: top3 / rounds, fnCorr, alpha, recall };
}

function strategyCompare() {
  console.log('\n########## 策略对比（普通噪声） ##########');
  for (const strategy of ['letter', 'template', 'hybrid']) {
    runScenario(`策略 ${strategy}`, { rounds: 3000, strategy });
  }
}

function weightSearch() {
  console.log('\n########## 模板权重粗搜索（hybrid） ##########');
  const grid = [];
  for (const I of [-0.3, -0.42, -0.55]) {
    for (const S8 of [-0.12, -0.22, -0.32]) {
      for (const S5 of [-0.05, -0.12, -0.2]) {
        grid.push({ ...DEFAULT_WEIGHTS, I, S8, S5 });
      }
    }
  }
  let best = null;
  for (const w of grid) {
    const rng = mulberry32(777);
    let exact = 0;
    const rounds = 1200;
    for (let i = 0; i < rounds; i += 1) {
      const t = TYPE_LIST[Math.floor(rng() * TYPE_LIST.length)];
      const latent = makeLatent(t, rng, 0.42);
      const answers = simulateAnswers(latent, rng, { bias: gauss(rng) * 0.26 });
      const res = evaluate(answers, { strategy: 'hybrid', weights: w });
      if (res.type === t) exact += 1;
    }
    const acc = exact / rounds;
    if (!best || acc > best.acc) best = { acc, w };
  }
  console.log('最佳权重', JSON.stringify(best.w), '准确率', (best.acc * 100).toFixed(1) + '%');
}

console.log('题库题量:', QUESTIONS.length, '各功能题量:', FUNCTION_ORDER.map((f) => `${f}:${QUESTIONS.filter((q) => q.fn === f).length}`).join(' '));
runScenario('理想作答（低噪声）', { rounds: 4000, personNoise: 0.18, itemNoise: 0.45, biasSd: 0.12 });
runScenario('普通作答（主要指标）', { rounds: 6000, personNoise: 0.42, itemNoise: 0.78, biasSd: 0.26 });
runScenario('随意作答（高噪声）', { rounds: 4000, personNoise: 0.7, itemNoise: 1.1, biasSd: 0.4 });
strategyCompare();
weightSearch();
