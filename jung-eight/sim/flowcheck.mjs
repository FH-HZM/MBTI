// 用 jsdom 跑关键答题流程：80 题 -> 结果页；进度保存与 URL 兜底
// 运行：node sim/flowcheck.mjs 1|2|3|4
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
  window, document: window.document, location: window.location,
  localStorage: window.localStorage, HTMLElement: window.HTMLElement,
  Node: window.Node, requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  getComputedStyle: window.getComputedStyle.bind(window),
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });

const TOTAL = 80;
const answers = new Array(TOTAL).fill(2);

if (testCase === '1') {
  // 已答 79 题，从第 80 题开始，答完进结果页，可返回上一题
  answers[79] = null;
  localStorage.setItem('jung8.v5.answers', JSON.stringify(answers));
  localStorage.setItem('jung8.v5.index', '79');
  window.location.hash = '#/test';
} else if (testCase === '2') {
  // 全部完成，首页显示"查看我的结果"
  localStorage.setItem('jung8.v5.answers', JSON.stringify(answers));
  localStorage.setItem('jung8.v5.index', String(TOTAL));
} else if (testCase === '3') {
  // 答了一半，首页显示继续，点击后跳到第一道未答题
  for (let i = 40; i < TOTAL; i += 1) answers[i] = null;
  localStorage.setItem('jung8.v5.answers', JSON.stringify(answers));
  localStorage.setItem('jung8.v5.index', '40');
} else if (testCase === '4') {
  // 模拟微信清掉 localStorage：仅靠 URL hash 片段恢复到第 41 题
  localStorage.clear();
  const payload = '5' + (40).toString(36).padStart(2, '0') + '2'.repeat(40) + 'n'.repeat(40);
  window.location.hash = '#/test?d=' + payload;
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

await import(pathToFileURL(resolve('public/assets/js/app.js')).href + '?case=' + testCase);
await wait(40);

if (testCase === '1') {
  assert(text().includes('第 80 / 80 题'), '从第 80 题开始');
  click('.option[data-value="3"]');
  await wait(340);
  assert(location.hash === '#/result', '答完第 80 题进入结果页');
  assert(text().includes('八维雷达'), '结果页显示雷达');
  assert(text().includes('/ 40 分'), '每维显示原始分（满分 40）');
  assert(!text().includes('功能对照'), '不再出现对照题');
} else if (testCase === '2') {
  assert(text().includes('查看我的结果'), '全部完成后首页显示查看结果');
  click('[data-result]');
  await wait(60);
  assert(text().includes('八维雷达'), '可进入结果页');
} else if (testCase === '3') {
  assert(text().includes('继续测试（已答 40 / 80 题）'), '首页显示继续测试');
  click('[data-start]');
  await wait(60);
  assert(text().includes('第 41 / 80 题'), '从第一道未答题继续');
  click('#prev-btn');
  await wait(40);
  assert(text().includes('第 40 / 80 题'), '可以返回上一题修改');
} else if (testCase === '4') {
  assert(text().includes('第 41 / 80 题'), '仅凭 URL 片段恢复第 41 题');
  click('.option[data-value="1"]');
  await wait(340);
  assert(location.hash.includes('?d='), '答题后进度写入 URL 片段');
  assert(localStorage.getItem('jung8.v5.answers'), '进度同时写回 localStorage');
  assert(text().includes('第 42 / 80 题'), '答完后前进到第 42 题');
}
console.log('CASE', testCase, 'OK');
