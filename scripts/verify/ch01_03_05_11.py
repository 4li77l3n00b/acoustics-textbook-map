"""Numbers and analytic checks used in the chapter 1, 3, 5 and 11 solutions and the non-textbook questions
(output/solutions/src/ch01.md, ch03.md, ch05.md, ch11.md, misc.md).
Air 20 °C: rho0=1.21, c0=343 (book §4.5.3); water c=1480; soft tissue c≈1540.
Run: python3 scripts/verify/ch01_03_05_11.py
"""
from math import pi, sqrt, cos, sin, atan2, log10
import cmath
import numpy as np
rho0, c0 = 1.21, 343.0
def show(k, v): print(f'{k:34s} {v:.5g}')
def check(name, ok):
    print(f'{name:34s} {"ok" if ok else "FAIL"}')
    assert ok, name

# ---- chapter 1 ----
# 1-3 string with a mass: K = T l / (x0 (l - x0)), lowest at the middle
T, l, M = 10.0, 1.0, 0.1
fx = lambda x0: sqrt(T * l / (M * x0 * (l - x0))) / (2 * pi)
xs = np.linspace(0.01, 0.99, 9801)
check('1-3 min at l/2', abs(xs[np.argmin([fx(x) for x in xs])] - l / 2) < 1e-3)
check('1-3 f(l/2)=sqrt(T/(Ml))/pi', abs(fx(l / 2) - sqrt(T / (M * l)) / pi) < 1e-12)
# 1-10 / 1-11 added mass
Mm, Km, m = 0.3, 500.0, 0.1
f0 = sqrt(Km / Mm) / (2 * pi); f0p = sqrt(Km / (Mm + m)) / (2 * pi)
check('1-11 M from f0,f0\'', abs(m * f0p**2 / (f0**2 - f0p**2) - Mm) < 1e-9)
check('1-11 K from f0,f0\'', abs(4 * pi**2 * m * f0**2 * f0p**2 / (f0**2 - f0p**2) - Km) < 1e-6)
g = 9.8; xi1 = m * g / Km
check('1-10 K=mg/xi1, M=K/(2pi f0)^2', abs(m * g / xi1 / (2 * pi * f0)**2 - Mm) < 1e-9)
# 1-12 / 2003-一 series springs
K1, K2, K3 = 100.0, 200.0, 300.0
Ks = 1 / (1 / K1 + 1 / K2 + 1 / K3)
F = 7.0; check('2003-一 series ext adds', abs(F / K1 + F / K2 + F / K3 - F / Ks) < 1e-12)
show('2003-一 example K', Ks)
# 1-13 / 2012-2 moon
K = 1 * 9.8 / 0.1; mrock = K * 1.0**2 / (4 * pi**2); gm = K * 0.04 / mrock
show('1-13 K', K); show('1-13 rock mass', mrock); show('1-13 g_moon', gm)
# 1-20
M, Ms, K, R = 0.4, 0.3, 150.0, 5.0
Me = M + Ms / 3; w0 = sqrt(K / Me); Q = w0 * Me / R
show('1-20 Me', Me); show('1-20 f0', w0 / (2 * pi)); show('1-20 Q', Q)
show('1-20 f damped', w0 / (2 * pi) * sqrt(1 - 1 / (4 * Q**2)))
fd = w0 / (2 * pi) * sqrt(1 - 1 / (2 * Q**2)); fa = w0 / (2 * pi) * Q * sqrt(2 / (2 * Q**2 - 1))
show('1-20 displacement resonance', fd); show('1-20 acceleration resonance', fa)
ws = np.linspace(0.5, 40, 400001)
Z = np.abs(R + 1j * (ws * Me - K / ws))
check('1-20 disp peak numeric', abs(ws[np.argmax(1 / (ws * Z))] / (2 * pi) - fd) < 1e-3)
check('1-20 acc peak numeric', abs(ws[np.argmax(ws / Z)] / (2 * pi) - fa) < 1e-3)
# 1-21 energy ratio at velocity resonance
M, K, R = 0.4, 160.0, 2.0; w0 = sqrt(K / M); va = 1.0
loss = 0.5 * R * va**2 * 2 * pi / w0; E = 0.5 * M * va**2
check('1-21 loss/E = 2pi/Q', abs(loss / E - 2 * pi / (w0 * M / R)) < 1e-12)
# 1-22 half power bandwidth
w1 = (-R + sqrt(R**2 + 4 * M * K)) / (2 * M); w2 = (R + sqrt(R**2 + 4 * M * K)) / (2 * M)
check('1-22 w2-w1 = R/M', abs(w2 - w1 - R / M) < 1e-12)
check('1-22 w1 w2 = w0^2', abs(w1 * w2 - w0**2) < 1e-9)
P = lambda w: 0.5 * R / (R**2 + (w * M - K / w)**2)
check('1-22 half power at w1,w2', abs(P(w1) / P(w0) - 0.5) < 1e-12 and abs(P(w2) / P(w0) - 0.5) < 1e-12)
# 1-23
Fa = 5.0
for w in (8.0, w0):
    Zm = R + 1j * (w * M - K / w); v = Fa / abs(Zm)
    show(f'1-23 w={w:g} |Z|', abs(Zm)); show(f'1-23 w={w:g} va', v); show(f'1-23 w={w:g} xi', v / w)
    show(f'1-23 w={w:g} a', v * w); show(f'1-23 w={w:g} P', 0.5 * R * v**2)
show('1-23 f0', w0 / (2 * pi))
# 2006-三 two degrees of freedom: wall-k1-M1-k2-M2
def modes(M1, M2, k1, k2):
    Mm = np.diag([M1, M2]); Kk = np.array([[k1 + k2, -k2], [-k2, k2]])
    ev, V = np.linalg.eig(np.linalg.solve(Mm, Kk))
    o = np.argsort(ev); return ev[o], V[:, o]
M1, M2, k1, k2 = 1.0, 2.0, 300.0, 500.0
ev, V = modes(M1, M2, k1, k2)
a, b, c = M1 * M2, -(M1 * k2 + M2 * (k1 + k2)), k1 * k2
roots = sorted(np.roots([a, b, c]).real)
check('2006-三 frequency equation', np.allclose(roots, ev))
for i in range(2):
    check(f'2006-三 mode {i} ratio', abs(V[1, i] / V[0, i] - k2 / (k2 - ev[i] * M2)) < 1e-9)
check('2006-三 k2/M2 between roots', ev[0] < k2 / M2 < ev[1])
ev, V = modes(1, 1, 1, 1)
show('2006-三 equal: w1^2', ev[0]); show('2006-三 equal: w2^2', ev[1])
show('2006-三 equal ratio 1', V[1, 0] / V[0, 0]); show('2006-三 equal ratio 2', V[1, 1] / V[0, 1])
# 2006-五: the impedance circuit gives the same response as the equations of motion
w = 13.0; F = 1.0
ZM2, ZM1 = 1j * w * M2, 1j * w * M1; Zk1, Zk2 = k1 / (1j * w), k2 / (1j * w)
par = 1 / (1 / Zk2 + 1 / (ZM1 + Zk1)); v2 = F / (ZM2 + par); v1 = v2 * Zk2 / (Zk2 + ZM1 + Zk1)
A = np.array([[k1 + k2 - w**2 * M1, -k2], [-k2, k2 - w**2 * M2]]); x = np.linalg.solve(A, [0, F])
check('2006-五 circuit = equations', np.allclose([v1, v2], 1j * w * x))
# 2010-三 rod on two springs, force at one end
m, l, k, F0, w = 2.0, 1.0, 400.0, 1.0, 9.0
Mx = np.diag([m, m * l**2 / 12]); Kx = np.array([[2 * k, 0], [0, k * l**2 / 2]])
y, th = np.linalg.solve(Kx - w**2 * Mx, [F0, F0 * l / 2])
check('2010-三 y', abs(y - F0 / (2 * k - m * w**2)) < 1e-12)
check('2010-三 theta', abs(th - 6 * F0 / (l * (6 * k - m * w**2))) < 1e-12)
# same answer from the end coordinates yA, yB (springs at the ends)
Mend = m / 6 * np.array([[2, 1], [1, 2]])          # kinetic energy of a uniform rod in end displacements
yA, yB = np.linalg.solve(np.diag([k, k]) - w**2 * Mend, [F0, 0])
check('2010-三 ends = y ± l th/2', abs(yA - (y + l * th / 2)) < 1e-12 and abs(yB - (y - l * th / 2)) < 1e-12)
check('2010-三 static: yA=F0/k, yB=0', abs(F0 / (2 * k) + 3 * F0 / (6 * k) - F0 / k) < 1e-15 and abs(F0 / (2 * k) - 3 * F0 / (6 * k)) < 1e-15)
# 2011-1 frame M, spring k, mass m inside, released from rest; integrate numerically
M, m, k, g = 1.5, 0.5, 200.0, 9.8
L0 = 0.1; X0 = 0.0; x0 = X0 + L0 + m * g / k
def rhs(s):
    X, Xd, x, xd = s; e = x - X - L0
    return np.array([Xd, g + k * e / M, xd, g - k * e / m])
s = np.array([X0, 0, x0, 0]); dt = 1e-5; t = 0.0
for _ in range(50000):
    k1_ = rhs(s); k2_ = rhs(s + dt / 2 * k1_); k3_ = rhs(s + dt / 2 * k2_); k4_ = rhs(s + dt * k3_)
    s = s + dt / 6 * (k1_ + 2 * k2_ + 2 * k3_ + k4_); t += dt
om = sqrt(k * (M + m) / (M * m))
Xa = X0 + g * t**2 / 2 + m / (M + m) * m * g / k * (1 - cos(om * t))
xa = x0 + g * t**2 / 2 - M / (M + m) * m * g / k * (1 - cos(om * t))
check('2011-1 frame X(t)', abs(s[0] - Xa) < 1e-8); check('2011-1 mass x(t)', abs(s[2] - xa) < 1e-8)
# 2007-二 along the springs; transverse with tension would be T(1/l1+1/l2)
# 2007-三 end impedance (1+2i) rho0 c0, wave exp(i(kx-wt)) incident on x=0 from x<0
zn = 1 + 2j; r = (zn - 1) / (zn + 1)
show('2007-三 |r|', abs(r)); show('2007-三 phase/pi', cmath.phase(r) / pi)
lam = 1.0; kk = 2 * pi / lam; xg = np.linspace(-lam, 0, 200001)
pp = np.abs(np.exp(1j * kk * xg) + r * np.exp(-1j * kk * xg))
xmax = -xg[np.argmax(np.where(xg > -0.5 * lam - 1e-9, pp, 0))]
xmin = -xg[np.argmin(np.where(xg > -0.5 * lam - 1e-9, pp, 9))]
show('2007-三 first max /lambda', xmax); show('2007-三 first min /lambda', xmin)
check('2007-三 max at 7/16', abs(xmax - 7 / 16) < 1e-4); check('2007-三 min at 3/16', abs(xmin - 3 / 16) < 1e-4)
show('2007-三 pmax', 1 + abs(r)); show('2007-三 pmin', 1 - abs(r)); show('2007-三 G', (1 + abs(r)) / (1 - abs(r)))

# ---- chapter 3 ----
# 3-1 isolation: |v/v1| = 1/sqrt((1-z^2)^2+(z/Q)^2) < 1  <=>  z > sqrt(2 - 1/Q^2)
for Q in (0.8, 2.0, 10.0):
    zz = np.linspace(0.01, 5, 500001); Tr = 1 / np.sqrt((1 - zz**2)**2 + (zz / Q)**2)
    check(f'3-1 Q={Q} isolation edge', abs(zz[np.argmax(Tr < 1)] - sqrt(2 - 1 / Q**2)) < 1e-4)
# 3-1 impedance circuit: current source v1 into C_m || (M_m + R_m)
Mm, Rm, Km, w = 0.2, 3.0, 2e4, 500.0
v_circ = (Km / (1j * w)) / (Km / (1j * w) + 1j * w * Mm + Rm)
check('3-1 circuit = Kxi1/(K-w^2M+jwR)', abs(v_circ - Km / (Km - w**2 * Mm + 1j * w * Rm)) < 1e-12)
# 3-4 two masses with friction, F on Mm1
Mm1, Mm2, Rm1, Rm2, Cm, w = 0.1, 0.3, 2.0, 5.0, 1e-4, 200.0
Z1 = 1j * w * Mm1 + Rm1; Z2 = 1j * w * Mm2 + Rm2; Zc = 1 / (1j * w * Cm)
v1 = 1 / (Z1 + Zc * Z2 / (Zc + Z2)); v2 = v1 * Zc / (Zc + Z2)
A = np.array([[Z1 + Zc, -Zc], [-Zc, Z2 + Zc]]); vv = np.linalg.solve(A, [1, 0])
check('3-4 circuit = equations', np.allclose([v1, v2], vv))
# 3-11 earphone on a 6 cm^3 coupler
Md, Sd, V = 4e-4, 1.2e-3, 6e-6
Kd = (2 * pi * 1200)**2 * Md; Kc = rho0 * c0**2 * Sd**2 / V
show('3-11 K diaphragm', Kd); show('3-11 K cavity', Kc); show('3-11 f', sqrt((Kd + Kc) / Md) / (2 * pi))
# 3-12 Helmholtz at resonance: |p_cavity/p| = Q_a
Ma, Ca, Ra = 500.0, 1e-8, 2e4; w0 = 1 / sqrt(Ma * Ca)
U = 1 / (Ra + 1j * (w0 * Ma - 1 / (w0 * Ca))); pc = U / (1j * w0 * Ca)
check('3-12 pc/p = Qa', abs(abs(pc) - w0 * Ma / Ra) < 1e-9)
show('2006-九 f0 example', c0 / (2 * pi) * sqrt(pi * 0.01**2 / ((0.02 + 1.7 * 0.01) * 1e-3)))
# 3-14 band-pass: Z1 = jwM1, Z2 = jwM2 || 1/(jwC2); pass band -4 <= Z1/Z2 <= 0
M1, M2, C2 = 300.0, 800.0, 2e-8
fL = 1 / (2 * pi * sqrt(M2 * C2)); fH = fL * sqrt(1 + 4 * M2 / M1)
f = np.linspace(10, 5000, 499001); w = 2 * pi * f
ratio = (1j * w * M1) / (1j * w * M2 / (1 - w**2 * M2 * C2))
passb = f[(ratio.real >= -4) & (ratio.real <= 0)]
check('3-14 band edges', abs(passb[0] - fL) < 0.02 and abs(passb[-1] - fH) < 0.02)
show('3-14 example fL', fL); show('3-14 example fH', fH)
# 3-5-15 low-pass ladder cutoff 1/(pi sqrt(MC))
Ma, Ca = 300.0, 2e-8
r = (1j * w * Ma) * (1j * w * Ca)
lp = f[(r.real >= -4) & (r.real <= 0)]
check('2000-四 low-pass cutoff', abs(lp[-1] - 1 / (pi * sqrt(Ma * Ca))) < 0.02)
# 3-17 compound microphone: U ∝ jwC p1 + (p1-p2)/R; with p2 = p1 e^{-jkd cos}, small kd → directivity 1+B cos
Zm_S2, Ca, Ra = 1e7 + 3e6j, 2e-10, 2e7
d = 0.01
for th in (0.0, pi / 2, pi):
    for f_ in (200.0, 800.0):
        w = 2 * pi * f_; p1 = 1.0; p2 = p1 * cmath.exp(-1j * w / c0 * d * cos(th))
        Y = 1 / Zm_S2
        pA = (Y * p1 + p2 / Ra) / (Y + 1 / Ra + 1j * w * Ca)
        U = Y * (p1 - pA)
        U2 = Y * (1j * w * Ca * p1 + (p1 - p2) / Ra) / (Y + 1 / Ra + 1j * w * Ca)
        assert abs(U - U2) < 1e-15 * max(1, abs(U))
check('3-17 node solution', True)
B = d / (c0 * Ra * Ca); show('3-17 example B', B)

# ---- chapter 5 ----
# 5-2-6..9 abrupt section
for S1, S2 in ((1.0, 3.0), (2.0, 0.5)):
    S21 = S1 / S2; S12 = S2 / S1
    rp = (S21 - 1) / (S21 + 1); tp = 1 + rp
    check(f'2002-三 S1={S1},S2={S2} volume velocity', abs(S1 * (1 - rp) - S2 * tp) < 1e-12)
    check(f'2002-三 S1={S1},S2={S2} energy', abs(rp**2 + tp**2 * S12 - 1) < 1e-12)
    check(f'2002-三 tI formula', abs(tp**2 - 4 / (S12 + 1)**2) < 1e-12)
# 5-24, 5-25, 5-28
show('5-24 f10', c0 / (2 * 0.4))
lx, ly = 0.1, 0.08
fm = sorted((c0 / 2 * sqrt((i / lx)**2 + (j / ly)**2), i, j) for i in range(4) for j in range(4) if i or j)
for fc, i, j in fm[:4]: show(f'5-25 f{i}{j}', fc)
a = 0.05
show('5-28 f(1,0) 1.841', 1.8412 * c0 / (2 * pi * a)); show('5-28 f(2,0) 3.054', 3.0542 * c0 / (2 * pi * a))
show('5-28 f(0,1) 3.832', 3.8317 * c0 / (2 * pi * a))
# 5-26, 5-27 Fourier coefficients B_n0 (u independent of y)
x = np.linspace(0, 1, 200001); dx = x[1] - x[0]
def Bn(u, n):
    integ = u * np.cos(n * pi * x); s_ = (integ.sum() - (integ[0] + integ[-1]) / 2) * dx
    return s_ if n == 0 else 2 * s_
u26 = np.where(x <= 0.5, 1.0, 0.0); u27 = np.sin(pi * x)
exp26 = [1 / 2, 2 / pi, 0, -2 / (3 * pi)]; exp27 = [2 / pi, 0, -4 / (3 * pi), 0, -4 / (15 * pi)]
check('5-26 B00,B10,B20,B30', all(abs(Bn(u26, n) - e) < 1e-4 for n, e in enumerate(exp26)))
check('5-27 B00..B40', all(abs(Bn(u27, n) - e) < 1e-6 for n, e in enumerate(exp27)))
# 2024-三 water trough: rigid bottom & sides, free surface; cutoff c/2 sqrt((ny/a)^2+((2nx+1)/(2h))^2)
cw, aw, hw = 1480.0, 2.0, 1.0
show('2024-三 example lowest c/(4h)', cw / (4 * hw))
xs_ = np.linspace(0, hw, 1001); kx = pi / (2 * hw)
check('2024-三 cos(kx x): dp/dx=0 at 0, p=0 at h', abs(cos(kx * hw)) < 1e-12 and abs(sin(kx * 0)) < 1e-12)

# ---- chapter 11 ----
for E, s in ((7e10, 0.33), (2e11, 0.29), (1e9, 0.45)):
    lam = E * s / ((1 + s) * (1 - 2 * s)); mu = E / (2 * (1 + s))
    check(f'11-1 E from lambda,mu (s={s})', abs((3 * lam + 2 * mu) * mu / (lam + mu) - E) < 1e-6 * E)
    check(f'11-1 sigma (s={s})', abs(lam / (2 * (lam + mu)) - s) < 1e-12)
    r2 = (lam + 2 * mu) / mu
    check(f'11-2 sigma from cL/cT (s={s})', abs((2 - r2) / (2 * (1 - r2)) - s) < 1e-12)
show('11 cL/cT at sigma=0.25', sqrt(2 * (1 - 0.25) / (1 - 2 * 0.25)))
# Rayleigh speed from the book's cubic g^3 - 8g^2 + (24 - 16q)g - 16(1-q) = 0, q = (cT/cL)^2
for s in (0.0, 0.25, 0.29, 0.5):
    q = (1 - 2 * s) / (2 * (1 - s))
    rts = [z.real for z in np.roots([1, -8, 24 - 16 * q, -16 * (1 - q)]) if abs(z.imag) < 1e-9 and 0 < z.real < 1]
    show(f'11 cR/cT sigma={s}', sqrt(rts[0]))

# ---- non-textbook ----
# 2006-八 Doppler from a moving reflector, theta = 60°
for f_, B_ in ((5e3, 2e3), (5e6, 2e6)):
    c, v, th = 1540.0, 1.0, pi / 3
    fac = (c + v * cos(th)) / (c - v * cos(th))
    show(f'2006-八 f={f_:g} shift', f_ * (fac - 1)); show(f'2006-八 f={f_:g} new band', B_ * fac)
show('2006-八 wavelength 5 kHz', 1540 / 5e3); show('2006-八 wavelength 5 MHz mm', 1540 / 5e6 * 1e3)
print('all checks passed')
