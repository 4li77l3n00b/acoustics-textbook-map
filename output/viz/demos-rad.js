/* 交互演示（三）：辐射、接收与散射、室内声场、固体中的波 */
'use strict';
(() => {
  const { reg, M } = Demo, PI = Math.PI, TAU = 2 * PI;
  const squash = v => Math.tanh(1.6 * v);

  /* ---------- 脉动球源 ---------- */
  reg.sphere = {
    title: '脉动球源：球面波、近场与辐射阻抗', h: 300,
    params: [
      { k: 'ka', label: 'kr₀（球大小 / 波长）', min: 0.05, max: 6, log: true, v: 0.5 },
      { k: 'view', label: '右图', options: [['imp', '辐射阻抗 Z_r / ρ₀c₀S₀'], ['phase', '声压与速度的相位差']], v: 'imp' },
    ],
    setup(p, S, g) {
      const N = 150, span = 4;  // field square spans 4 wavelengths
      const r0 = p.ka / TAU;  // radius in wavelengths
      S.N = N; S.re = new Float64Array(N * N); S.im = new Float64Array(N * N); S.r0 = r0; S.span = span;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N - 0.5) * span, y = ((j + 0.5) / N - 0.5) * span, r = Math.hypot(x, y), k = TAU;
        if (r < r0) { S.re[j * N + i] = NaN; continue; }
        const a = Math.max(r0, 0.15) / Math.max(r, 0.15), ph = -k * (r - r0);
        S.re[j * N + i] = a * Math.cos(ph); S.im[j * N + i] = a * Math.sin(ph);
      }
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, D = H - 20, b = { x: 10, y: 10, w: D, h: D }, wt = TAU * 0.5 * t, cw = Math.cos(wt), sw = Math.sin(wt), N = S.N;
      g.field(b, N, N, (i, j) => { const re = S.re[j * N + i]; return isNaN(re) ? null : squash(re * cw - S.im[j * N + i] * sw); });
      const rp = Math.max(1.5, S.r0 / S.span * D) * (1 + 0.06 * Math.cos(wt - PI / 2));
      g.circle(b.x + D / 2, b.y + D / 2, rp, c.ink + '88', c.ink, 1.2);
      g.text('图宽 4λ', b.x + 6, b.y + D - 8, { color: c.muted, size: 10.5 });
      const P = p.view === 'imp'
        ? g.box({ x: D + 60, y: 24, w: W - D - 80, h: H - 66 }, [0, 6], [0, 1.05], { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 0.5, 1], xl: 'kr₀', grid: true })
        : g.box({ x: D + 60, y: 24, w: W - D - 80, h: H - 66 }, [0, 6], [0, 90], { xt: [0, 1, 2, 3, 4, 5, 6], yt: [0, 45, 90], xl: 'kr', yl: '相位差 / °', grid: true });
      P.frame();
      if (p.view === 'imp') {
        P.fn(x => x * x / (1 + x * x), c.red, 2); P.fn(x => x / (1 + x * x), c.blue, 2);
        P.vline(p.ka, c.muted); P.dot(p.ka, p.ka ** 2 / (1 + p.ka ** 2), c.red); P.dot(p.ka, p.ka / (1 + p.ka ** 2), c.blue);
        g.text('辐射阻 R_r', P.b.x + 8, P.b.y + 10, { color: c.red, size: 11 }); g.text('辐射抗 X_r', P.b.x + 80, P.b.y + 10, { color: c.blue, size: 11 });
      } else {
        P.fn(x => Math.atan(1 / x) * 180 / PI, c.accent, 2, null, 300, 0.02, 6);
        g.text('近场速度超前声压，远场两者同相', P.b.x + 8, P.b.y + 10, { color: c.muted, size: 11 });
      }
    },
    note(p) {
      const x = p.ka, R = x * x / (1 + x * x), X = x / (1 + x * x);
      return `$p=\\frac Are^{j(\\omega t-kr)}$，振幅按 $1/r$ 衰减（颜色已作压缩）。$Z_r=\\rho_0c_0S_0\\frac{(kr_0)^2+jkr_0}{1+(kr_0)^2}$：此时 $R_r/\\rho_0c_0S_0=${M.fmt(R, 3)}$，$X_r/\\rho_0c_0S_0=${M.fmt(X, 3)}$。` +
        (x < 0.5 ? '小球源 $R_r\\approx\\rho_0c_0S_0(kr_0)^2$：辐射效率低，大部分是同振质量（3 倍排开空气质量）。' : x > 3 ? '大球源 $R_r\\to\\rho_0c_0S_0$：像平面波一样有效辐射。' : '');
    },
  };

  /* ---------- 小球源组合：单极、偶极、同相对、声柱、镜像、不相干线阵 ---------- */
  reg.sources = {
    title: '小球源的组合：声场与指向性', h: 320,
    params: [
      { k: 'cfg', label: '', options: [['mono', '单个小球源'], ['dip', '偶极子（反相一对）'], ['pair', '两个同相小球源'], ['line', '声柱：n 个同相源'], ['image', '刚性壁旁的源（镜像）'], ['incoh', '不相干线阵（如交通噪声）']], v: 'pair' },
      { k: 'd', label: '间距 l / λ', min: 0.05, max: 2, step: 0.01, v: 0.5, when: p => p.cfg !== 'mono' },
      { k: 'n', label: '源数 n', min: 2, max: 12, step: 1, v: 6, when: p => p.cfg === 'line' || p.cfg === 'incoh' },
    ],
    srcs(p) {  // [x, y, amplitude] in wavelengths, axis of pairs/lines along y (θ measured from +x)
      const d = p.d;
      if (p.cfg === 'mono') return [[0, 0, 1]];
      if (p.cfg === 'dip') return [[-d / 2, 0, 1], [d / 2, 0, -1]];
      if (p.cfg === 'pair') return [[0, -d / 2, 1], [0, d / 2, 1]];
      if (p.cfg === 'image') return [[-0.6 + d / 2, 0, 1], [-0.6 - d / 2, 0, 1]];
      const n = p.n; return Array.from({ length: n }, (_, i) => [0, (i - (n - 1) / 2) * d, 1]);
    },
    setup(p, S) {
      const N = 150, span = 4, src = reg.sources.srcs(p);
      S.N = N; S.re = new Float64Array(N * N); S.im = new Float64Array(N * N); S.src = src; S.span = span;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N - 0.5) * span, y = (0.5 - (j + 0.5) / N) * span;
        if (p.cfg === 'image' && x < -0.6) { S.re[j * N + i] = NaN; continue; }
        let re = 0, im = 0;
        for (const [sx, sy, a] of src) {
          const r = Math.max(Math.hypot(x - sx, y - sy), 0.06);
          if (p.cfg === 'incoh') re += 1 / (r * r); else { re += a * 0.3 / r * Math.cos(-TAU * r); im += a * 0.3 / r * Math.sin(-TAU * r); }
        }
        S.re[j * N + i] = re; S.im[j * N + i] = im;
      }
      if (p.cfg === 'incoh') { let mx = 0; for (const v of S.re) if (v > mx) mx = v; S.mx = mx; }
      // far-field directivity, θ from +x
      const k = TAU, Ds = new Float64Array(361); let mx = 0;
      for (let i = 0; i <= 360; i++) {
        const th = i * PI / 180; let re = 0, im = 0;
        for (const [sx, sy, a] of src) { const ph = k * (sx * Math.cos(th) + sy * Math.sin(th)); re += a * Math.cos(ph); im += a * Math.sin(ph); }
        Ds[i] = Math.hypot(re, im); mx = Math.max(mx, Ds[i]);
      }
      for (let i = 0; i <= 360; i++) Ds[i] /= mx || 1;
      S.D = Ds;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, D = H - 20, b = { x: 10, y: 10, w: D, h: D }, N = S.N, wt = TAU * 0.5 * t, cw = Math.cos(wt), sw = Math.sin(wt);
      if (p.cfg === 'incoh') {
        const lg = v => Math.max(0, Math.min(1, 1 + Math.log10(v / S.mx) / 3));
        g.field(b, N, N, (i, j) => lg(S.re[j * N + i]));
      } else g.field(b, N, N, (i, j) => { const re = S.re[j * N + i]; return isNaN(re) ? null : squash(re * cw - S.im[j * N + i] * sw); });
      const X = x => b.x + (x / S.span + 0.5) * D, Y = y => b.y + (0.5 - y / S.span) * D;
      S.src.forEach(([sx, sy, a]) => g.circle(X(sx), Y(sy), 3.5, a > 0 ? c.red : c.blue, c.ink, 1));
      if (p.cfg === 'image') { g.hatch(X(-0.6), b.y + D, X(-0.6), b.y, c.ink); g.text('像源', X(-0.6 - p.d / 2), Y(0) + 14, { color: c.muted, size: 10.5, align: 'center' }); }
      g.text('图宽 4λ', b.x + 6, b.y + D - 8, { color: c.muted, size: 10.5 });
      const cx0 = D + 30 + (W - D - 30) / 2, cy0 = H / 2, R = Math.min((W - D - 60) / 2, H / 2 - 24);
      if (p.cfg === 'incoh') {
        const P = g.box({ x: D + 60, y: 24, w: W - D - 80, h: H - 66 }, [0.1, 10], [-30, 0], { logx: true, xt: [0.1, 1, 10], yt: [-30, -20, -10, 0], xl: '到线阵距离 / 源间距', yl: '相对声压级 / dB', grid: true });
        P.frame();
        P.fn(r => 10 * Math.log10(0.1 / r), c.blue, 1.6, [5, 3]); P.fn(r => 20 * Math.log10(0.1 / r), c.red, 1.6, [5, 3]);
        g.text('线声源 −3 dB/倍距', P.b.x + 8, P.b.y + 10, { color: c.blue, size: 11 }); g.text('点声源 −6 dB/倍距', P.b.x + 8, P.b.y + 26, { color: c.red, size: 11 });
        return;
      }
      const from = p.cfg === 'image' ? -PI / 2 : 0, to = p.cfg === 'image' ? PI / 2 : TAU;
      g.polar(cx0, cy0, R, th => { let a = ((th % TAU) + TAU) % TAU; return S.D[Math.round(a * 180 / PI)]; }, c.accent, 2.2, { from, to });
      g.text('远场指向性 D(θ)', cx0 - R, cy0 + R + 14, { color: c.muted, size: 11 });
    },
    note(p) {
      const kl = TAU * p.d;
      if (p.cfg === 'mono') return '单个小球源（点源）向四周均匀辐射，无指向性；声压只取决于体积速度 $Q_0$。';
      if (p.cfg === 'dip') return `偶极子远场 $p\\propto\\cos\\theta$：轴向最大，侧向（两源等距、反相）为零。$kl=${M.fmt(kl, 2)}$${kl < 1 ? '，两源很近时几乎抵消，辐射功率比单极子小 $(kl)^2$ 量级' : ''}。`;
      if (p.cfg === 'pair') return `$D(\\theta)=|\\cos(\\frac12kl\\sin\\theta)|$；${p.d > 0.5 ? `主瓣宽 $2\\arcsin\\frac{\\lambda}{2l}=${M.fmt(2 * Math.asin(1 / (2 * p.d)) * 180 / PI, 1)}^\\circ$` : '$l<\\lambda/2$ 时没有零辐射方向'}。互辐射使每个源的辐射阻变为 $R_{11}(1+\\frac{\\sin kl}{kl})=${M.fmt(1 + Math.sin(kl) / kl, 3)}R_{11}$。`;
      if (p.cfg === 'line') return `声柱 $D(\\theta)=\\left|\\frac{\\sin(\\frac n2kl\\sin\\theta)}{n\\sin(\\frac12kl\\sin\\theta)}\\right|$：主瓣宽 $2\\arcsin\\frac{\\lambda}{nl}${p.n * p.d > 1 ? `=${M.fmt(2 * Math.asin(1 / (p.n * p.d)) * 180 / PI, 1)}^\\circ` : ''}$，源越多越窄；${p.d >= 1 ? '间距 ≥ λ 时出现与主瓣等高的栅瓣。' : '第一旁瓣约 −13.5 dB。'}`;
      if (p.cfg === 'image') return '刚性壁上法向速度为零，等效于在镜像位置放一个同相像源；贴近壁面时声压加倍，相当于障板上的点源。';
      return '各源不相干，能量（均方声压）直接相加；离线阵较远时 $\\overline{p^2}\\propto1/r_0$，距离加倍只降 3 dB。';
    },
  };

  /* ---------- 传声器指向性 ---------- */
  reg.mic = {
    title: '声波的接收：压强式、压差式与复合式', h: 300, anim: false,
    params: [
      { k: 'kind', label: '', options: [['polar', '复合式的指向性 1 + B cosθ'], ['near', '压差式的近讲效应'], ['multi', '多声道干涉（线阵式强指向）']], v: 'polar' },
      { k: 'B', label: 'B = Δ / (c₀CₐRₐ)', min: 0, max: 4, step: 0.05, v: 1, when: p => p.kind === 'polar' },
      { k: 'b', label: '进声段长 b / λ', min: 0.2, max: 8, log: true, v: 2, when: p => p.kind === 'multi' },
    ],
    draw(g, p) {
      const { th: c, W, H } = g;
      if (p.kind === 'near') {
        const P = g.box({ x: 60, y: 20, w: W - 80, h: H - 56 }, [0.05, 20], [-5, 30], { logx: true, xt: [0.1, 1, 10], yt: [0, 10, 20, 30], xl: 'kr（声源距离 × 波数）', yl: '灵敏度提升 / dB', grid: true });
        P.frame(); P.fn(x => 20 * Math.log10(Math.sqrt(1 + x * x) / x), c.red, 2.2); P.hline(0, c.blue, null, 2);
        g.text('压差式：近场相对远场的提升 20lg(√(1+k²r²)/kr)', P.b.x + 8, P.b.y + 12, { color: c.red, size: 11 }); g.text('压强式：与距离无关', P.b.x + 8, P.Y(0) - 10, { color: c.blue, size: 11 });
        return;
      }
      const cx0 = W / 2, cy0 = H / 2, R = H / 2 - 26;
      if (p.kind === 'polar') {
        g.polar(cx0, cy0, R, () => 1, c.blue, 1.4, { dash: [5, 3] });
        g.polar(cx0, cy0, R, th => Math.abs(Math.cos(th)), c.green, 1.4, { dash: [5, 3], noGrid: true });
        g.polar(cx0, cy0, R, th => Math.abs(1 + p.B * Math.cos(th)) / (1 + p.B), c.red, 2.6, { noGrid: true });
        g.text('压强式（全向）', 20, 24, { color: c.blue, size: 11 }); g.text('压差式（8 字形）', 20, 42, { color: c.green, size: 11 }); g.text('复合式', 20, 60, { color: c.red, size: 11 });
      } else {
        const k = p.b;
        g.polar(cx0, cy0, R, th => { const u = PI * k * (1 - Math.cos(th)); return Math.abs(u) < 1e-9 ? 1 : Math.abs(Math.sin(u) / u); }, c.accent, 2.4);
      }
      g.arrow(cx0 + R + 50, cy0, cx0 + R + 14, cy0, c.muted, 1.6); g.text('声波从 θ = 0 方向射来', cx0 + R - 40, cy0 + R + 16, { color: c.muted, size: 10.5 });
    },
    note(p) {
      if (p.kind === 'near') return '压差式受力 $F_a\\propto kS\\Delta\\cos\\theta\\frac{\\sqrt{1+k^2r^2}}{kr}$：声源越近、频率越低，灵敏度越高（近讲效应）；压强式只感受声压，与距离无关。';
      if (p.kind === 'multi') return `$D=\\left|\\frac{\\sin[\\frac{\\pi b}{\\lambda}(1-\\cos\\theta)]}{\\frac{\\pi b}{\\lambda}(1-\\cos\\theta)}\\right|$：沿管轴射来的声波经各声道到达传声器时同相相加，其他方向相互抵消；$b$ 越长于波长，主瓣越窄（枪式传声器）。`;
      const rear = Math.abs(1 - p.B) / (1 + p.B);
      return `$B=0$ 全向，$B=1$ 心形（背面为零），$B\\gg1$ 接近 8 字形。此时背面（180°）相对正面 ${rear > 1e-3 ? M.fmt(20 * Math.log10(rear), 1) + ' dB' : '为零'}，侧面（90°）${M.fmt(20 * Math.log10(1 / (1 + p.B)), 1)} dB。`;
    },
  };

  /* ---------- 刚性球散射 ---------- */
  reg.scatter = {
    title: '平面波遇到刚性圆球：散射与声影', h: 300,
    params: [
      { k: 'ka', label: 'kr₀', min: 0.2, max: 10, log: true, v: 2 },
      { k: 'view', label: '', options: [['total', '总声场'], ['scat', '只看散射波'], ['amp', '总声压幅值']], v: 'total' },
    ],
    coef(ka, L) {  // c_l = -j_l'(ka) / h_l'(ka), h = j - i y  (e^{jωt}); returned as [re, im]
      const { j, y } = M.sph(L + 1, ka), out = [];
      for (let l = 0; l <= L; l++) {
        const djl = l === 0 ? -j[1] : j[l - 1] - (l + 1) / ka * j[l], dyl = l === 0 ? -y[1] : y[l - 1] - (l + 1) / ka * y[l];
        const d = djl * djl + dyl * dyl;  // -djl/(djl - i dyl) = -djl(djl + i dyl)/d
        out.push([-djl * djl / d, -djl * dyl / d]);
      }
      return out;
    },
    setup(p, S) {
      const ka = p.ka, Rw = Math.max(3, 8 * PI / ka);  // half-width in sphere radii (at least ~2 λ)
      const N = 140, NY = 100, L = Math.ceil(ka + 4 * Math.cbrt(ka) + 5), C = reg.scatter.coef(ka, L);
      S.N = N; S.NY = NY; S.Rw = Rw; S.re = new Float64Array(N * NY); S.im = new Float64Array(N * NY); S.sre = new Float64Array(N * NY); S.sim = new Float64Array(N * NY);
      // (−j)^l
      const pw = l => [[1, 0], [0, -1], [-1, 0], [0, 1]][l % 4];
      for (let jy = 0; jy < NY; jy++) for (let ix = 0; ix < N; ix++) {
        const x = ((ix + 0.5) / N - 0.5) * 2 * Rw, yy = ((jy + 0.5) / NY - 0.5) * 2 * Rw * NY / N, r = Math.hypot(x, yy), k = jy * N + ix;
        if (r < 1) { S.re[k] = S.sre[k] = NaN; continue; }
        const kr = ka * r, cth = x / r, P = M.legendre(L, cth), { j, y } = M.sph(L, kr);
        let sr = 0, si = 0;
        for (let l = 0; l <= L; l++) {
          const [cr, ci] = C[l], [pr, pi] = pw(l), f = (2 * l + 1) * P[l];
          const hr = j[l], hi = -y[l];          // h_l^(2)
          const ar = cr * hr - ci * hi, ai = cr * hi + ci * hr;  // c_l h_l
          sr += f * (pr * ar - pi * ai); si += f * (pr * ai + pi * ar);
        }
        const ir = Math.cos(kr * cth), ii = -Math.sin(kr * cth);  // e^{-jkz}
        S.sre[k] = sr; S.sim[k] = si; S.re[k] = ir + sr; S.im[k] = ii + si;
      }
      let sig = 0; C.forEach(([cr, ci], l) => { sig += (2 * l + 1) * (cr * cr + ci * ci); }); S.sigma = 4 / (ka * ka) * sig;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, bw = W - 210, b = { x: 10, y: 10, w: bw, h: bw * S.NY / S.N }, N = S.N, wt = TAU * 0.5 * t, cw = Math.cos(wt), sw = Math.sin(wt);
      if (b.h > H - 20) { b.h = H - 20; b.w = b.h * S.N / S.NY; }
      const scat = p.view === 'scat';
      g.field(b, N, S.NY, (i, j) => {
        const k = j * N + i, re = scat ? S.sre[k] : S.re[k], im = scat ? S.sim[k] : S.im[k];
        if (isNaN(re)) return null;
        return p.view === 'amp' ? Math.hypot(re, im) - 1 : (re * cw - im * sw) / 2;
      });
      const rpx = b.w / (2 * S.Rw);
      g.circle(b.x + b.w / 2, b.y + b.h / 2, rpx, c.muted, c.ink, 1.2);
      g.arrow(b.x + 8, b.y + 16, b.x + 48, b.y + 16, c.ink, 1.6); g.text('入射', b.x + 52, b.y + 16, { color: c.ink, size: 11 });
      const P = g.box({ x: b.x + b.w + 48, y: 24, w: W - (b.x + b.w + 60), h: H - 66 }, [0.1, 10], [1e-4, 4], { logx: true, logy: true, xt: [0.1, 1, 10], yt: [1e-4, 1e-2, 1], yf: v => v >= 1 ? '1' : '1e' + Math.log10(v), xl: 'kr₀', yl: 'W_s / (πr₀²I)', grid: true });
      P.frame();
      P.fn(ka => reg.scatter.coef(ka, Math.ceil(ka + 4 * Math.cbrt(ka) + 5)).reduce((s, [cr, ci], l) => s + (2 * l + 1) * (cr * cr + ci * ci), 0) * 4 / (ka * ka), c.accent, 2, null, 160);
      P.fn(ka => 7 / 9 * ka ** 4, c.muted, 1, [4, 3]); P.hline(2, c.muted, [4, 3]);
      P.dot(p.ka, S.sigma, c.red);
    },
    note(p, S) {
      return `散射功率 $W_s=${M.fmt(S.sigma, 3)}\\,\\pi r_0^2I_p$。小球（$kr_0\\ll1$）$W_s\\approx\\frac79\\pi r_0^2(kr_0)^4I_p$，与频率四次方成正比、声波基本绕过去；大球趋于 $2\\pi r_0^2I_p$（右图虚线），球后形成声影。“总声压幅值”视图中红色表示比入射声压大：高频时正对声源的一面约为 2 倍（+6 dB）。`;
    },
  };

  /* ---------- 房间简正方式 ---------- */
  const ROOM = { lx: 5, ly: 4, lz: 3, c: 343 };
  reg.roommode = {
    title: '矩形房间的简正方式（5 m × 4 m × 3 m）', h: 300,
    params: [
      { k: 'view', label: '', options: [['mode', '平面上的声压分布'], ['count', '简正频率的分布']], v: 'mode' },
      { k: 'nx', label: 'nx', min: 0, max: 4, step: 1, v: 2, when: p => p.view === 'mode' },
      { k: 'ny', label: 'ny', min: 0, max: 4, step: 1, v: 1, when: p => p.view === 'mode' },
      { k: 'nz', label: 'nz（高度方向）', min: 0, max: 2, step: 1, v: 0, when: p => p.view === 'mode' },
    ],
    setup(p, S) {
      const { lx, ly, lz, c } = ROOM, list = [];
      for (let a = 0; a < 14; a++) for (let b = 0; b < 12; b++) for (let d = 0; d < 9; d++) {
        if (!a && !b && !d) continue;
        const f = c / 2 * Math.sqrt((a / lx) ** 2 + (b / ly) ** 2 + (d / lz) ** 2); if (f <= 200) list.push([f, (a > 0) + (b > 0) + (d > 0)]);
      }
      S.list = list.sort((u, v) => u[0] - v[0]);
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, { lx, ly, lz } = ROOM;
      if (p.view === 'mode') {
        const sc = Math.min((W - 220) / lx, (H - 30) / ly), b = { x: 14, y: 14, w: lx * sc, h: ly * sc }, ph = Math.cos(TAU * 0.5 * t);
        g.field(b, 100, 80, (i, j) => Math.cos(p.nx * PI * (i + 0.5) / 100) * Math.cos(p.ny * PI * (j + 0.5) / 80) * ph);
        g.rect(b.x, b.y, b.w, b.h, null, c.ink, 2);
        [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].forEach(([x, y]) => g.circle(x, y, 4, c.orange));
        const f = ROOM.c / 2 * Math.sqrt((p.nx / lx) ** 2 + (p.ny / ly) ** 2 + (p.nz / lz) ** 2), nz = (p.nx > 0) + (p.ny > 0) + (p.nz > 0);
        const x0 = b.x + b.w + 30;
        g.text(`(${p.nx}, ${p.ny}, ${p.nz})`, x0, 40, { size: 18, bold: true });
        g.text(nz ? `f = ${f.toFixed(1)} Hz` : '（不是简正方式）', x0, 70, { size: 14 });
        g.text(['', '轴向波', '切向波', '斜向波'][nz], x0, 96, { color: c.accent, size: 13 });
        g.text('橙点：墙角（所有方式的波腹）', x0, H - 30, { color: c.muted, size: 11 });
      } else {
        const fmax = 200, P = g.box({ x: 56, y: 20, w: W - 76, h: H - 70 }, [0, fmax], [0, Math.max(10, S.list.length * 1.1)], { xt: [0, 50, 100, 150, 200], yt: [0, 20, 40, 60, 80, 100].filter(v => v <= S.list.length * 1.1), xl: '频率 / Hz', yl: '低于 f 的简正方式数 N', grid: true });
        P.frame();
        const pts = []; S.list.forEach(([f], i) => { pts.push([P.X(f), P.Y(i)], [P.X(f), P.Y(i + 1)]); }); pts.push([P.X(fmax), P.Y(S.list.length)]);
        g.line([[P.X(0), P.Y(0)], ...pts], c.accent, 2);
        const V = lx * ly * lz, Sa = 2 * (lx * ly + ly * lz + lz * lx), Lz = 4 * (lx + ly + lz), c0 = ROOM.c;
        P.fn(f => 4 * PI * f ** 3 * V / (3 * c0 ** 3) + PI * f * f * Sa / (4 * c0 * c0) + f * Lz / (8 * c0), c.red, 1.6, [5, 3]);
        S.list.forEach(([f, k]) => g.line([[P.X(f), P.b.y + P.b.h], [P.X(f), P.b.y + P.b.h - 7 * k]], [c.blue, c.green, c.orange][k - 1], 1.4));
        g.text('台阶：逐个数出的简正方式；红虚线：(8-2-5)；底部短线：轴向 / 切向 / 斜向', P.b.x + 6, P.b.y + 12, { color: c.muted, size: 10.5 });
      }
    },
    note(p, S) {
      if (p.view === 'count') return `200 Hz 以下共 ${S.list.length} 个简正方式；$N\\approx\\frac{4\\pi f^3V}{3c_0^3}+\\frac{\\pi f^2S}{4c_0^2}+\\frac{fL}{8c_0}$，密度随 $f^2$ 增长：低频稀疏、响应起伏大，高频密集、趋于扩散声场。`;
      return `$p=A\\cos\\frac{n_x\\pi x}{l_x}\\cos\\frac{n_y\\pi y}{l_y}\\cos\\frac{n_z\\pi z}{l_z}$（这里画地面 $z=0$ 的平面）：红蓝分界处是节线，两侧反相振动。`;
    },
  };

  /* ---------- 统计声学：衰减、稳态声场、平均自由程 ---------- */
  const RS = { lx: 10, ly: 8, lz: 4 };
  reg.roomstat = {
    title: '室内统计声学（10 m × 8 m × 4 m）', h: 300,
    params: [
      { k: 'view', label: '', options: [['decay', '声能衰减与混响时间'], ['steady', '稳态声压级与混响半径'], ['mfp', '平均自由程：声线模拟']], v: 'decay' },
      { k: 'a', label: '平均吸声系数 ᾱ', min: 0.02, max: 0.9, log: true, v: 0.2, when: p => p.view !== 'mfp' },
      { k: 'Q', label: '声源指向性因数 Q', min: 1, max: 8, step: 1, v: 1, when: p => p.view === 'steady' },
    ],
    setup(p, S) {
      if (p.view !== 'mfp') return;
      S.pos = [RS.lx * 0.3, RS.ly * 0.4, RS.lz * 0.5]; S.dir = [0.6, 0.5, 0.62]; S.trail = [S.pos.slice()]; S.len = 0; S.hits = 0; S.lastT = null;
    },
    anim: true,
    step(S, dist) {
      const lim = [RS.lx, RS.ly, RS.lz];
      while (dist > 1e-9) {
        let tmin = Infinity, ax = -1;
        for (let k = 0; k < 3; k++) { const d = S.dir[k]; if (Math.abs(d) < 1e-12) continue; const tk = ((d > 0 ? lim[k] : 0) - S.pos[k]) / d; if (tk < tmin) { tmin = tk; ax = k; } }
        if (tmin > dist) { for (let k = 0; k < 3; k++) S.pos[k] += S.dir[k] * dist; S.len += dist; return; }
        for (let k = 0; k < 3; k++) S.pos[k] += S.dir[k] * tmin; S.len += tmin; dist -= tmin; S.hits++;
        // diffuse (Lambert) reflection about the wall normal
        const nrm = [0, 0, 0]; nrm[ax] = S.dir[ax] > 0 ? -1 : 1;
        const u = Math.random(), ph = TAU * Math.random(), ct = Math.sqrt(u), st = Math.sqrt(1 - u);
        const t1 = [0, 0, 0], t2 = [0, 0, 0]; t1[(ax + 1) % 3] = 1; t2[(ax + 2) % 3] = 1;
        for (let k = 0; k < 3; k++) S.dir[k] = nrm[k] * ct + t1[k] * st * Math.cos(ph) + t2[k] * st * Math.sin(ph);
        S.trail.push(S.pos.slice()); if (S.trail.length > 40) S.trail.shift();
      }
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, V = RS.lx * RS.ly * RS.lz, Sa = 2 * (RS.lx * RS.ly + RS.ly * RS.lz + RS.lz * RS.lx), c0 = 343;
      if (p.view === 'decay') {
        const a = p.a, Tey = 0.161 * V / (-Sa * Math.log(1 - a)), Tsa = 0.161 * V / (Sa * a), tmax = Math.min(6, Math.max(1, Tsa * 1.2));
        const P = g.box({ x: 56, y: 20, w: W - 76, h: H - 56 }, [0, tmax], [-70, 0], { xt: [0, tmax / 4, tmax / 2, 3 * tmax / 4, tmax].map(v => +v.toFixed(2)), yt: [-60, -40, -20, 0], xl: '时间 / s', yl: '10lg(ε/ε₀) / dB', grid: true });
        P.frame(); P.hline(-60, c.muted);
        P.fn(tt => 10 * Math.log10(1 - a) * c0 * Sa / (4 * V) * tt, c.red, 2); P.fn(tt => -10 / Math.LN10 * c0 * Sa * a / (4 * V) * tt, c.blue, 1.6, [6, 3]);
        P.vline(Tey, c.red); P.vline(Tsa, c.blue);
        // a decaying marker
        const tt = (t * 0.6) % tmax; P.dot(tt, Math.max(-70, 10 * Math.log10(1 - a) * c0 * Sa / (4 * V) * tt), c.red);
        g.text(`艾林 T₆₀ = ${Tey.toFixed(2)} s`, P.b.x + P.b.w - 150, P.b.y + 14, { color: c.red, size: 11.5 }); g.text(`赛宾 T₆₀ = ${Tsa.toFixed(2)} s`, P.b.x + P.b.w - 150, P.b.y + 32, { color: c.blue, size: 11.5 });
      } else if (p.view === 'steady') {
        const R = Sa * p.a / (1 - p.a), rc = 0.25 * Math.sqrt(p.Q * R / PI);
        const P = g.box({ x: 56, y: 20, w: W - 76, h: H - 56 }, [0.3, 30], [-40, 0], { logx: true, xt: [0.3, 1, 3, 10, 30], yt: [-40, -30, -20, -10, 0], xl: '离声源距离 r / m', yl: 'SPL − SWL / dB', grid: true });
        P.frame();
        P.fn(r => 10 * Math.log10(p.Q / (4 * PI * r * r)), c.blue, 1.4, [5, 3]); P.hline(10 * Math.log10(4 / R), c.green, [5, 3], 1.4);
        P.fn(r => 10 * Math.log10(p.Q / (4 * PI * r * r) + 4 / R), c.red, 2.2); P.vline(rc, c.ink);
        g.text('直达声', P.b.x + 8, P.b.y + 14, { color: c.blue, size: 11 }); g.text('混响声 10lg(4/R)', P.b.x + 60, P.b.y + 14, { color: c.green, size: 11 }); g.text(`混响半径 r_c = ${rc.toFixed(2)} m`, P.X(rc) + 6, P.b.y + P.b.h - 12, { color: c.ink, size: 11 });
      } else {
        if (S.lastT === null) S.lastT = t;
        reg.roomstat.step(S, (t - S.lastT) * 12); S.lastT = t;
        const sc = Math.min((W - 230) / RS.lx, (H - 30) / RS.ly), b = { x: 14, y: 14, w: RS.lx * sc, h: RS.ly * sc };
        g.rect(b.x, b.y, b.w, b.h, null, c.ink, 2);
        g.line(S.trail.map(([x, y]) => [b.x + x * sc, b.y + y * sc]).concat([[b.x + S.pos[0] * sc, b.y + S.pos[1] * sc]]), c.accent, 1.2);
        g.circle(b.x + S.pos[0] * sc, b.y + S.pos[1] * sc, 4, c.red);
        const x0 = b.x + b.w + 24, mean = S.hits ? S.len / S.hits : 0;
        g.text('俯视图（声线在三维房间中漫反射）', x0, 30, { color: c.muted, size: 11 });
        g.text(`反射次数 ${S.hits}`, x0, 60, { size: 13 }); g.text(`平均自由程 ${mean.toFixed(2)} m`, x0, 84, { size: 13, color: c.red });
        g.text(`4V/S = ${(4 * V / Sa).toFixed(2)} m`, x0, 108, { size: 13, color: c.accent });
      }
    },
    note(p) {
      const V = RS.lx * RS.ly * RS.lz, Sa = 2 * (RS.lx * RS.ly + RS.ly * RS.lz + RS.lz * RS.lx);
      if (p.view === 'mfp') return `声线每碰一次壁面就按余弦规律随机反射（扩散声场）。反射次数越多，平均自由程越接近 $\\bar L=\\frac{4V}{S}$，每秒反射 $\\frac{c_0S}{4V}\\approx${M.fmt(343 * Sa / (4 * V), 1)}$ 次。`;
      if (p.view === 'decay') return `$\\bar\\varepsilon=\\bar\\varepsilon_0(1-\\bar\\alpha)^{\\frac{c_0S}{4V}t}$，衰减 60 dB 的时间即 $T_{60}=\\frac{0.161V}{-S\\ln(1-\\bar\\alpha)}$；$\\bar\\alpha$ 小时与赛宾公式重合，$\\bar\\alpha$ 大时赛宾公式偏长（$\\bar\\alpha\\to1$ 仍不为零）。`;
      return `$SPL=SWL+10\\lg(\\frac{Q}{4\\pi r^2}+\\frac4R)$：近处直达声为主（距离加倍 −6 dB），远处混响声为主（处处相同）；吸声越多（$R$ 越大）、指向性越强，混响半径越大。`;
    },
  };

  /* ---------- 固体中的波 ---------- */
  const rayleigh = sigma => {  // g = (c_s/c_T)^2 root < 1 of g^3 - 8g^2 + 8(3-2q)g + 16(q-1) = 0
    const q = (1 - 2 * sigma) / (2 * (1 - sigma)), f = g => g ** 3 - 8 * g * g + 8 * (3 - 2 * q) * g + 16 * (q - 1);
    let a = 0.3, b = 0.999; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; }
    return { g: (a + b) / 2, q };
  };
  reg.solid = {
    title: '固体中的弹性波（质点运动放大显示）', h: 300,
    params: [
      { k: 'w', label: '', options: [['P', '纵波（压缩波）'], ['S', '横波（切变波）'], ['R', '瑞利波（声表面波）'], ['lamb', '兰姆波：s₀ 与 a₀（示意）'], ['strain', '应变：伸长、切变与转动']], v: 'R' },
      { k: 's', label: '泊松比 σ', min: 0, max: 0.49, step: 0.01, v: 0.25, when: p => p.w !== 'strain' && p.w !== 'lamb' },
      { k: 'exx', label: 'εxx', min: -0.3, max: 0.3, step: 0.01, v: 0.15, when: p => p.w === 'strain' },
      { k: 'exy', label: 'εxy（切应变）', min: -0.5, max: 0.5, step: 0.01, v: 0.25, when: p => p.w === 'strain' },
      { k: 'rot', label: '转动角', min: -0.4, max: 0.4, step: 0.01, v: 0, when: p => p.w === 'strain' },
    ],
    draw(g, p, S, t) {
      const { th: c, W, H } = g, wt = TAU * 0.4 * t;
      if (p.w === 'strain') {
        const s = 120, ox = W / 2 - 60, oy = H / 2 + 60, Mx = [[1 + p.exx, p.exy / 2 - p.rot], [p.exy / 2 + p.rot, 1]];
        const map = ([x, y]) => [ox + s * (Mx[0][0] * x + Mx[0][1] * y), oy - s * (Mx[1][0] * x + Mx[1][1] * y)];
        const sq = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
        g.line(sq.map(([x, y]) => [ox + s * x, oy - s * y]), c.muted, 1.2, [4, 3]);
        g.line(sq.map(map), c.accent, 2.4);
        g.text('虚线：原来的小体元；实线：形变后', 20, 24, { color: c.muted, size: 11 });
        return;
      }
      const lambv = p.w === 'lamb', L = 30, R = W - 30, top = lambv ? H / 2 - 32 : 30, depth = lambv ? 64 : H - 60, rq = 1 - 2 * p.s, cLcT = Math.sqrt(2 * (1 - p.s) / Math.max(1e-6, rq));
      const nx = lambv ? 40 : 26, ny = lambv ? 5 : 9, lam = (R - L) / (lambv ? 1.5 : 2), amp = lambv ? 14 : 9, surf = [[], []];
      if (p.w === 'R') g.text('自由表面', L, top - 12, { color: c.muted, size: 11 });
      const { g: gg, q } = rayleigh(p.s), kz = TAU / lam, al = Math.sqrt(1 - q * gg), be = Math.sqrt(1 - gg);  // α/k, β/k
      const cR = Math.sqrt(gg);
      for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
        const x = L + (R - L) * i / nx, d = depth * j / (ny - 1), ph = wt - kz * (x - L);
        let ux = 0, uy = 0;
        if (p.w === 'P') ux = Math.sin(ph);
        else if (p.w === 'S') uy = Math.sin(wt - kz * cLcT * (x - L));
        else if (p.w === 'R') {
          const kd = kz * d, U = Math.exp(-al * kd) - 2 * al * be / (1 + be * be) * Math.exp(-be * kd), V = al * (Math.exp(-al * kd) - 2 / (1 + be * be) * Math.exp(-be * kd));
          ux = U * Math.sin(ph); uy = V * Math.cos(ph);
        } else {  // Lamb, schematic: plate occupies the middle rows
          const yy = (j - (ny - 1) / 2) / ((ny - 1) / 2);
          if (S.lambMode === 'a0') { uy = Math.sin(ph); ux = -0.35 * yy * Math.cos(ph); } else { ux = Math.sin(ph); uy = -0.35 * yy * Math.cos(ph); }
        }
        g.circle(x + amp * ux, top + d - amp * uy, 2.4, c.ink);
        if (lambv && (j === 0 || j === ny - 1)) surf[j ? 1 : 0].push([x + amp * ux, top + d - amp * uy]);
      }
      if (lambv) { g.line(surf[0], c.accent, 2); g.line(surf[1], c.accent, 2); }
      if (p.w === 'R') {  // trace a few elliptical orbits
        [0, 1, 2, 3].forEach(j => {
          const d = depth * j / (ny - 1), kd = kz * d, U = Math.exp(-al * kd) - 2 * al * be / (1 + be * be) * Math.exp(-be * kd), V = al * (Math.exp(-al * kd) - 2 / (1 + be * be) * Math.exp(-be * kd));
          const pts = []; for (let k = 0; k <= 60; k++) { const a = TAU * k / 60; pts.push([R - 18 + amp * U * Math.sin(a), top + d - amp * V * Math.cos(a)]); }
          g.line(pts, c.red, 1);
        });
      }
      const label = { P: `纵波：质点沿传播方向振动，c_L / c_T = ${cLcT.toFixed(2)}`, S: '横波：质点垂直于传播方向振动，同频率下波长更短', R: `瑞利波：c_R = ${cR.toFixed(3)} c_T，质点做椭圆运动（右侧红线），振幅随深度很快衰减`, lamb: '' }[p.w];
      if (label) g.text(label, L, H - 14, { color: c.muted, size: 11.5 });
    },
    setup(p, S) { S.lambMode = S.lambMode || 's0'; },
    note(p) {
      if (p.w === 'strain') return `$\\varepsilon_{xx}=\\partial\\xi/\\partial x$ 是伸长，$\\varepsilon_{xy}=\\frac{\\partial\\eta}{\\partial x}+\\frac{\\partial\\xi}{\\partial y}$ 是两个小转角之和（切变，改变直角）；两角之差是整体转动，不产生应变也就不产生应力。`;
      if (p.w === 'lamb') return '薄板两面都自由，纵、横波在两面间来回反射耦合成兰姆波：对称族（$s_0$）板沿厚度伸缩，反对称族（$a_0$）板整体弯曲。这里只画示意形状，实际振型随频率 × 板厚变化（频散）。';
      const r = Math.sqrt(2 * (1 - p.s) / (1 - 2 * p.s));
      return `$c_L=\\sqrt{\\frac{\\lambda+2\\mu}{\\rho}}$，$c_T=\\sqrt{\\frac\\mu\\rho}$，$\\frac{c_L}{c_T}=\\sqrt{\\frac{2(1-\\sigma)}{1-2\\sigma}}=${M.fmt(r, 3)}>\\sqrt2$。` + (p.w === 'R' ? `瑞利波速满足 $g^3-8g^2+8(3-2q)g+16(q-1)=0$；表面附近椭圆是逆进的，约 0.2 波长深处水平分量反向。` : '');
    },
  };
  // s0 / a0 switch for the Lamb view: reuse σ slider slot is not needed; toggle by clicking the canvas
  const origDraw = reg.solid.draw;
  reg.solid.draw = function (g, p, S, t) {
    origDraw.call(this, g, p, S, t);
    if (p.w === 'lamb') {
      g.text(S.lambMode === 'a0' ? '反对称 a₀（弯曲）——点击画面切换' : '对称 s₀（伸缩）——点击画面切换', 30, g.H - 14, { color: g.th.muted, size: 11.5 });
      if (!S.bound) { S.bound = true; g.ctx.canvas.addEventListener('click', () => { S.lambMode = S.lambMode === 'a0' ? 's0' : 'a0'; }); }
    }
  };
})();
