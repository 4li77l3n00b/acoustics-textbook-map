"""Numbers used in the chapter 2, 7 and 8 solutions (output/solutions/src/ch02.md, ch07.md, ch08.md).
Air 20 °C: rho0=1.21, c0=343, rho0*c0=415 (book §4.5.3).  Aluminium from appendix A: rho=2700, E=6.85e10.
Run: python3 scripts/verify/ch02_07_08.py
"""
from math import pi, sqrt, sin, cos, tan, log, log10, factorial, atan
import itertools
rho0, c0, Z0 = 1.21, 343.0, 415.0
def show(k, v): print(f'{k:34s} {v:.5g}')
def J(n, x, terms=40):   # Bessel function of the first kind, series
    return sum((-1)**m / (factorial(m) * factorial(m + n)) * (x / 2)**(2 * m + n) for m in range(terms))
def root(f, a, b, it=200):
    fa = f(a)
    for _ in range(it):
        m = (a + b) / 2; fm = f(m)
        if (fa < 0) == (fm < 0): a, fa = m, fm
        else: b = m
    return (a + b) / 2

# ---- chapter 2 ----
# 2-1
m, l, T = 0.001, 1.0, 1.0
d = m / l; c = sqrt(T / d); f1 = c / (2 * l)
show('2-1 c', c); show('2-1 f1', f1)
B = 0.01; show('2-1 E1', T * pi**2 * B**2 / (4 * l))
show('2-1 v(0.25)', 2 * pi * f1 * B * sin(pi * 0.25 / l))
# 2-2 plucked at l/3: mode energies in units of T*eta0^2/l
E = [81 * sin(n * pi / 3)**2 / (4 * pi**2 * n**2) for n in (1, 2, 3)]
show('2-2 E1/(T eta0^2/l)', E[0]); show('2-2 E2', E[1]); show('2-2 E3', E[2])
show('2-2 total initial', 9 / 4); show('2-2 sum all modes', sum(81 * sin(n * pi / 3)**2 / (4 * pi**2 * n**2) for n in range(1, 20000)))
# 2-8 aluminium rod, free-free
rho, E_al, S, l = 2700.0, 6.85e10, 1e-4, 1.0
c_al = sqrt(E_al / rho); m_rod = rho * S * l
show('2-8 c', c_al); show('2-8 f1 free-free', c_al / (2 * l)); show('2-8 rod mass', m_rod)
M = 0.054; ratio = M / m_rod
g = root(lambda x: tan(x) / x + ratio, pi / 2 + 1e-9, pi - 1e-9)      # tan(kl)/(kl) = -M/m
show('2-8 M/m', ratio); show('2-8 kl loaded', g); show('2-8 f1 loaded', g * c_al / (2 * pi * l)); show('2-8 node x/l', (pi / 2) / g)
# 2-9 fixed + mass: gamma tan gamma = m/M
beta = m_rod / M
g9 = root(lambda x: x * tan(x) - beta, 1e-9, pi / 2 - 1e-9)
show('2-9 beta', beta); show('2-9 gamma', g9); show('2-9 f1', g9 * c_al / (2 * pi * l))
show('2-9 lumped f0', sqrt((E_al * S / l) / (M + m_rod / 3)) / (2 * pi))
# 2-18
a, sig = 0.015, 2.0
show('2-18 Tmax', sig * (2 * pi * a * 5000 / 2.405)**2)
# 2-19
P, h = 2.4e8, 5e-5; Tm = P * h; sg = 2700 * h; a = 0.02
show('2-19 Tmax', Tm); show('2-19 sigma', sg); show('2-19 f1max', 2.405 / (2 * pi * a) * sqrt(Tm / sg))
# 2-20
mu1 = root(lambda x: J(0, x), 2, 3); show('mu1', mu1); show('J1(mu1)', J(1, mu1)); show('2-20 coeff J1^2/2', J(1, mu1)**2 / 2)
mu2 = root(lambda x: J(0, x), 5, 6); mu3 = root(lambda x: J(0, x), 8, 9); show('mu2', mu2); show('mu3', mu3)
show('2021-2 nodal r/a n=2', mu1 / mu2); show('n=3 r1/a', mu1 / mu3); show('n=3 r2/a', mu2 / mu3)
# 2025-二 = book nickel membrane example
Tn = 4e8 * 1e-5; sn = 8800 * 1e-5; a = 1e-2
show('2025-二 T', Tn); show('2025-二 f1', 2.405 / (2 * pi * a) * sqrt(Tn / sn)); show('2025-二 c', sqrt(Tn / sn))
# 2009-四 example numbers not given; check low-frequency limit of cot(kl0)+cot(k(L-l0)) = (m/delta) k
L_, l0, mm, dd, TT = 1.0, 0.3, 0.05, 0.01, 10.0
kk = root(lambda k: 1 / tan(k * l0) + 1 / tan(k * (L_ - l0)) - mm / dd * k, 1e-6, pi / (L_ - l0) * 0.999)
show('2009-四 example omega exact', kk * sqrt(TT / dd)); show('2009-四 lumped omega', sqrt(TT * L_ / (mm * l0 * (L_ - l0))))

# ---- chapter 7 ----
a, M_, f0, Q, Bl = 1e-2, 2e-4, 300.0, 2.0, 1.0 * 3.0
w0 = 2 * pi * f0; Rm = w0 * M_ / Q; Km = w0**2 * M_; S_ = pi * a**2
show('7-1 Rm', Rm); show('7-1 Km', Km); show('7-1 S', S_)
for f in (100, 300, 1000):
    w = 2 * pi * f; Z = abs(complex(Rm, w * M_ - Km / w)); F = 1.0 * S_
    show(f'7-1 E_e mV @{f}', Bl * F / Z * 1e3)
    F4 = 1.0 * (w / c0) * S_ * 0.04                   # 7-4 pressure-gradient, far field, theta = 0
    show(f'7-4 E_e mV @{f}', Bl * F4 / Z * 1e3)
for x, name in ((2 * pi * 4000 / c0 * 0.02, '7-3'), (2.0, '2024-六')):
    D = 2 * J(1, x) / x; show(f'{name} ka', x); show(f'{name} D', D); show(f'{name} dB', 20 * log10(D))
k = 2 * pi * 200 / c0
Fr = lambda r: sqrt(1 + (k * r)**2) / r**2
show('7-5 dB', 20 * log10(Fr(0.01) / Fr(1.0)))
# 2015-六: raindrop
r0 = 1e-3
for f in (100, 1000, 10000):
    kr = 2 * pi * f / c0 * r0; show(f'2015-六 kr0 @{f}', kr); show(f'2015-六 Ws/(pi r0^2 I) @{f}', 7 / 9 * kr**4)

# ---- chapter 8 ----
def room(lx, ly, lz, a):
    V = lx * ly * lz; S = 2 * (lx * ly + ly * lz + lz * lx)
    return V, S, 4 * V / S, S * a / (1 - a), 0.161 * V / (S * a), 0.161 * V / (-S * log(1 - a))
for name, dims in (('8-1', (10, 7, 4)), ('2021-6', (10, 8, 4))):
    V, S, mfp, R, Ts, Te = room(*dims, 0.2)
    show(f'{name} V', V); show(f'{name} S', S); show(f'{name} mfp', mfp); show(f'{name} R', R); show(f'{name} T Sabine', Ts); show(f'{name} T Eyring', Te)
# 8-6
V, S = 30 * 15 * 7, 2 * (30 * 15 + 15 * 7 + 7 * 30)
a = 0.161 * V / (S * 2.0); show('8-6 V', V); show('8-6 S', S); show('8-6 alpha Sabine', a)
show('8-6 alpha Eyring', 1 - 2.718281828**(-0.161 * V / (S * 2.0)))
R = S * a / (1 - a); pe2 = (2e-5 * 10**4)**2; W = pe2 * R / (4 * Z0)
show('8-6 R', R); show('8-6 W', W)
A2 = S * a + 400 * 0.5; T2 = 0.161 * V / A2; a2 = A2 / S; R2 = A2 / (1 - a2)
show('8-6 A2', A2); show('8-6 T2', T2); show('8-6 R2', R2); show('8-6 LR2', 80 + 10 * log10(R / R2))
for r in (3, 10):
    show(f'8-6 SPL r={r}', 10 * log10(W * Z0 * (1 / (4 * pi * r**2) + 4 / R2) / (2e-5)**2))
show('8-6 rc', 0.25 * sqrt(R2 / pi))
# 8-12 / 8-13: exact mode counts in a 6x5x4 rigid room
lx, ly, lz = 6, 5, 4
def modes(fmin, fmax):
    out = []
    nmax = [int(2 * fmax * L / c0) + 1 for L in (lx, ly, lz)]
    for nx in range(nmax[0] + 1):
        for ny in range(nmax[1] + 1):
            for nz in range(nmax[2] + 1):
                if nx == ny == nz == 0: continue
                f = c0 / 2 * sqrt((nx / lx)**2 + (ny / ly)**2 + (nz / lz)**2)
                if fmin <= f <= fmax: out.append((f, nx, ny, nz))
    return sorted(out)
V, S, L = lx * ly * lz, 2 * (lx * ly + ly * lz + lz * lx), 4 * (lx + ly + lz)
dN = lambda f: (4 * pi * f**2 * V / c0**3 + pi * f * S / (2 * c0**2) + L / (8 * c0)) * 10
for f in (50, 100, 1000, 4000):
    show(f'8-12 exact count {f}±5', len(modes(f - 5, f + 5))); show(f'8-12 formula {f}', dN(f))
print('8-13 modes 95-105 Hz:', [(round(f, 1), n) for f, *n in [(f, (a, b, c)) for f, a, b, c in modes(95, 105)]])
# 2025-六 cube: distinct n^2 sums and multiplicities
cnt = {}
for n in itertools.product(range(5), repeat=3):
    s = sum(i * i for i in n)
    if s: cnt[s] = cnt.get(s, 0) + 1
print('2025-六 first 12 n^2 values (multiplicity):', sorted(cnt.items())[:12])

# 例7 / 2017-二（2）: composite rod, same material, lengths l each, cross-sections S1, S2; force at x=-l, free at x=+l.
import numpy as np
E_, rho_, l = 1.0, 1.0, 1.0
S1, S2 = 4.0, 1.0
for kl in (np.pi / 2 * 0.999, 3 * np.pi / 2 * 0.999):
    k = kl / l
    # xi1 = A sin kx + B cos kx (x<0), xi2 = C sin kx + D cos kx (x>0)
    M = np.array([[E_ * S1 * k * np.cos(-kl), E_ * S1 * k * np.sin(kl), 0, 0],     # E S1 dxi1/dx at -l = F
                  [0, 0, k * np.cos(kl), -k * np.sin(kl)],                           # dxi2/dx at +l = 0
                  [0, 1, 0, -1],                                                     # xi1(0) = xi2(0)
                  [E_ * S1 * k, 0, -E_ * S2 * k, 0]])                                # force continuity at 0
    A, Bc, C, Dd = np.linalg.solve(M, [1.0, 0, 0, 0])
    x1 = abs(A * np.sin(-kl) + Bc * np.cos(-kl)); x2 = abs(C * np.sin(kl) + Dd * np.cos(kl))
    assert abs(x1 / x2 - S2 / S1) < 1e-3, (x1 / x2)
print('例7 composite rod: |xi1(-l)|/|xi2(l)| -> S2/S1 near kl=(n+1/2)pi: ok')
# 2010-四: string fixed at both ends, spring K at x0=l/3; modes with sin(k l/3)=0 do not depend on K
l, x0, Tt, d = 1.0, 1 / 3, 1.0, 1.0
def det(k, K):   # A sin kx (x<x0), B sin k(l-x) (x>x0); continuity and T(eta2'-eta1') = K eta
    M = np.array([[np.sin(k * x0), -np.sin(k * (l - x0))],
                  [-Tt * k * np.cos(k * x0) - K * np.sin(k * x0), -Tt * k * np.cos(k * (l - x0))]])
    return np.linalg.det(M)
for K in (0.5, 5, 50):
    assert abs(det(3 * np.pi, K)) < 1e-9 and abs(det(6 * np.pi, K)) < 1e-9
print('2010-四 modes k l = 3n pi solve the equations for any K: ok')

# 2013-5: rigid sphere, sigma_s / (pi r0^2) = 4/(k r0)^2 * sum (2l+1) |j_l'/h_l'|^2 ; check 7/9 (kr0)^4 and the limit 2
from math import sin as s_, cos as c_
def sph(l, x):   # spherical Bessel j_l, y_l by upward recurrence
    j0, j1 = s_(x) / x, s_(x) / x**2 - c_(x) / x
    y0, y1 = -c_(x) / x, -c_(x) / x**2 - s_(x) / x
    js, ys = [j0, j1], [y0, y1]
    for n in range(1, l + 1):
        js.append((2 * n + 1) / x * js[n] - js[n - 1]); ys.append((2 * n + 1) / x * ys[n] - ys[n - 1])
    return js, ys
def sigma_ratio(x):
    L = int(x) + 8   # terms beyond ~kr0 are negligible; more would overflow y_l at small x
    js, ys = sph(L + 1, x)
    tot = 0
    for l in range(L):
        dj = (l * js[l - 1] - (l + 1) * js[l + 1]) / (2 * l + 1) if l else -js[1]
        dy = (l * ys[l - 1] - (l + 1) * ys[l + 1]) / (2 * l + 1) if l else -ys[1]
        tot += (2 * l + 1) * dj**2 / (dj**2 + dy**2)
    return 4 / x**2 * tot
for x in (0.02, 0.05):
    assert abs(sigma_ratio(x) / (7 / 9 * x**4) - 1) < 0.02
vals = [sigma_ratio(x) for x in (10.0, 40.0, 100.0)]   # approaches 2 slowly from below
assert vals[0] < vals[1] < vals[2] < 2 and vals[2] > 1.85
print('2013-5 rigid sphere: 7/9 (kr0)^4 at small kr0; rises toward 2 (kr0=10, 40, 100: %.3f %.3f %.3f): ok' % tuple(vals))
