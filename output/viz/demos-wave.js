/* 交互演示（二）：声波——平面波与驻波、叠加与相干、垂直与斜入射、中间层与隔声、波导 */
'use strict';
(() => {
  const { reg, M } = Demo, PI = Math.PI, TAU = 2 * PI;
  const cx = (re, im) => ({ re, im }), cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re), cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
  const cexp = ph => cx(Math.cos(ph), Math.sin(ph)), cabs = a => Math.hypot(a.re, a.im), cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const reAt = (a, wt) => a.re * Math.cos(wt) - a.im * Math.sin(wt);  // Re(a e^{jωt})

  /* ---------- 平面波：行波、驻波、部分反射 ---------- */
  reg.plane = {
    title: '平面声波：质点运动与声压', h: 320,
    params: [
      { k: 'mode', label: '', options: [['travel', '行波'], ['stand', '刚性壁全反射：驻波'], ['part', '部分反射：管中驻波']], v: 'travel' },
      { k: 'r', label: '反射系数 |rp|', min: 0, max: 1, step: 0.01, v: 0.5, when: p => p.mode === 'part' },
      { k: 's', label: '反射相位 σ（×π）', min: -1, max: 1, step: 0.01, v: 0, when: p => p.mode === 'part' },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, L = 30, R = W - 30, top = 14, hh = 120, wt = TAU * 0.5 * t, lam = (R - L) / 2;
      const rr = p.mode === 'travel' ? cx(0, 0) : p.mode === 'stand' ? cx(1, 0) : cmul(cx(p.r, 0), cexp(p.s * PI));
      // x measured from the wall (x <= 0) for reflection, from the left for a travelling wave; k = 2π/λ
      const xOf = px => p.mode === 'travel' ? (px - L) / lam * TAU : (px - R) / lam * TAU;
      const P = kx => cadd(cexp(-kx), cmul(rr, cexp(kx))), V = kx => cadd(cexp(-kx), cmul(cx(-rr.re, -rr.im), cexp(kx)));
      const norm = 1 + cabs(rr);
      g.field({ x: L, y: top, w: R - L, h: hh }, 220, 2, i => reAt(P(xOf(L + (i + 0.5) / 220 * (R - L))), wt) / norm);
      // particles: displacement ξ = v/(jω) -> Re(V e^{jωt}/j)
      for (let j = 0; j < 7; j++) for (let i = 0; i <= 64; i++) {
        const px = L + (R - L) * i / 64, v = V(xOf(px)), xi = (v.re * Math.sin(wt) + v.im * Math.cos(wt)) / norm;
        g.circle(px + 9 * xi, top + 10 + j * (hh - 20) / 6, 2, c.ink);
      }
      if (p.mode !== 'travel') g.hatch(R + 2, top + hh, R + 2, top, c.muted);
      else g.arrow(R - 70, top + hh + 10, R - 10, top + hh + 10, c.muted, 1.4);
      const B = g.box({ x: L, y: top + hh + 30, w: R - L, h: H - (top + hh + 30) - 26 }, [0, 1], [-2.1, 2.1], { yt: [-2, -1, 0, 1, 2] });
      B.frame(); B.hline(0, c.line, null);
      const at = u => L + u * (R - L);
      B.fn(u => reAt(P(xOf(at(u))), wt), c.red, 2); B.fn(u => reAt(V(xOf(at(u))), wt), c.blue, 1.6, [6, 3]);
      if (p.mode !== 'travel') { B.fn(u => cabs(P(xOf(at(u)))), c.muted, 1, [2, 3]); B.fn(u => -cabs(P(xOf(at(u)))), c.muted, 1, [2, 3]); }
      g.text('声压 p', B.b.x + 6, B.b.y + 10, { color: c.red, size: 11 }); g.text('质点速度 ρ₀c₀v', B.b.x + 56, B.b.y + 10, { color: c.blue, size: 11 });
      g.text('背景色 = 声压，黑点 = 媒质质点（位移放大）', L, H - 10, { color: c.muted, size: 11 });
    },
    note(p) {
      if (p.mode === 'travel') return `行波中声压与质点速度同相，$p=\\rho_0c_0v$；质点只在平衡位置附近来回振动，传播的是振动状态。质点密集处是压缩（声压为正）。`;
      if (p.mode === 'stand') return `入射波与反射波叠加成驻波：壁面是声压波腹、速度波节，相距 $\\lambda/4$ 处相反；声压与速度相差 90°，平均声强为零。`;
      const r = p.r, G = r < 1 ? (1 + r) / (1 - r) : Infinity;
      return `驻波比 $G=\\frac{1+|r_p|}{1-|r_p|}=${M.fmt(G, 2)}$；第一个声压极小点距端面 $(1+\\sigma)\\frac\\lambda4=${M.fmt((1 + p.s) / 4, 3)}\\lambda$（灰色虚线是声压幅值包络）。测出 $G$ 与极小点位置就能反求端面阻抗。`;
    },
  };

  /* ---------- 两列波的叠加：相干与不相干 ---------- */
  reg.coherence = {
    title: '两列声波的叠加：相干与不相干', h: 290,
    params: [
      { k: 'kind', label: '', options: [['same', '同频率、固定相位差'], ['diff', '频率不同（拍）']], v: 'same' },
      { k: 'a', label: '振幅比 p₂/p₁', min: 0, max: 1.5, step: 0.01, v: 1 },
      { k: 'ph', label: '相位差 Δφ（°）', min: 0, max: 360, step: 1, v: 60, when: p => p.kind === 'same' },
      { k: 'f2', label: '频率比 f₂/f₁', min: 1.03, max: 2, step: 0.01, v: 1.15, when: p => p.kind === 'diff' },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, w1 = TAU * 0.6, span = 6;
      const p1 = s => Math.cos(w1 * s), p2 = s => p.a * Math.cos((p.kind === 'same' ? w1 : w1 * p.f2) * s - (p.kind === 'same' ? p.ph * PI / 180 : 0));
      const B = g.box({ x: 40, y: 16, w: W - 230, h: H - 46 }, [t, t + span], [-2.6, 2.6], { yt: [-2, 0, 2], xl: '时间 →' });
      B.frame(); B.hline(0, c.line, null);
      B.fn(p1, c.blue, 1.1, [5, 3]); B.fn(p2, c.green, 1.1, [5, 3]); B.fn(s => p1(s) + p2(s), c.red, 2.2, null, 500);
      g.text('p₁', B.b.x + 6, B.b.y + 10, { color: c.blue, size: 11 }); g.text('p₂', B.b.x + 30, B.b.y + 10, { color: c.green, size: 11 }); g.text('p₁+p₂', B.b.x + 54, B.b.y + 10, { color: c.red, size: 11 });
      // energy bars: ε ∝ mean p²
      const e1 = 0.5, e2 = 0.5 * p.a * p.a, cross = p.kind === 'same' ? p.a * Math.cos(p.ph * PI / 180) : 0;
      let meas = 0; const n = 400; for (let i = 0; i < n; i++) { const s = t + span * i / n; meas += (p1(s) + p2(s)) ** 2; } meas /= n;
      const bars = [['ε₁', e1, c.blue], ['ε₂', e2, c.green], ['干涉项', cross, c.orange], ['合成', e1 + e2 + cross, c.red], ['窗口内实测', meas, c.muted]];
      const bx = W - 175, base = H / 2 + 20, sc = 40;
      g.line([[bx - 4, base], [W - 10, base]], c.line, 1);
      bars.forEach(([nm, v, col], i) => { const x = bx + i * 33, h = v * sc; g.rect(x, h >= 0 ? base - h : base, 24, Math.abs(h), col); g.text(nm, x + 12, base + 14 + (i % 2) * 12, { color: col, size: 9.5, align: 'center' }); });
    },
    note(p) {
      if (p.kind === 'diff') return `频率不同时干涉项 $\\overline{\\cos[(\\omega_1-\\omega_2)t]}$ 长时间平均为零，$\\bar\\varepsilon=\\bar\\varepsilon_1+\\bar\\varepsilon_2$：不相干波能量直接相加。窗口内实测值随“拍”起伏，平均下来等于两者之和。`;
      const cr = p.a * Math.cos(p.ph * PI / 180), tot = 0.5 + 0.5 * p.a * p.a + cr, inc = 0.5 + 0.5 * p.a * p.a;
      return `$p_a^2=p_{1a}^2+p_{2a}^2+2p_{1a}p_{2a}\\cos\\Delta\\varphi$：比不相干时 ${tot > 1e-9 ? (10 * Math.log10(tot / inc) >= 0 ? '高 ' : '低 ') + M.fmt(Math.abs(10 * Math.log10(tot / inc)), 2) + ' dB' : '完全抵消'}。同相等幅时 +3 dB（相对能量和），即声压 ×2、比单列 +6 dB；反相则抵消。`;
    },
  };

  /* ---------- 垂直入射：两种媒质 / 截面突变 ---------- */
  reg.interface = {
    title: '平面波垂直入射到界面', h: 300,
    params: [
      { k: 'kind', label: '', options: [['media', '两种媒质的界面'], ['duct', '管道截面突变（同一媒质）']], v: 'media' },
      { k: 'q', label: '阻抗比 R₂/R₁', min: 0.02, max: 50, log: true, v: 4, when: p => p.kind === 'media' },
      { k: 'cr', label: '声速比 c₂/c₁', min: 0.3, max: 4, log: true, v: 1.5, when: p => p.kind === 'media' },
      { k: 'sr', label: '面积比 S₂/S₁', min: 0.05, max: 10, log: true, v: 0.33, when: p => p.kind === 'duct' },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, L = 30, R = W - 30, X0 = (L + R) / 2, lam1 = (R - L) / 3.2, wt = TAU * 0.5 * t, mid = 90;
      const q = p.kind === 'media' ? p.q : 1 / p.sr, k2r = p.kind === 'media' ? 1 / p.cr : 1;  // q: (ρc/S) ratio
      const r = (q - 1) / (q + 1), tp = 1 + r;
      const pr = px => { const u = (px - X0) / lam1 * TAU; return px < X0 ? Math.cos(wt - u) + r * Math.cos(wt + u) : tp * Math.cos(wt - u * k2r); };
      const amp = Math.max(1 + Math.abs(r), Math.abs(tp));
      if (p.kind === 'media') {
        g.rect(L, mid - 60, X0 - L, 120, c.blue + '14'); g.rect(X0, mid - 60, R - X0, 120, c.orange + '18');
        g.text('媒质 1：R₁', L + 6, mid - 50, { color: c.muted, size: 11 }); g.text('媒质 2：R₂', X0 + 6, mid - 50, { color: c.muted, size: 11 });
      } else {
        const h1 = 50, h2 = M.clamp(50 * Math.sqrt(p.sr), 8, 110);
        g.line([[L, mid - h1], [X0, mid - h1], [X0, mid - h2], [R, mid - h2]], c.ink, 2); g.line([[L, mid + h1], [X0, mid + h1], [X0, mid + h2], [R, mid + h2]], c.ink, 2);
        g.text('S₁', L + 6, mid - h1 + 12, { color: c.muted, size: 11 }); g.text('S₂', R - 20, mid - h2 + 12, { color: c.muted, size: 11 });
      }
      g.line([[X0, mid - 64], [X0, mid + 64]], c.ink, 1, [3, 3]);
      const B = g.box({ x: L, y: mid - 55, w: R - L, h: 110 }, [L, R], [-amp * 1.05, amp * 1.05]);
      B.fn(x => (x < X0 ? Math.cos(wt - (x - X0) / lam1 * TAU) : NaN), c.blue, 1, [5, 3], 300, L, X0);
      B.fn(x => (x < X0 ? r * Math.cos(wt + (x - X0) / lam1 * TAU) : NaN), c.green, 1, [5, 3], 300, L, X0);
      B.fn(pr, c.red, 2.2, null, 500);
      g.text('入射', L + 6, mid + 52, { color: c.blue, size: 11 }); g.text('反射', L + 40, mid + 52, { color: c.green, size: 11 }); g.text('合成声压', L + 74, mid + 52, { color: c.red, size: 11 });
      // coefficient bars
      const tI = tp * tp / q, rI = r * r, bars = [['rₚ', r], ['tₚ', tp], ['r_I', rI], [p.kind === 'media' ? 't_I' : 't_W', tI]];
      const by = H - 40, bx = L + 20, sc = 30;
      g.line([[bx - 10, by], [bx + 330, by]], c.line, 1);
      bars.forEach(([nm, v], i) => { const x = bx + i * 80, h = v * sc; g.rect(x, h >= 0 ? by - h : by, 30, Math.abs(h), [c.green, c.red, c.orange, c.blue][i]); g.text(`${nm} = ${M.fmt(v, 3)}`, x + 15, by + 14, { color: c.ink, size: 10.5, align: 'center' }); });
    },
    note(p) {
      const q = p.kind === 'media' ? p.q : 1 / p.sr, r = (q - 1) / (q + 1);
      const base = p.kind === 'media' ? `$r_p=\\frac{R_2-R_1}{R_2+R_1}$，$t_p=1+r_p$，$r_I+t_I=1$。` : `截面突变时管中“特性声阻抗”为 $\\rho_0c_0/S$：$r_p=\\frac{S_1-S_2}{S_1+S_2}$，功率透射 $t_W=\\frac{4S_1S_2}{(S_1+S_2)^2}$。`;
      return base + (r > 0.05 ? '后面“更硬”（阻抗大），反射波与入射波同相，界面处声压加强。' : r < -0.05 ? '后面“更软”，反射波反相，界面处声压减小。' : '阻抗几乎匹配，几乎没有反射。');
    },
  };

  /* ---------- 斜入射 ---------- */
  reg.oblique = {
    title: '平面波斜入射：反射、折射与全反射', h: 320,
    params: [
      { k: 'th', label: '入射角 θᵢ（°）', min: 0, max: 89, step: 0.5, v: 30 },
      { k: 'cr', label: '声速比 c₂/c₁', min: 0.3, max: 3, log: true, v: 1.6 },
      { k: 'm', label: '密度比 ρ₂/ρ₁', min: 0.2, max: 5, log: true, v: 1.5 },
    ],
    setup(p, S) {
      const s = Math.sin(p.th * PI / 180), ci = Math.cos(p.th * PI / 180), n = 1 / p.cr, st = s * p.cr;
      const ct = st <= 1 ? cx(Math.sqrt(1 - st * st), 0) : cx(0, -Math.sqrt(st * st - 1));
      const num = cadd(cx(p.m * ci, 0), cx(-n * ct.re, -n * ct.im)), den = cadd(cx(p.m * ci, 0), cx(n * ct.re, n * ct.im));
      S.r = cdiv(num, den); S.t = cadd(cx(1, 0), S.r); S.ct = ct; S.st = st; S.s = s; S.ci = ci;
      const N = 150, NY = 110, k1 = TAU / 30;  // grid units: λ1 = 30 cells
      S.N = N; S.NY = NY; S.re = new Float64Array(N * NY); S.im = new Float64Array(N * NY);
      const k2 = k1 / p.cr, y0 = NY * 0.55;
      for (let j = 0; j < NY; j++) for (let i = 0; i < N; i++) {
        const x = i, y = y0 - j;  // y > 0: medium 1 (upper)
        let a;
        if (y >= 0) a = cadd(cexp(-k1 * (x * s - y * ci)), cmul(S.r, cexp(-k1 * (x * s + y * ci))));
        else { const kx = k1 * s, ky = cmul(cx(k2, 0), ct); a = cmul(S.t, cmul(cexp(-kx * x), cmul(cexp(ky.re * y), cx(Math.exp(-ky.im * y), 0)))); }
        S.re[j * N + i] = a.re; S.im[j * N + i] = a.im;
      }
      S.norm = Math.max(1 + cabs(S.r), cabs(S.t)); S.y0 = y0;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, bw = Math.min(W - 230, (H - 20) * S.N / S.NY), b = { x: 12, y: 10, w: bw, h: bw * S.NY / S.N }, wt = TAU * 0.5 * t;
      const cw = Math.cos(wt), sw = Math.sin(wt), N = S.N;
      g.field(b, N, S.NY, (i, j) => (S.re[j * N + i] * cw - S.im[j * N + i] * sw) / S.norm);
      const yI = b.y + b.h * S.y0 / S.NY, ox = b.x + b.w * 0.5;
      g.line([[b.x, yI], [b.x + b.w, yI]], c.ink, 1.5);
      const L = 70, s = S.s, ci = S.ci;
      g.arrow(ox - L * s, yI - L * ci, ox - 4 * s, yI - 4 * ci, c.ink, 2);
      g.arrow(ox, yI, ox + L * s, yI - L * ci * 1, c.ink, 1.4 + cabs(S.r));
      if (S.st <= 1) { const st = S.st, ctr = S.ct.re; g.arrow(ox, yI, ox + L * st, yI + L * ctr, c.ink, 2); }
      g.line([[ox, yI - 60], [ox, yI + 60]], c.muted, 1, [3, 3]);
      g.text('媒质 1', b.x + 6, b.y + 12, { color: c.ink, size: 11 }); g.text('媒质 2', b.x + 6, yI + 14, { color: c.ink, size: 11 });
      // |r| vs angle
      const P = g.box({ x: b.x + b.w + 46, y: 24, w: W - (b.x + b.w + 60), h: H - 70 }, [0, 90], [0, 1], { xt: [0, 30, 60, 90], yt: [0, 0.5, 1], xl: 'θᵢ / °', yl: '|rₚ|', grid: true });
      P.frame();
      const rOf = deg => { const S2 = {}; reg.oblique.setupR({ ...p, th: deg }, S2); return cabs(S2.r); };
      P.fn(rOf, c.accent, 2, null, 180); P.vline(p.th, c.muted); P.dot(p.th, cabs(S.r), c.red);
      if (p.cr > 1) P.vline(Math.asin(1 / p.cr) * 180 / PI, c.red, [2, 3]);
    },
    setupR(p, S) {
      const s = Math.sin(p.th * PI / 180), ci = Math.cos(p.th * PI / 180), n = 1 / p.cr, st = s * p.cr;
      const ct = st <= 1 ? cx(Math.sqrt(1 - st * st), 0) : cx(0, -Math.sqrt(st * st - 1));
      S.r = cdiv(cadd(cx(p.m * ci, 0), cx(-n * ct.re, -n * ct.im)), cadd(cx(p.m * ci, 0), cx(n * ct.re, n * ct.im)));
    },
    note(p, S) {
      const crit = p.cr > 1 ? Math.asin(1 / p.cr) * 180 / PI : null, n = 1 / p.cr, m = p.m;
      const s0 = (m * m - n * n) / (m * m - 1), th0 = s0 >= 0 && s0 <= 1 && Math.abs(m - 1) > 1e-6 ? Math.asin(Math.sqrt(s0)) * 180 / PI : null;
      return `斯奈尔定律 $\\frac{\\sin\\theta_i}{\\sin\\theta_t}=\\frac{c_1}{c_2}$。${S.st <= 1 ? `折射角 $\\theta_t=${M.fmt(Math.asin(S.st) * 180 / PI, 1)}^\\circ$` : '已超过临界角：媒质 2 中只有沿界面传播、离界面指数衰减的波，$|r_p|=1$（全反射）'}；$|r_p|=${M.fmt(cabs(S.r), 3)}$。` +
        (crit ? `临界角 $\\theta_{ic}=\\arcsin\\frac{c_1}{c_2}=${M.fmt(crit, 1)}^\\circ$（右图红色虚线）。` : '$c_2<c_1$，没有全反射。') + (th0 !== null ? `全透射角 $\\theta_{i0}=${M.fmt(th0, 1)}^\\circ$（$|r_p|=0$）。` : '');
    },
  };

  /* ---------- 中间层与单层墙 ---------- */
  reg.layer = {
    title: '中间层的透射与单层墙隔声', h: 290, anim: false,
    params: [
      { k: 'kind', label: '', options: [['layer', '中间层：透射系数随厚度变化'], ['wall', '单层墙：隔声量随频率变化（质量定律）']], v: 'layer' },
      { k: 'r2', label: 'R₂/R₁', min: 0.01, max: 100, log: true, v: 3, when: p => p.kind === 'layer' },
      { k: 'r3', label: 'R₃/R₁', min: 0.05, max: 20, log: true, v: 9, when: p => p.kind === 'layer' },
      { k: 'D', label: '层厚 D/λ₂', min: 0, max: 1, step: 0.005, v: 0.25, when: p => p.kind === 'layer' },
      { k: 'Mw', label: '面密度 M（kg/m²）', min: 1, max: 500, log: true, v: 20, when: p => p.kind === 'wall' },
      { k: 'ang', label: '入射角（°）', min: 0, max: 80, step: 1, v: 0, when: p => p.kind === 'wall' },
    ],
    tI(r2, r3, D) { const k = TAU * D, c2 = Math.cos(k) ** 2, s2 = Math.sin(k) ** 2; return 4 * r3 / ((1 + r3) ** 2 * c2 + (r2 + r3 / r2) ** 2 * s2); },
    draw(g, p) {
      const { th: c, W, H } = g;
      if (p.kind === 'layer') {
        const P = g.box({ x: 56, y: 20, w: W - 76, h: H - 56 }, [0, 1], [0, 1.05], { xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], xl: 'D / λ₂', yl: '声强透射系数 t_I', grid: true });
        P.frame(); P.fn(D => reg.layer.tI(p.r2, p.r3, D), c.accent, 2, null, 500);
        P.hline(4 * p.r3 / (1 + p.r3) ** 2, c.muted); P.vline(p.D, c.muted); P.dot(p.D, reg.layer.tI(p.r2, p.r3, p.D), c.red);
        g.text('虚线：没有中间层时的透射', P.b.x + 8, P.Y(4 * p.r3 / (1 + p.r3) ** 2) - 9, { color: c.muted, size: 10.5 });
      } else {
        const R1 = 415, cosA = Math.cos(p.ang * PI / 180), TL = f => 10 * Math.log10(1 + (TAU * f * p.Mw * cosA / (2 * R1)) ** 2);
        const P = g.box({ x: 56, y: 20, w: W - 76, h: H - 56 }, [50, 8000], [0, 80], { logx: true, xt: [63, 125, 250, 500, 1000, 2000, 4000, 8000], xf: v => v >= 1000 ? v / 1000 + 'k' : String(v), yt: [0, 20, 40, 60, 80], xl: '频率 / Hz', yl: 'TL / dB', grid: true });
        P.frame(); P.fn(TL, c.accent, 2.2); P.fn(f => 20 * Math.log10(TAU * f * p.Mw * cosA / (2 * R1)), c.muted, 1, [4, 3]);
        g.text('虚线：20lg(ωM/2ρc) —— 每倍频程 +6 dB', P.b.x + 8, P.b.y + 12, { color: c.muted, size: 10.5 });
      }
    },
    note(p) {
      if (p.kind === 'wall') return `墙看成整体运动的质量，$TL=10\\lg[1+(\\frac{\\omega M\\cos\\theta}{2\\rho_1c_1})^2]\\approx20\\lg f+20\\lg M-42$ dB（垂直入射）：频率或面密度加倍，隔声量增加 6 dB。`;
      const best = Math.sqrt(p.r3), t = reg.layer.tI(p.r2, p.r3, p.D);
      return `$t_I=${M.fmt(t, 3)}$。$D=\\lambda_2/2$ 的整数倍时中间层“透明”；$D=\\lambda_2/4$ 且 $R_2=\\sqrt{R_1R_3}$（此处 ${M.fmt(best, 2)}）时全透射——超声换能器的匹配层。`;
    },
  };

  /* ---------- 波导 ---------- */
  const JP = {  // zeros of J_m'(x): m = 0 (incl. the plane wave 0), 1, 2
    0: [0, 3.8317, 7.0156], 1: [1.8412, 5.3314, 8.5363], 2: [3.0542, 6.7061, 9.9695],
  };
  reg.waveguide = {
    title: '声波导：简正波与截止频率', h: 300,
    params: [
      { k: 'kind', label: '', options: [['rect', '矩形管：纵剖面中的 (n,0) 次波'], ['round', '圆管：截面上的 (m,n) 次波']], v: 'rect' },
      { k: 'n', label: '次数 n', min: 0, max: 3, step: 1, v: 1, when: p => p.kind === 'rect' },
      { k: 'F', label: '频率 f / f₁₀', min: 0.2, max: 4, step: 0.01, v: 1.6, when: p => p.kind === 'rect' },
      { k: 'm', label: 'm（节径）', min: 0, max: 2, step: 1, v: 1, when: p => p.kind === 'round' },
      { k: 'nn', label: 'n（节圆）', min: 0, max: 2, step: 1, v: 0, when: p => p.kind === 'round' },
    ],
    setup(p, S) {
      if (p.kind !== 'round') return;
      const mu = JP[p.m][p.nn], N = 120; S.mu = mu; S.N = N; S.amp = new Float64Array(N * N);
      let mx = 0; const f = r => mu === 0 ? 1 : M.J(p.m, mu * r);
      for (let i = 0; i <= 100; i++) mx = Math.max(mx, Math.abs(f(i / 100)));
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N * 2 - 1, y = (j + 0.5) / N * 2 - 1, r = Math.hypot(x, y);
        S.amp[j * N + i] = r > 1 ? NaN : f(r) / mx * Math.cos(p.m * Math.atan2(y, x));
      }
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, wt = TAU * 0.5 * t;
      if (p.kind === 'round') {
        const D = H - 30, N = S.N, ph = Math.cos(wt);
        g.field({ x: 20, y: 12, w: D, h: D }, N, N, (i, j) => { const a = S.amp[j * N + i]; return isNaN(a) ? null : a * ph; });
        g.circle(20 + D / 2, 12 + D / 2, D / 2, null, c.ink, 2);
        const list = [];
        for (const m of [0, 1, 2]) JP[m].forEach((mu, n) => list.push([mu, m, n]));
        list.sort((a, b) => a[0] - b[0]);
        let y = 24; g.text('截止频率 f / f₁₀（= μ / 1.841）', D + 50, y, { color: c.muted, size: 11.5 });
        list.forEach(([mu, m, n]) => { y += 19; g.text(`(${m},${n})  μ = ${mu.toFixed(3)}  →  ${mu === 0 ? '0（平面波）' : (mu / 1.8412).toFixed(3)}`, D + 50, y, { color: m === p.m && n === p.nn ? c.red : c.ink, size: 11.5, bold: m === p.m && n === p.nn }); });
        return;
      }
      const a = 90, L = 20, R = W - 20, y0 = 30, k = PI * p.F, kx = p.n * PI, kz2 = k * k - kx * kx;  // lengths in units of a
      const prop = kz2 > 0, kz = prop ? Math.sqrt(kz2) : Math.sqrt(-kz2), len = (R - L) / a;
      g.field({ x: L, y: y0, w: R - L, h: a }, 240, 40, (i, j) => {
        const z = (i + 0.5) / 240 * len, x = (j + 0.5) / 40, tr = Math.cos(kx * x);
        return 0.95 * tr * (prop ? Math.cos(wt - kz * z) : Math.exp(-kz * z) * Math.cos(wt));
      });
      g.line([[L, y0], [R, y0]], c.ink, 2.5); g.line([[L, y0 + a], [R, y0 + a]], c.ink, 2.5);
      if (prop && p.n > 0) {  // the two plane waves bouncing between the walls
        const ang = Math.atan2(kx, kz), stepz = a / Math.tan(ang);
        for (let z = L; z < R; z += 2 * stepz) g.line([[z, y0 + a], [z + stepz, y0], [z + 2 * stepz, y0 + a]], c.ink, 1, [4, 4]);
      }
      const fc = p.n, B = g.box({ x: L + 40, y: y0 + a + 40, w: R - L - 60, h: H - (y0 + a + 40) - 30 }, [0, 4], [0, 3], { xt: [0, 1, 2, 3, 4], yt: [0, 1, 2, 3], xl: 'f / f₁₀', yl: 'c / c₀' });
      B.frame();
      if (fc > 0) { B.fn(F => F > fc ? 1 / Math.sqrt(1 - (fc / F) ** 2) : NaN, c.red, 2, null, 400, fc + 1e-3, 4); B.fn(F => F > fc ? Math.sqrt(1 - (fc / F) ** 2) : NaN, c.blue, 2, null, 400, fc, 4); B.vline(fc, c.muted); }
      else B.hline(1, c.accent, null, 2);
      B.vline(p.F, c.ink, [2, 2]);
      g.text('相速 c_p', B.b.x + 8, B.b.y + 10, { color: c.red, size: 11 }); g.text('群速 c_g', B.b.x + 70, B.b.y + 10, { color: c.blue, size: 11 });
    },
    note(p, S) {
      if (p.kind === 'round') return `圆管刚性壁要求 $J_m'(\\mu)=0$，$f_{mn}=\\mu_{mn}\\frac{c_0}{2\\pi a}$；最低的高次波是 $(1,0)$ 次（$\\mu=1.841$）。轴对称声源只激发 $m=0$ 的波，截止频率提高到 $3.832\\frac{c_0}{2\\pi a}$。当前方式 $\\mu=${M.fmt(S.mu, 4)}$。`;
      const fc = p.n;
      if (p.n === 0) return `$(0,0)$ 次波就是平面波，没有截止频率，任何频率都能传播，相速、群速都等于 $c_0$。`;
      return p.F > fc ? `$f>f_{${p.n}0}=${fc}f_{10}$，该次波能传播：截面上是驻波 $\\cos\\frac{n\\pi x}{l_x}$，可看成两列在管壁间来回反射的平面波（虚线）。$c_p/c_0=${M.fmt(1 / Math.sqrt(1 - (fc / p.F) ** 2), 3)}$，$c_g/c_0=${M.fmt(Math.sqrt(1 - (fc / p.F) ** 2), 3)}$，$c_pc_g=c_0^2$。`
        : `$f<f_{${p.n}0}$：$k_z$ 为虚数，该次波沿管指数衰减（消失波），不能传播。把频率调过 ${fc}$ 看它“通过”。`;
    },
  };
})();
