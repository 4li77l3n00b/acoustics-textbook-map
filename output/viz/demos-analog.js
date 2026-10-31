/* 交互演示（五）：类比线路——力–电类比（单振子 ↔ RLC）、声学结构 ↔ 线路图、变量器（活塞联结力学与声学） */
'use strict';
(() => {
  const { reg, M } = Demo, PI = Math.PI, TAU = 2 * PI;

  /* ---------- complex numbers as [re, im] ---------- */
  const cx = (re, im = 0) => [re, im];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const abs = a => Math.hypot(a[0], a[1]), par = (a, b) => div(mul(a, b), add(a, b));
  const at = (z, wt) => z[0] * Math.cos(wt) - z[1] * Math.sin(wt);  // Re(z e^{jωt})
  // animation phase: slow enough to follow, still faster at higher frequency (not to scale)
  const phase = (z, t) => TAU * 0.5 * Math.sqrt(z) * t;

  /* ---------- circuit drawing ---------- */
  const HALF = { R: 15, L: 15, C: 3, V: 13, I: 13 };
  // a two-terminal element in the middle of the segment, wires to both ends; side ±1 puts the label on one side
  function el(g, kind, x0, y0, x1, y1, color, label, side = -1) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, P = (s, t) => [mx + ux * s + nx * t, my + uy * s + ny * t];
    const ink = g.th.ink, h = HALF[kind] || 0;
    g.line([[x0, y0], P(-h, 0)], ink, 1.4); g.line([P(h, 0), [x1, y1]], ink, 1.4);
    if (kind === 'R') {
      const pts = [P(-h, 0)];
      for (let i = 1; i < 7; i++) pts.push(P(-h + 2 * h * i / 7, i % 2 ? 6 : -6));
      pts.push(P(h, 0)); g.line(pts, color, 1.8);
    } else if (kind === 'L') {
      const pts = [];
      for (let k = 0; k < 4; k++) for (let i = 0; i <= 10; i++) { const a = PI - PI * i / 10, c0 = -h + (k + 0.5) * h / 2; pts.push(P(c0 + h / 4 * Math.cos(a), -h / 4 * Math.sin(a) * 1.4)); }
      g.line(pts, color, 1.8);
    } else if (kind === 'C') {
      g.line([P(-h, -10), P(-h, 10)], color, 2.4); g.line([P(h, -10), P(h, 10)], color, 2.4);
    } else if (kind === 'V' || kind === 'I') {
      const [cxx, cyy] = P(0, 0); g.circle(cxx, cyy, h, g.th.bg, color, 1.6);
      if (kind === 'V') g.line(Array.from({ length: 17 }, (_, i) => [cxx - 7 + 14 * i / 16, cyy - 4 * Math.sin(TAU * i / 16)]), color, 1.5);
      else g.arrow(...P(-8, 0), ...P(8, 0), color, 1.5);
    }
    if (label) {
      const off = (kind === 'R' || kind === 'L' ? 15 : kind === 'C' ? 19 : 22) * side, [lx, ly] = P(0, off);
      g.text(label, lx, ly, { color, size: 11.5, align: Math.abs(nx) > 0.5 ? (off * nx > 0 ? 'left' : 'right') : 'center' });
    }
  }
  function gnd(g, x, y) {
    const c = g.th.ink;
    g.line([[x, y], [x, y + 6]], c, 1.4);
    [[9, 6], [6, 10], [3, 14]].forEach(([w, d]) => g.line([[x - w, y + d], [x + w, y + d]], c, 1.4));
  }
  // charges moving along a wire path: dots spaced sp apart, all shifted by off pixels
  function dots(g, pts, off, color, sp = 15) {
    const seg = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    for (let s = ((off % sp) + sp) % sp; s < tot; s += sp) {
      let k = 0, r = s; while (k < seg.length - 1 && r > seg[k]) { r -= seg[k]; k++; }
      const f = r / seg[k], a = pts[k], b = pts[k + 1];
      g.circle(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 2.4, color);
    }
  }
  const tint = (g, v) => { const c = g.th, a = Math.min(1, Math.abs(v)) * 0.75; return `rgba(${(v >= 0 ? c.posRGB : c.negRGB).join(',')},${a})`; };

  /* ---------- mechanical symbols (horizontal) ---------- */
  function hspring(g, x0, x1, y, color, coils = 7) {
    const pts = [[x0, y], [x0 + 5, y]], n = coils * 2, L = x1 - x0 - 10;
    for (let i = 1; i < n; i++) pts.push([x0 + 5 + L * i / n, y + (i % 2 ? 7 : -7)]);
    pts.push([x1 - 5, y], [x1, y]); g.line(pts, color, 1.6);
  }
  function hdashpot(g, x0, x1, y, color) {
    const m = (x0 + x1) / 2;
    g.line([[x0, y], [m + 4, y]], color, 1.5); g.line([[m + 14, y - 7], [m - 10, y - 7], [m - 10, y + 7], [m + 14, y + 7]], color, 1.5);
    g.line([[m + 4, y - 5], [m + 4, y + 5]], color, 2.5); g.line([[m + 14, y], [x1, y]], color, 1.5);
  }

  /* ---------- 力–电类比：单振子 ↔ RLC ---------- */
  reg.analog = {
    title: '力–电类比：单振子与 RLC 电路逐项对应', h: 310,
    params: [
      { k: 'kind', label: '', options: [['imp', '阻抗型：力 ↔ 电压，速度 ↔ 电流（串联回路）'], ['adm', '导纳型：力 ↔ 电流，速度 ↔ 电压（并联支路）']], v: 'imp' },
      { k: 'z', label: '频率比 f/f₀', min: 0.2, max: 3, step: 0.01, v: 0.7 },
      { k: 'Q', label: '品质因素 Qm', min: 0.5, max: 20, log: true, v: 4 },
    ],
    setup(p, S) {  // Mm = Km = 1 so ω0 = 1, Rm = 1/Q, F = 1
      const w = p.z, R = 1 / p.Q;
      S.v = div(cx(1), cx(R, w - 1 / w));           // v = F / Zm
      S.xi = div(S.v, cx(0, w));                       // ξ = v / jω
      S.fM = mul(cx(0, w), S.v); S.fR = mul(cx(R), S.v); S.fK = S.xi;  // jωMv, Rv, v/(jωCm) = Kξ
      let mx = 1; for (let z = 0.2; z <= 3; z += 0.005) mx = Math.max(mx, 1 / Math.hypot(z / p.Q, z * z - 1));
      S.xmax = mx;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, wt = phase(p.z, t), adm = p.kind === 'adm';
      const col = { M: c.orange, K: c.blue, R: c.green, F: c.red };
      const xpx = at(S.xi, wt) / S.xmax * 30;  // mass displacement in px; the charge moves exactly the same way
      // --- mechanical oscillator ---
      const mW = Math.min(W * 0.3, 220), yc = H * 0.42, wall = 18, m0 = wall + Math.min(110, mW * 0.5);
      g.hatch(wall, yc - 48, wall, yc + 48, c.muted);
      const mx0 = m0 + xpx;
      hspring(g, wall, mx0 - 22, yc - 14, col.K); hdashpot(g, wall, mx0 - 22, yc + 14, col.R);
      g.rect(mx0 - 22, yc - 24, 44, 48, col.M + '33', col.M, 1.6); g.text('Mm', mx0, yc, { color: col.M, align: 'center', size: 12 });
      g.text('Km', (wall + mx0 - 22) / 2, yc - 30, { color: col.K, align: 'center', size: 11.5 });
      g.text('Rm', (wall + mx0 - 22) / 2, yc + 32, { color: col.R, align: 'center', size: 11.5 });
      const F = Math.cos(wt); g.arrow(mx0 + 24, yc, mx0 + 24 + 30 * F, yc, col.F, 2); g.text('F', mx0 + 30, yc - 12, { color: col.F, size: 11.5 });
      const vv = at(S.v, wt) / p.Q * 16;  // |v| peaks at Q (F = 1, Rm = 1/Q)
      g.line([[m0, yc + 46], [m0, yc + 56]], c.line, 1); g.arrow(mx0, yc + 51, mx0 + vv, yc + 51, c.ink, 1.4); g.text('v', mx0 - 12, yc + 51, { color: c.muted, size: 11 });
      g.text('力学系统', mW / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      // --- circuit ---
      const x0 = mW + 26, x1 = Math.max(x0 + 150, W * 0.64), y0 = H * 0.2, y1 = H * 0.74;
      g.text(adm ? '导纳型线路：各支路电压相同' : '阻抗型线路：同一电流流过各元件', (x0 + x1) / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      if (!adm) {
        const xm = (x0 + x1) / 2;
        el(g, 'V', x0, y1, x0, y0, col.F, 'E ↔ F', 1);
        el(g, 'L', x0, y0, xm, y0, col.M, 'Le ↔ Mm', -1);
        el(g, 'R', xm, y0, x1, y0, col.R, 'Re ↔ Rm', -1);
        el(g, 'C', x1, y0, x1, y1, col.K, 'Ce ↔ Cm', 1);
        g.line([[x1, y1], [x0, y1]], c.ink, 1.4);
        g.text('+', x0 + 8, y0 + (y1 - y0) / 2 - 16, { color: col.F, size: 11 });
        dots(g, [[x0, y1], [x0, y0], [x1, y0], [x1, y1], [x0, y1]], xpx, c.ink);
        g.text('I ↔ v（电荷位移 ↔ 质量位移 ξ）', (x0 + x1) / 2, y1 + 18, { color: c.muted, size: 11, align: 'center' });
      } else {
        const xs = [0, 1, 2, 3].map(i => x0 + (x1 - x0) * i / 3);
        g.line([[x0, y0], [x1, y0]], c.ink, 1.4); g.line([[x0, y1], [x1, y1]], c.ink, 1.4);
        g.rect(x0 - 2, y0 - 3, x1 - x0 + 4, 6, tint(g, at(S.v, wt) / p.Q));
        el(g, 'I', xs[0], y1, xs[0], y0, col.F); el(g, 'C', xs[1], y0, xs[1], y1, col.M); el(g, 'R', xs[2], y0, xs[2], y1, col.R); el(g, 'L', xs[3], y0, xs[3], y1, col.K);
        [['I', '↔ F'], ['Ce', '↔ Mm'], ['1/Re', '↔ Rm'], ['Le', '↔ Cm']].forEach(([e, m], i) => {  // labels under the rail: the branches are too close for side labels
          const color = [col.F, col.M, col.R, col.K][i];
          g.text(e, xs[i], y1 + 13, { color, size: 11, align: 'center' }); g.text(m, xs[i], y1 + 26, { color, size: 11, align: 'center' });
        });
        const q = [S.v, mul(cx(1 / p.Q), S.xi), div(S.xi, cx(0, p.z))], qF = div(cx(1), cx(0, p.z));
        const sc = 16 / Math.max(abs(qF), ...q.map(abs));
        dots(g, [[xs[0], y1], [xs[0], y0]], at(qF, wt) * sc, col.F);
        q.forEach((z, i) => dots(g, [[xs[i + 1], y0], [xs[i + 1], y1]], at(z, wt) * sc, [col.M, col.R, col.K][i]));
        g.text('e ↔ v：上方导线的颜色是节点电压', (x0 + x1) / 2, y1 + 44, { color: c.muted, size: 11, align: 'center' });
      }
      // --- phasors (v along +x): F = Rv + jωMv + v/(jωC) ---
      const px0 = x1 + 34, pw = W - px0 - 10;
      if (pw < 90) return;
      const rot = z => { const u = abs(S.v); return [(z[0] * S.v[0] + z[1] * S.v[1]) / u, (z[1] * S.v[0] - z[0] * S.v[1]) / u]; };
      const a1 = rot(S.fR), a2 = add(a1, rot(S.fM)), a3 = add(a2, rot(S.fK));
      const pts = [[0, 0], a1, a2, a3], xr = [Math.min(...pts.map(q => q[0])), Math.max(...pts.map(q => q[0]))], yr = [Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[1]))];
      const ph = H - 76, fw = pw - 76, sc = Math.min(fw / Math.max(xr[1] - xr[0], 1e-6), ph / Math.max(yr[1] - yr[0], 1e-6), 400);
      const ox = px0 + 38 + (fw - (xr[1] - xr[0]) * sc) / 2 - xr[0] * sc, oy = 34 + (ph - (yr[1] - yr[0]) * sc) / 2 + yr[1] * sc;
      const X = (q, dx = 0) => [ox + q[0] * sc + dx, oy - q[1] * sc];
      g.text('相量图（以 v 为参考方向）', px0 + pw / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      g.line([[px0, oy], [px0 + pw, oy]], c.line, 0.8, [3, 3]);
      // jωMv (up) and v/jωC (down) lie on one vertical line: draw them 5 px apart so both stay visible
      g.arrow(...X([0, 0]), ...X(a1), col.R, 2);
      g.arrow(...X(a1, -5), ...X(a2, -5), col.M, 2); g.line([X(a2, -5), X(a2, 5)], c.muted, 1, [2, 2]); g.arrow(...X(a2, 5), ...X(a3, 5), col.K, 2);
      g.arrow(...X([0, 0]), ...X(a3), col.F, 2.2);
      const mid = (q0, q1, dx) => { const [ax, ay] = X(q0), [bx, by] = X(q1); return [(ax + bx) / 2 + dx, (ay + by) / 2]; };
      g.text('Rv', ...mid([0, 0], a1, 0).map((v, i) => v + (i ? 10 : 0)), { color: col.R, size: 11, align: 'center' });
      g.text('jωMv', ...mid(a1, a2, -10), { color: col.M, size: 11, align: 'right' });
      g.text('v/jωC', ...mid(a2, a3, 10), { color: col.K, size: 11 });
      g.text('F', ...mid([0, 0], a3, a3[1] > 0 ? 8 : -8).map((v, i) => v + (i ? -8 : 0)), { color: col.F, size: 11.5, bold: true, align: a3[1] > 0 ? 'left' : 'right' });
      g.text(adm ? '支路电流 I_G + I_C + I_L = I' : '元件电压 U_R + U_L + U_C = E', px0 + pw / 2, H - 10, { color: c.muted, size: 10.5, align: 'center' });
    },
    note(p, S) {
      const z = p.z, dom = Math.abs(z - 1 / z) < 1 / p.Q ? '力阻控制（共振附近）' : z < 1 ? '弹性控制（弹簧项最大）' : '质量控制（惯性项最大）';
      const th = Math.atan2(S.v[1], S.v[0]) * 180 / PI;
      if (p.kind === 'imp') return `运动方程 $M_m\\dot v+R_mv+\\frac1{C_m}\\!\\int\\!v\\,dt=F$ 与回路方程 $L_e\\dot I+R_eI+\\frac1{C_e}\\!\\int\\!I\\,dt=E$ 同形：三个元件流过同一速度（电流），所以<b>串联</b>。电容上的电荷就是质量块的位移，弹簧储能 ↔ 电容储能，动能 ↔ 电感磁能。此刻 ${dom}，速度${th >= 0 ? '超前' : '滞后'}外力 ${M.fmt(Math.abs(th), 1)}°。`;
      return `导纳型把力当电流：外力像电流一样“穿过”元件分到三条支路（惯性力、摩擦力、弹性力），三条支路两端电压相同 ↔ 三个元件速度相同，所以<b>并联</b>。元件对换：$M_m\\to C_e$、$C_m\\to L_e$、$R_m\\to 1/R_e$。它与阻抗型互为对偶（串 ↔ 并、L ↔ C、电压源 ↔ 电流源）。此刻 ${dom}。`;
    },
  };

  /* ---------- 声学结构 ↔ 类比线路图 ---------- */
  // a ladder: each section is a series element followed by a node with an optional shunt to ground; elements {M, R, C}
  const Z = (e, w) => cx(e.R || 0, (e.M ? w * e.M : 0) - (e.C ? 1 / (w * e.C) : 0));
  function ladder(net, w) {
    const n = net.sec.length, zin = new Array(n);
    let zr = net.load ? Z(net.load, w) : null;
    for (let k = n - 1; k >= 0; k--) {
      const s = net.sec[k], zs = s.sh ? Z(s.sh, w) : null;
      const zp = zs && zr ? par(zs, zr) : zs || zr;
      zr = zin[k] = add(Z(s.ser, w), zp);
    }
    let U = div(cx(1), zin[0]), pPrev = cx(1);
    const out = { Us: [], Ush: [], pn: [] };
    net.sec.forEach(s => {
      const pn = sub(pPrev, mul(U, Z(s.ser, w))), ush = s.sh ? div(pn, Z(s.sh, w)) : cx(0);
      out.Us.push(U); out.pn.push(pn); out.Ush.push(ush);
      U = sub(U, ush); pPrev = pn;
    });
    out.UL = U;
    return out;
  }
  const NETS = {
    single: r => ({ sec: [{ ser: { M: 1, R: r }, sh: { C: 1 } }] }),
    two: r => ({ sec: [{ ser: { M: 1, R: r }, sh: { C: 1 } }, { ser: { M: 1, R: r }, sh: { C: 1 } }] }),
    branch: r => ({ sec: [{ ser: { M: 0.4 }, sh: { M: 1, R: r, C: 1 } }, { ser: { M: 0.4 }, sh: null }], load: { R: 1 } }),
  };
  reg.acnet = {
    title: '声学结构与类比线路：跟着声流线画图', h: 330,
    params: [
      { k: 'kind', label: '', options: [['single', '单个共鸣器'], ['two', '两个共鸣器串接（图 3-4-7）'], ['branch', '主管旁接共鸣器（带阻）']], v: 'two' },
      { k: 'z', label: '频率 f/f₀', min: 0.2, max: 2.5, step: 0.01, v: 0.62 },
      { k: 'r', label: '声阻（相对）', min: 0.02, max: 0.6, log: true, v: 0.05 },
    ],
    setup(p, S) {
      S.net = NETS[p.kind](p.r);
      S.res = ladder(S.net, p.z);
      let pm = 1, um = 1e-9;  // scales: largest node pressure / volume displacement over the sweep
      for (let z = 0.2; z <= 2.5; z += 0.004) {
        const r = ladder(S.net, z);
        r.pn.forEach(q => { pm = Math.max(pm, abs(q)); });
        r.Us.concat(r.Ush).forEach(u => { um = Math.max(um, abs(u) / z); });
      }
      S.pm = pm; S.um = um;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, wt = phase(p.z, t), R = S.res, w = p.z, kind = p.kind;
      const disp = u => at(div(u, cx(0, w)), wt) / S.um;   // volume displacement, −1..1 over the sweep
      const pr = q => at(q, wt) / S.pm;                    // pressure, −1..1
      const colN = [c.orange, c.purple], colC = [c.blue, c.accent];
      // ---------- structure ----------
      const sx0 = 12, sx1 = W * 0.5 - 8, yc = H * 0.42;
      g.text('声学结构（虚线：声流线）', (sx0 + sx1) / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      const src = (x, wdt, hh) => {  // the driving sound field on the left
        g.field({ x, y: yc - hh, w: wdt, h: 2 * hh }, 24, 4, i => 0.5 * Math.cos(wt - (i - 24) * 0.12));
        g.text('p', x + wdt / 2, yc - hh - 10, { color: c.red, size: 12, align: 'center', bold: true });
      };
      const neck = (x, len, hw, u, color, label) => {  // tube walls + an air plug displaced with the volume flow
        const d = disp(u) * Math.min(14, len * 0.25), pl = Math.min(22, len * 0.45);
        g.rect(x, yc - hw, len, 2 * hw, c.bg); g.line([[x, yc - hw], [x + len, yc - hw]], c.ink, 2); g.line([[x, yc + hw], [x + len, yc + hw]], c.ink, 2);
        g.rect(x + (len - pl) / 2 + d, yc - hw + 2, pl, 2 * hw - 4, color + '99', color);
        g.text(label, x + len / 2, yc - hw - 10, { color, size: 11, align: 'center' });
      };
      const cavity = (x, wd, ht, q, color, label, cy = yc) => {
        g.rect(x, cy - ht / 2, wd, ht, tint(g, pr(q)), c.ink, 2);
        g.text(label, x + wd / 2, cy + ht / 2 + 13, { color, size: 11, align: 'center' });
      };
      // ---------- circuit ----------
      const x0 = W * 0.5 + 24, x1 = W - 22, y0 = H * 0.2, y1 = H * 0.76;
      g.text('类比线路（阻抗型，地 = 大气压 / 刚性壁）', (x0 + x1) / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      const node = (x, y, q) => g.circle(x, y, 5, tint(g, pr(q)), c.ink, 1);
      const sc = 12;  // px of charge displacement at the sweep maximum
      el(g, 'V', x0, y1, x0, y0, c.red, 'p', 1);
      dots(g, [[x0, y1], [x0, y0]], disp(R.Us[0]) * sc, c.red);
      g.line([[x0, y1], [x1, y1]], c.ink, 1.4); gnd(g, (x0 + x1) / 2, y1);
      const rlSeg = (xa, xb, y, u, color, lab) => {  // series M + R on one segment
        const xm = (xa + xb) / 2;
        el(g, 'L', xa, y, xm, y, color, lab, -1); el(g, 'R', xm, y, xb, y, color, '', -1);
        dots(g, [[xa, y], [xb, y]], disp(u) * sc, color);
      };
      if (kind === 'single' || kind === 'two') {
        const n = R.Us.length, seg = (sx1 - sx0) / (n === 1 ? 4.2 : 6.6);
        let x = sx0;
        src(x, seg * 0.8, 34); x += seg * 0.8;
        for (let k = 0; k < n; k++) {
          neck(x, seg, 9, R.Us[k], colN[k], `M${n > 1 ? '₁₂'[k] : 'a'} R${n > 1 ? '₁₂'[k] : 'a'}`); x += seg;
          cavity(x, seg * 1.6, 96, R.pn[k], colC[k], `C${n > 1 ? '₁₂'[k] : 'a'}`); x += seg * 1.6;
        }
        g.line([[sx0 + 4, yc], [x - 3, yc]], c.red, 1, [4, 4]);  // the flow line ends on the rigid wall of the last cavity
        // circuit: p — (M R) — node — C to ground — (M R) — node — C
        const cols = n === 1 ? [x0, x1] : [x0, (x0 + x1) / 2, x1];
        for (let k = 0; k < n; k++) {
          const xa = cols[k], xb = cols[k + 1];
          rlSeg(xa, xb, y0, R.Us[k], colN[k], `M${n > 1 ? '₁₂'[k] : 'a'} R${n > 1 ? '₁₂'[k] : 'a'}`);
          el(g, 'C', xb, y0, xb, y1, colC[k], `C${n > 1 ? '₁₂'[k] : 'a'}`, 1);
          dots(g, [[xb, y0], [xb, y1]], disp(R.Ush[k]) * sc, colC[k]);
          node(xb, y0, R.pn[k]);
        }
      } else {
        // main tube with a side-branch resonator under its middle, open end on the right
        const fw = (sx1 - sx0) * 0.16, tx0 = sx0 + fw, tx1 = sx1 - 30, jx = (tx0 + tx1) / 2, hw = 12;
        src(sx0, fw, 30);
        g.rect(tx0, yc - hw, tx1 - tx0, 2 * hw, c.bg);
        g.rect(tx0, yc - hw, jx - tx0 - 10, 2 * hw, tint(g, pr(mul(add(cx(1), R.pn[0]), cx(0.5)))));
        g.rect(jx + 10, yc - hw, tx1 - jx - 10, 2 * hw, tint(g, pr(R.pn[1])));
        g.line([[tx0, yc - hw], [tx1, yc - hw]], c.ink, 2);
        g.line([[tx0, yc + hw], [jx - 8, yc + hw]], c.ink, 2); g.line([[jx + 8, yc + hw], [tx1, yc + hw]], c.ink, 2);
        // air particles in the main tube, moving with the volume flow of each half
        for (let i = 0; i < 6; i++) {
          const half = i < 3 ? 0 : 1, xb = half ? jx + 14 + (tx1 - jx - 28) * (i - 3 + 0.5) / 3 : tx0 + 4 + (jx - tx0 - 18) * (i + 0.5) / 3;
          g.circle(xb + disp(R.Us[half]) * 8, yc, 3, c.ink);
        }
        g.text('Mt', (tx0 + jx) / 2, yc - hw - 10, { color: c.muted, size: 11, align: 'center' });
        g.text('Mt', (jx + tx1) / 2, yc - hw - 10, { color: c.muted, size: 11, align: 'center' });
        // radiation at the open end
        for (let k = 1; k <= 3; k++) { const rr = 8 * k + 6 * ((wt / TAU) % 1); g.line(Array.from({ length: 13 }, (_, i) => { const a = -0.8 + 1.6 * i / 12; return [tx1 + rr * Math.cos(a), yc + rr * Math.sin(a)]; }), c.green, 1, [2, 2]); }
        g.text('RL', tx1 + 18, yc - 22, { color: c.green, size: 11 });
        // the resonator: vertical neck + cavity
        const nkT = yc + hw, nkB = nkT + 34, cvH = Math.min(70, H - nkB - 26);
        g.rect(jx - 8, nkT - 1, 16, nkB - nkT + 1, c.bg); g.line([[jx - 8, nkT], [jx - 8, nkB]], c.ink, 2); g.line([[jx + 8, nkT], [jx + 8, nkB]], c.ink, 2);
        const d = disp(R.Ush[0]) * 7;
        g.rect(jx - 6, nkT + 8 + d, 12, 16, c.orange + '99', c.orange);
        g.text('Mb Rb', jx + 14, (nkT + nkB) / 2, { color: c.orange, size: 11 });
        g.rect(jx - 50, nkB, 100, cvH, tint(g, pr(div(R.Ush[0], cx(0, w)))), c.ink, 2);  // cavity pressure = U / (jωCb), Cb = 1
        g.rect(jx - 7, nkB - 2, 14, 4, c.bg);
        g.text('Cb', jx + 60, nkB + cvH / 2, { color: c.blue, size: 11 });
        g.line([[sx0 + 4, yc], [jx, yc], [tx1 + 10, yc]], c.red, 1, [4, 4]); g.line([[jx, yc], [jx, nkB + cvH / 2]], c.red, 1, [4, 4]);
        // circuit
        const xm = (x0 + x1) / 2, ya = y0 + (y1 - y0) / 3, yb = y0 + 2 * (y1 - y0) / 3;
        el(g, 'L', x0, y0, xm, y0, c.muted, 'Mt', -1); dots(g, [[x0, y0], [xm, y0]], disp(R.Us[0]) * sc, c.muted);
        el(g, 'L', xm, y0, x1, y0, c.muted, 'Mt', -1); dots(g, [[xm, y0], [x1, y0]], disp(R.Us[1]) * sc, c.muted);
        el(g, 'L', xm, y0, xm, ya, c.orange, 'Mb', -1); el(g, 'R', xm, ya, xm, yb, c.orange, 'Rb', -1); el(g, 'C', xm, yb, xm, y1, c.blue, 'Cb', -1);
        dots(g, [[xm, y0], [xm, y1]], disp(R.Ush[0]) * sc, c.orange);
        el(g, 'R', x1, y0, x1, y1, c.green, 'RL', 1); dots(g, [[x1, y0], [x1, y1]], disp(R.UL) * sc, c.green);
        node(xm, y0, R.pn[0]); node(x1, y0, R.pn[1]);
      }
      g.text('颜色：腔内 / 节点的瞬时声压（红正蓝负）；圆点：体积位移（电荷）', W / 2, H - 8, { color: c.muted, size: 10.5, align: 'center' });
    },
    note(p, S) {
      const R = S.res, db = q => M.fmt(20 * Math.log10(Math.max(abs(q), 1e-9)), 1);
      if (p.kind === 'single') return `声流线从外部声源出发，穿过颈（声质量 $M_a$、声阻 $R_a$，串联）进入腔体，终止在刚性壁上（声容 $C_a$ 接地）：一个串联回路。腔内声压 $|p_c/p|=${M.fmt(abs(R.pn[0]), 2)}$，在 $f_0=\\frac1{2\\pi\\sqrt{M_aC_a}}$ 处最大。`;
      if (p.kind === 'two') return `两段颈都在声流线上依次穿过 → 串臂；两个腔各自终止于刚性壁 → 两个对地声容：一个两节梯形网络，有两个共振频率（这里 $M_1=M_2$、$C_1=C_2$，$f/f_0=0.618$ 与 $1.618$）。此刻 $|p_1/p|=${M.fmt(abs(R.pn[0]), 2)}$、$|p_2/p|=${M.fmt(abs(R.pn[1]), 2)}$。低频两腔同相，高频的第二个共振两腔反相。`;
      return `声流线在交汇处分叉：一路沿主管到开口（辐射阻 $R_L$ 接地），一路进入旁支共鸣器（$M_b$、$R_b$、$C_b$ 串联后接地）。$f=f_0$ 时旁支阻抗只剩 $R_b$，几乎把节点声压短路到地，开口辐射出去的声压只有 $${db(R.pn[1])}$ dB（相对声源）——这就是共振式消声器。`;
    },
  };

  /* ---------- 变量器：活塞把力学系统接到声学系统 ---------- */
  const RC2 = 1.21 * 343 * 343, MM = 0.002, KM = 2000;  // ρ0c0² in Pa; a 2 g piston on a 2000 N/m spring (159 Hz alone)
  reg.xformer = {
    title: '变量器：面积 S 的活塞联结力学与声学', h: 320,
    params: [
      { k: 'view', label: '', options: [['xf', '画出变量器（1 : S）'], ['m', '折算到力学侧'], ['a', '折算到声学侧']], v: 'xf' },
      { k: 'a', label: '活塞半径 a / cm', min: 0.5, max: 4, step: 0.1, v: 1.5 },
      { k: 'V', label: '腔体积 V / cm³', min: 2, max: 2000, log: true, v: 30, fmt: v => M.fmt(v, 0) },
    ],
    setup(p, S) {
      S.S = PI * (p.a / 100) ** 2; S.Ca = p.V * 1e-6 / RC2;
      S.Kc = S.S * S.S / S.Ca;                         // the cavity seen from the piston: K = S²/Ca = ρc²S²/V
      S.f1 = Math.sqrt(KM / MM) / TAU; S.f0 = Math.sqrt((KM + S.Kc) / MM) / TAU;
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, wt = TAU * 0.6 * t, xi = Math.cos(wt), frac = S.Kc / (KM + S.Kc);
      // ---------- structure ----------
      const yc = H * 0.4, wall = 16, hw = 10 + 9 * p.a, px0 = 120, len = M.clamp(30 + 60 * Math.log10(1 + p.V / (S.S * 1e4)), 30, W * 0.42 - px0 - 4);
      const pxx = px0 + 8 * xi;
      g.text('力学系统 + 声学系统', W * 0.22, 14, { color: c.muted, size: 11.5, align: 'center' });
      g.hatch(wall, yc - 40, wall, yc + 40, c.muted);
      hspring(g, wall, pxx - 18, yc, c.blue); g.text('Km', (wall + pxx) / 2 - 8, yc - 18, { color: c.blue, size: 11 });
      // tube and cavity, cavity pressure follows the compression
      const tx0 = px0 - 4, tx1 = tx0 + 18 + len;
      g.rect(pxx + 4, yc - hw, tx1 - pxx - 4, 2 * hw, tint(g, xi * (0.25 + 0.75 * frac)));
      g.line([[tx0 - 20, yc - hw], [tx1, yc - hw], [tx1, yc + hw], [tx0 - 20, yc + hw]], c.ink, 2);
      g.rect(pxx - 18, yc - hw + 2, 22, 2 * hw - 4, c.orange + '44', c.orange, 1.6);
      g.text('Mm', pxx - 7, yc - hw - 10, { color: c.orange, size: 11, align: 'center' });
      g.arrow(pxx - 7, yc - hw - 28, pxx - 7 - 16 * Math.sin(wt), yc - hw - 28, c.red, 2); g.text('F', pxx + 14, yc - hw - 28, { color: c.red, size: 11 });  // driven at resonance: F in phase with v
      g.text('V → Ca', (pxx + tx1) / 2, yc + hw + 13, { color: c.accent, size: 11, align: 'center' });
      g.text('S', pxx + 10, yc, { color: c.ink, size: 11, bold: true });
      // stiffness bar: spring vs cavity
      const bx = 20, by = H - 44, bw = W * 0.42 - 30;
      g.rect(bx, by, bw * (1 - frac), 10, c.blue + '99'); g.rect(bx + bw * (1 - frac), by, bw * frac, 10, c.accent + '99');
      g.text(`恢复力：弹簧 ${M.fmt(100 * (1 - frac), 0)}%　腔体 ${M.fmt(100 * frac, 0)}%`, bx, by - 9, { color: c.muted, size: 10.5 });
      g.text(`f₀ = ${M.fmt(S.f1, 0)} Hz（无腔） → ${M.fmt(S.f0, 0)} Hz`, bx, by + 24, { color: c.ink, size: 11.5 });
      // ---------- circuit ----------
      const cx0 = W * 0.47, cx1 = W - 16, y0 = H * 0.2, y1 = H * 0.72, dm = 10 * xi, da = M.clamp(10 * (p.a / 1.5) ** 2, 3, 24) * xi;
      if (p.view === 'xf') {
        const xa = cx0 + (cx1 - cx0) * 0.5 - 16, xb = xa + 32, xm = (cx0 + xa) / 2;
        g.text('力学侧', (cx0 + xa) / 2, 14, { color: c.muted, size: 11.5, align: 'center' }); g.text('声学侧', (xb + cx1) / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
        el(g, 'V', cx0, y1, cx0, y0, c.red, 'F', 1);
        el(g, 'L', cx0, y0, xm, y0, c.orange, 'Mm', -1); el(g, 'C', xm, y0, xa, y0, c.blue, 'Cm', -1);
        g.line([[cx0, y1], [xa, y1]], c.ink, 1.4);
        // ideal transformer: two coils and a core
        const coil = (x, dir) => { const pts = []; for (let k = 0; k < 4; k++) for (let i = 0; i <= 10; i++) { const a = -PI / 2 + PI * i / 10, cy0 = y0 + 10 + (k + 0.5) * (y1 - y0 - 20) / 4; pts.push([x + dir * 7 * Math.cos(a), cy0 + (y1 - y0 - 20) / 8 * Math.sin(a)]); } return pts; };
        g.line([[xa, y0], [xa, y0 + 10]], c.ink, 1.4); g.line([[xa, y1 - 10], [xa, y1]], c.ink, 1.4); g.line(coil(xa, 1), c.ink, 1.6);
        g.line([[xb, y0], [xb, y0 + 10]], c.ink, 1.4); g.line([[xb, y1 - 10], [xb, y1]], c.ink, 1.4); g.line(coil(xb, -1), c.ink, 1.6);
        g.line([[xa + 13, y0 + 6], [xa + 13, y1 - 6]], c.muted, 1.4); g.line([[xb - 13, y0 + 6], [xb - 13, y1 - 6]], c.muted, 1.4);
        g.text('1 : S', (xa + xb) / 2, y1 + 14, { color: c.ink, size: 11.5, align: 'center', bold: true });
        el(g, 'C', cx1, y0, cx1, y1, c.accent, 'Ca', 1); g.line([[xb, y0], [cx1, y0]], c.ink, 1.4); g.line([[xb, y1], [cx1, y1]], c.ink, 1.4);
        dots(g, [[cx0, y1], [cx0, y0], [xa, y0]], dm, c.ink); dots(g, [[xb, y0], [cx1, y0], [cx1, y1], [xb, y1]], da, c.accent);
        g.text('F = pS', (cx0 + xa) / 2, y1 + 14, { color: c.muted, size: 10.5, align: 'center' });
        g.text('U = Sv', (xb + cx1) / 2, y1 + 14, { color: c.muted, size: 10.5, align: 'center' });
      } else {
        const m = p.view === 'm', xs = [0, 1, 2, 3].map(i => cx0 + (cx1 - cx0) * i / 3);
        g.text(m ? '全部折算到力学侧（力阻抗）' : '全部折算到声学侧（声阻抗）', (cx0 + cx1) / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
        el(g, 'V', cx0, y1, cx0, y0, c.red, m ? 'F' : 'p = F/S', 1);
        el(g, 'L', xs[0], y0, xs[1], y0, c.orange, m ? 'Mm' : 'Mm/S²', -1);
        el(g, 'C', xs[1], y0, xs[2], y0, c.blue, m ? 'Cm' : 'Cm·S²', -1);
        el(g, 'C', xs[2], y0, xs[3], y0, c.accent, m ? 'Ca/S²' : 'Ca', -1);
        g.line([[xs[3], y0], [xs[3], y1], [cx0, y1]], c.ink, 1.4);
        dots(g, [[cx0, y1], [cx0, y0], [xs[3], y0], [xs[3], y1], [cx0, y1]], m ? dm : da, m ? c.ink : c.accent);
        g.text(m ? '电流 = 速度 v；腔体变成串联的力顺 Ca/S²' : '电流 = 体积速度 U；活塞质量变成声质量 Mm/S²', (cx0 + cx1) / 2, y1 + 16, { color: c.muted, size: 10.5, align: 'center' });
      }
    },
    note(p, S) {
      const Ca = S.Ca, Cm2 = Ca / (S.S * S.S), sci = v => { const e = Math.floor(Math.log10(v)); return `${M.fmt(v / 10 ** e, 2)}\\times10^{${e}}`; };
      return `活塞面积 $S=${M.fmt(S.S * 1e4, 2)}\\,\\text{cm}^2$，腔体声容 $C_a=V/\\rho_0c_0^2=${sci(Ca)}\\,\\text{m}^3/\\text{Pa}$。从活塞看过去，腔体相当于力顺 $C_a/S^2=${sci(Cm2)}\\,\\text{m/N}$（劲度 $\\rho_0c_0^2S^2/V=${M.fmt(S.Kc, 0)}\\,\\text{N/m}$），与弹簧力顺 $C_m$ 串联（两个劲度相加），所以共振频率从 ${M.fmt(S.f1, 0)} Hz 升到 ${M.fmt(S.f0, 0)} Hz——习题 3-11 耳机压在小腔上频率升高就是这个道理。腔越小、活塞越大，腔体越“硬”。`;
    },
  };

  /* ---------- 画声学类比线路图的过程：认结构 → 声流线 → 地 → 换元件 → 连线路 → 列方程 ---------- */
  // structure parts in a unit box (u right, v down); circuit elements in another unit box, k = order of drawing
  const AC_EX = {
    two: {
      parts: [
        { id: 'src', type: 'src', u0: 0, u1: 0.12, v0: 0.3, v1: 0.7, label: '声源', col: 'red', ov: 'p' },
        { id: 'c1', type: 'cav', u0: 0.28, u1: 0.52, v0: 0.2, v1: 0.8, label: '腔体 1', col: 'blue', ov: 'C₁' },
        { id: 'c2', type: 'cav', u0: 0.68, u1: 0.95, v0: 0.2, v1: 0.8, label: '腔体 2', col: 'blue', ov: 'C₂' },
        { id: 'n1', type: 'tube', u0: 0.12, u1: 0.28, v: 0.5, hw: 9, label: '细管 1', col: 'orange', ov: 'M₁ R₁' },
        { id: 'n2', type: 'tube', u0: 0.52, u1: 0.68, v: 0.5, hw: 9, label: '细管 2', col: 'orange', ov: 'M₂ R₂' },
      ],
      flows: [[[0.03, 0.5], [0.4, 0.5]], [[0.4, 0.5], [0.4, 0.77]], [[0.4, 0.5], [0.815, 0.5]], [[0.815, 0.5], [0.815, 0.77]]],
      grounds: [{ u: 0.4, v: 0.8, text: '刚性壁' }, { u: 0.815, v: 0.8, text: '刚性壁' }],
      circuit: [
        { k: 1, part: 'src', kind: 'V', a: [0.04, 0.85], b: [0.04, 0.15], label: 'p' },
        { k: 2, part: 'n1', kind: 'LR', a: [0.04, 0.15], b: [0.5, 0.15], label: 'M₁ R₁' },
        { k: 3, part: 'c1', kind: 'C', a: [0.5, 0.15], b: [0.5, 0.85], label: 'C₁' },
        { k: 4, part: 'n2', kind: 'LR', a: [0.5, 0.15], b: [0.96, 0.15], label: 'M₂ R₂' },
        { k: 5, part: 'c2', kind: 'C', a: [0.96, 0.15], b: [0.96, 0.85], label: 'C₂' },
      ],
      nodes: [[0.5, 0.15, 3]],
      eq: '回路 1：$p=(j\\omega M_1+R_1)U_1+\\dfrac{U_1-U_2}{j\\omega C_1}$；回路 2：$\\dfrac{U_1-U_2}{j\\omega C_1}=(j\\omega M_2+R_2)U_2+\\dfrac{U_2}{j\\omega C_2}$。',
    },
    open: {
      parts: [
        { id: 'src', type: 'src', u0: 0, u1: 0.12, v0: 0.3, v1: 0.7, label: '声源', col: 'red', ov: 'p' },
        { id: 'cav', type: 'cav', u0: 0.3, u1: 0.6, v0: 0.2, v1: 0.8, label: '腔体', col: 'blue', ov: 'C' },
        { id: 'n1', type: 'tube', u0: 0.12, u1: 0.3, v: 0.5, hw: 9, label: '进口细管', col: 'orange', ov: 'M₁ R₁' },
        { id: 'n2', type: 'tube', u0: 0.6, u1: 0.85, v: 0.5, hw: 9, label: '出口细管', col: 'orange', ov: 'M₂ R₂' },
        { id: 'out', type: 'open', u: 0.85, v: 0.5, label: '管口通大气', col: 'green', ov: '大气 = 地' },
      ],
      flows: [[[0.03, 0.5], [0.45, 0.5]], [[0.45, 0.5], [0.45, 0.77]], [[0.45, 0.5], [0.97, 0.5]]],
      grounds: [{ u: 0.45, v: 0.8, text: '刚性壁' }, { u: 0.97, v: 0.56, text: '大气' }],
      circuit: [
        { k: 1, part: 'src', kind: 'V', a: [0.04, 0.85], b: [0.04, 0.15], label: 'p' },
        { k: 2, part: 'n1', kind: 'LR', a: [0.04, 0.15], b: [0.5, 0.15], label: 'M₁ R₁' },
        { k: 3, part: 'cav', kind: 'C', a: [0.5, 0.15], b: [0.5, 0.85], label: 'C' },
        { k: 4, part: 'n2', kind: 'LR', a: [0.5, 0.15], b: [0.96, 0.15], label: 'M₂ R₂' },
        { k: 5, part: 'out', kind: 'wire', a: [0.96, 0.15], b: [0.96, 0.85], label: '管口接地' },
      ],
      nodes: [[0.5, 0.15, 3]],
      eq: '回路 1：$p=(j\\omega M_1+R_1)U_1+\\dfrac{U_1-U_2}{j\\omega C}$；回路 2：$\\dfrac{U_1-U_2}{j\\omega C}=(j\\omega M_2+R_2)U_2$（管口辐射阻抗忽略，直接接地）。',
    },
    branch: {
      parts: [
        { id: 'src', type: 'src', u0: 0, u1: 0.12, v0: 0.18, v1: 0.52, label: '声源', col: 'red', ov: 'p' },
        { id: 'cav', type: 'cav', u0: 0.36, u1: 0.64, v0: 0.64, v1: 0.94, label: '旁支腔体', col: 'blue', ov: 'Cb' },
        { id: 't1', type: 'tube', u0: 0.12, u1: 0.5, v: 0.35, hw: 12, label: '主管', col: 'purple', ov: 'Mt' },
        { id: 't2', type: 'tube', u0: 0.5, u1: 0.88, v: 0.35, hw: 12, label: '主管', col: 'purple', ov: 'Mt' },
        { id: 'nb', type: 'vtube', u: 0.5, v0: 0.35, v1: 0.64, hw: 8, label: '旁支细管', col: 'orange', ov: 'Mb Rb' },
        { id: 'out', type: 'open', u: 0.88, v: 0.35, label: '开口', col: 'green', ov: 'RL' },
      ],
      flows: [[[0.03, 0.35], [0.5, 0.35]], [[0.5, 0.35], [0.98, 0.35]], [[0.5, 0.35], [0.5, 0.88]]],
      grounds: [{ u: 0.5, v: 0.93, text: '刚性壁' }, { u: 0.98, v: 0.41, text: '大气' }],
      circuit: [
        { k: 1, part: 'src', kind: 'V', a: [0.04, 0.85], b: [0.04, 0.15], label: 'p' },
        { k: 2, part: 't1', kind: 'L', a: [0.04, 0.15], b: [0.5, 0.15], label: 'Mt' },
        { k: 3, part: 'nb', kind: 'L', a: [0.5, 0.15], b: [0.5, 0.38], label: 'Mb' },
        { k: 3, part: 'nb', kind: 'R', a: [0.5, 0.38], b: [0.5, 0.6], label: 'Rb' },
        { k: 4, part: 'cav', kind: 'C', a: [0.5, 0.6], b: [0.5, 0.85], label: 'Cb' },
        { k: 5, part: 't2', kind: 'L', a: [0.5, 0.15], b: [0.96, 0.15], label: 'Mt' },
        { k: 6, part: 'out', kind: 'R', a: [0.96, 0.15], b: [0.96, 0.85], label: 'RL' },
      ],
      nodes: [[0.5, 0.15, 3]],
      eq: '设节点声压 $p_1$：$p=j\\omega M_tU+p_1$，$p_1=\\left(j\\omega M_b+R_b+\\dfrac1{j\\omega C_b}\\right)U_b=(j\\omega M_t+R_L)(U-U_b)$。$f_0=\\frac1{2\\pi\\sqrt{M_bC_b}}$ 时旁支几乎短路，开口没有声音出去。',
    },
  };
  const AC_STEPS = ['认清结构', '画声流线', '找出“地”', '结构换成元件', '按流线连成线路', '检查并列方程'];
  const AC_REV = ['读线路图', '沿电流画声流线', '串臂 → 细管', '对地电容 → 腔体', '接地处 → 刚性壁或开口', '拼成结构并检查'];
  // reverse direction: which kinds of parts exist after each step, and which are being added
  const REV_SHOW = [[], ['src'], ['src', 'tube', 'vtube'], ['src', 'tube', 'vtube', 'cav'], ['src', 'tube', 'vtube', 'cav', 'open'], ['src', 'tube', 'vtube', 'cav', 'open']];
  const REV_NEW = [[], ['src'], ['tube', 'vtube'], ['cav'], ['open'], []];
  const AC_RULES = [
    '认结构：声源、细管、腔体、通大气的开口',
    '声流线：从声源出发，沿体积速度流过各元件',
    '地：声流线终止于刚性壁或大气（只有压强差有意义）',
    '细管 → 声质量 M、声阻 R 串联；腔体 → 声容 C 接地；开口 → 辐射阻抗（常近似为接地）',
    '流线不分支、依次穿过 → 串联；流线分叉 → 并联',
    '每个腔一条对地声容；节点处体积速度之和为零',
  ];
  reg.acdraw = {
    title: '一步一步画声学系统的类比线路图', h: 340,
    params: [
      { k: 'dir', label: '', options: [['fwd', '由结构画线路'], ['rev', '由线路画结构']], v: 'fwd' },
      { k: 'ex', label: '', options: [['two', '两个共鸣器串接（图 3-4-7）'], ['open', '腔体经出口细管通大气'], ['branch', '主管旁接共鸣器']], v: 'two' },
      { k: 'st', stepper: true, min: 1, max: 6, v: 1, fmt: (v, p) => `第 ${v} / 6 步：${(p.dir === 'rev' ? AC_REV : AC_STEPS)[v - 1]}` },
    ],
    setup(p, S) {
      if (S.ex !== p.ex || S.dir !== p.dir) { S.ex = p.ex; S.dir = p.dir; p.st = 1; }
      if (S.st !== p.st) { S.st = p.st; S.t0 = null; }
    },
    draw(g, p, S, t) {
      const { th: c, W, H } = g, ex = AC_EX[p.ex], st = p.st, rev = p.dir === 'rev';
      if (S.t0 == null) S.t0 = t;
      const dt = t - S.t0, col = k => c[k];
      const SB = { x: 14, y: 34, w: W * 0.5 - 28, h: H - 84 }, CB = { x: W * 0.5 + 26, y: 44, w: W * 0.5 - 50, h: H - 104 };
      const U = u => SB.x + u * SB.w, V = v => SB.y + v * SB.h, CX = u => CB.x + u * CB.w, CY = v => CB.y + v * CB.h;
      g.text('声学结构', SB.x + SB.w / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      g.text(st >= 5 || rev ? '类比线路（阻抗型）' : '画图规则', CB.x + CB.w / 2, 14, { color: c.muted, size: 11.5, align: 'center' });
      // which part is highlighted now: step 1 cycles through the parts, step 5 follows the element being drawn
      const nPart = ex.parts.length, maxK = Math.max(...ex.circuit.map(e => e.k));
      const shownK = rev || st >= 6 ? maxK : st === 5 ? Math.min(maxK, Math.floor(dt / 1.1) + 1) : 0;
      const typeOf = id => (ex.parts.find(q => q.id === id) || {}).type;
      // forward: step 1 cycles through the parts, step 5 follows the element being drawn;
      // reverse: step 1 cycles through the circuit elements, steps 2–5 light up the parts being added
      const revK = rev && st === 1 ? Math.floor(dt / 1.2) % maxK + 1 : 0;
      const isHi = id => rev ? (st === 1 ? ex.circuit.some(e => e.k === revK && e.part === id) : REV_NEW[st - 1].includes(typeOf(id)))
        : id === (st === 1 ? ex.parts[Math.floor(dt / 1.2) % nPart].id : st === 5 ? (ex.circuit.find(e => e.k === shownK) || {}).part : null);
      const shown = pt => !rev || REV_SHOW[st - 1].includes(pt.type);
      // ---------- structure ----------
      const drawPart = pt => {
        const hi = isHi(pt.id) || (!rev && st === 4), pc = col(pt.col), w = hi ? 3 : 2, ink = hi ? pc : c.ink;
        if (pt.type === 'src') {
          g.field({ x: U(pt.u0), y: V(pt.v0), w: U(pt.u1) - U(pt.u0), h: V(pt.v1) - V(pt.v0) }, 16, 4, i => 0.45 * Math.cos(TAU * 0.6 * t - (i - 16) * 0.35));
          if (hi) g.rect(U(pt.u0), V(pt.v0), U(pt.u1) - U(pt.u0), V(pt.v1) - V(pt.v0), null, pc, 2.5);
        } else if (pt.type === 'cav') {
          g.rect(U(pt.u0), V(pt.v0), U(pt.u1) - U(pt.u0), V(pt.v1) - V(pt.v0), hi ? pc + '22' : c.bg, ink, w + 0.4);
        } else if (pt.type === 'tube') {
          const y = V(pt.v), x0 = U(pt.u0) - 2, x1 = U(pt.u1) + 2;
          g.rect(x0, y - pt.hw + 1, x1 - x0, 2 * pt.hw - 2, hi || st >= 4 || rev ? pc + '30' : c.bg);
          g.line([[x0, y - pt.hw], [x1, y - pt.hw]], ink, w); g.line([[x0, y + pt.hw], [x1, y + pt.hw]], ink, w);
        } else if (pt.type === 'vtube') {
          const x = U(pt.u), y0 = V(pt.v0) + 12, y1 = V(pt.v1) + 2;
          g.rect(x - pt.hw + 1, y0 - 2, 2 * pt.hw - 2, y1 - y0 + 2, hi || st >= 4 || rev ? pc + '30' : c.bg);
          g.line([[x - pt.hw, y0], [x - pt.hw, y1]], ink, w); g.line([[x + pt.hw, y0], [x + pt.hw, y1]], ink, w);
        } else if (pt.type === 'open') {
          for (let k = 1; k <= 3; k++) {
            const rr = 7 * k + 5 * ((t * 0.6) % 1);
            g.line(Array.from({ length: 11 }, (_, i) => { const a = -0.8 + 1.6 * i / 10; return [U(pt.u) + rr * Math.cos(a), V(pt.v) + rr * Math.sin(a)]; }), hi ? pc : c.green, hi ? 1.8 : 1, [2, 2]);
          }
        }
      };
      // a side tube joins the main tube: cut the main tube's lower wall where they meet
      ex.parts.filter(shown).forEach(drawPart);
      if (rev && st === 1) g.text('先读懂右边的线路，结构在后面几步画出', SB.x + SB.w / 2, SB.y + SB.h / 2, { color: c.muted, size: 12, align: 'center' });
      ex.parts.filter(pt => pt.type === 'vtube' && shown(pt)).forEach(pt => {
        const main = ex.parts.find(q => q.type === 'tube' && Math.abs(q.v - pt.v0) < 1e-6), x = U(pt.u);
        if (main) { g.rect(x - pt.hw + 1.5, V(pt.v0) + main.hw - 2, 2 * pt.hw - 3, 5, isHi(pt.id) || st >= 4 || rev ? col(pt.col) + '30' : c.bg); }
      });
      // labels: step 1 names the parts, step 4 on writes the element symbols
      ex.parts.filter(shown).forEach(pt => {
        const hi = isHi(pt.id), pc = col(pt.col);
        const pos = pt.type === 'cav' ? [U((pt.u0 + pt.u1) / 2), V(pt.v0) - 9] : pt.type === 'tube' ? [U((pt.u0 + pt.u1) / 2), V(pt.v) - pt.hw - 9]
          : pt.type === 'vtube' ? [U(pt.u) + pt.hw + 6, V((pt.v0 + pt.v1) / 2) + 6] : pt.type === 'open' ? [U(pt.u) + 4, V(pt.v) - 30] : [U((pt.u0 + pt.u1) / 2), V(pt.v0) - 9];
        const align = pt.type === 'vtube' ? 'left' : 'center';
        if (!rev && st <= 3) g.text(pt.label, pos[0], pos[1], { color: hi ? pc : c.muted, size: hi ? 12 : 11, bold: hi, align });
        if (rev ? st >= 2 : st >= 4) {
          // in a cavity the flow line runs through the centre and down to the wall: write beside it
          const ovPos = pt.type === 'cav' ? [U((pt.u0 + pt.u1) / 2) + 8, V((pt.v0 + pt.v1) / 2) + 18] : pos;
          g.text(pt.ov, ovPos[0], ovPos[1], { color: pc, size: 12.5, bold: true, align: pt.type === 'cav' ? 'left' : align });
        }
      });
      // flow lines: drawn out in step 2, then volume flow keeps moving along them
      if (st >= 2) {
        const paths = ex.flows.map(f => f.map(([u, v]) => [U(u), V(v)])), lens = paths.map(pp => pp.reduce((s, q, i) => i ? s + Math.hypot(q[0] - pp[i - 1][0], q[1] - pp[i - 1][1]) : 0, 0));
        let budget = st === 2 ? Math.min(1, dt / 3) * lens.reduce((a, b) => a + b, 0) : Infinity;
        paths.forEach((pp, i) => {
          if (budget <= 0) return;
          const L = lens[i], f = Math.min(1, budget / L); budget -= L;
          const end = [pp[0][0] + (pp[1][0] - pp[0][0]) * f, pp[0][1] + (pp[1][1] - pp[0][1]) * f];
          g.line([pp[0], end], c.red, 1.6, [5, 3]);
          if (f >= 1) { g.arrow(pp[0][0] + (pp[1][0] - pp[0][0]) * 0.55, pp[0][1] + (pp[1][1] - pp[0][1]) * 0.55, pp[0][0] + (pp[1][0] - pp[0][0]) * 0.62, pp[0][1] + (pp[1][1] - pp[0][1]) * 0.62, c.red, 1.6); dots(g, pp, dt * 22, c.red + 'aa', 22); }
        });
        if (st === 2) g.text(rev ? '声流线 = 线路中的电流路径：它就是结构的骨架' : '声流线（体积速度 U）', SB.x + SB.w / 2, H - 30, { color: c.red, size: 11, align: 'center' });
      }
      // grounds: where the flow ends
      if (rev ? st >= 5 : st >= 3) ex.grounds.forEach(q => {
        const x = U(q.u), y = V(q.v), pulse = st === (rev ? 5 : 3) ? 0.5 + 0.5 * Math.sin(dt * 5) : 0;
        if (pulse) g.circle(x, y + 6, 12 + 3 * pulse, c.green + '33');
        gnd(g, x, y);
        g.text(q.text, x + 12, y + 8, { color: c.green, size: 10.5 });
      });
      // ---------- right side: the rules, then the circuit ----------
      if (!rev && st <= 4) {
        let y = CB.y + 4;
        AC_RULES.forEach((r, i) => {
          const on = i + 1 === st, done = i + 1 < st;
          const lines = []; let cur = '';
          for (const ch of `${i + 1}. ${r}`) { cur += ch; if (cur.length >= Math.max(10, Math.floor(CB.w / 12.5))) { lines.push(cur); cur = ''; } }
          if (cur) lines.push(cur);
          if (on) g.rect(CB.x - 6, y - 9, CB.w + 12, lines.length * 17 + 4, c.accent + '1c');
          lines.forEach((ln, j) => g.text(ln, CB.x, y + j * 17, { color: on ? c.ink : done ? c.muted : c.muted + 'aa', size: 12, bold: on }));
          y += lines.length * 17 + 8;
        });
        return;
      }
      const vis = ex.circuit.filter(e => e.k <= shownK);
      // ground rail under every element that reaches it, the source included
      const low = vis.filter(e => e.a[1] > 0.8 || e.b[1] > 0.8).map(e => CX(e.a[0]));
      if (low.length > 1) { const x0 = Math.min(...low), x1 = Math.max(...low); g.line([[x0, CY(0.85)], [x1, CY(0.85)]], c.ink, 1.4); gnd(g, (x0 + x1) / 2, CY(0.85)); }
      vis.forEach(e => {
        const pt = ex.parts.find(q => q.id === e.part), pc = pt ? col(pt.col) : c.ink, [x0, y0, x1, y1] = [CX(e.a[0]), CY(e.a[1]), CX(e.b[0]), CY(e.b[1])];
        const vertical = Math.abs(x1 - x0) < 1, side = vertical ? (e.kind === 'V' ? 1 : 1) : -1;
        if (rev ? isHi(e.part) && st < 6 : e.k === shownK && st === 5) g.circle((x0 + x1) / 2, (y0 + y1) / 2, 22 + 3 * Math.sin(dt * 6), pc + '22');
        if (e.kind === 'LR') { const xm = (x0 + x1) / 2; el(g, 'L', x0, y0, xm, y0, pc, e.label, -1); el(g, 'R', xm, y0, x1, y1, pc, '', -1); }
        else if (e.kind === 'wire') { g.line([[x0, y0], [x1, y1]], c.ink, 1.4); g.text(e.label, x0 - 6, (y0 + y1) / 2, { color: pc, size: 11, align: 'right' }); }
        else el(g, e.kind, x0, y0, x1, y1, pc, e.label, side);
      });
      ex.nodes.filter(n => n[2] <= shownK).forEach(([u, v]) => g.circle(CX(u), CY(v), 3.5, c.ink));
      // volume flow in the finished circuit
      if (st === 6 || rev && st === 2) {
        const loop = ex.circuit.filter(e => e.kind !== 'wire').map(e => [[CX(e.a[0]), CY(e.a[1])], [CX(e.b[0]), CY(e.b[1])]]);
        loop.forEach(seg => dots(g, seg, dt * 18, c.red + '99', 18));
      }
    },
    note(p) {
      const ex = p.ex, st = p.st;
      if (p.dir === 'rev') return {
        1: '先读懂线路：哪些是串在支路上的电感、电阻（串臂），哪些是从节点接到地的电容（对地支路），哪里直接接地，节点在哪里。高亮的元件依次扫过。',
        2: '线路中的电流就是体积速度：从声源出发沿电流路径画出声流线，它决定了结构的骨架——流线经过的地方就是空气流动的通道，分叉处就是结构上的连接处。',
        3: '串臂上的声质量与声阻（$M$、$R$）→ 一段细管：空气在其中整体运动。$M_a=\\rho_0l/S$：声质量越大，管越细越长。',
        4: '从节点接到地的声容 $C$ → 一个腔体：空气在其中被压缩，流线终止于腔壁（刚性壁就是“地”）。$C_a=V/(\\rho_0c_0^2)$：声容越大，腔越大。',
        5: '直接接地的导线或辐射阻 → 通大气的开口；电容接地 → 腔体的刚性壁。没有对地电容的节点 → 体积可以忽略的连接处（例如三通）。',
        6: `检查：线路中的每个元件都有对应的结构，每个腔体都通过声容接地，每个开口都接地。这正是例 5（由线路画结构）的做法。对应的方程：${AC_EX[ex].eq}`,
      }[st];
      const T = {
        1: { two: '外部声源推动空气进入第一根细管，经腔体 1、细管 2 到达封闭的腔体 2。先分清每一部分是“细管”（空气整体运动，有质量）还是“腔体”（空气被压缩，像弹簧）。', open: '声源推动空气经进口细管进入腔体，腔体另有一根出口细管通向大气。', branch: '主管从声源通到开口；主管中部向下接出一根细管和一个腔体，构成旁支共鸣器。' }[ex],
        2: '从声源出发，沿体积速度流过的路径画线。到腔体时流线分成两路：一路“压进”腔体（终止于刚性壁，体现腔内空气被压缩），一路继续流向下一个元件。',
        3: '声学系统中只有压强差有意义，所以把<b>刚性壁</b>（流线终止、腔体被压缩的地方）和<b>大气</b>（开口外的静压）都当作“地”。每条流线都必须终止于某个地。',
        4: '细管：空气柱整体运动 → 声质量 $M_a=\\rho_0l/S$ 与声阻 $R_a$ 串联；腔体：空气被压缩 → 声容 $C_a=V/(\\rho_0c_0^2)$，一端必定接地；开口：辐射阻抗，常近似为直接接地。',
        5: '按流线依次放元件：不分支地依次穿过的元件串在同一支路上；流线分叉处成为节点，各分路并联。腔体的声容总是从节点接到地。',
        6: `${{ two: '两节梯形网络（低通滤波器的雏形）。', open: '腔体声容与出口细管并联在同一节点上。', branch: '主管上的节点接出一条串联谐振支路。' }[ex]}检查：每个腔都有一条对地声容；每个通大气的开口都接地；节点处流入流出的体积速度相等。列回路方程：${AC_EX[ex].eq}`,
      };
      return T[st];
    },
  };

  Object.assign(Demo.DEMO_FOR, {
    'd-mech-analog': ['analog:imp', 'osc:forced'], 'd-acoustic-analog': ['acdraw:two', 'acnet:two'], 'd-transformer': 'xformer:xf',
    'd-filter': ['filter:low', 'acnet:branch'], 'd-helmholtz': ['helmholtz', 'acnet:single'],
  });
  Demo.DEMO_MODEL.lumped = ['helmholtz', 'analog:imp', 'acnet:two'];
})();
