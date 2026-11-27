// 将首页渲染结果写入 index.html，保证静态首屏与部署截图可见
import fs from 'node:fs';

const appEl = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [], focus: () => {} };
const toastEl = { textContent: '', classList: { add: () => {}, remove: () => {} } };
const store = new Map();

globalThis.document = {
  getElementById: (id) => (id === 'app' ? appEl : id === 'toast' ? toastEl : null),
  querySelectorAll: () => [],
  addEventListener: () => {},
};
globalThis.window = globalThis;
globalThis.location = { hash: '#/' };
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, configurable: true });
globalThis.requestAnimationFrame = (cb) => cb();
globalThis.scrollTo = () => {};
globalThis.addEventListener = () => {};
globalThis.confirm = () => false;

await import('../public/assets/js/app.js');

const home = appEl.innerHTML;
const indexUrl = new URL('../public/index.html', import.meta.url);
let html = fs.readFileSync(indexUrl, 'utf8');
const start = html.indexOf('<main id="app"');
if (start < 0) throw new Error('main#app not found');
const openEnd = html.indexOf('>', start) + 1;
const close = html.indexOf('</main>', openEnd);
if (close < 0) throw new Error('</main> not found');
const noscript = '<noscript><div class="noscript-tip">你的浏览器未启用 JavaScript，答题功能无法使用。请开启 JavaScript 后刷新页面。</div></noscript>';
html = `${html.slice(0, openEnd)}\n${home}\n${noscript}\n${html.slice(close)}`;
fs.writeFileSync(indexUrl, html);
console.log('prerendered home bytes:', home.length, 'index bytes:', html.length);
