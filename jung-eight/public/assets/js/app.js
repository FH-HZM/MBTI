import { QUESTIONS, FUNCTIONS, FUNCTION_ORDER, SCALE } from './questions.js';
import { TYPES, TYPE_LIST, FAMILIES, TYPE_LIST as ALL_TYPES } from './types.js';
import { evaluate } from './engine.js';
import { avatarSVG } from './avatars.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const LS_ANSWERS = 'jung8.answers.v1';
const LS_INDEX = 'jung8.index.v1';
const TOTAL = QUESTIONS.length;

// 结果示例：一组固定的演示作答（ENFP 倾向），不写入用户进度
const DEMO_ANSWERS = [4,2,2,1,2,2,3,4,4,1,3,1,3,2,3,4,4,2,2,2,2,2,3,3,3,1,2,1,2,2,3,4,4,2,2,1,2,2,3,3,4,1,2,2,2,2,3,4,3,1,2,1,2,2,3,4,4,1,2,3];

const state = {
  answers: loadAnswers(),
  index: loadIndex(),
  timer: null,
  locked: false,
  view: 'home',
};

let toastTimer = null;
let currentRoute = '/';

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ }
}

function loadAnswers() {
  try {
    const raw = JSON.parse(storageGet(LS_ANSWERS) || 'null');
    if (Array.isArray(raw) && raw.length === TOTAL) {
      return raw.map((v) => (typeof v === 'number' && v >= 0 && v <= 4 ? v : null));
    }
  } catch (e) { /* ignore */ }
  return new Array(TOTAL).fill(null);
}

function loadIndex() {
  const n = Number(storageGet(LS_INDEX));
  return Number.isInteger(n) && n >= 0 && n < TOTAL ? n : 0;
}

function saveAnswers() {
  storageSet(LS_ANSWERS, JSON.stringify(state.answers));
}

function saveIndex() {
  storageSet(LS_INDEX, state.index);
}

function answeredCount() {
  return state.answers.filter((v) => typeof v === 'number').length;
}

function hasProgress() {
  return answeredCount() > 0;
}

function firstUnanswered() {
  const i = state.answers.findIndex((v) => typeof v !== 'number');
  return i === -1 ? TOTAL - 1 : i;
}

function resetAll() {
  state.answers = new Array(TOTAL).fill(null);
  state.index = 0;
  state.locked = false;
  clearTimeout(state.timer);
  saveAnswers();
  saveIndex();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function go(hash) {
  if (location.hash === hash) {
    router();
  } else {
    location.hash = hash;
  }
}

function soft(hex, alpha = '18') {
  return `${hex}${alpha}`;
}

/* ---------------- Home ---------------- */

function wheelChips() {
  return FUNCTION_ORDER.map((f, i) => {
    const angle = (-90 + i * 45) * (Math.PI / 180);
    const left = 50 + 40.5 * Math.cos(angle);
    const top = 50 + 40.5 * Math.sin(angle);
    const fn = FUNCTIONS[f];
    return `<div class="fn-chip" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;--c:${fn.color}">
      <b>${f}</b><span>${fn.nick}</span>
    </div>`;
  }).join('');
}

function homeView() {
  const n = answeredCount();
  const resume = n > 0 && n < TOTAL
    ? `<div class="resume-hint">
         <span>你上次已经答到第 ${Math.min(firstUnanswered() + 1, TOTAL)} 题（共 ${n} 题已完成），进度会自动保存。</span>
         <span style="display:flex;gap:8px">
           <button class="btn btn-sm btn-primary" data-resume>继续作答</button>
           <button class="btn btn-sm btn-ghost" data-restart>重新开始</button>
         </span>
       </div>`
    : '';

  return `<div class="view">
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <div class="eyebrow">Jung · 8 Cognitive Functions</div>
          <h1 class="h1">荣格八维<br><span class="hl">人格测试</span></h1>
          <p class="lede">60 道贴近中国日常的选择题，测量你在 Ne、Ni、Se、Si、Te、Ti、Fe、Fi 八种认知功能上的真实倾向，并匹配你的十六型人格。不是给你贴标签，而是让你看清自己最顺手的思维方式。</p>
          <div class="meta-row">
            <span class="pill"><i class="pill-dot"></i><b>60</b> 道题</span>
            <span class="pill"><i class="pill-dot"></i>约 <b>8</b> 分钟</span>
            <span class="pill"><i class="pill-dot"></i>中国情境题库</span>
            <span class="pill"><i class="pill-dot"></i>十六型解读</span>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" data-start>${n > 0 && n < TOTAL ? '继续测试' : '开始测试'} <span aria-hidden="true">→</span></button>
            <a class="btn btn-ghost btn-lg" href="#/types">先看看十六型人格</a>
          </div>
          ${resume}
          <p class="hero-note">无需注册 · 自动保存进度 · 结果只保存在你的浏览器 · <a href="#/result?demo">先看看结果示例</a></p>
        </div>
        <div class="hero-art">
          <div class="wheel-card">
            <div class="wheel-center"><div><strong>八维</strong><span>EIGHT FUNCTIONS</span></div></div>
            ${wheelChips()}
          </div>
        </div>
      </div>
    </section>

    <section class="section tint">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">THE EIGHT FUNCTIONS</div>
          <h2>八维不是八个标签，是八种看世界的方式</h2>
          <p>每个人都在使用全部八种功能，只是顺序和熟练度不同。你的类型，来自最常用的那几种功能的组合。</p>
        </div>
        <div class="fn-grid">
          ${FUNCTION_ORDER.map((f) => {
            const fn = FUNCTIONS[f];
            return `<article class="fn-card" style="--c:${fn.color};--cs:${soft(fn.color)}">
              <div class="fn-top"><span class="fn-code">${f}</span><span class="fn-tag">${fn.name}</span></div>
              <div class="fn-name">${fn.nick}</div>
              <span class="fn-nick">${fn.name}</span>
              <p class="fn-desc">${fn.one}</p>
            </article>`;
          }).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div class="kicker">HOW IT WORKS</div>
          <h2>八分钟，完成一次自我观察</h2>
          <p>没有对错，也没有“好性格”。你只需要诚实地回答：过去半年里，这些情况有多常发生。</p>
        </div>
        <div class="steps">
          <article class="step">
            <div class="step-num">01</div>
            <h3>按第一反应作答</h3>
            <p>看到题目后 3 秒内选择最接近的频率。反复斟酌反而会混入“我应该怎样”的期待。</p>
          </article>
          <article class="step">
            <div class="step-num">02</div>
            <h3>系统计算八维</h3>
            <p>每个功能由 7–8 道不同情境的题目共同测量，降低单一题目带来的误差。</p>
          </article>
          <article class="step">
            <div class="step-num">03</div>
            <h3>得到类型与解读</h3>
            <p>将你的八维曲线与十六型的认知功能栈逐一比对，给出最贴合的类型、次选与完整解读。</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="cred-panel">
          <div>
            <h3>这份题库，经过模拟验证</h3>
            <p>题目参考荣格《心理类型》的八维框架与中文同类型测试的题型经验，结合职场、家庭、人情往来等中国情境重写。我们用模拟答题者反复检验计分：八维得分与潜在倾向的相关系数约 0.87，普通噪声下的类型还原率约 81%。</p>
            <div style="margin-top:16px"><a class="btn btn-sm btn-ghost" href="#/about">查看测试说明与信度数据</a></div>
          </div>
          <div class="cred-stats">
            <div class="cred-stat"><b>60</b><span>道行为频率题</span></div>
            <div class="cred-stat"><b>8</b><span>个认知功能维度</span></div>
            <div class="cred-stat"><b>16</b><span>型人格匹配</span></div>
            <div class="cred-stat"><b>81%</b><span>模拟类型还原率</span></div>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

/* ---------------- Test ---------------- */

function encouragement(i) {
  if (i < 10) return '刚开始，跟着第一反应走就好。';
  if (i < 25) return '已完成四分之一，节奏不错，保持下去。';
  if (i < 40) return '过半了。如果有点累，可以退出休息，进度会保存。';
  if (i < 55) return '进入后半段，很多人的真实倾向会在这时更清晰。';
  if (i < TOTAL - 1) return '最后几题了，坚持一下。';
  return '最后一题，选完就能看到你的八维画像。';
}

function testView() {
  if (!hasProgress() && state.index > 0) state.index = 0;
  if (state.answers.every((v) => typeof v === 'number')) {
    return completeView();
  }
  const idx = Math.min(Math.max(state.index, 0), TOTAL - 1);
  const q = QUESTIONS[idx];
  const pct = Math.round((idx / TOTAL) * 100);
  const selected = state.answers[idx];

  return `<div class="test-view view">
    <div class="test-shell">
      <div class="test-top">
        <a href="#/" class="mini">← 退出，进度自动保存</a>
        <div class="count">第 <b>${idx + 1}</b> / ${TOTAL} 题</div>
      </div>
      <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="test-encourage">${encouragement(idx)}</div>

      <div class="question-card">
        <div class="q-index">QUESTION ${String(idx + 1).padStart(2, '0')} · 想想过去半年</div>
        <h1 class="q-text">${q.text}</h1>
        <p class="q-hint">按第一反应选择，不必反复斟酌。</p>
        <div class="options" role="group" aria-label="请选择一个最符合的频率">
          ${SCALE.map((s) => `<button class="option ${selected === s.value ? 'is-selected' : ''}" data-value="${s.value}" type="button">
            <span class="key">${s.value + 1}</span>
            <span class="olabel">${s.label}</span>
            <span class="ohint">${s.hint}</span>
          </button>`).join('')}
        </div>
        <div class="test-foot">
          <button class="btn btn-quiet" id="prev-btn" ${idx === 0 ? 'disabled' : ''}>← 上一题</button>
          <span class="autosave"><i></i> 进度已自动保存</span>
        </div>
      </div>
      <p class="test-legal">快捷键 1–5 可快速作答 · 题目不评价能力高低，只测量你更常使用的认知方式。</p>
    </div>
  </div>`;
}

function completeView() {
  return `<div class="test-view view">
    <div class="test-shell">
      <div class="question-card" style="text-align:center;padding:56px 40px">
        <div class="q-index">ALL DONE</div>
        <h1 class="q-text" style="min-height:0">60 题已经完成</h1>
        <p class="q-hint" style="margin-bottom:24px">你的八维画像已生成，去看看结果吧。</p>
        <button class="btn btn-primary btn-lg" data-result>查看我的结果 →</button>
        <div style="margin-top:14px"><button class="btn btn-quiet btn-sm" data-restart>重新测一次</button></div>
      </div>
    </div>
  </div>`;
}

function chooseOption(value) {
  if (state.locked) return;
  const idx = state.index;
  state.answers[idx] = value;
  saveAnswers();
  saveIndex();

  const btn = app.querySelector(`.option[data-value="${value}"]`);
  app.querySelectorAll('.option').forEach((el) => el.classList.remove('is-selected'));
  if (btn) btn.classList.add('is-selected');

  state.locked = true;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.locked = false;
    if (idx >= TOTAL - 1) {
      state.index = TOTAL - 1;
      saveIndex();
      go('#/result');
    } else {
      state.index = idx + 1;
      saveIndex();
      renderTest();
    }
  }, 230);
}

function prevQuestion() {
  clearTimeout(state.timer);
  state.locked = false;
  if (state.index > 0) {
    state.index -= 1;
    saveIndex();
    renderTest();
  }
}

function renderTest() {
  state.view = 'test';
  app.innerHTML = testView();
  const prev = app.querySelector('#prev-btn');
  if (prev) prev.addEventListener('click', prevQuestion);
  app.querySelectorAll('.option').forEach((btn) => {
    btn.addEventListener('click', () => chooseOption(Number(btn.dataset.value)));
  });
  toastEl.classList.remove('show');
}

/* ---------------- Result ---------------- */

function radarSVG(res) {
  const cx = 210;
  const cy = 208;
  const R = 120;
  const angle = (i) => -Math.PI / 2 + i * (Math.PI / 4);
  const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  const rings = [0.25, 0.5, 0.75, 1];
  const ringPolys = rings.map((k) => {
    const pts = FUNCTION_ORDER.map((_, i) => point(i, R * k).map((n) => n.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="${k === 1 ? '#fbfcff' : 'none'}" stroke="${k === 1 ? '#dbe2ee' : '#e8ecf4'}" stroke-width="1" ${k < 1 ? 'stroke-dasharray="3 4"' : ''}/>`;
  }).join('');

  const axes = FUNCTION_ORDER.map((f, i) => {
    const [x, y] = point(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e8ecf4" stroke-width="1"/>`;
  }).join('');

  const dataPts = FUNCTION_ORDER.map((f, i) => point(i, R * (res.rel[f] / 100)));
  const poly = dataPts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const dots = FUNCTION_ORDER.map((f, i) => {
    const [x, y] = dataPts[i];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${FUNCTIONS[f].color}" stroke="#fff" stroke-width="2"/>`;
  }).join('');

  const labels = FUNCTION_ORDER.map((f, i) => {
    const [x, y] = point(i, R + 26);
    const cos = Math.cos(angle(i));
    const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
    const dy = i === 0 ? -4 : i === 4 ? 12 : 0;
    return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" class="radar-label">
      <tspan x="${x.toFixed(1)}" fill="${FUNCTIONS[f].color}">${f}</tspan>
      <tspan x="${x.toFixed(1)}" dy="11" class="radar-sub">${FUNCTIONS[f].nick}</tspan>
    </text>`;
  }).join('');

  return `<svg class="radar-svg" viewBox="0 0 420 420" role="img" aria-label="八维认知功能雷达图">
    ${ringPolys}${axes}
    <polygon points="${poly}" fill="${res.typeData ? FAMILIES[res.typeData.family].color : '#1f5fd0'}" fill-opacity="0.16" stroke="${res.typeData ? FAMILIES[res.typeData.family].color : '#1f5fd0'}" stroke-width="2"/>
    ${dots}${labels}
  </svg>`;
}

function barsHTML(res) {
  const sorted = [...FUNCTION_ORDER].sort((a, b) => res.rel[b] - res.rel[a]);
  return sorted.map((f, i) => {
    const fn = FUNCTIONS[f];
    const role = res.roleByFn[f];
    const roleText = role ? (role.shadow ? `影子·${role.role}` : role.role) : '影子';
    return `<div class="bar-row" style="--c:${fn.color};--cs:${soft(fn.color, '14')};--c2:${soft(fn.color, 'b3')}">
      <div class="bar-rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="bar-label">
        <b>${f} <span class="role-badge ${role && role.shadow ? 'shadow' : ''}">${roleText}</span></b>
        <span>${fn.name}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" data-w="${res.rel[f]}"></div></div>
      <div class="bar-score">${res.rel[f]}<small>原始 ${res.scores[f].pct}%</small></div>
    </div>`;
  }).join('');
}

function resultView(demo = false) {
  if (!demo && answeredCount() < TOTAL) {
    return `<div class="result-view view"><div class="wrap">
      <div class="panel" style="text-align:center;padding:56px 32px">
        <h1 class="q-text" style="min-height:0">还差 ${TOTAL - answeredCount()} 题</h1>
        <p class="q-hint" style="margin-bottom:22px">完成全部题目后才能生成八维画像。</p>
        <button class="btn btn-primary btn-lg" data-continue>继续答题 →</button>
      </div>
    </div></div>`;
  }

  const res = evaluate(demo ? DEMO_ANSWERS : state.answers);
  const type = res.typeData;
  const fam = FAMILIES[type.family];
  const alts = res.fits.slice(1, 3);
  const dominant = type.stack[0];
  const auxiliary = type.stack[1];
  const inferior = type.stack[3];

  return `<div class="result-view view">
    <div class="wrap">
      ${demo ? `<div class="demo-banner">
        <div><b>示例结果</b><span>这是一组演示答案生成的 ${type.code} 示例，用来预览结果页的样式，不是你的作答。</span></div>
        <a class="btn btn-sm btn-primary" href="#/test">开始我的测试 →</a>
      </div>` : ''}
      <article class="result-hero" style="--soft:${fam.soft};--c:${fam.color}">
        <div class="result-avatar">${avatarSVG(type.code, { size: 180 })}</div>
        <div>
          <div class="result-kicker">YOUR COGNITIVE TYPE · 八维类型</div>
          <div class="result-code">${type.code}<small>${type.name} · ${type.alias}</small></div>
          <div class="result-name">${type.tagline}</div>
          <p class="result-tagline">与你的八维曲线契合度 <b style="color:${fam.color}">${res.match}%</b> · 主导功能 ${dominant}（${FUNCTIONS[dominant].name}）</p>
          <div class="result-chips">
            <span class="chip strong" style="--soft:${fam.soft};--c:${fam.color}">${fam.name} · ${fam.en}</span>
            <span class="chip">主导 ${dominant} · ${FUNCTIONS[dominant].nick}</span>
            <span class="chip">辅助 ${auxiliary} · ${FUNCTIONS[auxiliary].nick}</span>
            <span class="chip">清晰度 ${res.clarity}</span>
          </div>
          <div class="result-actions">
            <a class="btn btn-primary" href="#/type/${type.code}">查看完整解读 →</a>
            ${demo
              ? `<a class="btn btn-ghost" href="#/test">开始我的测试</a>`
              : `<button class="btn btn-ghost" data-copy>复制结果</button>
                 <button class="btn btn-quiet" data-retest>重新测试</button>`}
          </div>
        </div>
      </article>

      ${res.lowDifferentiation ? `<div class="warn-note"><b>区分度偏低</b>你的八个维度分数非常接近，说明这次作答没有拉开差异，类型结果仅供参考。建议换一个放松、真实的状态重测一次。</div>` : ''}

      <div class="result-grid">
        <section class="panel">
          <div class="panel-head"><h2>八维雷达</h2><span>相对强度 · 越靠外越常用</span></div>
          <div class="radar-wrap">${radarSVG(res)}</div>
        </section>
        <section class="panel" style="--c:${fam.color};--soft:${fam.soft}">
          <div class="panel-head"><h2>这次的你</h2><span>${fam.name}</span></div>
          <p class="summary-type">${type.summary}</p>
          <div class="summary-block">
            <h4>主导功能 · ${dominant} ${FUNCTIONS[dominant].name}</h4>
            <p>${type.stackNotes[dominant]}</p>
          </div>
          <div class="summary-block">
            <h4>需要留意的劣势功能 · ${inferior} ${FUNCTIONS[inferior].name}</h4>
            <p>${type.stackNotes[inferior]}</p>
          </div>
          <div class="summary-block">
            <h4>次选的类型</h4>
            <div class="mini-alts">
              ${alts.map((a) => `<div class="mini-alt"><span><b>${a.code}</b> ${TYPES[a.code].name} · ${TYPES[a.code].tagline}</span><span class="pct">${a.fit}%</span></div>`).join('')}
            </div>
          </div>
        </section>
      </div>

      <section class="panel bars-panel">
        <div class="panel-head"><h2>八维分数</h2><span>相对强度 + 原始倾向</span></div>
        <div class="bars">${barsHTML(res)}</div>
        <p class="result-note">“相对强度”是把你的八个维度放在一起比较后的排序分数，便于看清主次；“原始”是你在这组题目上的绝对倾向。分数不是能力高低，类型也只代表当前最贴合的功能组合，会随阶段与情境变化。</p>
      </section>

      <div class="result-cta">
        <p>想更深入了解这套功能组合如何影响你的工作、亲密关系与成长？</p>
        <a class="btn btn-ghost" href="#/type/${type.code}">阅读 ${type.code} 完整解读</a>
      </div>
    </div>
  </div>`;
}

function bindResult(demo = false) {
  if (!demo) {
    const copy = app.querySelector('[data-copy]');
    if (copy) {
      copy.addEventListener('click', () => {
        if (answeredCount() < TOTAL) return;
        const res = evaluate(state.answers);
        const type = res.typeData;
        const sorted = [...FUNCTION_ORDER].sort((a, b) => res.rel[b] - res.rel[a]);
        const text = `我的荣格八维类型：${type.code} ${type.name}（${type.alias}）
契合度 ${res.match}% · 主导 ${type.stack[0]} · 辅助 ${type.stack[1]}
八维排序：${sorted.map((f) => `${f} ${res.rel[f]}`).join(' / ')}
—— 八维人格 · 荣格八维人格测试`;
        navigator.clipboard?.writeText(text).then(() => toast('结果已复制，去分享吧')).catch(() => toast('复制失败，请手动选择文本'));
      });
    }
    const retest = app.querySelector('[data-retest]');
    if (retest) {
      retest.addEventListener('click', () => {
        if (window.confirm('确定要清空当前作答，重新测一次吗？')) {
          resetAll();
          go('#/test');
        }
      });
    }
  }
  requestAnimationFrame(() => {
    app.querySelectorAll('.bar-fill').forEach((el) => {
      el.style.width = `${el.dataset.w}%`;
    });
  });
}

/* ---------------- Type detail ---------------- */

function typeOrder() {
  return TYPE_LIST;
}

function typeDetailView(code) {
  const type = TYPES[code];
  if (!type) return notFoundView();
  const fam = FAMILIES[type.family];
  const stack = type.stack;
  const roles = ['主导', '辅助', '第三', '劣势'];
  const idx = typeOrder().indexOf(code);
  const prev = typeOrder()[(idx - 1 + 16) % 16];
  const next = typeOrder()[(idx + 1) % 16];

  return `<div class="type-view view" style="--c:${fam.color};--soft:${fam.soft}">
    <div class="wrap">
      <div class="crumb"><a href="#/">首页</a> / <a href="#/types">十六型人格</a> / ${code}</div>
      <article class="type-hero">
        <div>${avatarSVG(code, { size: 190 })}</div>
        <div>
          <span class="type-family">${fam.name} · ${fam.en}</span>
          <div class="type-code" style="margin-top:12px">${code}<small>${type.name} · ${type.alias}</small></div>
          <div class="type-title">${type.tagline}</div>
          <p class="type-summary">${type.summary}</p>
          <div class="result-chips">
            ${stack.map((f, i) => `<span class="chip">${roles[i]} ${f} · ${FUNCTIONS[f].name}</span>`).join('')}
          </div>
        </div>
      </article>

      <section class="stack-section">
        <div class="panel-head" style="margin-bottom:14px"><h2 style="font-family:var(--serif);font-size:19px">认知功能栈</h2><span>从主导到劣势，构成你的底层操作系统</span></div>
        <div class="stack-grid">
          ${stack.map((f, i) => `<article class="stack-card" style="--c:${FUNCTIONS[f].color}">
            <div class="stack-role">${roles[i].toUpperCase()} · ${i + 1}</div>
            <div class="stack-code">${f}</div>
            <div class="stack-name">${FUNCTIONS[f].name} · ${FUNCTIONS[f].nick}</div>
            <p class="stack-note">${type.stackNotes[f]}</p>
          </article>`).join('')}
        </div>
      </section>

      <div class="detail-grid">
        <article class="detail-card">
          <h2><span class="dot"></span>你天然擅长的</h2>
          <ul class="li-list good">${type.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>
        </article>
        <article class="detail-card">
          <h2><span class="dot"></span>容易踩的坑</h2>
          <ul class="li-list warn">${type.blindspots.map((s) => `<li>${s}</li>`).join('')}</ul>
        </article>
        <article class="detail-card work-love">
          <h2><span class="dot"></span>在职场里</h2>
          <p>${type.work}</p>
        </article>
        <article class="detail-card work-love">
          <h2><span class="dot"></span>在亲密关系里</h2>
          <p>${type.love}</p>
        </article>
        <article class="detail-card wide">
          <h2><span class="dot"></span>一个你可能熟悉的小场景</h2>
          <div class="scene-quote">${type.scene}</div>
        </article>
        <article class="detail-card wide">
          <h2><span class="dot"></span>给你的成长建议</h2>
          <ol class="growth-list">${type.growth.map((g) => `<li>${g}</li>`).join('')}</ol>
        </article>
        <article class="detail-card wide">
          <h2><span class="dot"></span>相似气质</h2>
          <p style="font-size:13.5px;color:var(--muted)">${type.examples}。这些归类来自民间讨论，仅供联想，不代表本人真实类型。</p>
        </article>
      </div>

      <div class="type-nav">
        <div class="side">
          <a class="btn btn-sm btn-ghost" href="#/type/${prev}">← ${prev} ${TYPES[prev].name}</a>
          <a class="btn btn-sm btn-ghost" href="#/type/${next}">${next} ${TYPES[next].name} →</a>
        </div>
        <a class="btn btn-sm btn-primary" href="#/test">测测我是哪一型</a>
      </div>
    </div>
  </div>`;
}

/* ---------------- Gallery ---------------- */

function typesView() {
  return `<div class="types-view view">
    <div class="wrap">
      <div class="section-head" style="margin-bottom:8px">
        <div class="kicker">THE 16 TYPES</div>
        <h1 style="font-family:var(--serif);font-size:clamp(30px,4.4vw,44px)">十六型人格图鉴</h1>
        <p>四种气质家族，十六种功能组合。点开任意一型，看看它的认知功能栈、优势、盲点与相处方式。</p>
      </div>
      ${Object.values(FAMILIES).map((fam) => {
        const codes = ALL_TYPES.filter((c) => TYPES[c].family === fam.key);
        return `<section class="family-block" style="--c:${fam.color};--soft:${fam.soft}">
          <div class="family-head">
            <h2>${fam.name}</h2><span>${fam.en} · ${fam.desc}</span>
          </div>
          <div class="type-grid">
            ${codes.map((code) => {
              const t = TYPES[code];
              return `<a class="type-card" href="#/type/${code}">
                ${avatarSVG(code, { size: 122 })}
                <b>${code}</b>
                <div class="nm">${t.name}</div>
                <div class="tg">${t.tagline}</div>
              </a>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------------- About ---------------- */

function aboutView() {
  return `<div class="about-view view">
    <div class="wrap prose">
      <div class="crumb"><a href="#/">首页</a> / 测试说明</div>
      <h1>这是一份怎样的测试</h1>
      <p>它不是娱乐式的“你是哪种动物”，也不是临床心理评估。它做一件事：用一组贴近日常的题目，估计你更常使用哪几种认知功能，再据此找出最贴合的十六型人格。</p>

      <h2>理论来源</h2>
      <p>八维认知功能来自荣格 1921 年出版的《心理类型》（<i>Psychologische Typen</i>）。荣格提出，人感知世界有感觉（S）与直觉（N）两种方式，做判断有思维（T）与情感（F）两种方式，二者又各有外倾（E）与内倾（I）两种朝向，组合成八种功能。后来迈尔斯母女在此基础上发展出 MBTI，Beebe 等人又补充了“影子功能”的模型。本测试以八维功能为主轴，而不是只测四个字母。</p>

      <h2>题目如何编写</h2>
      <ul>
        <li>每个功能 7–8 题，共 60 题；同一功能的题目覆盖不同生活面向，避免只测到单一侧面。</li>
        <li>全部写成可观察的行为频率，而不是“你觉得自己是不是一个有远见的人”这类自我评价。</li>
        <li>情境取自中国日常：部门会议、家族聚餐、微信群讨论、长辈期待、临时邀约、内卷与选择。</li>
        <li>题目交错排列，降低连续同类型题目带来的作答惯性；不设置“正确答案”导向。</li>
      </ul>

      <h2>怎么计分</h2>
      <p>每题按“从不—总是”记为 0–4 分，同一功能的题目相加后换算为 0–100 的原始倾向。随后把你的八维曲线与十六型的“功能权重模板”逐一做相关匹配：主导功能权重最高，辅助、第三依次降低，劣势功能为负，四个影子功能也各有权重。匹配度最高的类型，就是本次结果。</p>
      <p>结果页同时给出“相对强度”：把你自己的八个维度放在一起排序并映射到 46–97，便于一眼看出主次。原始分数则保留绝对倾向。两者结合看，比单看一个数字更可靠。</p>

      <h2>模拟验证</h2>
      <p>为了检查题库和计分是否“测得准”，我们用计算机生成带有已知功能倾向的模拟答题者，按真实作答的噪声水平反复作答，再看得出的类型是否回到已知类型。共进行数万次模拟：</p>
      <table class="data-table">
        <thead><tr><th>模拟条件</th><th>类型完全还原</th><th>真实类型进入前三</th><th>八维得分与潜在倾向相关</th></tr></thead>
        <tbody>
          <tr><td>理想作答（低噪声）</td><td><b>99.2%</b></td><td>100%</td><td>0.94</td></tr>
          <tr><td>普通作答（主要指标）</td><td><b>81.0%</b></td><td>98.6%</td><td>0.87</td></tr>
          <tr><td>随意作答（高噪声）</td><td><b>54.6%</b></td><td>86.7%</td><td>0.83</td></tr>
        </tbody>
      </table>
      <p style="font-size:12.5px;color:var(--faint)">各维度内部一致性（Cronbach's α）约 0.84–0.87。模拟结果只能说明计分逻辑在该模型下稳定，不等于对真实个体的预测准确率。</p>

      <h2>请这样理解结果</h2>
      <ul>
        <li>八维分数是“倾向”不是“能力”：Fe 高不代表你更善良，Ti 低也不代表你逻辑差。</li>
        <li>类型是当前阶段最贴合的组合，不是终身标签。换环境、换角色，功能顺序会变化。</li>
        <li>相邻类型（如 INTJ 与 INFJ）本来就很像，次选结果同样值得阅读。</li>
        <li>如果你在压力很大、情绪剧烈波动或刻意“扮演某个角色”时作答，结果会偏移。建议在相对平稳的状态下重测。</li>
      </ul>

      <div class="note">本测试用于自我探索与交流，不构成心理诊断、职业测评结论或医疗建议。若你正经历持续的情绪困扰，请寻求专业心理帮助。</div>

      <h2>隐私</h2>
      <p>所有作答与结果只保存在你当前浏览器的本地存储中，不上传服务器，也不需要注册账号。清除浏览器数据即会删除记录。</p>

      <div style="margin-top:28px"><a class="btn btn-primary" href="#/test">开始测试 →</a></div>
    </div>
  </div>`;
}

function notFoundView() {
  return `<div class="view"><div class="wrap" style="padding:80px 0;text-align:center">
    <h1 style="font-family:var(--serif);font-size:36px">页面走丢了</h1>
    <p style="color:var(--muted);margin-top:10px">这个地址不存在，回到首页重新开始吧。</p>
    <div style="margin-top:22px"><a class="btn btn-primary" href="#/">回到首页</a></div>
  </div></div>`;
}

/* ---------------- Router ---------------- */

function setNav(route) {
  const active = route === '/' ? 'home'
    : route.startsWith('/test') ? 'test'
    : route.startsWith('/types') || route.startsWith('/type') ? 'types'
    : route.startsWith('/about') ? 'about' : '';
  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === active);
  });
}

function router() {
  const raw = location.hash.replace(/^#/, '') || '/';
  currentRoute = raw;
  clearTimeout(state.timer);
  state.locked = false;
  toastEl.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (raw === '/' || raw === '') {
    state.view = 'home';
    app.innerHTML = homeView();
    bindHome();
    setNav('/');
  } else if (raw.startsWith('/test')) {
    state.view = 'test';
    app.innerHTML = testView();
    bindTest();
    if (answeredCount() === TOTAL) bindComplete();
    setNav('/test');
  } else if (raw.startsWith('/result')) {
    const demo = raw.includes('demo');
    state.view = 'result';
    app.innerHTML = resultView(demo);
    bindResult(demo);
    if (!demo) bindIncomplete();
    setNav('/result');
  } else if (raw === '/types') {
    state.view = 'types';
    app.innerHTML = typesView();
    setNav('/types');
  } else if (raw.startsWith('/type/')) {
    const code = decodeURIComponent(raw.split('/')[2] || '').toUpperCase();
    state.view = 'type';
    app.innerHTML = typeDetailView(code);
    setNav('/types');
  } else if (raw.startsWith('/about')) {
    state.view = 'about';
    app.innerHTML = aboutView();
    setNav('/about');
  } else {
    state.view = '404';
    app.innerHTML = notFoundView();
    setNav('');
  }
}

function bindTest() {
  const prev = app.querySelector('#prev-btn');
  if (prev) prev.addEventListener('click', prevQuestion);
  app.querySelectorAll('.option').forEach((btn) => {
    btn.addEventListener('click', () => chooseOption(Number(btn.dataset.value)));
  });
}

function bindHome() {
  const start = app.querySelector('[data-start]');
  if (start) {
    start.addEventListener('click', () => {
      if (hasProgress() && answeredCount() < TOTAL) {
        state.index = firstUnanswered();
      } else {
        resetAll();
      }
      saveIndex();
      go('#/test');
    });
  }
  const resume = app.querySelector('[data-resume]');
  if (resume) {
    resume.addEventListener('click', () => {
      state.index = firstUnanswered();
      saveIndex();
      go('#/test');
    });
  }
  const restart = app.querySelector('[data-restart]');
  if (restart) {
    restart.addEventListener('click', () => {
      if (!hasProgress() || window.confirm('确定清空之前的作答，重新开始吗？')) {
        resetAll();
        go('#/test');
      }
    });
  }
}

function bindComplete() {
  const see = app.querySelector('[data-result]');
  if (see) see.addEventListener('click', () => go('#/result'));
  const restart = app.querySelector('[data-restart]');
  if (restart) restart.addEventListener('click', () => { resetAll(); go('#/test'); });
}

function bindIncomplete() {
  const cont = app.querySelector('[data-continue]');
  if (cont) cont.addEventListener('click', () => { state.index = firstUnanswered(); saveIndex(); go('#/test'); });
  const restart = app.querySelector('[data-restart]');
  if (restart) restart.addEventListener('click', () => { resetAll(); go('#/test'); });
}

document.addEventListener('keydown', (e) => {
  if (state.view !== 'test') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (answeredCount() === TOTAL) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 5) {
    e.preventDefault();
    chooseOption(n - 1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevQuestion();
  }
});

window.addEventListener('hashchange', router);
router();
