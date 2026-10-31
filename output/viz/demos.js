/* 交互演示：推导链与模型页上的画布动画。
   每个演示是一个小程序 { title, h, params, setup(p, S), draw(g, p, S, t), note(p, S), anim }，在 demos-*.js 里注册；
   推导链 / 模型通过 DEMO_FOR / DEMO_MODEL 映射到演示，“演示名:预设”中的预设是第一个下拉参数的取值。
   画面全部按公式实时计算，不依赖外部数据；颜色取页面 CSS 变量，跟随明暗主题。加载顺序：demos.js → demos-*.js → app.js。 */
'use strict';
const Demo = (() => {
  const reg = {};
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const hex = s => { const m = /^#?([0-9a-f]{6})$/i.exec(s.trim()); const v = m ? parseInt(m[1], 16) : 0xffffff; return [v >> 16, (v >> 8) & 255, v & 255]; };
  function theme() {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      dark, ink: css('--ink') || '#222', muted: css('--muted') || '#777', line: css('--line') || '#ddd', bg: css('--panel') || '#fff',
      accent: css('--accent') || '#1f5f9f', red: dark ? '#f07b6f' : '#c8392b', blue: dark ? '#6fa8f0' : '#2263b8',
      green: dark ? '#7fcf9e' : '#2e7d4f', orange: dark ? '#e7b35a' : '#c27c0e', purple: dark ? '#c39bf0' : '#7b3fb8',
      bgRGB: hex(css('--panel') || '#ffffff'), posRGB: dark ? [240, 110, 95] : [200, 45, 35], negRGB: dark ? [95, 160, 240] : [30, 90, 185],
    };
  }

  /* ---------- drawing helpers ---------- */
  function makeG(ctx, W, H, th) {
    const g = { ctx, W, H, th };
    g.clear = () => { ctx.clearRect(0, 0, W, H); };
    g.text = (s, x, y, o = {}) => {
      ctx.save(); ctx.fillStyle = o.color || th.ink; ctx.font = `${o.bold ? '600 ' : ''}${o.size || 12}px -apple-system,"Noto Sans CJK SC","PingFang SC",sans-serif`;
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle'; ctx.fillText(s, x, y); ctx.restore();
    };
    g.line = (pts, color, w = 1.5, dash) => {
      if (pts.length < 2) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w;
      // a dashed curve y(x): lay the dashes out along x, fixed on the canvas. Canvas dashes follow the arc length from the
      // first point, so on an animated curve they would crawl sideways, more and more towards the right end.
      const dx = pts.slice(1).map((q, i) => q[0] - pts[i][0]);
      if (dash && pts.length > 2 && (dx.every(d => d >= 0) || dx.every(d => d <= 0))) {
        const q = dx.some(d => d < 0) ? pts.slice().reverse() : pts, on = dash[0], per = dash[0] + (dash[1] ?? dash[0]);
        let down = false;
        ctx.beginPath();
        for (let i = 1; i < q.length; i++) {
          let [xa, ya] = q[i - 1]; const [xb, yb] = q[i];
          if (xb - xa < 1e-9) { if (down) ctx.lineTo(xb, yb); continue; }  // vertical piece: follow the pen
          while (xb - xa > 1e-9) {
            const ph = ((xa % per) + per) % per, isOn = ph < on, xe = Math.min(xb, xa + (isOn ? on - ph : per - ph)), ye = ya + (yb - ya) * (xe - xa) / (xb - xa);
            if (isOn) { if (!down) ctx.moveTo(xa, ya); ctx.lineTo(xe, ye); }
            down = isOn; xa = xe; ya = ye;
          }
        }
        ctx.stroke(); ctx.restore();
        return;
      }
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke(); ctx.restore();
    };
    g.rect = (x, y, w, h, fill, stroke, lw = 1) => {
      ctx.save(); if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); } ctx.restore();
    };
    g.circle = (x, y, r, fill, stroke, lw = 1, dash) => {
      ctx.save(); if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0.5), 0, 2 * Math.PI); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } ctx.restore();
    };
    g.arrow = (x0, y0, x1, y1, color, w = 1.5) => {
      const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), h = Math.min(8, L * 0.4);
      ctx.save(); ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (L > 2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); ctx.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    };
    g.hatch = (x0, y0, x1, y1, color) => {  // a fixed support drawn along the segment
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / 7)), nx = (y1 - y0) / L, ny = -(x1 - x0) / L;
      g.line([[x0, y0], [x1, y1]], color, 2);
      const seg = [];
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; seg.push([[x, y], [x + 6 * nx + 4 * (x1 - x0) / L, y + 6 * ny + 4 * (y1 - y0) / L]]); }
      seg.forEach(s => g.line(s, color, 1));
    };
    // a plot box: g.box({x, y, w, h}, [x0, x1], [y0, y1], opts) returns mapping helpers
    g.box = (b, xr, yr, o = {}) => {
      const lx = !!o.logx, ly = !!o.logy;
      const tx = v => lx ? Math.log10(v) : v, ty = v => ly ? Math.log10(v) : v;
      const X = v => b.x + (tx(v) - tx(xr[0])) / (tx(xr[1]) - tx(xr[0])) * b.w;
      const Y = v => b.y + b.h - (ty(v) - ty(yr[0])) / (ty(yr[1]) - ty(yr[0])) * b.h;
      const P = {
        X, Y, b,
        frame() {
          ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
          (o.xt || []).forEach(v => { const x = X(v); g.line([[x, b.y + b.h], [x, b.y + b.h + 4]], th.muted, 1); g.text(o.xf ? o.xf(v) : String(v), x, b.y + b.h + 12, { color: th.muted, size: 10.5, align: 'center' }); if (o.grid) g.line([[x, b.y], [x, b.y + b.h]], th.line, 0.6, [2, 3]); });
          (o.yt || []).forEach(v => { const y = Y(v); g.line([[b.x - 4, y], [b.x, y]], th.muted, 1); g.text(o.yf ? o.yf(v) : String(v), b.x - 6, y, { color: th.muted, size: 10.5, align: 'right' }); if (o.grid) g.line([[b.x, y], [b.x + b.w, y]], th.line, 0.6, [2, 3]); });
          if (o.xl) g.text(o.xl, b.x + b.w, b.y + b.h + 25, { color: th.muted, size: 11, align: 'right' });
          if (o.yl) g.text(o.yl, b.x + 2, b.y - 9, { color: th.muted, size: 11 });
          ctx.restore();
        },
        fn(f, color, w = 1.6, dash, n = 300, x0 = xr[0], x1 = xr[1]) {
          const pts = [];
          for (let i = 0; i <= n; i++) {
            const v = lx ? 10 ** (Math.log10(x0) + (Math.log10(x1) - Math.log10(x0)) * i / n) : x0 + (x1 - x0) * i / n;
            const y = f(v); if (!isFinite(y)) continue;
            pts.push([X(v), Math.max(b.y - 2, Math.min(b.y + b.h + 2, Y(ly ? Math.max(y, 1e-12) : y)))]);
          }
          ctx.save(); ctx.beginPath(); ctx.rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2); ctx.clip(); g.line(pts, color, w, dash); ctx.restore();
        },
        vline(v, color, dash = [4, 3], w = 1) { g.line([[X(v), b.y], [X(v), b.y + b.h]], color, w, dash); },
        hline(v, color, dash = [4, 3], w = 1) { g.line([[b.x, Y(v)], [b.x + b.w, Y(v)]], color, w, dash); },
        dot(x, y, color, r = 4) { g.circle(X(x), Y(y), r, color); },
      };
      return P;
    };
    // a scalar field on a grid (values in [-1, 1], or [0, 1] with seq): fill(i, j) -> value
    let off = null;
    g.field = (b, nx, ny, val, o = {}) => {
      if (!off || off.width !== nx || off.height !== ny) { off = document.createElement('canvas'); off.width = nx; off.height = ny; }
      const c2 = off.getContext('2d'), img = c2.createImageData(nx, ny), d = img.data, [br, bg, bb] = th.bgRGB;
      const [pr, pg, pb] = th.posRGB, [nr, ng, nb] = th.negRGB;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        let v = val(i, j), k = 4 * (j * nx + i);
        if (v === null || v === undefined || isNaN(v)) { d[k + 3] = 0; continue; }
        v = Math.max(-1, Math.min(1, v));
        const [cr, cg, cb] = v >= 0 ? [pr, pg, pb] : [nr, ng, nb], a = Math.abs(v);
        d[k] = br + (cr - br) * a; d[k + 1] = bg + (cg - bg) * a; d[k + 2] = bb + (cb - bb) * a; d[k + 3] = 255;
      }
      c2.putImageData(img, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = o.smooth !== false; ctx.drawImage(off, b.x, b.y, b.w, b.h); ctx.restore();
    };
    // polar curve: f(theta) in [0, 1], theta from +x axis counter-clockwise
    g.polar = (cx, cy, R, f, color, w = 2, o = {}) => {
      if (!o.noGrid) {
        [0.25, 0.5, 0.75, 1].forEach(r => g.circle(cx, cy, R * r, null, th.line, 0.7));
        for (let a = 0; a < 180; a += 30) { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); g.line([[cx - R * c, cy + R * s], [cx + R * c, cy - R * s]], th.line, 0.7); }
        g.text('0°', cx + R + 4, cy, { color: th.muted, size: 10 }); g.text('90°', cx, cy - R - 8, { color: th.muted, size: 10, align: 'center' });
      }
      const pts = [], t0 = o.from ?? 0, t1 = o.to ?? 2 * Math.PI;
      for (let i = 0; i <= 360; i++) { const t = t0 + (t1 - t0) * i / 360, r = Math.max(0, Math.min(1, f(t))) * R; pts.push([cx + r * Math.cos(t), cy - r * Math.sin(t)]); }
      g.line(pts, color, w, o.dash);
    };
    return g;
  }

  /* ---------- math helpers shared by the demos ---------- */
  const M = {
    J(m, x) {  // Bessel J_m, power series (fine for |x| < ~25)
      let t = (x / 2) ** m, s = 0;
      for (let k = 1; k <= m; k++) t /= k;
      for (let k = 0; k < 200; k++) { s += t; t *= -(x * x / 4) / ((k + 1) * (k + 1 + m)); if (Math.abs(t) < 1e-17 * Math.max(1, Math.abs(s)) && k > x) break; }
      return s;
    },
    I(m, x) {
      let t = (x / 2) ** m, s = 0;
      for (let k = 1; k <= m; k++) t /= k;
      for (let k = 0; k < 200; k++) { s += t; t *= (x * x / 4) / ((k + 1) * (k + 1 + m)); if (t < 1e-17 * s) break; }
      return s;
    },
    dJ(m, x) { return m === 0 ? -M.J(1, x) : (M.J(m - 1, x) - M.J(m + 1, x)) / 2; },
    roots(f, n, a = 0.05, step = 0.02, max = 40) {  // first n sign changes of f on (a, max), refined by bisection
      const out = []; let x = a, fx = f(x);
      while (out.length < n && x < max) {
        const y = x + step, fy = f(y);
        if (fx === 0 || fx * fy < 0) { let lo = x, hi = y, flo = fx; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; } } out.push((lo + hi) / 2); }
        x = y; fx = fy;
      }
      return out;
    },
    // spherical Bessel j_l (Miller downward recurrence) and y_l (upward), l = 0..L
    sph(L, x) {
      const j = new Float64Array(L + 2), y = new Float64Array(L + 2);
      if (x < 1e-8) { j[0] = 1; for (let l = 0; l <= L + 1; l++) y[l] = -Infinity; return { j, y }; }
      const N = L + 20 + Math.ceil(x);
      let fp = 0, f = 1e-30, arr = new Float64Array(N + 2); arr[N] = f;
      for (let l = N; l > 0; l--) { const fm = (2 * l + 1) / x * f - fp; fp = f; f = fm; arr[l - 1] = f; if (Math.abs(f) > 1e250) { for (let q = l - 1; q <= N; q++) arr[q] /= 1e250; f /= 1e250; fp /= 1e250; } }
      const j0 = Math.sin(x) / x, j1 = Math.sin(x) / (x * x) - Math.cos(x) / x;
      const sc = Math.abs(j0) > Math.abs(j1) ? j0 / arr[0] : j1 / arr[1];
      for (let l = 0; l <= L + 1; l++) j[l] = arr[l] * sc;
      y[0] = -Math.cos(x) / x; y[1] = -Math.cos(x) / (x * x) - Math.sin(x) / x;
      for (let l = 1; l <= L; l++) y[l + 1] = (2 * l + 1) / x * y[l] - y[l - 1];
      return { j, y };
    },
    legendre(L, c) { const P = new Float64Array(L + 1); P[0] = 1; if (L > 0) P[1] = c; for (let l = 1; l < L; l++) P[l + 1] = ((2 * l + 1) * c * P[l] - l * P[l - 1]) / (l + 1); return P; },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    fmt: (v, d = 3) => { if (!isFinite(v)) return '∞'; const a = Math.abs(v); return a !== 0 && (a < 1e-3 || a >= 1e5) ? v.toExponential(2) : (+v.toFixed(d)).toString(); },
  };

  /* ---------- mounting ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function controls(spec, p, onChange) {
    const box = document.createElement('div'); box.className = 'demo-ctl';
    for (const q of spec.params || []) {
      if (q.when && !q.when(p)) continue;
      const lab = document.createElement('label');
      if (q.options) {
        lab.innerHTML = `${q.label ? `<span>${esc(q.label)}</span>` : ''}<select>${q.options.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>`;
        const sel = lab.querySelector('select'); sel.value = p[q.k];
        sel.addEventListener('input', () => { p[q.k] = sel.value; onChange(true); });
      } else {
        const toPos = v => q.log ? Math.log(v / q.min) / Math.log(q.max / q.min) * 1000 : v;
        const fromPos = u => { if (!q.log) return +u; const v = q.min * (q.max / q.min) ** (u / 1000); return q.step ? Math.round(v / q.step) * q.step : v; };
        lab.innerHTML = `<span>${esc(q.label)}</span><input type="range" min="${q.log ? 0 : q.min}" max="${q.log ? 1000 : q.max}" step="${q.log ? 1 : q.step || 'any'}"><output></output>`;
        const inp = lab.querySelector('input'), out = lab.querySelector('output');
        const show = () => { out.textContent = q.fmt ? q.fmt(p[q.k]) : M.fmt(p[q.k], 3); };
        inp.value = toPos(p[q.k]); show();
        inp.addEventListener('input', () => { p[q.k] = fromPos(inp.value); show(); onChange(false); });
      }
      box.appendChild(lab);
    }
    return box;
  }
  function mount(host) {
    if (host.dataset.ready) return;
    host.dataset.ready = 1;
    const [id, preset] = host.dataset.demo.split(':'), spec = reg[id];
    if (!spec) { host.remove(); return; }
    const p = {};
    (spec.params || []).forEach(q => { p[q.k] = q.v; });
    const first = (spec.params || []).find(q => q.options);
    if (preset && first && first.options.some(o => o[0] === preset)) p[first.k] = preset;
    host.innerHTML = `<div class="demo-hd"><b>${esc(spec.title)}</b><span class="demo-btns">${spec.anim !== false ? '<button data-act="play" title="暂停 / 继续">⏸</button><button data-act="slow" title="慢放">0.5×</button>' : ''}</span></div>
      <canvas></canvas><div class="demo-ctlwrap"></div><div class="demo-note"></div>`;
    const cv = host.querySelector('canvas'), ctlWrap = host.querySelector('.demo-ctlwrap'), noteEl = host.querySelector('.demo-note');
    const S = {};
    let playing = spec.anim !== false, speed = 1, t = 0, last = performance.now(), visible = true, raf = 0, W = 0, H = 0, g = null;
    const size = () => {
      W = Math.max(280, host.clientWidth - 2); H = Math.round((spec.h || 300) * (W < 560 ? 0.8 : 1));
      cv.width = Math.round(W * dpr()); cv.height = Math.round(H * dpr()); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
      g = makeG(ctx, W, H, theme());
      if (spec.setup) spec.setup(p, S, g);
    };
    const note = () => {
      if (!spec.note) return;
      noteEl.innerHTML = spec.note(p, S);
      if (window.renderMathInElement) try { renderMathInElement(noteEl, { throwOnError: false, delimiters: [{ left: '$', right: '$', display: false }] }); } catch (e) { /* plain text */ }
    };
    const draw = () => { g.clear(); spec.draw(g, p, S, t); };
    S.redraw = draw;  // 3D views redraw while being dragged, even when paused
    const rebuild = () => { ctlWrap.innerHTML = ''; ctlWrap.appendChild(controls(spec, p, changed)); };
    function changed(structural) {
      if (spec.setup) spec.setup(p, S, g);
      if (structural) rebuild();
      note(); draw();
    }
    size(); rebuild(); note(); draw();
    const loop = now => {
      if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (playing && visible) { t += dt * speed; draw(); }
      raf = requestAnimationFrame(loop);
    };
    if (spec.anim !== false) raf = requestAnimationFrame(loop);
    if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    if (window.ResizeObserver) { let w0 = host.clientWidth; new ResizeObserver(() => requestAnimationFrame(() => { if (Math.abs(host.clientWidth - w0) > 4 && cv.isConnected) { w0 = host.clientWidth; size(); draw(); } })).observe(host); }
    host.querySelector('.demo-hd').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'play') { playing = !playing; b.textContent = playing ? '⏸' : '▶'; }
      if (b.dataset.act === 'slow') { speed = speed === 1 ? 0.5 : speed === 0.5 ? 0.25 : 1; b.textContent = speed + '×'; }
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (cv.isConnected) { size(); draw(); } });
  }

  // derivation / model -> demos ("id:preset")
  const DEMO_FOR = {
    'd-free': 'osc:free', 'd-springs': 'osc:free', 'd-springmass': 'osc:free', 'd-damped': 'osc:damped', 'd-osc': 'osc:forced', 'd-control': 'osc:forced', 'd-mech-analog': 'osc:forced',
    'd-string': 'string:pluck', 'd-string-modes': 'string:modes', 'd-bar': 'bar:ff', 'd-bar-modes': 'bar:rm', 'd-beam': 'beam', 'd-membrane': 'membrane', 'd-membrane-lumped': 'membrane',
    'd-membrane-forced': 'membrane', 'd-plate': 'membrane:plate',
    'd-helmholtz': 'helmholtz', 'd-transformer': 'helmholtz', 'd-acoustic-analog': 'filter:low', 'd-filter': 'filter:low',
    'd-wave': 'plane:travel', 'd-potential': 'plane:travel', 'd-plane': 'plane:travel', 'd-linear': 'plane:travel', 'd-soundspeed': 'plane:travel', 'd-levels': 'coherence',
    'd-wave-special': 'sphere', 'd-superpose': 'plane:stand', 'd-coherence': 'coherence', 'd-tube-standing': 'plane:part',
    'd-normal': 'interface:media', 'd-oblique': 'oblique', 'd-layer': 'layer:layer', 'd-wall': 'layer:wall', 'd-junction': 'interface:duct',
    'd-waveguide': 'waveguide:rect', 'd-waveguide-round': 'waveguide:round',
    'd-sphere': 'sphere', 'd-point': 'sources:mono', 'd-dipole': 'sources:dip', 'd-array': 'sources:line', 'd-mutual': 'sources:pair', 'd-image': 'sources:image',
    'd-incoherent': 'sources:incoh', 'd-reciprocity': 'sources:pair',
    'd-pressure-mic': 'mic:polar', 'd-gradient': 'mic:near', 'd-compound': 'mic:polar', 'd-multipath': 'mic:multi', 'd-probe': 'mic:near',
    'd-scatter': 'scatter',
    'd-sabine': 'roomstat:decay', 'd-meanfree': 'roomstat:mfp', 'd-airabs': 'roomstat:decay', 'd-steady': 'roomstat:steady', 'd-room': 'roommode:mode', 'd-mode-count': 'roommode:count',
    'd-solid': 'solid:P', 'd-hooke': 'solid:strain', 'd-solid-interface': 'solid:S', 'd-rayleigh': 'solid:R', 'd-lamb': 'solid:lamb',
  };
  const DEMO_MODEL = {
    osc: 'osc:forced', string: 'string:modes', bar: 'bar:ff', membrane: 'membrane', lumped: 'helmholtz', plane: 'plane:travel', interface: 'oblique', wall: 'layer:wall',
    interference: 'coherence', tube: 'plane:part', junction: 'interface:duct', waveguide: 'waveguide:rect', sphere: 'sphere', dipole: 'sources:dip', array: 'sources:line',
    receiver: 'mic:polar', scatter: 'scatter', 'room-stat': 'roomstat:decay', 'room-mode': 'roommode:mode', solid: 'solid:R',
  };
  // a derivation / model may map to several demos (a 2D one and a 3D one): "id:preset" or [..]
  const box = (keys, open) => [].concat(keys || []).filter(k => reg[k.split(':')[0]]).map(key => {
    const spec = reg[key.split(':')[0]];
    return `<details class="demo-box"${open ? ' open' : ''}><summary>${spec.is3d ? '三维演示' : '动画演示'}：${esc(spec.title)}</summary><div class="demo" data-demo="${key}"></div></details>`;
  }).join('');
  return {
    reg, M, DEMO_FOR, DEMO_MODEL,
    forDerivation: (id, open = true) => box(DEMO_FOR[id], open),
    forModel: (id, open = true) => box(DEMO_MODEL[id], open),
    has: id => !!DEMO_FOR[id],
    mountAll(root) {
      root.querySelectorAll('details.demo-box').forEach(d => {
        const go = () => d.querySelectorAll('.demo').forEach(mount);
        if (d.open) go(); else d.addEventListener('toggle', () => { if (d.open) go(); });
      });
    },
  };
})();

window.Demo = Demo;
