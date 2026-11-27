import { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, SCALE, MAX_RAW_PER_FUNCTION } from './questions.js';
import { TYPES, TYPE_LIST, FAMILIES } from './types.js';
import { evaluate } from './engine.js';
import { avatarSVG } from './avatars.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

// v5：80 题独立计分版。使用全新的 storage key，与历史版本完全隔离，始终全新开始。
const LS_ANSWERS = 'jung8.v5.answers';
const LS_INDEX = 'jung8.v5.index';
const PROGRESS_VERSION = '5';
const PROGRESS_PARAM = 'd';
const TOTAL = QUESTIONS.length; // 80

/* ================= 存储与进度（localStorage + URL hash 双保险） ================= */

function storageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function storageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 隐私模式等场景下静默失败，URL 兜底 */ } }

function loadAnswers() {
  try {
    const arr = JSON.parse(storageGet(LS_ANSWERS) || 'null');
    if (Array.isArray(arr) && arr.length === TOTAL) return arr;
  } catch { /* ignore */ }
  return new Array(TOTAL).fill(null);
}
function loadIndex() {
  const n = parseInt(storageGet(LS_INDEX) || '0', 10);
  return Number.isInteger(n) && n >= 0 && n <= TOTAL ? n : 0;
}

// 编码：版本(1位) + index(2位36进制) + 80题答案(0-4 或 n)
function progressPayload() {
  const answersPart = state.answers.map((v) => (typeof v === 'number' ? String(v) : 'n')).join('');
  return PROGRESS_VERSION + state.index.toString(36).padStart(2, '0') + answersPart;
}
function decodeProgress(str) {
  if (!str || str[0] !== PROGRESS_VERSION) return null;
  const need = 3 + TOTAL;
  if (str.length < need) return null;
  const index = parseInt(str.slice(1, 3), 36);
  if (!Number.isInteger(index) || index < 0 || index > TOTAL) return null;
  const answers = [];
  for (let i = 0; i < TOTAL; i += 1) {
    const ch = str[3 + i];
    answers.push(ch === 'n' ? null : Number(ch));
  }
  return { index, answers };
}
function readProgressFromURL() {
  const raw = location.hash || '';
  const q = raw.indexOf('?');
  if (q < 0) return null;
  // 手动 split，不用 URLSearchParams（hash 内参数在某些 WebView 下解析有兼容问题）
  for (const part of raw.slice(q + 1).split('&')) {
    if (part.startsWith(PROGRESS_PARAM + '=')) {
      return decodeProgress(part.slice(2));
    }
  }
  return null;
}
function syncProgressToURL() {
  if (state.view !== 'test' && state.view !== 'result') return;
  const base = state.view === 'result' ? '#/result' : '#/test';
  const url = `${location.pathname}${location.search}${base}?${PROGRESS_PARAM}=${progressPayload()}`;
  try { history.replaceState(null, '', url); } catch { /* ignore */ }
}
function saveProgress() {
  storageSet(LS_ANSWERS, JSON.stringify(state.answers));
  storageSet(LS_INDEX, String(state.index));
  syncProgressToURL();
}
function saveOnHide() { saveProgress(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) saveOnHide(); });
window.addEventListener('pagehide', saveOnHide);
window.addEventListener('beforeunload', saveOnHide);

/* ================= 状态 ================= */

const restored = readProgressFromURL();

const state = {
  answers: restored ? restored.answers : loadAnswers(),
  index: restored ? restored.index : loadIndex(),
  view: 'home',
  typeCode: null, // 十六型总览点进来的详情页
  locked: false,
  timer: null,
};
if (restored) saveProgress(); // 从 URL 恢复后立即写回 localStorage

function answeredCount() { return state.answers.filter((v) => typeof v === 'number').length; }
function firstUnanswered() {
  const i = state.answers.findIndex((v) => typeof v !== 'number');
  return i < 0 ? TOTAL : i;
}
function isComplete() { return answeredCount() === TOTAL; }

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(state.timer);
  state.timer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ================= 路由 ================= */

function route() {
  const hash = location.hash || '#/';
  const path = hash.split('?')[0];
  if (path.startsWith('#/test')) {
    if (isComplete()) { state.view = 'result'; }
    else {
      state.view = 'test';
      if (state.index >= TOTAL) state.index = firstUnanswered();
    }
  } else if (path.startsWith('#/result')) {
    if (!isComplete()) { state.view = 'home'; }
    else state.view = 'result';
  } else if (path.startsWith('#/type/')) {
    const code = path.slice(7).toUpperCase();
    if (TYPES[code]) { state.view = 'type'; state.typeCode = code; }
    else state.view = 'types';
  } else if (path.startsWith('#/types')) {
    state.view = 'types';
  } else if (path.startsWith('#/about')) {
    state.view = 'about';
  } else {
    state.view = 'home';
  }
  render();
  syncProgressToURL();
}
window.addEventListener('hashchange', route);

/* ================= 视图 ================= */

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function topbar(active) {
  return `<header class="topbar">
    <div class="logo">八</div>
    <div class="brand">八维人格</div>
    <nav>
      <button data-nav="#/" class="${active === 'home' ? 'active' : ''}">首页</button>
      <button data-nav="#/test" class="${active === 'test' ? 'active' : ''}">${isComplete() ? '我的结果' : '开始测试'}</button>
      <button data-nav="#/types" class="${active === 'types' || active === 'type' ? 'active' : ''}">十六型人格</button>
    </nav>
  </header>`;
}

function homeView() {
  const done = answeredCount();
  const complete = isComplete();
  let cta;
  if (complete) {
    cta = `<button class="btn" data-result>查看我的结果</button>
           <button class="btn ghost" data-restart>重新测试</button>`;
  } else if (done > 0) {
    cta = `<button class="btn" data-start>继续测试（已答 ${done} / ${TOTAL} 题）</button>
           <button class="btn ghost" data-restart>从头开始</button>`;
  } else {
    cta = `<button class="btn" data-start>开始测试</button>`;
  }
  return `${topbar('home')}
    <section class="card hero">
      <div class="glyph">☯</div>
      <h1>荣格八维人格测试</h1>
      <p>${TOTAL} 道行为频率题，测量你在八个认知功能上的真实使用程度，再匹配最契合的十六型人格。</p>
      <div class="badges">
        <span class="badge">约 12 分钟</span>
        <span class="badge">每维 10 题 · 独立计分</span>
        <span class="badge">进度自动保存</span>
      </div>
      <div class="fn-strip">${FUNCTION_ORDER.map((f) => `<div class="fn-dot" style="background:${FUNCTIONS[f].color}" title="${FUNCTIONS[f].name}">${f}</div>`).join('')}</div>
    </section>
    <section class="card">
      ${cta}
      <p class="note">八个维度各自独立累计得分，互不影响——Ne 和 Ni 完全可以双高。</p>
      <p class="note">结果仅供自我探索参考，不构成心理学诊断。<button class="link-btn" data-nav="#/about">了解测试原理与隐私说明 →</button></p>
    </section>`;
}

function testView() {
  const i = Math.min(state.index, TOTAL - 1);
  const q = QUESTIONS[i];
  const cur = state.answers[i];
  const done = answeredCount();
  const pct = Math.round((done / TOTAL) * 100);
  return `${topbar('test')}
    <section class="card">
      <div class="progress-row">
        <button class="link-btn" data-exit>← 退出，进度自动保存</button>
      </div>
      <div class="progress-row">
        <span class="step">第 ${i + 1} / ${TOTAL} 题</span>
        <span class="hint">${done === 0 ? '刚开始，跟着第一反应走就好。' : `已完成 ${pct}%`}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="q-kicker">QUESTION ${String(i + 1).padStart(2, '0')} · 想想过去半年</div>
      <h2 class="q-text">${esc(q.text)}</h2>
      <p class="q-sub">按第一反应选择，不必反复斟酌。</p>
      <div class="options">
        ${SCALE.map((s) => `
          <button class="option ${cur === s.value ? 'selected' : ''}" data-value="${s.value}">
            <span class="key">${s.value + 1}</span>
            <span><span class="label">${s.label}</span> <span class="desc">${s.hint}</span></span>
          </button>`).join('')}
      </div>
      <div class="q-footer">
        <button class="link-btn" id="prev-btn" ${i === 0 ? 'disabled' : ''}>← 上一题</button>
        <span class="save-hint">进度已自动保存</span>
      </div>
      <p class="kbd-hint">快捷键 1–5 可快速作答 · 题目不评价能力高低，只测量你更常使用的认知方式。</p>
    </section>`;
}

// 雷达图：八维相对强度可视化（仅展示用；分数本身以原始分为准）
function radarSVG(rel) {
  const size = 300, cx = size / 2, cy = size / 2, R = 100;
  const N = FUNCTION_ORDER.length;
  const point = (idx, r) => {
    const angle = (Math.PI * 2 * idx) / N - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const rings = [0.33, 0.66, 1].map((ratio) => {
    const pts = FUNCTION_ORDER.map((_, idx) => point(idx, R * ratio).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="#e7e2da" stroke-width="1"/>`;
  }).join('');
  const axes = FUNCTION_ORDER.map((f, idx) => {
    const [x, y] = point(idx, R);
    const [lx, ly] = point(idx, R + 26);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e7e2da"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700" fill="${FUNCTIONS[f].color}">${f}</text>`;
  }).join('');
  const valuePts = FUNCTION_ORDER.map((f, idx) => point(idx, (R * rel[f]) / 100).join(',')).join(' ');
  const dots = FUNCTION_ORDER.map((f, idx) => {
    const [x, y] = point(idx, (R * rel[f]) / 100);
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="${FUNCTIONS[f].color}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="300" height="300" role="img" aria-label="八维雷达图">
    ${rings}${axes}
    <polygon points="${valuePts}" fill="rgba(31,169,122,.18)" stroke="#1fa97a" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

function resultView() {
  const res = evaluate(state.answers);
  const t = res.typeData;
  const fam = FAMILIES[t.family];
  const stackNames = t.stack.map((f, i) => `${['主导', '辅助', '第三', '劣势'][i]} ${f}`).join(' · ');
  return `${topbar('test')}
    <section class="card result-head">
      ${avatarSVG(t.code, t.family, 132)}
      <div class="kicker">YOUR COGNITIVE TYPE · 八维类型</div>
      <div class="type-code">${t.code}</div>
      <div class="type-name">${t.name} · ${t.alias}</div>
      <div class="type-tagline">${t.tagline}</div>
      <p class="type-match">与你的八维曲线契合度 <strong>${res.match}%</strong> · 主导功能 ${FUNCTIONS[res.leadingFunction].key}（${FUNCTIONS[res.leadingFunction].name}）</p>
      <div class="chips">
        <span class="chip solid">${fam.name} · ${fam.en}</span>
        <span class="chip">主导 ${res.typeData.stack[0]} · ${FUNCTIONS[res.typeData.stack[0]].nick}</span>
        <span class="chip">清晰度 ${res.clarity}</span>
      </div>
    </section>

    <section class="card">
      <h3 class="section-title">八维雷达</h3>
      <p class="section-sub">相对强度 · 越靠外越常用</p>
      <div class="radar-wrap">${radarSVG(res.rel)}</div>
      <div class="score-list">
        ${res.ranking.map((f) => {
          const s = res.scores[f];
          return `<div class="score-row">
            <span class="fn" style="color:${FUNCTIONS[f].color}">${f}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${s.pct}%;background:${FUNCTIONS[f].color}"></div></div>
            <span class="val">${s.raw} / ${MAX_RAW_PER_FUNCTION} 分</span>
          </div>`;
        }).join('')}
      </div>
      <p class="note">每维 10 题独立累计（满分 ${MAX_RAW_PER_FUNCTION}），原始分即绝对使用频率，不做相互抵消。</p>
    </section>

    <section class="card">
      <h3 class="section-title">你的功能栈</h3>
      <p class="section-sub">${t.code} 的认知功能排列</p>
      <div class="stack-list">
        ${t.stack.map((f, i) => `<div class="stack-item">
          <span class="role">${['主导', '辅助', '第三', '劣势'][i]}</span>
          <span class="fn-name" style="color:${FUNCTIONS[f].color}">${f} ${FUNCTIONS[f].name}</span>
        </div>`).join('')}
      </div>
      <p class="note" style="text-align:left;margin-top:14px">${t.dominant}</p>
    </section>

    <section class="card prose">
      <h3 class="section-title" style="margin-bottom:12px">你是这样的人</h3>
      <p>${t.summary}</p>
      <div class="scene-box">${t.scene}</div>
    </section>

    <section class="card">
      <h3 class="section-title" style="margin-bottom:12px">优势</h3>
      <ul class="bullet-list">${t.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
      <h3 class="section-title" style="margin:20px 0 12px">容易踩的坑</h3>
      <ul class="bullet-list">${t.blindspots.map((s) => `<li>${s}</li>`).join('')}</ul>
    </section>

    <section class="card prose">
      <h3 class="section-title" style="margin-bottom:12px">工作与关系</h3>
      <p><strong>工作：</strong>${t.work}</p>
      <p><strong>亲密关系：</strong>${t.love}</p>
      <h3 class="section-title" style="margin:18px 0 12px">三个成长建议</h3>
      <ul class="bullet-list">${t.growth.map((s) => `<li>${s}</li>`).join('')}</ul>
      <p class="note" style="text-align:left;margin-top:16px">常被拿来举例的同类型人物：${t.examples}</p>
    </section>

    <section class="card">
      <h3 class="section-title" style="margin-bottom:12px">次契合的类型</h3>
      <div class="chips" style="justify-content:flex-start">
        ${res.fits.slice(1, 4).map((f) => `<button class="chip" data-nav="#/type/${f.code}">${f.code} · ${f.fit}%</button>`).join('')}
      </div>
      <p class="note" style="text-align:left">如果你的自感与结果不同，可以看看这几个邻近类型；八维是连续谱，边界附近的判定本来就有弹性。</p>
    </section>

    <button class="btn" data-share>复制结果</button>
    <button class="btn secondary" data-restart>重新测试</button>
    <p class="note">${stackNames}</p>`;
}

function typesView() {
  const famKeys = ['analyst', 'diplomat', 'sentinel', 'explorer'];
  return `${topbar('types')}
    <section class="card" style="padding-bottom:14px">
      <h2 class="section-title">十六型人格总览</h2>
      <p class="section-sub">点击任意类型，查看功能栈与画像</p>
    </section>
    ${famKeys.map((fk) => {
      const fam = FAMILIES[fk];
      const cells = TYPE_LIST.filter((c) => TYPES[c].family === fk).map((c) => {
        const t = TYPES[c];
        return `<button class="type-cell" data-nav="#/type/${c}">
          <span class="code" style="color:${fam.color}">${c}</span>
          <span class="name">${t.name} · ${t.alias}</span>
          <span class="tag">${t.stack.join(' → ')}</span>
        </button>`;
      }).join('');
      return `<h3 class="family-head"><span class="dot" style="background:${fam.color}"></span>${fam.name} ${fam.en}<span style="font-weight:400;font-size:12px;color:var(--ink-faint)">${fam.desc}</span></h3>
        <div class="type-grid">${cells}</div>`;
    }).join('')}`;
}

function typeDetailView() {
  const t = TYPES[state.typeCode];
  const fam = FAMILIES[t.family];
  return `${topbar('types')}
    <section class="card result-head">
      ${avatarSVG(t.code, t.family, 120)}
      <div class="type-code" style="font-size:42px">${t.code}</div>
      <div class="type-name">${t.name} · ${t.alias} · ${fam.name}</div>
      <div class="type-tagline">${t.tagline}</div>
    </section>
    <section class="card">
      <h3 class="section-title" style="margin-bottom:12px">功能栈</h3>
      <div class="stack-list">
        ${t.stack.map((f, i) => `<div class="stack-item">
          <span class="role">${['主导', '辅助', '第三', '劣势'][i]}</span>
          <span class="fn-name" style="color:${FUNCTIONS[f].color}">${f} ${FUNCTIONS[f].name}</span>
          <span class="desc">${FUNCTIONS[f].nick}</span>
        </div>`).join('')}
      </div>
      <p class="note" style="text-align:left;margin-top:14px">${t.dominant}</p>
    </section>
    <section class="card prose">
      <p>${t.summary}</p>
      <div class="scene-box">${t.scene}</div>
      <p style="margin-top:14px"><strong>工作：</strong>${t.work}</p>
      <p><strong>亲密关系：</strong>${t.love}</p>
    </section>
    <section class="card">
      <h3 class="section-title" style="margin-bottom:12px">优势</h3>
      <ul class="bullet-list">${t.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
      <h3 class="section-title" style="margin:20px 0 12px">容易踩的坑</h3>
      <ul class="bullet-list">${t.blindspots.map((s) => `<li>${s}</li>`).join('')}</ul>
      <h3 class="section-title" style="margin:20px 0 12px">成长建议</h3>
      <ul class="bullet-list">${t.growth.map((s) => `<li>${s}</li>`).join('')}</ul>
    </section>
    <button class="btn secondary" data-nav="#/types">← 返回十六型总览</button>`;
}

function aboutView() {
  return `${topbar('home')}
    <section class="card about">
      <h2>测试原理</h2>
      <p>本测试基于荣格的心理类型理论及后续的八功能模型（Beebe 的功能位置理论、Nardi 的脑成像研究），测量八个认知功能：<strong>Ne 外倾直觉、Ni 内倾直觉、Se 外倾感觉、Si 内倾感觉、Te 外倾思考、Ti 内倾思考、Fe 外倾情感、Fi 内倾情感</strong>。</p>
      <h2>计分方式</h2>
      <ul>
        <li>共 ${TOTAL} 题，每个功能各 10 题，按行为频率 0–4 分作答。</li>
        <li><strong>每个维度独立累计得分</strong>（满分 ${MAX_RAW_PER_FUNCTION}），维度之间互不影响。这符合八功能各自独立发展的现代观点——Ne 高不意味着 Ni 低，双高完全正常。</li>
        <li>不使用强制二选一的对照题，避免人为制造功能间的此消彼长。</li>
        <li>十六型判定：将你的八维剖面与 16 个认知功能栈模板做相关性匹配，取最契合者。判型只读取分数，不回写修改分数。</li>
      </ul>
      <h2>如何理解结果</h2>
      <ul>
        <li>八维原始分是绝对使用频率；雷达图另做了相对归一化，方便看形状。</li>
        <li>八个功能每个人都会用，分数反映的是"多常用"，不是"会不会"。</li>
        <li>人格是连续的，若两个类型契合度接近，说明你处在边界附近，两个都值得读。</li>
      </ul>
      <h2>隐私说明</h2>
      <p>所有作答只保存在你自己的设备上（localStorage），不会上传到任何服务器。为防微信等内置浏览器清理缓存导致进度丢失，进度同时也会编码进地址栏 # 后的片段中（同样不发送到服务器）。<strong>注意：如果你把带进度的链接分享给别人，对方能看到你的答题进度。</strong></p>
      <h2>免责声明</h2>
      <p>本测试为自我探索工具，结果仅供娱乐与参考，不构成临床心理学诊断或职业决策依据。</p>
    </section>
    <button class="btn secondary" data-nav="#/">← 返回首页</button>`;
}

/* ================= 渲染与事件 ================= */

function render() {
  const views = { home: homeView, test: testView, result: resultView, types: typesView, type: typeDetailView, about: aboutView };
  app.innerHTML = views[state.view]();
  window.scrollTo(0, 0);
}

function answer(value) {
  if (state.locked || state.view !== 'test') return;
  state.locked = true;
  state.answers[state.index] = value;
  saveProgress();
  // 先渲染选中态，短暂停顿后自动前进（最后一题则进结果页）
  render();
  setTimeout(() => {
    state.locked = false;
    if (state.index >= TOTAL - 1) {
      state.index = TOTAL;
      if (isComplete()) {
        location.hash = '#/result';
      } else {
        // 还有漏答（例如跳题回来），跳到第一道未答题
        state.index = firstUnanswered();
        saveProgress();
        render();
        toast('还有未作答的题，已帮你跳过去');
      }
    } else {
      state.index += 1;
      saveProgress();
      render();
    }
  }, 280);
}

app.addEventListener('click', (e) => {
  const navEl = e.target.closest('[data-nav]');
  if (navEl) { location.hash = navEl.dataset.nav; return; }

  const optEl = e.target.closest('.option[data-value]');
  if (optEl) { answer(Number(optEl.dataset.value)); return; }

  if (e.target.closest('[data-start]')) {
    state.index = Math.min(firstUnanswered(), TOTAL - 1);
    location.hash = '#/test';
    return;
  }
  if (e.target.closest('[data-result]')) { location.hash = '#/result'; return; }
  if (e.target.closest('[data-exit]')) { saveProgress(); location.hash = '#/'; return; }

  if (e.target.closest('#prev-btn')) {
    if (state.index > 0) { state.index -= 1; saveProgress(); render(); }
    return;
  }
  if (e.target.closest('[data-restart]')) {
    if (window.confirm('确定要清空当前进度、重新测试吗？')) {
      state.answers = new Array(TOTAL).fill(null);
      state.index = 0;
      saveProgress();
      location.hash = '#/test';
      if (state.view === 'test') render();
    }
    return;
  }
  if (e.target.closest('[data-share]')) {
    const res = evaluate(state.answers);
    const text = `我的荣格八维类型是 ${res.type}（${res.typeData.name}·${res.typeData.alias}），契合度 ${res.match}%。\n八维得分：${FUNCTION_ORDER.map((f) => `${f} ${res.scores[f].raw}`).join(' / ')}\n测测你的：${location.origin}${location.pathname}`;
    const done = () => toast('结果已复制，去分享吧');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => toast('复制失败，请手动截图分享'));
    } else {
      toast('当前浏览器不支持复制，请截图分享');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (state.view !== 'test') return;
  const n = Number(e.key);
  if (n >= 1 && n <= 5) answer(n - 1);
  else if (e.key === 'ArrowLeft' && state.index > 0) { state.index -= 1; saveProgress(); render(); }
});

route();
