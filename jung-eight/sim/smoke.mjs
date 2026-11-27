// 无浏览器环境下的模板渲染冒烟测试
// 用法：node sim/smoke.mjs /result
const route = process.argv[2] || '/';

const answers = new Array(60).fill(null).map((_, i) => (i % 5));
const partial = new Array(60).fill(null).map((_, i) => (i < 20 ? i % 5 : null));
const store = new Map();
if (route === '/result') {
  store.set('jung8.answers.v1', JSON.stringify(answers));
  store.set('jung8.index.v1', '12');
}
if (route === '/test') {
  store.set('jung8.answers.v1', JSON.stringify(partial));
  store.set('jung8.index.v1', '12');
}

const appEl = {
  innerHTML: '',
  querySelector: () => null,
  querySelectorAll: () => [],
  focus: () => {},
};
const toastEl = {
  textContent: '',
  classList: { add: () => {}, remove: () => {} },
};

globalThis.document = {
  getElementById: (id) => (id === 'app' ? appEl : id === 'toast' ? toastEl : null),
  querySelectorAll: () => [],
  addEventListener: () => {},
};
globalThis.window = globalThis;
globalThis.location = { hash: `#${route}` };
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
if (process.env.NO_STORAGE) {
  globalThis.localStorage = {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
    removeItem: () => { throw new Error('storage blocked'); },
  };
}
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, configurable: true });
globalThis.requestAnimationFrame = (cb) => cb();
globalThis.scrollTo = () => {};
globalThis.addEventListener = () => {};
globalThis.confirm = () => true;

await import('../public/assets/js/app.js');

const html = appEl.innerHTML;
const checks = {
  '/': ['荣格八维', 'wheel-card', '八维不是八个标签'],
  '/test': ['QUESTION', 'option', '进度已自动保存'],
  '/result': ['八维雷达', 'bar-row', '次选的类型'],
  '/result?demo': ['示例结果', '八维雷达', '开始我的测试'],
  '/types': ['十六型人格图鉴', 'type-card', '外交家'],
  '/type/INTJ': ['认知功能栈', 'Ni', '成长建议'],
  '/about': ['模拟验证', '81.0%', '理论来源'],
};
const expected = checks[route] || [];
const missing = expected.filter((s) => !html.includes(s));
console.log('route', route, 'length', html.length, 'undefined?', html.includes('undefined'), 'NaN?', html.includes('NaN'));
console.log('missing markers:', missing.length ? missing : 'none');
if (html.includes('undefined') || html.includes('NaN') || missing.length) process.exitCode = 1;
