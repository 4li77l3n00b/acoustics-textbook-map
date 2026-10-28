/* 三维交互演示：一个很小的软件三维渲染器（透视投影、按深度排序的着色面片、拖动旋转、滚轮缩放），
   以及膜与板的振动面、三维指向性、房间简正方式、波导中的简正波、瑞利波五个演示。
   不依赖外部库；拖动 = 旋转，滚轮 = 缩放，双击 = 复位。 */
'use strict';
(() => {
  const { reg, M, DEMO_FOR, DEMO_MODEL } = Demo, PI = Math.PI, TAU = 2 * PI;

  /* ---------- renderer ---------- */
  function view3d(g, S, o = {}) {
    const cam = S.cam || (S.cam = { yaw: o.yaw ?? -0.6, pitch: o.pitch ?? 0.45, zoom: 1 });
    const cv = g.ctx.canvas;
    if (!cv.dataset.v3d) {
      cv.dataset.v3d = 1; cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
      let drag = null;
      cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', e => {
        if (!drag) return;
        cam.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
        cam.pitch = M.clamp(drag.pitch + (e.clientY - drag.y) * 0.01, -1.45, 1.45);
        S.redraw && S.redraw();
      });
      const up = () => { drag = null; cv.style.cursor = 'grab'; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = M.clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), 0.4, 3); S.redraw && S.redraw(); }, { passive: false });
      cv.addEventListener('dblclick', () => { cam.yaw = o.yaw ?? -0.6; cam.pitch = o.pitch ?? 0.45; cam.zoom = 1; S.redraw && S.redraw(); });
    }
    const { ctx, W, H, th } = g, R = o.radius || 1.5, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
    const s = Math.min(o.w || W, H) * 0.42 * cam.zoom / R, f = 4 * R;
    const cy_ = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // world (z up) -> view: x right, y into the screen (depth), z up
    const tf = ([x, y, z]) => { const x1 = cy_ * x - sy * y, y1 = sy * x + cy_ * y; return [x1, cp * y1 - sp * z, sp * y1 + cp * z]; };
    const proj = v => { const k = f / (f + v[1]); return [cx + s * v[0] * k, cy - s * v[2] * k, v[1]]; };
    const faces = [], lines = [], labels = [];
    const light = (() => { const l = [-0.4, -0.7, 0.6], n = Math.hypot(...l); return l.map(v => v / n); })();
    const r3 = {
      P: p => proj(tf(p)),
      quad(ps, rgb, shade = true) {
        const v = ps.map(tf), sp2 = v.map(proj);
        let k = 1;
        if (shade) {
          const a = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]], b = [v[ps.length - 1][0] - v[0][0], v[ps.length - 1][1] - v[0][1], v[ps.length - 1][2] - v[0][2]];
          const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nn = Math.hypot(...n) || 1;
          k = 0.55 + 0.45 * Math.abs((n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / nn);
        }
        faces.push({ p: sp2, d: sp2.reduce((s1, q) => s1 + q[2], 0) / sp2.length, c: `rgb(${rgb[0] * k | 0},${rgb[1] * k | 0},${rgb[2] * k | 0})` });
      },
      line(ps, color, w = 1, dash) { lines.push({ p: ps.map(r3.P), color, w, dash }); },
      label(p, text, color, size = 11) { labels.push({ p: r3.P(p), text, color, size }); },
      axes(len = 1.2, names = ['x', 'y', 'z']) {
        [[[len, 0, 0], names[0]], [[0, len, 0], names[1]], [[0, 0, len], names[2]]].forEach(([e, n]) => { r3.line([[0, 0, 0], e], th.muted, 1); r3.label(e.map(v => v * 1.08), n, th.muted); });
      },
      flush() {
        faces.sort((a, b) => b.d - a.d);
        for (const fc of faces) {
          ctx.beginPath(); fc.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
          ctx.fillStyle = fc.c; ctx.fill(); ctx.strokeStyle = fc.c; ctx.lineWidth = 0.6; ctx.stroke();
        }
        for (const l of lines) g.line(l.p.map(q => [q[0], q[1]]), l.color, l.w, l.dash);
        for (const l of labels) g.text(l.text, l.p[0], l.p[1], { color: l.color, size: l.size, align: 'center' });
        g.text('拖动旋转 · 滚轮缩放 · 双击复位', 8, H - 10, { color: th.muted, size: 10.5 });
      },
    };
    return r3;
  }
  // diverging colour for surfaces: blue (−) · neutral (0) · red (+)
  const dcol = (th, v) => {
    v = M.clamp(v, -1, 1);
    const mid = th.dark ? [110, 112, 118] : [222, 224, 228], end = v >= 0 ? th.posRGB : th.negRGB, a = Math.abs(v);
    return mid.map((m, i) => m + (end[i] - m) * a);
  };
  const seq = (th, v) => {  // 0..1 -> cool to warm
    const a = th.dark ? [70, 120, 200] : [70, 120, 200], b = th.dark ? [240, 120, 90] : [210, 60, 40];
    return a.map((x, i) => x + (b[i] - x) * M.clamp(v, 0, 1));
  };

  /* ---------- 膜与板：三维振动面 ---------- */
  const zJ = {};
  const jz = m => zJ[m] || (zJ[m] = M.roots(x => M.J(m, x), 3, 0.5));
  reg.mem3d = {
    title: '圆膜 / 圆板的振动面', h: 340, is3d: true,
    params: [
      { k: 'kind', label: '', options: [['mem', '圆膜（周界固定）'], ['plate', '圆板（周界钳定，对称方式）']], v: 'mem' },
      { k: 'm', label: '节径数 m', min: 0, max: 3, step: 1, v: 1, when: p => p.kind === 'mem' },
      { k: 'n', label: '节圆序号 n', min: 1, max: 3, step: 1, v: 1 },
    ],
    setup(p, S) {
      let f, m = 0;
      if (p.kind === 'mem') { const mu = jz(p.m)[p.n - 1]; f = r => M.J(p.m, mu * r); m = p.m; }
      else { const mu = M.roots(x => M.J(0, x) * M.I(1, x) + M.J(1, x) * M.I(0, x), 3, 1)[p.n - 1], c0 = M.J(0, mu) / M.I(0, mu); f = r => M.J(0, mu * r) - c0 * M.I(0, mu * r); }
      const NR = 22, NA = 56, rad = [];
      let mx = 0; for (let i = 0; i <= NR; i++) { rad.push(f(i / NR)); mx = Math.max(mx, Math.abs(rad[i])); }
      S.NR = NR; S.NA = NA; S.rad = rad.map(v => v / mx); S.m = m;
    },
    draw(g, p, S, t) {
      const r3 = view3d(g, S, { radius: 1.1, pitch: 0.55 }), ph = Math.cos(TAU * 0.5 * t), A = 0.45, { NR, NA } = S;
      const pt = (i, j) => { const r = i / NR, a = TAU * j / NA, h = S.rad[i] * Math.cos(S.m * a); return [[r * Math.cos(a), r * Math.sin(a), A * h * ph], h * ph]; };
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
        const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)];
        r3.quad(q.map(x => x[0]), dcol(g.th, q.reduce((s, x) => s + x[1], 0) / 4));
      }
      const rim = []; for (let j = 0; j <= NA; j++) { const a = TAU * j / NA; rim.push([Math.cos(a), Math.sin(a), 0]); }
      r3.line(rim, g.th.ink, 1.6);
      r3.flush();
    },
    note(p) { return p.kind === 'mem' ? `$(${p.m},${p.n})$ 方式：$\\eta=AJ_${p.m}(\\mu r/a)\\cos ${p.m}\\theta\\cos\\omega t$。颜色相反的区域反相振动，分界处是节线（节径、节圆）。` : '钳定圆板周界处位移和斜率都为零，振动面在边缘与支承面相切；与膜相比，节圆位置不同、频率按 $\\mu^2$ 增长。'; },
  };

  /* ---------- 三维指向性 ---------- */
  reg.balloon = {
    title: '三维指向性图', h: 340, is3d: true,
    params: [
      { k: 'cfg', label: '', options: [['dip', '偶极子（沿 z 轴）'], ['line', '同相源线阵 / 声柱（沿 z 轴）'], ['piston', '障板上的圆形活塞（朝 x）'], ['card', '复合式传声器 1 + B cosα（朝 x）']], v: 'dip' },
      { k: 'n', label: '源数 n', min: 2, max: 10, step: 1, v: 4, when: p => p.cfg === 'line' },
      { k: 'd', label: '间距 l/λ', min: 0.1, max: 1.5, step: 0.01, v: 0.5, when: p => p.cfg === 'line' },
      { k: 'ka', label: 'ka', min: 0.2, max: 12, log: true, v: 4, when: p => p.cfg === 'piston' },
      { k: 'B', label: 'B', min: 0, max: 4, step: 0.05, v: 1, when: p => p.cfg === 'card' },
    ],
    D(p, x, y, z) {  // unit direction -> directivity in [0, 1]
      if (p.cfg === 'dip') return Math.abs(z);
      if (p.cfg === 'line') { const u = PI * p.d * z, den = p.n * Math.sin(u); return Math.abs(den) < 1e-9 ? 1 : Math.abs(Math.sin(p.n * u) / den); }
      if (p.cfg === 'piston') { if (x < 0) return 0; const s = Math.sqrt(Math.max(0, 1 - x * x)), u = p.ka * s; return u < 1e-6 ? 1 : Math.abs(2 * M.J(1, u) / u); }
      return Math.abs(1 + p.B * x) / (1 + p.B);
    },
    draw(g, p, S) {
      const r3 = view3d(g, S, { radius: 1.1, yaw: -0.9, pitch: 0.35 }), NT = 44, NP = 72;
      const pt = (i, j) => {
        const th = PI * i / NT, ph = TAU * j / NP, x = Math.sin(th) * Math.cos(ph), y = Math.sin(th) * Math.sin(ph), z = Math.cos(th), r = reg.balloon.D(p, x, y, z);
        return [[r * x, r * y, r * z], r];
      };
      const grid = []; for (let i = 0; i <= NT; i++) { grid.push([]); for (let j = 0; j <= NP; j++) grid[i].push(pt(i, j)); }
      for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) {
        const q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]], r = q.reduce((s, x) => s + x[1], 0) / 4;
        if (r < 0.004) continue;
        r3.quad(q.map(x => x[0]), seq(g.th, r));
      }
      r3.axes(1.25);
      r3.flush();
    },
    anim: false,
    note(p) {
      if (p.cfg === 'dip') return '偶极子 $D=|\\cos\\theta|$：沿轴两个对称的瓣（“8”字形绕轴旋转），垂直于轴的整个平面上声压为零。';
      if (p.cfg === 'line') return `线阵 $D=\\left|\\frac{\\sin(\\frac n2kl\\cos\\theta)}{n\\sin(\\frac12kl\\cos\\theta)}\\right|$（$\\theta$ 从阵轴量起）：主瓣是垂直于阵轴的“圆盘”，所以声柱在水平面内全向、在竖直面内很窄。`;
      if (p.cfg === 'piston') return `障板活塞 $D=\\left|\\frac{2J_1(ka\\sin\\alpha)}{ka\\sin\\alpha}\\right|$：$ka$ 小时接近半球，$ka$ 越大主瓣越窄、旁瓣出现；圆形振膜的接收指向性与此相同（互易）。`;
      return `$1+B\\cos\\alpha$ 绕轴旋转：$B=1$ 是心形“苹果”，背面为零；$B>1$ 背面出现小瓣。`;
    },
  };

  /* ---------- 房间简正方式 ---------- */
  const RM = { lx: 5, ly: 4, lz: 3 };
  reg.room3d = {
    title: '矩形房间中的简正方式（5 × 4 × 3 m）', h: 340, is3d: true,
    params: [
      { k: 'nx', label: 'nx', min: 0, max: 3, step: 1, v: 1 },
      { k: 'ny', label: 'ny', min: 0, max: 3, step: 1, v: 1 },
      { k: 'nz', label: 'nz', min: 0, max: 2, step: 1, v: 1 },
      { k: 'zh', label: '水平截面高度 / m', min: 0.1, max: 2.9, step: 0.05, v: 1.5 },
    ],
    draw(g, p, S, t) {
      const { lx, ly, lz } = RM, sc = 1 / 2.5, r3 = view3d(g, S, { radius: 1.2, yaw: -0.75, pitch: 0.5 }), ph = Math.cos(TAU * 0.5 * t);
      const P = (x, y, z) => [(x - lx / 2) * sc, (y - ly / 2) * sc, (z - lz / 2) * sc];
      const val = (x, y, z) => Math.cos(p.nx * PI * x / lx) * Math.cos(p.ny * PI * y / ly) * Math.cos(p.nz * PI * z / lz) * ph;
      const N = 16;
      // the floor and the two far walls (x = 0, y = 0) and a horizontal slice
      const plane = (fn, a0, a1, b0, b1) => {
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const a = a0 + (a1 - a0) * i / N, b = b0 + (b1 - b0) * j / N, da = (a1 - a0) / N, db = (b1 - b0) / N;
          const q = [fn(a, b), fn(a + da, b), fn(a + da, b + db), fn(a, b + db)], v = val(...fn(a + da / 2, b + db / 2));
          r3.quad(q.map(x => P(...x)), dcol(g.th, v), false);
        }
      };
      plane((a, b) => [a, b, 0], 0, lx, 0, ly);
      plane((a, b) => [0, a, b], 0, ly, 0, lz);
      plane((a, b) => [a, 0, b], 0, lx, 0, lz);
      plane((a, b) => [a, b, p.zh], 0, lx, 0, ly);
      const E = [[0, 0, 0], [lx, 0, 0], [lx, ly, 0], [0, ly, 0]];
      [[...E, E[0]], [...E.map(([x, y]) => [x, y, lz]), [0, 0, lz]]].forEach(r => r3.line(r.map(q => P(...q)), g.th.ink, 1.2));
      E.forEach(([x, y]) => r3.line([P(x, y, 0), P(x, y, lz)], g.th.ink, 1.2));
      r3.flush();
      const f = 343 / 2 * Math.sqrt((p.nx / lx) ** 2 + (p.ny / ly) ** 2 + (p.nz / lz) ** 2);
      g.text(p.nx + p.ny + p.nz ? `(${p.nx},${p.ny},${p.nz})  f = ${f.toFixed(1)} Hz` : '(0,0,0) 不是简正方式', 10, 16, { size: 13, bold: true });
    },
    note() { return '画出地面、两面墙和一个水平截面上的声压：$p\\propto\\cos\\frac{n_x\\pi x}{l_x}\\cos\\frac{n_y\\pi y}{l_y}\\cos\\frac{n_z\\pi z}{l_z}$。墙面与墙角总是声压波腹；改变截面高度可以看到 $z$ 方向的驻波。'; },
  };

  /* ---------- 矩形波导 ---------- */
  reg.duct3d = {
    title: '矩形波导中的 (ny, nz) 次波', h: 340, is3d: true,
    params: [
      { k: 'ny', label: 'ny', min: 0, max: 2, step: 1, v: 1 },
      { k: 'nz', label: 'nz', min: 0, max: 2, step: 1, v: 0 },
      { k: 'F', label: '频率 f / f₁₀', min: 0.3, max: 4, step: 0.01, v: 1.8 },
    ],
    draw(g, p, S, t) {
      const ly = 1, lz = 0.7, L = 3.2, sc = 1 / 1.7, wt = TAU * 0.5 * t;  // f10 is the cut-off of (1,0) across ly
      const kc2 = (p.ny * PI / ly) ** 2 + (p.nz * PI / lz) ** 2, k = PI * p.F / ly, kz2 = k * k - kc2, prop = kz2 > 0, kx = Math.sqrt(Math.abs(kz2));
      const val = (x, y, z) => Math.cos(p.ny * PI * y / ly) * Math.cos(p.nz * PI * z / lz) * (prop ? Math.cos(wt - kx * x) : Math.exp(-kx * x) * Math.cos(wt));
      const r3 = view3d(g, S, { radius: 0.95, yaw: -0.5, pitch: 0.4 }), P = (x, y, z) => [(x - L / 2) * sc, (y - ly / 2) * sc, (z - lz / 2) * sc];
      const NX = 48, NB = 10;
      const plane = (fn, nb) => {
        for (let i = 0; i < NX; i++) for (let j = 0; j < nb; j++) {
          const a = L * i / NX, da = L / NX, b = j / nb, db = 1 / nb;
          const q = [fn(a, b), fn(a + da, b), fn(a + da, b + db), fn(a, b + db)];
          r3.quad(q.map(x => P(...x)), dcol(g.th, val(...fn(a + da / 2, b + db / 2))), false);
        }
      };
      plane((x, b) => [x, b * ly, 0], NB);        // floor
      plane((x, b) => [x, 0, b * lz], NB);        // one side wall
      plane((x, b) => [x, b * ly, lz / 2], NB);   // horizontal mid-plane
      const C = [[0, 0], [ly, 0], [ly, lz], [0, lz], [0, 0]];
      [0, L].forEach(x => r3.line(C.map(([y, z]) => P(x, y, z)), g.th.ink, 1.2));
      C.slice(0, 4).forEach(([y, z]) => r3.line([P(0, y, z), P(L, y, z)], g.th.ink, 1));
      r3.line([P(-0.3, ly / 2, lz / 2), P(-0.05, ly / 2, lz / 2)], g.th.accent, 2);
      r3.flush();
      const fc = Math.sqrt(kc2) / PI;
      g.text(`截止频率 f/f₁₀ = ${fc.toFixed(3)}  ${p.ny + p.nz === 0 ? '（平面波）' : prop ? '→ 可以传播' : '→ 低于截止，消失波'}`, 10, 16, { size: 12.5, bold: true, color: prop ? g.th.ink : g.th.red });
    },
    note() { return '管宽 $l_y$、高 $l_z=0.7l_y$。截面上是驻波 $\\cos\\frac{n_y\\pi y}{l_y}\\cos\\frac{n_z\\pi z}{l_z}$，沿管轴是行波；频率低于 $f_{n_yn_z}=\\frac{c_0}2\\sqrt{(\\frac{n_y}{l_y})^2+(\\frac{n_z}{l_z})^2}$ 时只在入口附近按指数衰减。'; },
  };

  /* ---------- 瑞利波 ---------- */
  reg.rayleigh3d = {
    title: '瑞利波：固体表面附近的椭圆运动', h: 340, is3d: true,
    params: [{ k: 's', label: '泊松比 σ', min: 0, max: 0.49, step: 0.01, v: 0.25 }],
    draw(g, p, S, t) {
      const q = (1 - 2 * p.s) / (2 * (1 - p.s)), fq = x => x ** 3 - 8 * x * x + 8 * (3 - 2 * q) * x + 16 * (q - 1);
      let a = 0.3, b = 0.999; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (fq(a) * fq(m) <= 0) b = m; else a = m; }
      const gg = (a + b) / 2, al = Math.sqrt(1 - q * gg), be = Math.sqrt(1 - gg), wt = TAU * 0.4 * t, K = TAU / 1.6, A = 0.09;
      const U = d => Math.exp(-al * K * d) - 2 * al * be / (1 + be * be) * Math.exp(-be * K * d);
      const Wd = d => al * (Math.exp(-al * K * d) - 2 / (1 + be * be) * Math.exp(-be * K * d));
      // block: x along propagation (0..3.2), y across (0..1), depth d (0..1.2) downward
      const r3 = view3d(g, S, { radius: 1.0, yaw: -0.55, pitch: 0.42 }), L = 3.2, Wd0 = 1, Dp = 1.2, sc = 1 / 1.7;
      const disp = (x, y, d) => { const ph = wt - K * x; return [(x - L / 2 + A * U(d) * Math.sin(ph)) * sc, (y - Wd0 / 2) * sc, (-d + A * Wd(d) * Math.cos(ph) + Dp / 2) * sc]; };
      const NX = 48, NY = 8, ND = 14;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {  // top surface
        const x0 = L * i / NX, x1 = L * (i + 1) / NX, y0 = Wd0 * j / NY, y1 = Wd0 * (j + 1) / NY;
        const h = Wd(0) * Math.cos(wt - K * (x0 + x1) / 2) / Math.abs(Wd(0) || 1);
        r3.quad([disp(x0, y0, 0), disp(x1, y0, 0), disp(x1, y1, 0), disp(x0, y1, 0)], dcol(g.th, 0.75 * h));
      }
      for (let i = 0; i < NX; i++) for (let j = 0; j < ND; j++) {  // front face (y = 0)
        const x0 = L * i / NX, x1 = L * (i + 1) / NX, d0 = Dp * j / ND, d1 = Dp * (j + 1) / ND, dm = (d0 + d1) / 2;
        const h = Wd(dm) * Math.cos(wt - K * (x0 + x1) / 2) / Math.abs(Wd(0) || 1);
        r3.quad([disp(x0, 0, d0), disp(x1, 0, d0), disp(x1, 0, d1), disp(x0, 0, d1)], dcol(g.th, 0.75 * h));
      }
      r3.flush();
      g.text(`c_R = ${Math.sqrt(gg).toFixed(3)} c_T`, 10, 16, { size: 12.5, bold: true });
    },
    note() { return '表面的质点做逆进椭圆运动（竖直位移大于水平位移），振幅随深度很快衰减：前侧面上的颜色在大约一个波长深处就看不出了。'; },
  };

  // where the 3D views appear (after the 2D demo of the same page)
  const add = (map, id, key) => { map[id] = [].concat(map[id] || [], key); };
  ['d-membrane', 'd-membrane-lumped', 'd-membrane-forced'].forEach(id => add(DEMO_FOR, id, 'mem3d:mem'));
  add(DEMO_FOR, 'd-plate', 'mem3d:plate');
  add(DEMO_FOR, 'd-dipole', 'balloon:dip'); add(DEMO_FOR, 'd-array', 'balloon:line');
  add(DEMO_FOR, 'd-pressure-mic', 'balloon:piston'); add(DEMO_FOR, 'd-compound', 'balloon:card'); add(DEMO_FOR, 'd-multipath', 'balloon:line');
  add(DEMO_FOR, 'd-room', 'room3d'); add(DEMO_FOR, 'd-mode-count', 'room3d');
  add(DEMO_FOR, 'd-waveguide', 'duct3d'); add(DEMO_FOR, 'd-waveguide-round', 'duct3d');
  add(DEMO_FOR, 'd-rayleigh', 'rayleigh3d'); add(DEMO_FOR, 'd-solid', 'rayleigh3d');
  add(DEMO_MODEL, 'membrane', 'mem3d:mem'); add(DEMO_MODEL, 'dipole', 'balloon:dip'); add(DEMO_MODEL, 'array', 'balloon:line');
  add(DEMO_MODEL, 'receiver', 'balloon:card'); add(DEMO_MODEL, 'room-mode', 'room3d'); add(DEMO_MODEL, 'waveguide', 'duct3d'); add(DEMO_MODEL, 'solid', 'rayleigh3d');
})();
