// 用 jsdom 跑关键答题流程：60 题 -> 9 组对照 -> 结果
// 运行：node sim/flowcheck.mjs 1|2|3
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const testCase = process.argv[2] || '1';
const html = readFileSync(resolve('public/index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.test/', pretendToBeVisual: true });
const { window } = dom;
window.scrollTo = () => {};
window.confirm = () => true;

for (const [key, value] of Object.entries({
  window,
  document: window.document,
  location: window.location,
  localStorage: window.localStorage,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  getComputedStyle: window.getComputedStyle.bind(window),
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });

const answers = new Array(60).fill(2);
const pairs = new Array(9).fill(null);

if (testCase === '1') {
  answers[59] = null;
  localStorage.setItem('jung8.answers.v1', JSON.stringify(answers));
  localStorage.setItem('jung8.pairs.v1', JSON.stringify(pairs));
  localStorage.setItem('jung8.index.v1', '59');
  localStorage.setItem('jung8.version', '3');
} else if (testCase === '2') {
  pairs.fill(1);
  localStorage.setItem('jung8.answers.v1', JSON.stringify(answers));
  localStorage.setItem('jung8.pairs.v1', JSON.stringify(pairs));
  localStorage.setItem('jung8.index.v1', '60');
  localStorage.setItem('jung8.version', '3');
} else if (testCase === '3') {
  // 旧版数据：没有 version 标记，v3 应全量清空，从第 1 题重新开始
  localStorage.setItem('jung8.answers.v1', JSON.stringify(answers));
  localStorage.setItem('jung8.pairs.v1', JSON.stringify(pairs));
  localStorage.setItem('jung8.index.v1', '60');
} else if (testCase === '4') {
  // 新版 60 题已完成，但还没做 9 组对照
  localStorage.setItem('jung8.answers.v1', JSON.stringify(answers));
  localStorage.setItem('jung8.pairs.v1', JSON.stringify(pairs));
  localStorage.setItem('jung8.index.v1', '60');
  localStorage.setItem('jung8.version', '3');
} else {
  // 模拟微信清掉 localStorage：只靠地址栏片段恢复
  localStorage.clear();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => window.document.getElementById('app').textContent.replace(/\s+/g, ' ');
const click = (sel) => {
  const el = window.document.querySelector(sel);
  if (!el) throw new Error(`not found: ${sel}`);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return el;
};
const assert = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); console.log('PASS:', msg); };

const appUrl = pathToFileURL(resolve('public/assets/js/app.js')).href + '?case=' + testCase;
if (testCase === '5') {
  const payload = '3' + (30).toString(36).padStart(2, '0') + '2'.repeat(30) + 'n'.repeat(30) + 'n'.repeat(9);
  window.location.hash = '#/test?d=' + payload;
} else if (testCase === '1' || testCase === '2') {
  window.location.hash = '#/test';
}
await import(appUrl);
await wait(30);

if (testCase === '1') {
  assert(text().includes('第 60 / 60 题'), '从第 60 题开始');
  click('.option[data-value="2"]');
  await wait(320);
  assert(text().includes('功能对照 1 / 9'), '答完第 60 题后进入功能对照');
  click('#prev-btn');
  await wait(30);
  assert(text().includes('第 60 / 60 题'), '对照第 1 题可以返回第 60 题');
  click('.option[data-value="2"]');
  await wait(320);
  assert(text().includes('功能对照 1 / 9'), '再次答完第 60 题回到对照第 1 题');
  for (let i = 0; i < 9; i += 1) {
    assert(text().includes(`功能对照 ${i + 1} / 9`), `显示功能对照 ${i + 1}/9`);
    click('.option[data-pair-value="0"]');
    await wait(320);
  }
  await wait(120);
  assert(location.hash === '#/result', '完成 9 组对照后进入结果页');
  assert(text().includes('八维雷达') && text().includes('对照校准 9/9'), '结果页显示雷达与对照校准标记');
  assert(!text().includes('还差'), '结果页不是未完成提示');
} else if (testCase === '2') {
  assert(text().includes('60 题 + 9 组对照已完成'), '全部完成后显示完成页');
  click('[data-result]');
  await wait(120);
  assert(text().includes('八维雷达') && text().includes('对照校准 9/9'), '完成页可以进入结果页');
} else if (testCase === '3') {
  const t = text();
  assert(t.includes('开始测试'), 'v3 全量清空后显示开始测试');
  assert(!t.includes('共 45 题已完成') && !t.includes('还差 9 组功能对照'), '不再保留旧版部分进度');
  click('[data-start]');
  await wait(120);
  assert(text().includes('第 1 / 60 题'), '旧版数据从第 1 题重新开始');
} else if (testCase === '4') {
  const t = text();
  assert(t.includes('还差 9 组功能对照'), '新版 60 题完成后提示补做对照');
  assert(t.includes('继续功能对照'), '首页按钮显示继续功能对照');
  click('[data-start]');
  await wait(120);
  assert(text().includes('功能对照 1 / 9'), '点击继续后直达对照第 1 题');
} else {
  assert(text().includes('第 31 / 60 题'), '仅凭 URL 片段恢复第 31 题');
  click('.option[data-value="1"]');
  await wait(320);
  assert(location.hash.includes('?d=3'), '答题后进度写入 URL 片段');
  assert(localStorage.getItem('jung8.answers.v1'), '进度同时写回 localStorage');
}
console.log('CASE', testCase, 'OK');
