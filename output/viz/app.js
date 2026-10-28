/* 声学基础考点：离线页面（数据见 data.js，由 scripts/build_viz.py 生成） */
'use strict';
const D = window.DATA;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('acou.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  put(k, v) { try { localStorage.setItem('acou.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

/* ---------- math ---------- */
function math(el) {
  if (!window.renderMathInElement) return;
  try {
    window.renderMathInElement(el, { throwOnError: false, strict: 'ignore', delimiters: [
      { left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] });
  } catch (e) { /* leave source */ }
}
const tex = (s, display) => {
  try { return katex.renderToString(s, { throwOnError: false, strict: 'ignore', displayMode: !!display }); } catch (e) { return esc(s); }
};

/* ---------- indexes ---------- */
const NODES = D.book.nodes;
const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
const rating = id => D.syllabus.ratings[id];
const PAGE = Object.fromEntries(D.book.pages.map(p => [p[0], { w: p[1], h: p[2], printed: p[3] }]));
const blockByUid = Object.fromEntries(D.blocks.map(b => [b.u, b]));
const blocksByPage = {};
D.blocks.forEach(b => (blocksByPage[b.p] = blocksByPage[b.p] || []).push(b));
const QS = [];
const qById = {};
D.papers.forEach(p => p.questions.forEach(q => { q.paper = p; QS.push(q); qById[q.id] = q; }));
const G = D.glossary;
const gByName = Object.fromEntries(G.map((e, i) => [e.name, i]));
G.forEach((e, i) => { e.i = i; e.search = [e.name, ...e.aliases, ...e.book, e.def, ...e.points].join(' ').toLowerCase(); });
const exById = Object.fromEntries(D.exercises.map(x => [x.id, x]));
const egById = Object.fromEntries(D.examples.map(x => [x.id, x]));
const EXLV = D.syllabus.exercises, EGLV = D.syllabus.examples;
// questions per node (from build_viz: rating notes cite them, or their prototype lies there)
const qByNode = {};
QS.forEach(q => (q.nodes || []).forEach(n => (qByNode[n] = qByNode[n] || []).push(q.id)));
// term questions per paper, so a term's "asked in 2009" can open that question
const termQ = {};
QS.forEach(q => { if (q.type === 'term') termQ[q.paper.id] = q.id; });

const nodeLabel = id => {
  const n = nodeById[id];
  if (!n) return id;
  return n.kind === 'chapter' ? `第${n.num}章 ${n.title}` : n.kind === 'exercises' ? n.title : `${n.num} ${n.title}`;
};
const stars = r => r == null || r.stars == null ? '' : `<span class="st st${r.stars}" title="${esc(r.note || '')}">${r.stars ? '★'.repeat(r.stars) : '✗'}</span>`;
const nodeStars = id => stars(rating(id));
// exam ids inside text (2009-四, 2017-二（1）…) become links
const QREF = /((?:19|20)\d\d[a-z]?-(?:[一二三四五六七八九十]+|\d+)(?:（\d）)?)/g;
const linkQ = html => html.replace(QREF, m => (qById[m] ? `<a data-q="${m}">${m}</a>` : m));
const firstPage = id => {
  const n = nodeById[id];
  return n ? n.pdf_page : 1;
};
// shorten text without cutting a $…$ formula in half
const cut = (s, n) => {
  if (s.length <= n) return s;
  let t = s.slice(0, n);
  if ((t.match(/\$/g) || []).length % 2) t = t.slice(0, t.lastIndexOf('$'));
  return t + '…';
};

/* page-image crop of a block (with its merged regions), used on term cards */
function snip(uid, scale = 0.62) {
  const b = blockByUid[uid];
  if (!b) return '';
  let [x0, y0, x1, y1] = b.b;
  (b.xb || []).forEach(e => { x0 = Math.min(x0, e[0]); y0 = Math.min(y0, e[1]); x1 = Math.max(x1, e[2]); y1 = Math.max(y1, e[3]); });
  const pad = 8, pg = PAGE[b.p];
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(pg.w, x1); y1 = Math.min(pg.h, y1);
  const cw = x1 - x0, ch = y1 - y0;
  // percentages keep the crop right when the column is narrower than the crop and it shrinks
  return `<div class="snip" style="width:${Math.round(cw * scale)}px;aspect-ratio:${cw}/${ch};background-image:url(pages/AC/${String(b.p).padStart(4, '0')}.webp);` +
    `background-size:${(pg.w / cw * 100).toFixed(3)}% auto;background-position:${(x0 / (pg.w - cw) * 100).toFixed(3)}% ${(y0 / (pg.h - ch) * 100).toFixed(3)}%"></div>`;
}
const readLink = (uid, text = '在书中查看') => {
  const b = blockByUid[uid];
  return b ? `<a data-read="${b.p}" data-blk="${uid}">${text}（第 ${PAGE[b.p].printed} 页）</a>` : '';
};

/* ---------- 名词 ---------- */
const TV = { q: '', filter: store.get('tFilter', 'asked'), sort: store.get('tSort', 'count'), cur: null, order: [], recite: store.get('recite', false) };
const MASTER = store.get('mastery', {});   // name -> { ok, miss, last: 'ok' | 'miss' }
const mastery = e => (MASTER[e.name] || {}).last;
function termList() {
  const box = $('#termList');
  if (!box.dataset.init) {
    box.dataset.init = 1;
    box.innerHTML = `<div class="ctl"><input type="search" id="tq" placeholder="搜索名词、定义、公式…">
      <select id="tfilter"><option value="asked">考过的</option><option value="">全部</option><option value="never">未考过</option><option value="miss">没记住的</option><option value="new">还没背过的</option></select>
      <select id="tsort"><option value="count">按考过次数</option><option value="book">按书序</option><option value="recent">按最近考过</option></select>
      <label class="small" title="遮住定义与要点，先回忆再点“显示答案”（空格），然后标记记住 / 没记住（1 / 2）"><input type="checkbox" id="trecite">背诵</label></div>
      <div class="rows"></div>`;
    $('#tfilter').value = TV.filter; $('#tsort').value = TV.sort; $('#trecite').checked = TV.recite;
    const upd = () => {
      TV.q = $('#tq').value.trim().toLowerCase(); TV.filter = $('#tfilter').value; TV.sort = $('#tsort').value;
      store.put('tFilter', TV.filter); store.put('tSort', TV.sort); termList();
    };
    ['#tq', '#tfilter', '#tsort'].forEach(s => $(s).addEventListener('input', upd));
    $('#trecite').addEventListener('change', e => { e.target.blur(); TV.recite = e.target.checked; store.put('recite', TV.recite); termDetail(); });
    box.addEventListener('click', e => { const r = e.target.closest('[data-term]'); if (r) go('terms', G[+r.dataset.term].name); });
  }
  const words = TV.q.split(/\s+/).filter(Boolean);
  const order = { book: e => [e.node ? NODES.findIndex(n => n.id === e.node) : 999, e.i], count: e => [-e.asked.length, e.i], recent: e => [-(e.asked.at(-1) || '0').slice(0, 4), -e.asked.length] }[TV.sort];
  const es = G.filter(e => (TV.filter !== 'asked' || e.asked.length) && (TV.filter !== 'never' || !e.asked.length) &&
      (TV.filter !== 'miss' || mastery(e) === 'miss') && (TV.filter !== 'new' || !mastery(e)) && words.every(w => e.search.includes(w)))
    .sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1]; });
  TV.order = es.map(e => e.i);
  const known = G.filter(e => mastery(e) === 'ok').length;
  $('.rows', $('#termList')).innerHTML = `<div class="muted small" style="padding:6px 12px">${es.length} 个名词 · 已记住 ${known} / ${G.length}</div>` +
    es.map(e => `<div class="row${TV.cur === e.i ? ' cur' : ''}" data-term="${e.i}"><span class="dot ${mastery(e) || ''}"></span>
      <div class="nm"><div>${esc(e.name)}</div><div class="sub">${esc(nodeLabel(e.node))}</div></div>
      ${e.asked.length ? `<span class="cnt">考 ${e.asked.length} 次</span>` : ''}${stars(e.stars == null ? null : { stars: e.stars })}</div>`).join('');
}
function termDetail() {
  const el = $('#termDetail');
  if (TV.cur == null) TV.cur = TV.order[0] ?? 0;
  const e = G[TV.cur];
  const asked = e.asked.map(p => termQ[p] ? `<a class="chip" data-q="${termQ[p]}">${p}</a>` : `<span class="chip">${p}</span>`).join('');
  el.innerHTML = `<div class="inner ${TV.recite ? 'recite hidden-ans' : ''}" id="tcard">
    <h1 class="ttl">${esc(e.name)} ${e.stars != null ? stars({ stars: e.stars, note: nodeLabel(e.node) }) : ''}</h1>
    <div class="meta">${asked ? `<span class="muted small">考过：</span>${asked}` : '<span class="muted small">真题未考过</span>'}
      ${e.aliases.filter(a => a !== e.name).length ? `<span class="muted small">真题写法：${esc(e.aliases.filter(a => a !== e.name).join('、'))}</span>` : ''}
      ${e.book.length ? `<span class="chip tag">教材称“${esc(e.book.join('”“'))}”</span>` : ''}</div>
    <div class="reveal"><button id="tshow">显示答案（空格）</button><span class="muted small">先在心里说一遍定义、公式和要点</span></div>
    <div class="ans">
      <div class="def">${esc(e.def)}</div>
      ${e.formula ? `<div class="formula">${tex(e.formula, true)}</div>` : ''}
      ${e.unit ? `<div class="small">单位：${esc(e.unit)}</div>` : ''}
      ${e.points.length ? `<ul class="points">${e.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${e.note ? `<div class="notebox">${linkQ(esc(e.note))}</div>` : ''}
      ${e.see.length ? `<h2>相关名词</h2><div class="terms">${e.see.map(s => `<a class="chip" data-term-name="${esc(s)}">${esc(s)}</a>`).join('')}</div>` : ''}
      <h2>教材原文 <span class="small">${esc(nodeLabel(e.node))}</span></h2>
      ${e.cite.map(u => `<div class="snipwrap">${snip(u)}<div class="small">${readLink(u)}</div></div>`).join('')}
    </div>
    <div class="judge"><span class="muted small">这一条：</span><button id="tok">记住了（1）</button><button id="tmiss">没记住（2）</button>
      <span class="muted small">${MASTER[e.name] ? `记住 ${MASTER[e.name].ok || 0} 次 · 没记住 ${MASTER[e.name].miss || 0} 次` : ''}</span></div>
  </div>`;
  math(el);
  el.scrollTop = 0;
  $$('#termList .row').forEach(r => r.classList.toggle('cur', +r.dataset.term === TV.cur));
}
function judge(ok) {
  const e = G[TV.cur], m = MASTER[e.name] || (MASTER[e.name] = { ok: 0, miss: 0 });
  m[ok ? 'ok' : 'miss']++; m.last = ok ? 'ok' : 'miss';
  store.put('mastery', MASTER);
  const i = TV.order.indexOf(TV.cur);
  termList();
  // move on to the next term of the (possibly re-filtered) list
  const next = TV.order[Math.min(i + (TV.order.includes(G[TV.cur].i) ? 1 : 0), TV.order.length - 1)];
  if (next != null) go('terms', G[next].name); else termDetail();
}
$('#termDetail').addEventListener('click', e => {
  if (e.target.id === 'tshow') $('#tcard').classList.remove('hidden-ans');
  else if (e.target.id === 'tok') judge(true);
  else if (e.target.id === 'tmiss') judge(false);
});
function termStep(d) {
  const i = TV.order.indexOf(TV.cur) + d;
  if (i >= 0 && i < TV.order.length) go('terms', G[TV.order[i]].name);
}

/* ---------- 考纲 ---------- */
// which syllabus part (一…七) each node belongs to, via the items' node lists
const PARTS = [];
const partOfNode = {};
D.syllabus.items.forEach(it => {
  if (!PARTS.find(p => p.part === it.part)) PARTS.push({ part: it.part, title: it.part_title, items: [] });
  PARTS.find(p => p.part === it.part).items.push(it);
  it.nodes.forEach(n => { (partOfNode[n] = partOfNode[n] || new Set()).add(it.part); });
});
const qParts = q => {
  const s = new Set();
  (q.nodes || []).forEach(n => {
    // a node of a chapter/section also counts for the parts of its subsections and vice versa
    Object.keys(partOfNode).forEach(m => { if (m === n || m.startsWith(n + '/') || n.startsWith(m + '/')) partOfNode[m].forEach(p => s.add(p)); });
  });
  return s;
};
function syllabusPage() {
  const el = $('#sylPage');
  if (el.dataset.init) return;
  el.dataset.init = 1;
  const papers = D.papers;
  // grid: part x paper -> problems linked there; plus a row for 名词解释
  const cell = {};
  QS.forEach(q => { if (q.type === 'problem') qParts(q).forEach(p => (cell[p + '|' + q.paper.id] = cell[p + '|' + q.paper.id] || []).push(q.id)); });
  const shade = n => n ? `background:rgba(192,57,43,${Math.min(0.12 + n * 0.16, 0.6)})` : '';
  let h = `<h1 class="ttl">考纲地图 <span class="muted small">2026 年考纲（2025-06-25 发布），参考书只有《声学基础》第 3 版</span></h1>
    <h2>历年大题落在考纲哪一部分（格中为题数，点击打开）</h2>
    <div style="overflow-x:auto"><table class="grid"><tr><th>考纲部分</th>${papers.map(p => `<th title="${esc(p.kind + '，' + p.complete)}">${p.id.replace(/^(19|20)/, "'")}</th>`).join('')}</tr>`;
  PARTS.forEach(pt => {
    h += `<tr><td class="lbl">${pt.part}、${esc(pt.title)}</td>` + papers.map(p => {
      const qs = cell[pt.part + '|' + p.id] || [];
      return `<td class="c" style="${shade(qs.length)}" ${qs.length ? `data-q="${qs[0]}" title="${qs.join('、')}"` : ''}>${qs.length || ''}</td>`;
    }).join('') + '</tr>';
  });
  h += `<tr><td class="lbl">名词解释</td>${papers.map(p => { const q = termQ[p.id]; const n = q ? qById[q].terms.length : 0; return `<td class="c" ${q ? `data-q="${q}"` : ''}>${n || ''}</td>`; }).join('')}</tr></table></div>
    <p class="muted small">没有一份是官方原卷：都是考生回忆或答案整理中的题干。大题按题库注记与课本原型归到教材小节，再按考纲条目归到部分；一题可跨多个部分，少数题（开放题、教材外内容）未归入。</p>`;
  h += '<h2>考纲条目与教材小节</h2>';
  PARTS.forEach(pt => {
    h += `<div class="part">${pt.part}、${esc(pt.title)}</div>`;
    pt.items.forEach(it => {
      h += `<div class="item">${it.id} ${esc(it.title)}</div>${it.note ? `<div class="muted small" style="padding-left:12px">${esc(it.note)}</div>` : ''}`;
      it.nodes.forEach(n => {
        const r = rating(n) || {};
        h += `<div class="nrow"><span>${stars(r)} ${r.tags && r.tags.length ? r.tags.map(t => `<span class="chip tag">${t}</span>`).join('') : ''}</span>
          <a data-kp="${n}">${esc(nodeLabel(n))}</a><span class="note">${linkQ(esc(r.note || ''))}</span></div>`;
      });
    });
  });
  h += '<h2>课后习题分档（必做 / 选做 / 跳过）</h2>';
  NODES.filter(n => n.kind === 'chapter').forEach(ch => {
    const xs = D.exercises.filter(x => String(x.chapter) === ch.num);
    if (!xs.length) return;
    const cnt = k => xs.filter(x => (EXLV[x.id] || {}).level === k).length;
    h += `<details class="ch"><summary>第 ${ch.num} 章 ${esc(ch.title)} <span class="muted small">必做 ${cnt('必做')} · 选做 ${cnt('选做')} · 跳过 ${cnt('跳过')}</span></summary>` +
      xs.map(x => { const l = EXLV[x.id] || {}; return `<div class="exrow"><a data-read="${x.pdf_pages[0]}" data-blk="${x.start}">习题 ${x.id}</a><span class="lv lv-${l.level}">${l.level || ''}</span>
        <span>${esc(cut(x.text.split('\n')[0].replace(/^\S+\s*/, ''), 90))}<br><span class="muted small">${linkQ(esc(l.reason || ''))}</span></span></div>`; }).join('') + '</details>';
  });
  el.innerHTML = h;
  math(el);
}

/* ---------- 真题与习题 ---------- */
// solutions: a "same" entry shows its target's working with its own note on top
const SOL = D.solutions || {};
const solOf = id => {
  const s = SOL[id];
  if (!s) return null;
  const t = s.same ? SOL[s.same] : s;
  return { answer: s.answer || (t && t.answer) || '', note: s.note, body: t ? t.body : '', same: s.same, uses: s.uses || [] };
};
// small markdown: paragraphs, **bold**, "- " lists, | tables |, $$ display $$ (KaTeX renders the math afterwards)
function md(src) {
  const out = [];
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const blocks = src.replace(/\r/g, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split('\n');
    if (lines.every(l => l.trim().startsWith('|'))) {
      const rows = lines.filter(l => !/^\s*\|[\s|:-]+\|\s*$/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|'));
      out.push('<table class="mdt">' + rows.map((r, i) => '<tr>' + r.map(c => `<${i ? 'td' : 'th'}>${inline(c.trim())}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table>');
    } else if (lines.every(l => /^\s*- /.test(l))) {
      out.push('<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*- /, ''))}</li>`).join('') + '</ul>');
    } else {
      out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
    }
  }
  return out.join('');
}
function solHtml(id) {
  const s = solOf(id);
  if (!s) return '<div class="todo">解答尚未写入（阶段 4 进行中）。</div>';
  return `<div class="ansbox"><b>答案</b>　${esc(s.answer)}</div>
    ${s.same ? `<p class="muted small">与 <a data-q="${s.same}">${esc(s.same)}</a> 解答相同。</p>` : ''}
    ${s.note ? `<div class="notebox">${linkQ(esc(s.note))}</div>` : ''}
    <div class="solbody">${linkEq(md(s.body))}</div>
    ${s.uses.length ? `<p class="muted small">用到：${s.uses.map(n => `<a data-kp="${n}">${esc(nodeLabel(n))}</a>`).join('、')}</p>` : ''}`;
}
const isEx = id => !!exById[id];
const EV = { q: '', type: store.get('eType', ''), opt: store.get('eOpt', false), solved: false, cur: null, order: [] };
function examList() {
  const box = $('#examList');
  if (!box.dataset.init) {
    box.dataset.init = 1;
    box.innerHTML = `<div class="ctl"><input type="search" id="eq" placeholder="搜索题干、名词、年份、习题号…">
      <select id="etype"><option value="">真题 + 习题</option><option value="problem">只看真题大题</option><option value="term">只看名词解释</option><option value="ex">只看课后习题</option></select>
      <label class="small" title="课后习题默认只列必做"><input type="checkbox" id="eopt">含选做习题</label>
      <label class="small"><input type="checkbox" id="esolved">只看有解答</label></div><div class="rows"></div>`;
    $('#etype').value = EV.type; $('#eopt').checked = EV.opt;
    const upd = () => {
      EV.q = $('#eq').value.trim().toLowerCase(); EV.type = $('#etype').value; EV.opt = $('#eopt').checked; EV.solved = $('#esolved').checked;
      store.put('eType', EV.type); store.put('eOpt', EV.opt); examList();
    };
    ['#eq', '#etype', '#eopt', '#esolved'].forEach(s => $(s).addEventListener('input', upd));
    box.addEventListener('click', e => { const r = e.target.closest('[data-qrow]'); if (r) go('exams', r.dataset.qrow); });
  }
  const words = EV.q.split(/\s+/).filter(Boolean);
  const okSol = id => !EV.solved || !!SOL[id];
  const hay = q => [q.id, q.text, ...q.terms.map(t => t.name + ' ' + (t.raw || '')), ...q.notes].join(' ').toLowerCase();
  let h = '', n = 0;
  EV.order = [];
  if (EV.type !== 'ex') {
    [...D.papers].reverse().forEach(p => {
      const qs = p.questions.filter(q => (!EV.type || q.type === EV.type) && okSol(q.id) && words.every(w => hay(q).includes(w)));
      if (!qs.length) return;
      h += `<div class="grp">${p.year}${p.variant ? `（${p.variant}）` : ''} <span class="small muted">${esc(p.kind)} · ${esc(p.complete)}</span></div>`;
      qs.forEach(q => {
        n++; EV.order.push(q.id);
        const head = q.type === 'term' ? `名词解释：${q.terms.map(t => t.name).join('、')}` : q.text.split('\n')[0];
        h += `<div class="row${EV.cur === q.id ? ' cur' : ''}" data-qrow="${q.id}"><b style="flex:none">${esc(q.no)}</b>
          <div class="nm"><div class="sub" style="color:var(--ink);font-size:13px">${esc(cut(head, 64))}</div>
          <div class="sub">${q.type === 'term' ? '名词' : (q.nodes || []).slice(0, 2).map(x => esc(nodeLabel(x))).join('、')}${q.notes.length ? ' · 有注' : ''}</div></div>
          ${SOL[q.id] ? '<span class="cnt" title="有解答">解</span>' : ''}</div>`;
      });
    });
  }
  if (!EV.type || EV.type === 'ex') {
    NODES.filter(c => c.kind === 'chapter').forEach(ch => {
      const xs = D.exercises.filter(x => String(x.chapter) === ch.num && ['必做', ...(EV.opt ? ['选做'] : [])].includes((EXLV[x.id] || {}).level) &&
        okSol(x.id) && words.every(w => (x.id + ' ' + x.text).toLowerCase().includes(w)));
      if (!xs.length) return;
      h += `<div class="grp">习题 · 第 ${ch.num} 章 <span class="small muted">${esc(ch.title)}</span></div>`;
      xs.forEach(x => {
        n++; EV.order.push(x.id);
        const l = EXLV[x.id] || {};
        h += `<div class="row${EV.cur === x.id ? ' cur' : ''}" data-qrow="${x.id}"><b style="flex:none">${x.id}</b>
          <div class="nm"><div class="sub" style="color:var(--ink);font-size:13px">${esc(cut(x.text.replace(/^\S+\s*/, ''), 60))}</div>
          <div class="sub"><span class="lv lv-${l.level}">${l.level}</span> ${esc(cut(l.reason || '', 36))}</div></div>
          ${SOL[x.id] ? '<span class="cnt" title="有解答">解</span>' : ''}</div>`;
      });
    });
  }
  $('.rows', box).innerHTML = `<div class="muted small" style="padding:6px 12px">${n} 题 · 已有解答 ${Object.keys(SOL).length}</div>` + (h || '<p class="muted small" style="padding:6px 12px">没有符合条件的题目。</p>');
  math($('.rows', box));
}
const protoLink = r => {
  if (exById[r]) { const x = exById[r], l = EXLV[r] || {}; return `<li>习题 <a data-q="${r}">${r}</a> <span class="lv lv-${l.level}">${l.level || ''}</span>${SOL[r] ? ' <span class="cnt">有解答</span>' : ''}<div class="muted small">${esc(cut(x.text, 160))}</div></li>`; }
  if (egById[r]) { const x = egById[r]; return `<li>例题 <a data-read="${x.pdf_pages[0]}" data-blk="${x.start}">${esc(nodeLabel(x.node))} ${esc(x.title)}</a></li>`; }
  return `<li>小节 <a data-kp="${r}">${esc(nodeLabel(r))}</a></li>`;
};
function navBar(id) {
  const i = EV.order.indexOf(id);
  return `<div class="meta"><button data-step="-1" ${i <= 0 ? 'disabled' : ''}>↑ 上一题</button><button data-step="1" ${i < 0 || i >= EV.order.length - 1 ? 'disabled' : ''}>下一题 ↓</button>
    <span class="muted small">${i >= 0 ? `${i + 1} / ${EV.order.length}` : '不在当前列表中'}</span></div>`;
}
function exerciseDetail(x) {
  const l = EXLV[x.id] || {};
  const used = QS.filter(q => q.proto.includes(x.id));
  const text = x.text.replace(/^\S+\s*/, '').split('\n').map(t => `<p>${esc(t)}</p>`).join('');
  return `${navBar(x.id)}
    <h1 class="ttl">习题 ${x.id} <span class="lv lv-${l.level}">${l.level || ''}</span></h1>
    <div class="meta"><span class="muted small">第 ${x.chapter} 章 · ${esc(l.reason || '')}</span></div>
    <div class="qtext">${text}</div>
    <p class="small">${[readLink(x.start, '看原书题目'), ...(x.figs || []).map(f => readLink(f.uid, '看' + f.caption))].join('　')}</p>
    ${used.length ? `<h2>以它为原型的真题</h2><ul class="links">${used.map(q => `<li><a data-q="${q.id}">${q.id}</a> <span class="muted">${esc(cut(q.text.split('\n')[0], 60))}</span></li>`).join('')}</ul>` : ''}
    <h2>解答</h2>${solHtml(x.id)}`;
}
function examDetail() {
  const el = $('#examDetail');
  if (EV.cur == null || (!qById[EV.cur] && !exById[EV.cur])) EV.cur = EV.order[0];
  if (exById[EV.cur]) {
    el.innerHTML = `<div class="inner">${exerciseDetail(exById[EV.cur])}</div>`;
  } else {
    const q = qById[EV.cur];
    if (!q) { el.innerHTML = ''; return; }
    const p = q.paper;
    const text = q.text.split('\n').map(l => `<p>${esc(l)}</p>`).join('');
    el.innerHTML = `<div class="inner">${navBar(q.id)}
      <h1 class="ttl">${p.year}${p.variant ? `（${p.variant}）` : ''} 第${esc(q.no)}题 ${q.label ? `<span class="chip">${esc(q.label)}</span>` : ''} ${q.score ? `<span class="chip">${q.score} 分</span>` : ''}</h1>
      <div class="meta"><span class="chip">${esc(p.kind)}</span><span class="chip">${esc(p.complete)}</span><span class="muted small">来源：${esc(p.source)}</span></div>
      ${q.text ? `<div class="qtext">${text}</div>` : ''}
      ${q.terms.length ? `<div class="terms">${q.terms.map(t => `<a class="chip" data-term-name="${esc(t.name)}" title="${esc(t.raw ? '原文：' + t.raw : '')}">${esc(t.name)}</a>`).join('')}</div>
        <p class="muted small">点名词打开标准答案。</p>` : ''}
      ${q.figs.map(f => `<div class="fig">${esc(f)}</div>`).join('')}
      ${q.notes.length ? `<div class="notebox">${q.notes.map(n => linkQ(esc(n))).join('<br>')}</div>` : ''}
      ${q.type === 'problem' ? `<h2>解答</h2>${solHtml(q.id)}` : ''}
      ${(() => { const ms = q.type === 'problem' ? MODELS.filter(m => mQs(m).includes(q)) : [], ds = DERIVS.filter(d => d.asked.includes(q.id));
        return ms.length || ds.length ? `<h2>模型与推导</h2><div class="terms">${ms.map(m => `<a class="chip" data-model="${m.id}">模型：${esc(m.name)}</a>`).join('')}
          ${ds.map(d => `<a class="chip" data-derive="${d.id}">推导默写：${esc(d.name)}</a>`).join('')}</div>` : ''; })()}
      ${q.proto.length ? `<h2>课本原型</h2><ul class="links">${q.proto.map(protoLink).join('')}</ul>` : ''}
      ${(q.nodes || []).length ? `<h2>相关小节</h2><ul class="links">${q.nodes.map(n => `<li>${nodeStars(n)} <a data-kp="${n}">${esc(nodeLabel(n))}</a>
        <div class="muted small">${linkQ(esc((rating(n) || {}).note || ''))}</div></li>`).join('')}</ul>` : ''}
      ${p.notes.length ? `<h2>关于这份试卷</h2><div class="muted small">${p.notes.map(esc).join('<br>')}</div>` : ''}
    </div>`;
  }
  math(el);
  el.scrollTop = 0;
  $$('#examList .row').forEach(r => r.classList.toggle('cur', r.dataset.qrow === EV.cur));
  const cur = $('#examList .row.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
$('#examDetail').addEventListener('click', e => { const s = e.target.closest('[data-step]'); if (s) examStep(+s.dataset.step); });
function examStep(d) {
  const i = EV.order.indexOf(EV.cur) + d;
  if (i >= 0 && i < EV.order.length) go('exams', EV.order[i]);
}

/* ---------- 知识点（按教材小节） ---------- */
const LEAVES = NODES.filter(n => (n.kind === 'section' || n.kind === 'subsection') && !NODES.some(m => m.id.startsWith(n.id + '/')));
const under = (id, n) => n === id || n.startsWith(id + '/');
const KV = { q: '', min: store.get('kMin', 1), cur: null, order: [] };
const kpQs = id => QS.filter(q => (q.nodes || []).some(n => under(id, n) || under(n, id) && nodeById[n] && nodeById[n].kind !== 'chapter'));
const kpEx = id => D.exercises.filter(x => (x.nodes || []).some(n => under(id, n) || under(n, id)));
const kpTerms = id => G.filter(e => e.node && under(id, e.node));
const kpEgs = id => D.examples.filter(e => under(id, e.node));
function kpList() {
  const box = $('#kpList');
  if (!box.dataset.init) {
    box.dataset.init = 1;
    box.innerHTML = `<div class="ctl"><input type="search" id="kq" placeholder="搜索小节标题、评级理由…">
      <select id="kmin"><option value="3">只看 ★★★</option><option value="2">★★ 以上</option><option value="1">★ 以上（考纲范围）</option><option value="0">全部小节</option></select></div><div class="rows"></div>`;
    $('#kmin').value = KV.min;
    const upd = () => { KV.q = $('#kq').value.trim().toLowerCase(); KV.min = +$('#kmin').value; store.put('kMin', KV.min); kpList(); };
    ['#kq', '#kmin'].forEach(s => $(s).addEventListener('input', upd));
    box.addEventListener('click', e => { const r = e.target.closest('[data-krow]'); if (r) go('kp', r.dataset.krow); });
  }
  const words = KV.q.split(/\s+/).filter(Boolean);
  let h = '', n = 0, ch = null;
  KV.order = [];
  LEAVES.forEach(nd => {
    const r = rating(nd.id) || {};
    if ((r.stars ?? 0) < KV.min) return;
    if (!words.every(w => (nd.num + ' ' + nd.title + ' ' + (r.note || '')).toLowerCase().includes(w))) return;
    const c = nd.id.split('/').slice(0, 2).join('/');
    if (c !== ch) { ch = c; h += `<div class="grp">${esc(nodeLabel(c))}</div>`; }
    n++; KV.order.push(nd.id);
    const nq = kpQs(nd.id).length, nx = kpEx(nd.id).length, nt = kpTerms(nd.id).length;
    h += `<div class="row${KV.cur === nd.id ? ' cur' : ''}" data-krow="${nd.id}"><div class="nm"><div>${esc(nd.num)} ${esc(nd.title)}</div>
      <div class="sub">${[nq && `真题 ${nq}`, nx && `习题 ${nx}`, nt && `名词 ${nt}`].filter(Boolean).join(' · ')}${(r.tags || []).length ? ' · ' + r.tags.join(' ') : ''}</div></div>${stars(r)}</div>`;
  });
  $('.rows', box).innerHTML = `<div class="muted small" style="padding:6px 12px">${n} 个小节</div>` + h;
}
function kpDetail() {
  const el = $('#kpDetail');
  if (!KV.cur || !nodeById[KV.cur]) KV.cur = KV.order[0];
  const id = KV.cur, nd = nodeById[id];
  if (!nd) { el.innerHTML = ''; return; }
  const r = rating(id) || {};
  const items = D.syllabus.items.filter(it => it.nodes.some(m => under(m, id) || under(id, m)));
  const qs = kpQs(id), xs = kpEx(id), ts = kpTerms(id), egs = kpEgs(id);
  const i = KV.order.indexOf(id);
  el.innerHTML = `<div class="inner">
    <div class="meta"><button data-kstep="-1" ${i <= 0 ? 'disabled' : ''}>↑ 上一节</button><button data-kstep="1" ${i < 0 || i >= KV.order.length - 1 ? 'disabled' : ''}>下一节 ↓</button></div>
    <div class="small muted">${esc(nodeLabel(id.split('/').slice(0, 2).join('/')))}</div>
    <h1 class="ttl">${esc(nd.num)} ${esc(nd.title)} ${stars(r)} ${(r.tags || []).map(t => `<span class="chip tag">${t}</span>`).join('')}</h1>
    <div class="meta"><a data-read="${nd.pdf_page}" data-blk="${nd.anchor}">在书中阅读（第 ${nd.page} 页）</a>
      ${items.map(it => `<span class="chip" title="${esc(it.part_title)}">考纲 ${it.id} ${esc(cut(it.title, 18))}</span>`).join('')}</div>
    ${r.note ? `<div class="def" style="font-size:15px">${linkQ(esc(r.note))}</div>` : ''}
    ${ts.length ? `<h2>名词（${ts.length}）</h2><ul class="links">${ts.map(e => `<li><a data-term-name="${esc(e.name)}">${esc(e.name)}</a>${e.asked.length ? ` <span class="cnt">考 ${e.asked.length} 次</span>` : ''}
      <div class="muted small">${esc(cut(e.def, 90))}</div></li>`).join('')}</ul>` : ''}
    ${(() => { const ms = MODELS.filter(m => covers(m, id)), ds = DERIVS.filter(d => d.nodes.some(n => under(n, id) || under(id, n)));
      return ms.length || ds.length ? `<h2>模型与推导</h2><div class="terms">${ms.map(m => `<a class="chip" data-model="${m.id}">模型：${esc(m.name)}</a>`).join('')}
        ${ds.map(d => `<a class="chip" data-derive="${d.id}">推导：${esc(d.name)}</a>`).join('')}</div>` : ''; })()}
    ${qs.length ? `<h2>真题（${qs.length}）</h2><ul class="links">${qs.map(q => { const s = solOf(q.id); return `<li><a data-q="${q.id}">${q.id}</a> ${esc(cut(q.type === 'term' ? '名词解释' : q.text.split('\n')[0], 50))}
      ${s ? `<div class="muted small">答：${esc(cut(s.answer, 110))}</div>` : ''}</li>`; }).join('')}</ul>` : ''}
    ${xs.length ? `<h2>习题（${xs.length}）</h2><ul class="links">${xs.map(x => { const l = EXLV[x.id] || {}, s = solOf(x.id); return `<li><a data-q="${x.id}">习题 ${x.id}</a> <span class="lv lv-${l.level}">${l.level || ''}</span>
      <div class="muted small">${esc(cut(x.text.replace(/^\S+\s*/, ''), 70))}${s ? `<br>答：${esc(cut(s.answer, 100))}` : ''}</div></li>`; }).join('')}</ul>` : ''}
    ${egs.length ? `<h2>例题（${egs.length}）</h2><ul class="links">${egs.map(e => { const l = EGLV[e.id] || {}; return `<li><a data-read="${e.pdf_pages[0]}" data-blk="${e.start}">${esc(e.title)}</a> ${l.level ? `<span class="lv lv-${l.level}">${l.level}</span>` : ''}</li>`; }).join('')}</ul>` : ''}
    ${!ts.length && !qs.length && !xs.length && !egs.length ? '<p class="muted">这一节还没有关联的名词、真题或习题。</p>' : ''}
  </div>`;
  math(el);
  el.scrollTop = 0;
  $$('#kpList .row').forEach(x => x.classList.toggle('cur', x.dataset.krow === id));
  const cur = $('#kpList .row.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
$('#kpDetail').addEventListener('click', e => {
  const s = e.target.closest('[data-kstep]');
  if (s) { const i = KV.order.indexOf(KV.cur) + +s.dataset.kstep; if (i >= 0 && i < KV.order.length) go('kp', KV.order[i]); }
});

/* ---------- 模型与推导 ---------- */
const MD = D.models || { steps: [], models: [], relations: [], derivations: [], eqs: {} };
const EQS = MD.eqs;
// equation numbers like (2-1-5) outside $…$ become links to the formula in the book
function linkEq(html) {
  return html.split(/(\$\$[\s\S]*?\$\$|\$[^$]*\$)/).map((s, i) => i % 2 ? s : s.replace(/[（(](\d{1,2}-\d{1,2}-\d{1,3}[a-z]?)[)）]/g,
    (m, k) => EQS[k] ? `<a class="eq" data-read="${EQS[k][1]}" data-blk="${EQS[k][0]}" title="在书中查看式 (${k})">(${k})</a>` : m)).join('');
}
const MODELS = MD.models, mById = Object.fromEntries(MODELS.map(m => [m.id, m]));
const DERIVS = MD.derivations, dById = Object.fromEntries(DERIVS.map(d => [d.id, d]));
const covers = (m, id) => m.nodes.some(n => under(n, id) || under(id, n));
const mQs = m => QS.filter(q => q.type === 'problem' && (q.nodes || []).some(n => m.nodes.some(k => under(k, n) || under(n, k) && nodeById[n] && nodeById[n].kind !== 'chapter')));
const mEx = m => D.exercises.filter(x => (EXLV[x.id] || {}).level === '必做' && (x.nodes || []).some(n => m.nodes.some(k => under(k, n) || under(n, k))));
const mStars = m => Math.max(...m.nodes.map(n => (rating(n) || {}).stars ?? 0));
const mRels = m => MD.relations.filter(r => r.a === m.id || r.b === m.id);
const mDerivs = m => DERIVS.filter(d => d.models.includes(m.id));
const mLink = id => `<a data-model="${id}">${esc(mById[id].name)}</a>`;
const REL_NOTE = { 类比: '不同物理系统，方程同形', 同一数学: '同一类方程或本征值问题', 退化: '极限或特例', 互易: '互易原理及其推论' };
const MV = { q: '', cur: null, order: [] };
function modelList() {
  const box = $('#modelList');
  if (!box.dataset.init) {
    box.dataset.init = 1;
    box.innerHTML = `<div class="ctl"><input type="search" id="mq" placeholder="搜索模型、公式、关系…"></div><div class="rows"></div>`;
    $('#mq').addEventListener('input', () => { MV.q = $('#mq').value.trim().toLowerCase(); modelList(); });
    box.addEventListener('click', e => { const r = e.target.closest('[data-mrow]'); if (r) go('models', r.dataset.mrow); });
  }
  const words = MV.q.split(/\s+/).filter(Boolean);
  const text = m => (m.name + ' ' + m.brief + ' ' + Object.values(m.steps).map(s => s.short + ' ' + s.body).join(' ') + ' ' + mRels(m).map(r => r.text).join(' ')).toLowerCase();
  let h = `<div class="row${MV.cur === '_matrix' ? ' cur' : ''}" data-mrow="_matrix"><div class="nm"><div>总览：模型 × 解题环节</div><div class="sub">${MODELS.length} 个模型 × ${MD.steps.length} 个环节</div></div></div>
    <div class="row${MV.cur === '_rel' ? ' cur' : ''}" data-mrow="_rel"><div class="nm"><div>模型之间的关系</div><div class="sub">${Object.keys(REL_NOTE).map(k => `${k} ${MD.relations.filter(r => r.kind === k).length}`).join(' · ')}</div></div></div>`;
  let ch = null;
  MV.order = ['_matrix', '_rel'];
  MODELS.filter(m => words.every(w => text(m).includes(w))).forEach(m => {
    const c = m.nodes[0].split('/').slice(0, 2).join('/');
    if (c !== ch) { ch = c; h += `<div class="grp">${esc(nodeLabel(c))}</div>`; }
    MV.order.push(m.id);
    const nq = mQs(m).length, nd = mDerivs(m).length;
    h += `<div class="row${MV.cur === m.id ? ' cur' : ''}" data-mrow="${m.id}"><div class="nm"><div>${esc(m.name)}</div>
      <div class="sub">${[nq && `真题 ${nq}`, nd && `推导 ${nd}`, `关系 ${mRels(m).length}`].filter(Boolean).join(' · ')}</div></div>${stars({ stars: mStars(m) })}</div>`;
  });
  $('.rows', box).innerHTML = h;
}
function matrixHtml() {
  return `<h1 class="ttl">模型 × 解题环节</h1>
    <p class="muted small">每个物理模型都按同一套环节求解：条件 → 方程 → 边界 → 解 → 能量 → 阻抗 → 特性。横着看是一个模型的完整解法，竖着看是同一环节在不同模型里的形式。点格子打开该模型。</p>
    <div class="mxwrap"><table class="mx"><tr><th>模型</th>${MD.steps.map(s => `<th>${s}</th>`).join('')}<th>真题</th></tr>
    ${MODELS.map(m => `<tr><td class="mn"><a data-model="${m.id}">${esc(m.name)}</a> ${stars({ stars: mStars(m) })}</td>${MD.steps.map(s => m.steps[s]
      ? `<td data-model="${m.id}" data-mstep="${s}">${esc(m.steps[s].short)}</td>` : '<td class="none">—</td>').join('')}<td>${mQs(m).length || ''}</td></tr>`).join('')}</table></div>`;
}
function relHtml() {
  return `<h1 class="ttl">模型之间的关系</h1>
    <p class="muted small">把各章的模型连起来：方程同形的可以互相类比，取极限会退化成更简单的模型，同一类本征值问题共用一套数学。</p>
    ${Object.keys(REL_NOTE).map(k => {
      const rs = MD.relations.filter(r => r.kind === k);
      return rs.length ? `<h2>${k}（${rs.length}）<span class="small">　${REL_NOTE[k]}</span></h2><ul class="rels">${rs.map(r =>
        `<li><div class="pair">${mLink(r.a)} <span class="muted">${k === '退化' ? '→' : '↔'}</span> ${mLink(r.b)}</div><div class="rtext">${linkEq(esc(r.text))}</div></li>`).join('')}</ul>` : '';
    }).join('')}`;
}
function modelCard(m) {
  const i = MV.order.indexOf(m.id);
  const qs = mQs(m), xs = mEx(m), ds = mDerivs(m), rels = mRels(m);
  return `<div class="meta"><button data-mstepnav="-1" ${i <= 2 ? 'disabled' : ''}>↑ 上一个</button><button data-mstepnav="1" ${i < 0 || i >= MV.order.length - 1 ? 'disabled' : ''}>下一个 ↓</button></div>
    <h1 class="ttl">${esc(m.name)} ${stars({ stars: mStars(m) })}</h1>
    <div class="def" style="font-size:15px">${linkEq(esc(m.brief))}</div>
    <div class="meta">${m.nodes.map(n => `<a class="chip" data-kp="${n}">${esc(nodeLabel(n))}</a>`).join('')}</div>
    <div class="msteps">${MD.steps.map(s => m.steps[s] ? `<div class="mstep" id="ms-${s}"><div class="mk">${s}</div><div class="mv">
      <div class="short">${esc(m.steps[s].short)}</div><div class="solbody">${linkEq(md(m.steps[s].body))}</div></div></div>` : '').join('')}</div>
    ${rels.length ? `<h2>与其他模型的关系</h2><ul class="rels">${rels.map(r => { const o = r.a === m.id ? r.b : r.a;
      return `<li><div class="pair"><span class="chip">${r.kind}</span> ${r.kind === '退化' ? (r.a === m.id ? '→ ' : '← ') : ''}${mLink(o)}</div><div class="rtext">${linkEq(esc(r.text))}</div></li>`; }).join('')}</ul>` : ''}
    ${ds.length ? `<h2>推导默写（${ds.length}）</h2><ul class="links">${ds.map(d => `<li><a data-derive="${d.id}">${esc(d.name)}</a>${d.asked.length ? ` <span class="cnt">考 ${d.asked.length} 次</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${qs.length ? `<h2>真题（${qs.length}）</h2><ul class="links">${qs.map(q => { const s = solOf(q.id); return `<li><a data-q="${q.id}">${q.id}</a> ${esc(cut(q.text.split('\n')[0], 50))}
      ${s ? `<div class="muted small">答：${esc(cut(s.answer, 110))}</div>` : ''}</li>`; }).join('')}</ul>` : ''}
    ${xs.length ? `<h2>必做习题（${xs.length}）</h2><ul class="links">${xs.map(x => { const s = solOf(x.id); return `<li><a data-q="${x.id}">习题 ${x.id}</a>
      <div class="muted small">${esc(cut(x.text.replace(/^\S+\s*/, ''), 70))}${s ? `<br>答：${esc(cut(s.answer, 100))}` : ''}</div></li>`; }).join('')}</ul>` : ''}`;
}
function modelDetail(step) {
  const el = $('#modelDetail');
  if (!MV.cur || (MV.cur[0] !== '_' && !mById[MV.cur])) MV.cur = '_matrix';
  const wide = MV.cur === '_matrix';
  el.innerHTML = `<div class="inner${wide ? ' wide' : ''}">${MV.cur === '_matrix' ? matrixHtml() : MV.cur === '_rel' ? relHtml() : modelCard(mById[MV.cur])}</div>`;
  math(el);
  el.scrollTop = 0;
  if (step) { const s = $('#ms-' + step, el); if (s) { s.scrollIntoView({ block: 'start' }); s.classList.add('flash'); } }
  $$('#modelList .row').forEach(r => r.classList.toggle('cur', r.dataset.mrow === MV.cur));
  const cur = $('#modelList .row.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function modelStep(d) {
  const i = MV.order.indexOf(MV.cur) + d;
  if (i >= 0 && i < MV.order.length) go('models', MV.order[i]);
}
$('#modelDetail').addEventListener('click', e => { const s = e.target.closest('[data-mstepnav]'); if (s) modelStep(+s.dataset.mstepnav); });

const DV = { filter: store.get('dFilter', ''), recite: store.get('dRecite', false), cur: null, order: [], shown: 0 };
const DMASTER = store.get('dmastery', {});   // derivation id -> { ok, miss, last }
const dLast = d => (DMASTER[d.id] || {}).last;
function deriveList() {
  const box = $('#deriveList');
  if (!box.dataset.init) {
    box.dataset.init = 1;
    box.innerHTML = `<div class="ctl"><select id="dfilter"><option value="">全部推导</option><option value="asked">考过的</option><option value="miss">没记住的</option><option value="new">还没练过的</option></select>
      <label class="small" title="遮住每一步，先回忆再展开（空格），全部展开后标记记住 / 没记住（1 / 2）"><input type="checkbox" id="drecite">默写</label></div><div class="rows"></div>`;
    $('#dfilter').value = DV.filter; $('#drecite').checked = DV.recite;
    $('#dfilter').addEventListener('input', e => { DV.filter = e.target.value; store.put('dFilter', DV.filter); deriveList(); });
    $('#drecite').addEventListener('change', e => { e.target.blur(); DV.recite = e.target.checked; store.put('dRecite', DV.recite); DV.shown = 0; deriveDetail(); });
    box.addEventListener('click', e => { const r = e.target.closest('[data-drow]'); if (r) go('derive', r.dataset.drow); });
  }
  const ds = DERIVS.filter(d => (DV.filter !== 'asked' || d.asked.length) && (DV.filter !== 'miss' || dLast(d) === 'miss') && (DV.filter !== 'new' || !dLast(d)));
  DV.order = ds.map(d => d.id);
  let h = `<div class="muted small" style="padding:6px 12px">${ds.length} 条推导 · 已记住 ${DERIVS.filter(d => dLast(d) === 'ok').length} / ${DERIVS.length}</div>`, ch = null;
  ds.forEach(d => {
    const c = d.nodes[0].split('/').slice(0, 2).join('/');
    if (c !== ch) { ch = c; h += `<div class="grp">${esc(nodeLabel(c))}</div>`; }
    h += `<div class="row${DV.cur === d.id ? ' cur' : ''}" data-drow="${d.id}"><span class="dot ${dLast(d) || ''}"></span><div class="nm"><div>${esc(d.name)}</div>
      <div class="sub">${d.steps.length} 步 · ${esc(d.nodes.map(n => nodeById[n].num).join(' '))}</div></div>${d.asked.length ? `<span class="cnt">考 ${d.asked.length} 次</span>` : ''}</div>`;
  });
  $('.rows', box).innerHTML = h;
}
function deriveDetail() {
  const el = $('#deriveDetail');
  if (!DV.cur || !dById[DV.cur]) DV.cur = DV.order[0] || DERIVS[0].id;
  const d = dById[DV.cur], n = d.steps.length, i = DV.order.indexOf(d.id);
  const hide = k => DV.recite && k >= DV.shown;
  el.innerHTML = `<div class="inner${DV.recite ? ' drecite' : ''}">
    <div class="meta"><button data-dnav="-1" ${i <= 0 ? 'disabled' : ''}>↑ 上一条</button><button data-dnav="1" ${i < 0 || i >= DV.order.length - 1 ? 'disabled' : ''}>下一条 ↓</button></div>
    <h1 class="ttl">${esc(d.name)}</h1>
    <div class="meta">${d.asked.length ? `<span class="muted small">考过：</span>${d.asked.map(q => `<a class="chip" data-q="${q}">${q}</a>`).join('')}` : '<span class="muted small">真题未直接要求推导</span>'}</div>
    <div class="meta"><span class="muted small">模型：</span>${d.models.map(m => `<a class="chip" data-model="${m}">${esc(mById[m].name)}</a>`).join('')}
      <span class="muted small">教材：</span>${d.nodes.map(x => `<a class="chip" data-kp="${x}">${esc(nodeLabel(x))}</a>`).join('')}</div>
    <h2>目标</h2><div class="formula">${esc(d.goal)}</div>
    ${d.note ? `<div class="notebox">${linkEq(esc(d.note))}</div>` : ''}
    <h2>步骤${DV.recite ? `　<span class="small">已展开 ${Math.min(DV.shown, n)} / ${n}</span>` : ''}</h2>
    <div class="dsteps">${d.steps.map((s, k) => `<div class="dstep${hide(k) ? ' hid' : ''}" data-ds="${k}">
      <div class="dh"><span class="dn">${k + 1}</span><span class="dt">${esc(s.title.replace(/^\d+\.\s*/, ''))}</span><span class="dph">先回忆这一步，再点开（空格）</span></div>
      <div class="db solbody">${linkEq(md(s.body))}</div></div>`).join('')}</div>
    ${DV.recite ? `<div class="meta" style="margin-top:14px">${DV.shown < n ? '<button id="dnext">显示下一步（空格）</button><button id="dall">全部显示</button>'
      : `<span class="muted small">这一条：</span><button id="dok">记住了（1）</button><button id="dmiss">没记住（2）</button>`}
      <span class="muted small">${DMASTER[d.id] ? `记住 ${DMASTER[d.id].ok || 0} 次 · 没记住 ${DMASTER[d.id].miss || 0} 次` : ''}</span></div>`
      : '<p class="muted small">勾选左上角“默写”可以逐步遮挡，先自己推再对答案。</p>'}
  </div>`;
  math(el);
  $$('#deriveList .row').forEach(r => r.classList.toggle('cur', r.dataset.drow === d.id));
  const cur = $('#deriveList .row.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function deriveReveal(all) {
  const n = dById[DV.cur].steps.length;
  if (DV.shown >= n) return;
  DV.shown = all ? n : DV.shown + 1;
  const top = $('#deriveDetail').scrollTop;
  deriveDetail();
  $('#deriveDetail').scrollTop = top;
  const s = $(`#deriveDetail [data-ds="${DV.shown - 1}"]`); if (s) s.scrollIntoView({ block: 'nearest' });
}
function deriveJudge(ok) {
  const m = DMASTER[DV.cur] || (DMASTER[DV.cur] = { ok: 0, miss: 0 });
  m[ok ? 'ok' : 'miss']++; m.last = ok ? 'ok' : 'miss';
  store.put('dmastery', DMASTER);
  const i = DV.order.indexOf(DV.cur);
  deriveList();
  const next = DV.order[Math.min(i + (DV.order.includes(DV.cur) ? 1 : 0), DV.order.length - 1)];
  if (next && next !== DV.cur) go('derive', next); else { DV.shown = 0; deriveDetail(); }
}
function deriveStep(d) {
  const i = DV.order.indexOf(DV.cur) + d;
  if (i >= 0 && i < DV.order.length) go('derive', DV.order[i]);
}
$('#deriveDetail').addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'dnext') deriveReveal(false);
  else if (t.id === 'dall') deriveReveal(true);
  else if (t.id === 'dok') deriveJudge(true);
  else if (t.id === 'dmiss') deriveJudge(false);
  else if (t.closest('[data-dnav]')) deriveStep(+t.closest('[data-dnav]').dataset.dnav);
  else { const s = t.closest('.dstep.hid'); if (s && +s.dataset.ds === DV.shown) deriveReveal(false); }
});

/* ---------- 教材 ---------- */
const R = { page: store.get('rPage', firstPage('AC/1')), sel: null, tint: store.get('rTint', true) };
const PAGES = D.book.pages.map(p => p[0]);
function tocInit() {
  const box = $('#toc');
  box.innerHTML = NODES.filter(n => n.kind !== 'subsection' || true).map(n => {
    const lv = n.kind === 'chapter' || n.kind === 'appendix' ? 1 : n.kind === 'subsection' ? 3 : 2;
    return `<div class="t l${lv}" data-tnode="${n.id}"><span class="x">${esc(n.kind === 'chapter' ? `${n.num} ${n.title}` : n.kind === 'exercises' ? n.title : `${n.num} ${n.title}`)}</span>${n.kind !== 'exercises' ? nodeStars(n.id) : ''}</div>`;
  }).join('');
  box.addEventListener('click', e => { const t = e.target.closest('[data-tnode]'); if (t) { const n = nodeById[t.dataset.tnode]; go('read', `${n.pdf_page}/${n.anchor}`); } });
  $('#rbar').innerHTML = `<button data-pg="-1" title="上一页（←）">◀</button><span id="rpg"></span><button data-pg="1" title="下一页（→）">▶</button>
    <label class="small"><input type="checkbox" id="rtint">按评级着色</label>
    <span class="muted small" title="段落底色：红 ★★★、黄 ★★、绿 ★；左侧色条：必做（红）/ 选做（黄）习题；“名”：给出名词定义的段落">底色＝评级 · 色条＝习题分档 · 名＝名词定义</span>`;
  $('#rtint').checked = R.tint;
  $('#rtint').addEventListener('change', e => { R.tint = e.target.checked; store.put('rTint', R.tint); $('.pg') && $('.pg').classList.toggle('tint', R.tint); });
  $('#rbar').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) pageStep(+b.dataset.pg); });
  $('#pageWrap').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (b) { R.sel = b.dataset.u; markSel(); sidePanel(); } });
}
function pageStep(d) {
  const i = PAGES.indexOf(R.page) + d;
  if (i >= 0 && i < PAGES.length) go('read', String(PAGES[i]));
}
function renderPage() {
  const p = R.page, pg = PAGE[p];
  store.put('rPage', p);
  $('#rpg').textContent = `第 ${pg.printed ?? '—'} 页（PDF ${p} / ${PAGES.length}）`;
  const bl = (blocksByPage[p] || []).filter(b => !b.mi && b.l !== 'formula_number');
  const pct = (v, w) => (v / w * 100).toFixed(3) + '%';
  $('#pageWrap').innerHTML = `<div class="pg${R.tint ? ' tint' : ''}" style="max-width:${Math.min(pg.w * 0.75, 980)}px">
    <img src="pages/AC/${String(p).padStart(4, '0')}.webp" alt="">` +
    bl.map(b => {
      const boxes = [b.b, ...(b.xb || [])];
      const r = rating(b.n), ex = b.ex && EXLV[b.ex];
      const cls = ['blk', r ? 'r' + r.stars : '', ex ? 'ex-' + ex.level : '', b.g ? 'def' : '', R.sel === b.u ? 'sel' : ''].join(' ');
      return boxes.map((x, k) => `<div class="${cls}${k ? ' xb' : ''}" data-u="${b.u}" style="left:${pct(x[0], pg.w)};top:${pct(x[1], pg.h)};width:${pct(x[2] - x[0], pg.w)};height:${pct(x[3] - x[1], pg.h)}"></div>`).join('');
    }).join('') + '</div>';
  $('#pageWrap').scrollTop = 0;
  if (R.sel) { const s = $(`.blk[data-u="${R.sel}"]`); if (s) s.scrollIntoView({ block: 'center' }); }
  sidePanel();
}
function markSel() { $$('#pageWrap .blk').forEach(x => x.classList.toggle('sel', x.dataset.u === R.sel)); }
function sidePanel() {
  const el = $('#side');
  const b = R.sel && blockByUid[R.sel];
  const nid = b ? b.n : ((blocksByPage[R.page] || []).find(x => x.n) || {}).n;
  $$('#toc .t').forEach(t => t.classList.toggle('cur', !!nid && nid === t.dataset.tnode));
  const cur = $('#toc .t.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  if (!nid) { el.innerHTML = '<p class="muted">这一页不在正文范围内。</p>'; return; }
  const r = rating(nid) || {};
  // the node and its ancestors (a question cited on a section applies to its subsections too)
  const chain = []; let id = nid;
  while (id && id.includes('/')) { chain.unshift(id); id = id.slice(0, id.lastIndexOf('/')); }
  const qs = [...new Set(chain.flatMap(n => qByNode[n] || []))];
  let h = `<div class="small muted">${chain.map(n => esc(nodeLabel(n))).join(' › ')}</div>
    <h3>${esc(nodeLabel(nid))} ${stars(r)}</h3>${r.note ? `<div>${linkQ(esc(r.note))}</div>` : ''}
    ${r.tags && r.tags.length ? `<div>${r.tags.map(t => `<span class="chip tag">${t}</span>`).join(' ')}</div>` : ''}`;
  if (b && b.g) h += `<h3>本段给出定义的名词</h3><div class="terms">${b.g.map(i => `<a class="chip" data-term-name="${esc(G[i].name)}">${esc(G[i].name)}${G[i].asked.length ? ` · 考 ${G[i].asked.length} 次` : ''}</a>`).join('')}</div>`;
  if (b && b.ex) {
    const l = EXLV[b.ex] || {};
    const used = QS.filter(q => q.proto.includes(b.ex)).map(q => `<a data-q="${q.id}">${q.id}</a>`);
    h += `<h3>习题 ${b.ex} <span class="lv lv-${l.level}">${l.level || ''}</span></h3><div>${linkQ(esc(l.reason || ''))}</div>${used.length ? `<div>真题原型：${used.join('、')}</div>` : ''}`;
  }
  if (b && b.eg) {
    const l = EGLV[b.eg] || {};
    const used = QS.filter(q => q.proto.includes(b.eg)).map(q => `<a data-q="${q.id}">${q.id}</a>`);
    h += `<h3>${esc(b.eg.split('#')[1])} ${l.level ? `<span class="lv lv-${l.level}">${l.level}</span>` : ''}</h3>${l.reason ? `<div>${linkQ(esc(l.reason))}</div>` : ''}${used.length ? `<div>真题原型：${used.join('、')}</div>` : ''}`;
  }
  if (qs.length) h += `<h3>相关真题（${qs.length}）</h3><ul>${qs.map(q => `<li><a data-q="${q}">${q}</a> <span class="muted">${esc(cut((qById[q].text || (qById[q].terms || []).map(t => t.name).join('、')).split('\n')[0], 40))}</span></li>`).join('')}</ul>`;
  const terms = G.filter(e => e.node && chain.includes(e.node));
  if (terms.length && !(b && b.g)) h += `<h3>本节名词</h3><div class="terms">${terms.map(e => `<a class="chip" data-term-name="${esc(e.name)}">${esc(e.name)}</a>`).join('')}</div>`;
  if (!b) h += '<p class="muted small">点击页面上的段落查看它的评级、名词与相关真题。</p>';
  el.innerHTML = h;
  math(el);
}

/* ---------- routing ---------- */
let VIEW = null;
function go(view, arg = '') { location.hash = view + (arg !== '' ? '/' + encodeURIComponent(arg).replace(/%2F/g, '/') : ''); }
function route() {
  const [v, ...rest] = decodeURIComponent(location.hash.slice(1)).split('/');
  VIEW = ['terms', 'kp', 'models', 'derive', 'syllabus', 'exams', 'read'].includes(v) ? v : 'terms';
  const arg = rest.join('/');
  $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + VIEW));
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.view === VIEW));
  document.body.dataset.view = VIEW;
  if (VIEW === 'terms') {
    termList();
    if (arg && gByName[arg] != null) TV.cur = gByName[arg];
    termDetail();
    const cur = $('#termList .row.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  } else if (VIEW === 'kp') { kpList(); if (arg && nodeById[arg]) KV.cur = arg; kpDetail(); }
  else if (VIEW === 'models') { const [mid, step] = arg.split('#'); if (mid) MV.cur = mid; modelList(); modelDetail(step); }
  else if (VIEW === 'derive') { if (arg && dById[arg] && arg !== DV.cur) { DV.cur = arg; DV.shown = 0; } deriveList(); deriveDetail(); }
  else if (VIEW === 'syllabus') syllabusPage();
  else if (VIEW === 'exams') { examList(); if (arg) EV.cur = arg; examDetail(); }
  else if (VIEW === 'read') {
    if (!$('#toc').childElementCount) tocInit();
    const [pg, blk] = arg.split('/');
    if (pg && PAGE[+pg]) R.page = +pg;
    R.sel = blk && blockByUid[blk] ? (blockByUid[blk].mi || blk) : null;
    renderPage();
  }
}
$('#tabs').addEventListener('click', e => {
  const a = e.target.closest('a[data-view]');
  if (!a) return;
  const v = a.dataset.view;
  go(v, v === 'terms' && TV.cur != null ? G[TV.cur].name : v === 'exams' && EV.cur ? EV.cur : v === 'kp' && KV.cur ? KV.cur : v === 'models' && MV.cur ? MV.cur : v === 'derive' && DV.cur ? DV.cur : v === 'read' ? String(R.page) : '');
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-q],[data-term-name],[data-read],[data-kp],[data-model],[data-derive]');
  if (!t || t.closest('#tabs')) return;
  if (t.dataset.q) go('exams', t.dataset.q);
  else if (t.dataset.model) go('models', t.dataset.model + (t.dataset.mstep ? '#' + t.dataset.mstep : ''));
  else if (t.dataset.derive) go('derive', t.dataset.derive);
  else if (t.dataset.kp) go('kp', t.dataset.kp);
  else if (t.dataset.termName) go('terms', t.dataset.termName);
  else if (t.dataset.read) {
    const blk = t.dataset.blk || (t.dataset.node && nodeById[t.dataset.node] ? nodeById[t.dataset.node].anchor : '');
    go('read', t.dataset.read + (blk ? '/' + blk : ''));
  }
});
addEventListener('hashchange', route);
addEventListener('keydown', e => {
  if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-7]$/.test(e.code)) { e.preventDefault(); $$('#tabs a')[+e.code.slice(5) - 1].click(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input, select, textarea'))) return;
  const k = e.key;
  const down = k === 'ArrowDown' || k === 'j', up = k === 'ArrowUp' || k === 'k';
  if (VIEW === 'terms') {
    if (down || up) { e.preventDefault(); termStep(down ? 1 : -1); }
    else if (k === ' ' && $('#tcard.hidden-ans')) { e.preventDefault(); $('#tcard').classList.remove('hidden-ans'); }
    else if ((k === '1' || k === '2') && $('#tcard.recite:not(.hidden-ans)')) judge(k === '1');
  } else if (VIEW === 'exams' && (down || up)) { e.preventDefault(); examStep(down ? 1 : -1); }
  else if (VIEW === 'models' && (down || up)) { e.preventDefault(); modelStep(down ? 1 : -1); }
  else if (VIEW === 'derive') {
    if (down || up) { e.preventDefault(); deriveStep(down ? 1 : -1); }
    else if (k === ' ' && DV.recite && DV.shown < dById[DV.cur].steps.length) { e.preventDefault(); deriveReveal(false); }
    else if ((k === '1' || k === '2') && DV.recite && DV.shown >= dById[DV.cur].steps.length) deriveJudge(k === '1');
  }
  else if (VIEW === 'kp' && (down || up)) { e.preventDefault(); const i = KV.order.indexOf(KV.cur) + (down ? 1 : -1); if (i >= 0 && i < KV.order.length) go('kp', KV.order[i]); }
  else if (VIEW === 'read' && (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'PageDown' || k === 'PageUp')) {
    e.preventDefault(); pageStep(k === 'ArrowRight' || k === 'PageDown' ? 1 : -1);
  }
});
$('#topnote').textContent = `真题 ${D.papers.length} 份 · 大题 ${QS.filter(q => q.type === 'problem').length} 道 · 名词 ${G.length} 个 · 解答 ${Object.keys(D.solutions || {}).length} 题`;
route();
