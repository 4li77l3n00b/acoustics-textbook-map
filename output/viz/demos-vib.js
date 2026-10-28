/* 交互演示（一）：振动——单振子、弦、棒、横振动棒、膜与板、共鸣器、声滤波器 */
'use strict';
(() => {
  const { reg, M } = Demo, PI = Math.PI, TAU = 2 * PI;

  /* ---------- 单振子：自由 / 衰减 / 强迫 ---------- */
  function spring(g, x, y0, y1, color, coils = 9) {
    const pts = [[x, y0], [x, y0 + 6]], n = coils * 2, L = y1 - y0 - 12;
    for (let i = 1; i < n; i++) pts.push([x + (i % 2 ? 9 : -9), y0 + 6 + L * i / n]);
    pts.push([x, y1 - 6], [x, y1]);
    g.line(pts, color, 1.6);
  }
  function dashpot(g, x, y0, y1, color) {
    const m = (y0 + y1) / 2;
    g.line([[x, y0], [x, m - 4]], color, 1.5); g.line([[x - 7, m - 14], [x - 7, m + 10], [x + 7, m + 10], [x + 7, m - 14]], color, 1.5);
    g.line([[x - 5, m - 4], [x + 5, m - 4]], color, 2.5); g.line([[x, m + 10], [x, y1]], color, 1.5);
  }
  reg.osc = {
    title: '质点振动系统（单振子）', h: 300,
    params: [
      { k: 'mode', label: '', options: [['free', '自由振动'], ['damped', '衰减振动'], ['forced', '强迫振动（稳态）']], v: 'forced' },
      { k: 'Q', label: '品质因素 Qm', min: 0.2, max: 30, log: true, v: 3, when: p => p.mode !== 'free' },
      { k: 'z', label: '频率比 f/f₀', min: 0.1, max: 3, step: 0.01, v: 0.8, when: p => p.mode === 'forced' },
    ],
    resp(p) { const z = p.z, Q = p.Q, re = 1 - z * z, im = z / Q, d = Math.hypot(re, im); return { A: 1 / d, th: Math.atan2(im, re) }; },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, w0 = TAU * 0.5, cx = 70, top = 22, rest = 150, amp = 55;
      let xi = 0, F = null;
      if (p.mode === 'free') xi = Math.cos(w0 * t);
      else if (p.mode === 'damped') {
        const T = t % 12, d = w0 / (2 * p.Q);
        if (d < w0 - 1e-6) { const w1 = Math.sqrt(w0 * w0 - d * d); xi = Math.exp(-d * T) * (Math.cos(w1 * T) + d / w1 * Math.sin(w1 * T)); }
        else if (Math.abs(d - w0) < 1e-6) xi = (1 + w0 * T) * Math.exp(-w0 * T);
        else { const s = Math.sqrt(d * d - w0 * w0), r1 = -d + s, r2 = -d - s; xi = (r2 * Math.exp(r1 * T) - r1 * Math.exp(r2 * T)) / (r2 - r1); }
      } else {
        const r = reg.osc.resp(p), Amax = p.Q > 0.71 ? 2 * p.Q * p.Q / Math.sqrt(4 * p.Q * p.Q - 1) : 1, w = p.z * w0 / 1.6;
        xi = r.A / Math.max(Amax, 1) * Math.cos(w * t - r.th); F = Math.cos(w * t);
      }
      // the oscillator
      g.hatch(cx - 40, top, cx + 40, top, c.muted);
      const y = top + rest + xi * amp;
      spring(g, p.mode === 'free' ? cx : cx - 14, top, y, c.ink);
      if (p.mode !== 'free') dashpot(g, cx + 16, top, y, c.muted);
      g.rect(cx - 30, y, 60, 34, c.accent + '33', c.accent, 1.5); g.text('Mm', cx, y + 17, { align: 'center', size: 12, color: c.accent });
      g.line([[cx + 40, top + rest + 17], [cx + 52, top + rest + 17]], c.muted, 1, [2, 2]);
      if (F !== null) g.arrow(cx, y + 40, cx, y + 40 + F * 28, c.red, 2), g.text('F', cx + 8, y + 52, { color: c.red, size: 11 });
      // right panel
      const b = { x: 175, y: 18, w: W - 195, h: H - 52 };
      if (p.mode !== 'forced') {
        const span = 8, d = p.mode === 'free' ? 0 : w0 / (2 * p.Q), T0 = p.mode === 'damped' ? t % 12 : t;
        const P = g.box(b, [0, span], [-1.15, 1.15], { xt: [0, 2, 4, 6, 8], yt: [-1, 0, 1], xl: 't / s', yl: 'ξ / ξ₀', grid: true });
        P.frame();
        const f = s => {
          if (p.mode === 'free') return Math.cos(w0 * s);
          const T = s;
          if (d < w0 - 1e-6) { const w1 = Math.sqrt(w0 * w0 - d * d); return Math.exp(-d * T) * (Math.cos(w1 * T) + d / w1 * Math.sin(w1 * T)); }
          if (Math.abs(d - w0) < 1e-6) return (1 + w0 * T) * Math.exp(-w0 * T);
          const s2 = Math.sqrt(d * d - w0 * w0), r1 = -d + s2, r2 = -d - s2; return (r2 * Math.exp(r1 * T) - r1 * Math.exp(r2 * T)) / (r2 - r1);
        };
        const tEnd = p.mode === 'free' ? span : Math.min(T0, span);
        if (p.mode === 'damped') { P.fn(s => Math.exp(-d * s), c.muted, 1, [4, 3]); P.fn(s => -Math.exp(-d * s), c.muted, 1, [4, 3]); }
        P.fn(f, c.accent, 1.8, null, 400, 0, p.mode === 'free' ? span : Math.max(0.01, tEnd));
        const tm = p.mode === 'free' ? (t % span) : Math.min(T0, span);
        P.dot(tm, f(tm), c.red);
        if (p.mode === 'free') {  // energy bars
          const Ek = Math.sin(w0 * t) ** 2, x0 = b.x + b.w - 70;
          g.rect(x0, b.y + 8, 22, 60 * Ek, c.orange); g.rect(x0 + 30, b.y + 8, 22, 60 * (1 - Ek), c.green);
          g.text('动能', x0 + 11, b.y + 80, { align: 'center', size: 10, color: c.orange }); g.text('位能', x0 + 41, b.y + 80, { align: 'center', size: 10, color: c.green });
        }
      } else {
        const Q = p.Q, ymax = Math.max(1.6, Math.min(Q * 1.25, 30));
        const P = g.box(b, [0, 3], [0, ymax], { xt: [0, 0.5, 1, 1.5, 2, 2.5, 3], yt: [0, ymax / 2, ymax].map(v => +v.toFixed(1)), xl: 'z = f / f₀', grid: true });
        P.frame();
        const den = z => Math.sqrt(z * z + (z * z - 1) ** 2 * Q * Q);
        P.fn(z => Q / den(z), c.blue, 1.8); P.fn(z => Q * z / den(z), c.red, 1.8); P.fn(z => Q * z * z / den(z), c.green, 1.8);
        P.vline(p.z, c.muted);
        [[Q / den(p.z), c.blue], [Q * p.z / den(p.z), c.red], [Q * p.z * p.z / den(p.z), c.green]].forEach(([v, col]) => P.dot(p.z, Math.min(v, ymax), col));
        g.text('位移 A', b.x + 8, b.y + 12, { color: c.blue, size: 11 }); g.text('速度 B', b.x + 64, b.y + 12, { color: c.red, size: 11 }); g.text('加速度 C', b.x + 120, b.y + 12, { color: c.green, size: 11 });
        g.text('弹性控制', P.X(0.2), b.y + b.h - 10, { color: c.muted, size: 10.5, align: 'center' });
        g.text('质量控制', P.X(2.6), b.y + b.h - 10, { color: c.muted, size: 10.5, align: 'center' });
      }
    },
    note(p) {
      const w = '$\\omega_0=\\sqrt{K_m/M_m}$';
      if (p.mode === 'free') return `无阻尼时振幅不衰减，${w}；右侧柱形显示动能与位能此消彼长、总和不变。`;
      const Q = p.Q, d = 1 / (2 * Q);
      if (p.mode === 'damped') return Q > 0.5 ? `$\\delta/\\omega_0=1/(2Q_m)=${M.fmt(d)}$，振幅按 $e^{-\\delta t}$ 衰减（虚线为包络），$\\omega_0'/\\omega_0=${M.fmt(Math.sqrt(1 - d * d))}$。把 $Q_m$ 调到 0.5 以下即为过阻尼，不再振动。` : `$Q_m\\le0.5$：临界或过阻尼，质点不再往复振动，直接回到平衡位置。`;
      const r = reg.osc.resp(p), fd = Q > 0.71 ? Math.sqrt(1 - 1 / (2 * Q * Q)) : NaN, fa = Q > 0.71 ? Q * Math.sqrt(2 / (2 * Q * Q - 1)) : NaN;
      return `位移滞后外力 $\\theta=${M.fmt(r.th * 180 / PI, 1)}^\\circ$（红色箭头为外力）。三种共振：位移 $z_r=${M.fmt(fd)}$，速度 $z_r=1$，加速度 $z_r=${M.fmt(fa)}$；半功率带宽 $\\Delta f/f_0=1/Q_m=${M.fmt(1 / Q)}$。`;
    },
  };

  /* ---------- 弦：简正方式 / 拨弦 ---------- */
  reg.string = {
    title: '两端固定的弦', h: 300,
    params: [
      { k: 'mode', label: '', options: [['modes', '简正方式（驻波）'], ['pluck', '拨弦：两列反向行波的叠加']], v: 'pluck' },
      { k: 'n', label: '次数 n', min: 1, max: 8, step: 1, v: 2, when: p => p.mode === 'modes' },
      { k: 'x0', label: '拨弦位置 x₀/l', min: 0.05, max: 0.95, step: 0.01, v: 0.3, when: p => p.mode === 'pluck' },
      { k: 'parts', label: '', options: [['1', '显示两列行波'], ['0', '只看合成']], v: '1', when: p => p.mode === 'pluck' },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, L = 40, R = W - 40, y0 = p.mode === 'pluck' ? 95 : 120, A = 62;
      const X = x => L + (R - L) * x;
      g.hatch(L, y0 - 40, L, y0 + 40, c.muted); g.hatch(R, y0 + 40, R, y0 - 40, c.muted);
      g.line([[L, y0], [R, y0]], c.line, 1, [3, 3]);
      if (p.mode === 'modes') {
        const n = p.n, ph = Math.cos(TAU * 0.4 * n * t), pts = [], env1 = [], env2 = [];
        for (let i = 0; i <= 300; i++) { const x = i / 300, s = Math.sin(n * PI * x); pts.push([X(x), y0 - A * s * ph]); env1.push([X(x), y0 - A * s]); env2.push([X(x), y0 + A * s]); }
        g.line(env1, c.muted, 1, [4, 3]); g.line(env2, c.muted, 1, [4, 3]); g.line(pts, c.accent, 2.4);
        for (let m = 1; m < n; m++) g.circle(X(m / n), y0, 4, c.red);
        for (let m = 0; m < n; m++) g.text('腹', X((m + 0.5) / n), y0 + A + 16, { color: c.muted, size: 10, align: 'center' });
        g.text(`f${'ₙ'} = n·c/(2l)，第 ${n} 次：${n - 1} 个节点（红点）`, L, H - 18, { color: c.muted, size: 11.5 });
      } else {
        const x0 = p.x0, h = 1;
        const tri = x => x <= x0 ? h * x / x0 : h * (1 - x) / (1 - x0);
        const F = x => { let u = ((x % 2) + 2) % 2; return u <= 1 ? tri(u) : -tri(2 - u); };  // odd 2l-periodic extension
        const ct = (0.5 * t) % 2 * 1;  // c = 1 l/s·0.5
        const sum = [], a = [], b = [];
        for (let i = 0; i <= 300; i++) { const x = i / 300, f1 = F(x - ct) / 2, f2 = F(x + ct) / 2; sum.push([X(x), y0 - A * (f1 + f2)]); a.push([X(x), y0 - A * f1]); b.push([X(x), y0 - A * f2]); }
        if (p.parts === '1') { g.line(a, c.red, 1.3, [5, 3]); g.line(b, c.blue, 1.3, [5, 3]); }
        g.line(sum, c.accent, 2.4);
        if (p.parts === '1') { g.text('→ 向右行波 ½f(x−ct)', L, 20, { color: c.red, size: 11 }); g.text('← 向左行波 ½f(x+ct)', L + 170, 20, { color: c.blue, size: 11 }); }
        // mode energies E_n ∝ sin²(nπx0)/n²
        const N = 14, E = []; for (let n = 1; n <= N; n++) E.push(Math.sin(n * PI * x0) ** 2 / (n * n));
        const Emax = Math.max(...E), bx = L, by = H - 22, bw = (R - L) / N;
        g.text('各次简正方式的能量 Eₙ ∝ sin²(nπx₀)/n²', bx, by - 84, { color: c.muted, size: 11 });
        E.forEach((e, i) => { const hh = 60 * e / Emax; g.rect(bx + i * bw + 3, by - hh, bw - 6, hh, c.accent + 'aa'); g.text(String(i + 1), bx + i * bw + bw / 2, by + 9, { color: c.muted, size: 10, align: 'center' }); });
      }
    },
    note(p) {
      if (p.mode === 'modes') return `$\\eta_n=B_n\\sin\\frac{n\\pi x}{l}\\cos\\omega_nt$，$f_n=\\frac{nc}{2l}$：各点同相振动，节点不动。`;
      const miss = [];
      for (let n = 2; n <= 14; n++) if (Math.abs(Math.sin(n * PI * p.x0)) < 0.02) miss.push(n);
      return `初始三角形分成两半，各以速度 $c$ 向两边传播，在固定端反相反射（达朗贝尔解）；它们的合成与傅里叶级数 $\\sum C_n\\sin\\frac{n\\pi x}{l}\\cos\\omega_nt$ 完全相同。${miss.length ? `在 $x_0=${p.x0}l$ 拨弦，第 ${miss.join('、')} 次简正方式不被激发（拨点是它们的节点）。` : '拨点处是节点的简正方式不被激发。'}`;
    },
  };

  /* ---------- 棒的纵振动 ---------- */
  reg.bar = {
    title: '棒的纵振动（质点位移放大显示）', h: 300,
    params: [
      { k: 'bc', label: '', options: [['ff', '两端固定'], ['rr', '两端自由'], ['fr', '一端固定一端自由'], ['rm', '一端自由一端质量负载']], v: 'ff' },
      { k: 'n', label: '次数 n', min: 1, max: 4, step: 1, v: 1 },
      { k: 'mu', label: '负载质量 M/m', min: 0.05, max: 20, log: true, v: 1, when: p => p.bc === 'rm' },
    ],
    setup(p, S) {
      const n = p.n;
      if (p.bc === 'ff') { S.g = n * PI; S.shape = x => Math.sin(n * PI * x); }
      else if (p.bc === 'rr') { S.g = n * PI; S.shape = x => Math.cos(n * PI * x); }
      else if (p.bc === 'fr') { S.g = (2 * n - 1) * PI / 2; S.shape = x => Math.sin(S.g * x); }
      else {
        const r = p.mu, f = y => Math.tan(y) / y + r, lo = (n - 0.5) * PI + 1e-7, hi = n * PI - 1e-7;
        let a = lo, b = hi; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
        S.g = (a + b) / 2; S.shape = x => Math.cos(S.g * x);
      }
      let mx = 0; for (let i = 0; i <= 200; i++) mx = Math.max(mx, Math.abs(S.shape(i / 200))); S.mx = mx;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, L = 60, R = W - (p.bc === 'rm' ? 90 : 60), y0 = 34, h = 70, A = 16;
      const X = x => L + (R - L) * x, ph = Math.cos(TAU * 0.5 * t), u = x => S.shape(x) / S.mx;
      g.rect(L, y0, R - L, h, null, c.line);
      for (let i = 0; i <= 44; i++) { const x = i / 44, xx = X(x) + A * u(x) * ph; g.line([[xx, y0 + 2], [xx, y0 + h - 2]], c.accent, 1.4); }
      const left = p.bc === 'ff' || p.bc === 'fr', right = p.bc === 'ff';
      if (left) g.hatch(L, y0 + h + 10, L, y0 - 10, c.muted);
      if (right) g.hatch(R, y0 - 10, R, y0 + h + 10, c.muted);
      if (p.bc === 'rm') { const s = 20 + 14 * Math.min(1.6, Math.log10(1 + p.mu * 3)), xx = R + A * u(1) * ph; g.rect(xx, y0 + h / 2 - s / 2, s, s, c.orange + '55', c.orange, 1.5); g.text('M', xx + s / 2, y0 + h / 2, { align: 'center', color: c.orange, size: 11 }); }
      const P = g.box({ x: L, y: y0 + h + 34, w: R - L, h: H - (y0 + h + 34) - 30 }, [0, 1], [-1.15, 1.15], { xt: [0, 0.5, 1], yt: [-1, 0, 1], xl: 'x / l' });
      P.frame(); P.hline(0, c.line, null);
      const ds = x => (u(x + 1e-4) - u(x - 1e-4)) / 2e-4 / S.g;
      P.fn(x => u(x) * ph, c.accent, 2); P.fn(x => u(x), c.muted, 1, [4, 3]); P.fn(x => -u(x), c.muted, 1, [4, 3]);
      P.fn(x => -ds(x) * ph, c.red, 1.4, [6, 3]);
      g.text('位移 ξ', P.b.x + 6, P.b.y + 10, { color: c.accent, size: 11 }); g.text('应力 ∝ −∂ξ/∂x', P.b.x + 60, P.b.y + 10, { color: c.red, size: 11 });
    },
    note(p, S) {
      const r = S.g / PI;
      const txt = { ff: '固定端位移为零', rr: '自由端应力为零（$\\partial\\xi/\\partial x=0$），是位移波腹', fr: '固定端位移为零、自由端应力为零，只有奇次谐频', rm: '负载端：弹性力 = 质量惯性力，$\\frac{\\tan kl}{kl}=-\\frac{M_m}{m}$' }[p.bc];
      return `${txt}。$k_nl=${M.fmt(S.g)}$，$f_n=${M.fmt(r)}\\cdot\\frac{c}{2l}$。${p.bc === 'rm' ? `调大 $M/m$，频率趋向一端固定（${M.fmt(p.n - 0.5)}），调小则趋向两端自由（${p.n}）。` : ''}竖线疏处为稀疏、密处为压缩。`;
    },
  };

  /* ---------- 棒的横振动 ---------- */
  const BEAM = {
    cf: [1.8751, 4.6941, 7.8548, 10.9955], ss: [PI, 2 * PI, 3 * PI, 4 * PI], ff: [4.7300, 7.8532, 10.9956, 14.1372],
  };
  reg.beam = {
    title: '棒的横振动（弯曲振动）', h: 270,
    params: [
      { k: 'bc', label: '', options: [['cf', '一端钳定一端自由'], ['ss', '两端简支'], ['ff', '两端自由']], v: 'cf' },
      { k: 'n', label: '次数 n', min: 1, max: 4, step: 1, v: 1 },
    ],
    setup(p, S) {
      const mu = BEAM[p.bc][p.n - 1], ch = Math.cosh, sh = Math.sinh, co = Math.cos, si = Math.sin;
      let Y;
      if (p.bc === 'ss') Y = x => si(mu * x);
      else if (p.bc === 'cf') { const s = (ch(mu) + co(mu)) / (sh(mu) + si(mu)); Y = x => ch(mu * x) - co(mu * x) - s * (sh(mu * x) - si(mu * x)); }
      else { const s = (ch(mu) - co(mu)) / (sh(mu) - si(mu)); Y = x => ch(mu * x) + co(mu * x) - s * (sh(mu * x) + si(mu * x)); }
      let mx = 0; for (let i = 0; i <= 300; i++) mx = Math.max(mx, Math.abs(Y(i / 300)));
      S.Y = x => Y(x) / mx; S.mu = mu;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, L = 60, R = W - 60, y0 = H / 2 - 10, A = 60, ph = Math.cos(TAU * 0.5 * t), X = x => L + (R - L) * x;
      const top = [], bot = [];
      for (let i = 0; i <= 200; i++) { const x = i / 200, y = y0 - A * S.Y(x) * ph; top.push([X(x), y - 5]); bot.push([X(x), y + 5]); }
      g.line([[L, y0], [R, y0]], c.line, 1, [3, 3]);
      const ctx = g.ctx; ctx.save(); ctx.beginPath(); top.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); bot.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath();
      ctx.fillStyle = c.accent + '55'; ctx.fill(); ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      if (p.bc === 'cf') g.hatch(L - 2, y0 + 30, L - 2, y0 - 30, c.muted);
      if (p.bc === 'ss') { [L, R].forEach(x => { const yy = y0 + 6; g.line([[x, yy], [x - 8, yy + 13], [x + 8, yy + 13], [x, yy]], c.muted, 1.4); }); }
      const r = BEAM[p.bc].map(m => (m / BEAM[p.bc][0]) ** 2);
      g.text(`频率比 f₁ : f₂ : f₃ : f₄ = ${r.map(v => v.toFixed(2)).join(' : ')}（不是整数比）`, L, H - 16, { color: c.muted, size: 11.5 });
    },
    note(p, S) { return `$f_n=\\frac{cK}{2\\pi l^2}\\mu_n^2$，这里 $\\mu_${p.n}=${M.fmt(S.mu, 4)}$。四阶方程使频率与 $\\mu_n^2$ 成正比，弯曲波相速 $v=\\sqrt{\\omega cK}$ 随频率变化（频散）。`; },
  };

  /* ---------- 圆膜 / 圆板 ---------- */
  const zJ = {};
  const jzeros = m => zJ[m] || (zJ[m] = M.roots(x => M.J(m, x), 3, 0.5));
  reg.membrane = {
    title: '圆膜（周界固定）与圆板（周界钳定）的振动方式', h: 300,
    params: [
      { k: 'kind', label: '', options: [['mem', '圆膜'], ['plate', '圆板（只看对称方式）']], v: 'mem' },
      { k: 'm', label: '节径数 m', min: 0, max: 3, step: 1, v: 0, when: p => p.kind === 'mem' },
      { k: 'n', label: '节圆序号 n', min: 1, max: 3, step: 1, v: 1 },
    ],
    setup(p, S) {
      const N = 120;
      if (p.kind === 'mem') { S.mu = jzeros(p.m)[p.n - 1]; S.f = r => M.J(p.m, S.mu * r); S.m = p.m; S.mu0 = jzeros(0)[0]; }
      else {
        const roots = M.roots(x => M.J(0, x) * M.I(1, x) + M.J(1, x) * M.I(0, x), 3, 1);
        S.mu = roots[p.n - 1]; const c0 = M.J(0, S.mu) / M.I(0, S.mu); S.f = r => M.J(0, S.mu * r) - c0 * M.I(0, S.mu * r); S.m = 0; S.mu0 = roots[0];
      }
      const rr = new Float64Array(201); let mx = 0;
      for (let i = 0; i <= 200; i++) { rr[i] = S.f(i / 200); mx = Math.max(mx, Math.abs(rr[i])); }
      S.rr = rr; S.mx = mx;
      S.amp = new Float64Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N * 2 - 1, y = (j + 0.5) / N * 2 - 1, r = Math.hypot(x, y);
        S.amp[j * N + i] = r > 1 ? NaN : rr[Math.round(r * 200)] / mx * Math.cos(S.m * Math.atan2(y, x));
      }
      S.N = N;
      S.nodes = M.roots(r => S.f(r), 4, 0.01, 0.005, 0.999);
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, D = H - 30, x0 = 20, y0 = 12, ph = Math.cos(TAU * 0.5 * t), N = S.N;
      g.field({ x: x0, y: y0, w: D, h: D }, N, N, (i, j) => { const a = S.amp[j * N + i]; return isNaN(a) ? null : a * ph; });
      const cx = x0 + D / 2, cy = y0 + D / 2, R = D / 2;
      g.circle(cx, cy, R, null, c.ink, 1.5);
      S.nodes.forEach(r => g.circle(cx, cy, r * R, null, c.ink, 1, [3, 3]));
      for (let k = 0; k < S.m; k++) { const a = PI / 2 / S.m + k * PI / S.m; g.line([[cx - R * Math.cos(a), cy - R * Math.sin(a)], [cx + R * Math.cos(a), cy + R * Math.sin(a)]], c.ink, 1, [3, 3]); }
      // profile along a diameter
      const P = g.box({ x: x0 + D + 50, y: y0 + 10, w: W - (x0 + D + 70), h: D - 50 }, [-1, 1], [-1.15, 1.15], { xt: [-1, 0, 1], yt: [-1, 0, 1], xl: 'r / a（沿直径）' });
      P.frame(); P.hline(0, c.line, null);
      const prof = x => S.f(Math.abs(x)) / S.mx * (S.m % 2 && x < 0 ? -1 : 1);
      P.fn(x => prof(x) * ph, c.accent, 2); P.fn(prof, c.muted, 1, [4, 3]);
      g.text('虚线：节线（不动）', P.b.x, y0 + D - 8, { color: c.muted, size: 11 });
    },
    note(p, S) {
      if (p.kind === 'plate') return `钳定圆板 $\\eta=J_0(kr)-\\frac{J_0(ka)}{I_0(ka)}I_0(kr)$，$ka=${M.fmt(S.mu)}$；$f\\propto(ka)^2$，$f_${p.n}/f_1=${M.fmt((S.mu / S.mu0) ** 2)}$（膜是 $\\propto ka$）。周界处位移和斜率都为零。`;
      return `$(${p.m},${p.n})$ 方式：$J_${p.m}(ka)=0$ 的第 ${p.n} 个根 $\\mu=${M.fmt(S.mu)}$，$f/f_{01}=${M.fmt(S.mu / S.mu0)}$，有 ${p.m} 条节径、${p.n - 1} 个内部节圆（不是整数倍泛音）。`;
    },
  };

  /* ---------- 赫姆霍兹共鸣器 ---------- */
  reg.helmholtz = {
    title: '赫姆霍兹共鸣器：颈中空气柱是质量，腔内空气是弹簧', h: 290,
    params: [
      { k: 'z', label: '频率比 f/f₀', min: 0.2, max: 3, step: 0.01, v: 1 },
      { k: 'Q', label: '品质因素 Qa', min: 1, max: 30, log: true, v: 6 },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, Hc = (z => 1 / Math.hypot(1 - z * z, z / p.Q))(p.z), ph = Math.atan2(p.z / p.Q, 1 - p.z * p.z);
      const Hmax = p.Q > 0.71 ? 2 * p.Q * p.Q / Math.sqrt(4 * p.Q * p.Q - 1) : 1, w = TAU * 0.5;
      const pin = Math.cos(w * t), pc = Hc * Math.cos(w * t - ph), cx = 120, top = 70;
      // outside sound
      g.field({ x: 20, y: 8, w: 200, h: 40 }, 40, 6, (i, j) => 0.5 * Math.cos(w * t - i * 0.25));
      g.text('外部声压 p', 24, 58, { color: c.muted, size: 11 });
      // cavity
      const cav = { x: cx - 80, y: top + 60, w: 160, h: 120 };
      g.rect(cav.x, cav.y, cav.w, cav.h, null, null);
      const v = pc / Hmax;
      g.rect(cav.x, cav.y, cav.w, cav.h, v >= 0 ? `rgba(${c.posRGB},${Math.abs(v) * 0.75})` : `rgba(${c.negRGB},${Math.abs(v) * 0.75})`, c.ink, 2);
      // neck with the air plug
      const nk = { x: cx - 16, y: top, w: 32, h: 60 };
      g.rect(nk.x, nk.y, nk.w, nk.h, c.bg, null); g.line([[nk.x, nk.y], [nk.x, nk.y + nk.h]], c.ink, 2); g.line([[nk.x + nk.w, nk.y], [nk.x + nk.w, nk.y + nk.h]], c.ink, 2);
      const plug = 18 * pc / Hmax;
      g.rect(nk.x + 2, nk.y + 18 + plug, nk.w - 4, 22, c.orange + '99', c.orange);
      g.text('Ma', cx + 26, top + 30, { color: c.orange, size: 11 }); g.text('Ca（腔内声压）', cav.x + 6, cav.y + cav.h + 14, { color: c.muted, size: 11 });
      // response
      const P = g.box({ x: 280, y: 20, w: W - 300, h: H - 56 }, [0, 3], [0, Math.max(2, p.Q * 1.15)], { xt: [0, 1, 2, 3], yt: [0, Math.round(p.Q)], xl: 'f / f₀', yl: '|p腔 / p外|', grid: true });
      P.frame(); P.fn(z => 1 / Math.hypot(1 - z * z, z / p.Q), c.accent, 2); P.vline(p.z, c.muted); P.dot(p.z, Hc, c.red);
      P.hline(1, c.muted, [2, 3]);
    },
    note(p) {
      const Hc = 1 / Math.hypot(1 - p.z * p.z, p.z / p.Q), ph = Math.atan2(p.z / p.Q, 1 - p.z * p.z) * 180 / PI;
      return `$\\frac{p_c}{p}=\\frac{1}{1-z^2+jz/Q_a}$：此时放大 ${M.fmt(Hc, 2)} 倍、滞后 ${M.fmt(ph, 1)}°。$f=f_0=\\frac{c_0}{2\\pi}\\sqrt{\\frac{S}{lV_0}}$ 时颈中空气柱运动最剧烈，腔内声压是外部的 $Q_a$ 倍；低频腔内声压与外部同相相等，高频空气柱惯性大几乎不动。`;
    },
  };

  /* ---------- 声滤波器 ---------- */
  reg.filter = {
    title: '声滤波器的传输特性（梯形网络）', h: 290, anim: false,
    params: [
      { k: 'kind', label: '', options: [['low', '低通：串臂声质量 + 并臂声容'], ['stop', '带阻：主管旁接共鸣器'], ['band', '带通：侧腔加出口颈（习题 3-14）']], v: 'low' },
      { k: 'N', label: '节数', min: 1, max: 8, step: 1, v: 4 },
      { k: 'R', label: '声阻（相对）', min: 0.005, max: 0.5, log: true, v: 0.03 },
    ],
    resp(p, w) {  // ABCD of N identical T-ish sections (series Z1, shunt Z2), source / load R0 = 1
      const c = (re, im) => ({ re, im }), mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re), add = (a, b) => c(a.re + b.re, a.im + b.im), inv = a => { const d = a.re * a.re + a.im * a.im; return c(a.re / d, -a.im / d); };
      let Z1, Z2;
      if (p.kind === 'low') { Z1 = c(p.R, w); Z2 = inv(c(0, w)); }
      else if (p.kind === 'stop') { Z1 = c(0, 0.05 * w); Z2 = c(p.R, w - 1 / w); }
      else { Z1 = c(p.R, w); Z2 = inv(add(inv(c(p.R * 0.3, w)), c(0, w))); }
      // cascade N sections [series Z1][shunt Y2]: [A B; C D] · [1 Z1; 0 1] · [1 0; Y2 1]
      let A = c(1, 0), B = c(0, 0), C = c(0, 0), D = c(1, 0);
      const Y = inv(Z2);
      for (let i = 0; i < p.N; i++) {
        B = add(B, mul(A, Z1)); D = add(D, mul(C, Z1));
        A = add(A, mul(B, Y)); C = add(C, mul(D, Y));
      }
      const den = add(add(A, B), add(C, D));
      return 2 / Math.hypot(den.re, den.im);
    },
    draw(g, p) {
      const { th: c, W, H } = g;
      const range = { low: [0, 2], stop: [0.2, 3], band: [0.2, 3.5] }[p.kind];
      const wOf = x => p.kind === 'low' ? 2 * x : x;  // low: x = f/fc with ωc = 2 (M = C = 1)
      const P = g.box({ x: 60, y: 18, w: W - 80, h: H - 52 }, range, [-60, 5], { xt: p.kind === 'low' ? [0, 0.5, 1, 1.5, 2] : [0.5, 1, 1.5, 2, 2.5, 3], yt: [-60, -40, -20, 0], xl: p.kind === 'low' ? 'f / fc' : 'f / f₀', yl: '透射 / dB', grid: true });
      // theoretical pass band
      const band = { low: [0, 1], stop: null, band: [1, Math.sqrt(5)] }[p.kind];
      if (band) g.rect(P.X(Math.max(band[0], range[0])), P.b.y, P.X(Math.min(band[1], range[1])) - P.X(Math.max(band[0], range[0])), P.b.h, c.green + '22');
      if (p.kind === 'stop') g.rect(P.X(0.97), P.b.y, P.X(1.03) - P.X(0.97), P.b.h, c.red + '22');
      P.frame();
      P.fn(x => 20 * Math.log10(Math.max(1e-6, reg.filter.resp(p, wOf(x)))), c.accent, 2, null, 600);
      g.text(band ? '绿色：由 −1 ≤ Z₁/4Z₂ ≤ 0 得到的通带' : '红色：旁支串联共振频率处为阻带', P.b.x + 8, P.b.y + 12, { color: c.muted, size: 11 });
    },
    note(p) {
      if (p.kind === 'low') return `每节串臂 $Z_1=j\\omega M_a$、并臂 $Z_2=\\frac1{j\\omega C_a}$，通带 $0\\le f\\le\\frac1{\\pi\\sqrt{M_aC_a}}$。节数越多，截止越陡；通带内的起伏来自网络两端的反射。`;
      if (p.kind === 'stop') return `旁支共鸣器在 $f_0=\\frac1{2\\pi\\sqrt{M_aC_a}}$ 处阻抗最小，把声流“短路”回去：这是共振式消声器。声阻越小，阻带越窄越深。`;
      return `串臂为主管声质量 $M_{a1}$，并臂为侧腔 $C_{a2}$ 与出口颈 $M_{a2}$ 并联；这里取 $M_{a2}=M_{a1}$，通带 $f_L\\le f\\le f_L\\sqrt{1+4M_{a2}/M_{a1}}=\\sqrt5f_L$。`;
    },
  };
})();
