"""Numbers used in the chapter 4 and 6 solutions (output/solutions/src/ch04.md, ch06.md).
Constants as in the book (§4.5.3, exercise 4-15): air at 20 °C rho0=1.21 kg/m3, c0=343 m/s, rho0*c0=415;
water rho*c=1.48e6 Pa·s/m, c=1480 m/s.  Run: python3 scripts/verify/ch04_ch06.py
"""
from math import pi, sqrt, log10, asin, degrees, sin, cos
rho0, c0, Z0 = 1.21, 343.0, 415.0
Zw, cw = 1.48e6, 1480.0
pref = 2e-5
pe_of = lambda L: pref * 10 ** (L / 20)
out = {}
def show(k, v): out[k] = v; print(f'{k:28s} {v:.4g}')

# 4-10
w = 2 * pi * 1000
for L in (0, 120):
    pe = pe_of(L); pa = pe * sqrt(2); va = pa / Z0
    show(f'4-10 L={L} pa', pa); show(f'4-10 L={L} va', va); show(f'4-10 L={L} xi_a', va / w); show(f'4-10 L={L} eps', pe**2 / (rho0 * c0**2))
show('4-10 ve=c0 pe', Z0 * c0); show('4-10 ve=c0 SPL', 20 * log10(Z0 * c0 / pref))
# 4-11 / 2007-五
for L in (74, 70):
    pe = pe_of(L); show(f'L={L} pe', pe); show(f'L={L} eps', pe**2 / (rho0 * c0**2)); show(f'L={L} I', pe**2 / Z0)
# 4-12 / 2021-3
show('4-12 ratio', Zw / Z0)
# 4-14
for r in (2, 5, 10, 100): show(f'4-14 ratio {r} dB', 20 * log10(r))
for d in (1, 3, 6, 10): show(f'4-14 {d} dB ratio', 10 ** (d / 20))
# 4-15, 4-16
for name, R1, R2 in (('4-15', Z0, Zw), ('4-16', 1.48e6, 3.2e6)):
    R = R2 / R1; show(f'{name} R12', R); show(f'{name} rp', (R - 1) / (R + 1)); show(f'{name} tI', 4 * R / (1 + R)**2)
show('4-15 TL dB', -10 * log10(4 * (Zw / Z0) / (1 + Zw / Z0)**2))
# 4-17
show('4-17 sin(theta_t)', cw / c0 * sin(pi / 6)); show('4-17 critical deg', degrees(asin(c0 / cw)))
# 4-27..4-29, 2022-四
show('4-27 40+70', 10 * log10(10**4 + 10**7)); show('4-27 70+70', 10 * log10(2 * 10**7))
show('2022-四', 10 + 10 * log10(10))
show('4-29 n=0', 10 * log10(2))
for target in (1, 0.1):
    n = -10 * log10(10 ** (target / 10) - 1); show(f'4-29 n for dL<{target}', n)
# chapter 6
k1000 = 2 * pi * 1000 / c0
show('k(1000Hz)', k1000)
# 6-1
show('6-1 small kr0 dB', 20 * log10(4)); show('6-1 large kr0 dB', 20 * log10(2))
# 6-2
for m in (2, 4, 10): show(f'6-2 {m}r dB', 20 * log10(m))
show('6-2 1m->2m', 20 * log10(2)); show('6-2 100->101', 20 * log10(101 / 100))
# 6-3
r0, ua, r = 0.01, 0.05, 50.0
kr0 = k1000 * r0; A = Z0 * k1000 * r0**2 * ua / sqrt(1 + kr0**2)
pa = A / r; show('6-3 kr0', kr0); show('6-3 |A|', A); show('6-3 pa', pa); show('6-3 SPL', 20 * log10(pa / sqrt(2) / pref))
va = pa / Z0 * sqrt(1 + 1 / (k1000 * r)**2); show('6-3 va', va); show('6-3 xi_a', va / (2 * pi * 1000)); show('6-3 W', 2 * pi * A**2 / Z0)
# 6-4 / 2024-四 example
pa = pe_of(74) * sqrt(2); A = pa * 1.0
ua = A * sqrt(1 + kr0**2) / (Z0 * k1000 * r0**2)
show('6-4 pa', pa); show('6-4 ua', ua); show('6-4 W', 2 * pi * A**2 / Z0)
# 6-5
show('6-5 r', sqrt(1e-3 * Z0 / (4 * pi * 0.1**2)))
# 6-6
k100 = 2 * pi * 100 / c0; r0 = 0.1
Mr = 4 * pi * r0**3 * rho0 / (1 + (k100 * r0)**2); show('6-6 kr0', k100 * r0); show('6-6 Mr', Mr); show('6-6 Mr/0.02', Mr / 0.02)
# 6-7..6-9
r0, ua, l = 0.005, 0.008, 0.15
S0 = 4 * pi * r0**2; kr0 = k100 * r0
W1 = 0.5 * Z0 * S0 * kr0**2 / (1 + kr0**2) * ua**2; show('6-7 W', W1)
kl = k100 * l; s = sin(kl) / kl; show('6-8 kl', kl); show('6-8 sin/kl', s)
show('6-8 Wtot', 2 * W1 * (1 + s)); show('6-8 ratio to W1', 2 * (1 + s))
show('6-9 Wtot', 2 * W1 * (1 - s)); show('6-9 ratio to W1', 2 * (1 - s))
# 6-10: free-field pressure of a 0.1 W source at 1 km, and doubled by the hard water surface
pe_free = sqrt(0.1 * Z0 / (4 * pi * 1000**2)); show('6-10 pe free', pe_free); show('6-10 pe doubled', 2 * pe_free)
show('6-10 SPL doubled', 20 * log10(2 * pe_free / pref)); show('6-10 lambda', c0 / 100)
# 6-17: unit spacing 0.2 m
for x in (0.5, 1.0, 1.5): show(f'6-17 f at l/lambda={x}', x * c0 / 0.2)

# 4-23: solve the 4 boundary equations directly and compare with (4-10-43)
import numpy as np, random
random.seed(1)
for _ in range(5):
    R1, R2, R3 = (random.uniform(0.2, 5) for _ in range(3)); k2D = random.uniform(0, 6)
    E = np.exp
    # unknowns B, C, E_, T with A = 1
    M = np.array([[-1, 1, 1, 0], [1 / R1, 1 / R2, -1 / R2, 0],
                  [0, E(-1j * k2D), E(1j * k2D), -1], [0, E(-1j * k2D) / R2, -E(1j * k2D) / R2, -1 / R3]], complex)
    rhs = np.array([1, 1 / R1, 0, 0], complex)
    B, C, Ee, T = np.linalg.solve(M, rhs)
    tI_num = abs(T)**2 / R3 * R1
    tI_formula = 4 * R1 * R3 / ((R1 + R3)**2 * cos(k2D)**2 + (R2 + R1 * R3 / R2)**2 * sin(k2D)**2)
    assert abs(tI_num - tI_formula) < 1e-9 and abs(abs(B)**2 + tI_num - 1) < 1e-9
print('4-23 three-layer formula and energy balance: ok')
# 2022-三: oblique incidence, r_W + t_W = 1
for _ in range(5):
    r1, c1, r2, c2 = (random.uniform(0.5, 3) for _ in range(4)); ti = random.uniform(0, 1.2)
    st = c2 / c1 * sin(ti)
    if st >= 1: continue
    tt = asin(st); Z1, Z2 = r1 * c1, r2 * c2
    rp = (Z2 * cos(ti) - Z1 * cos(tt)) / (Z2 * cos(ti) + Z1 * cos(tt))
    tp = 2 * Z2 * cos(ti) / (Z2 * cos(ti) + Z1 * cos(tt))
    tI = Z1 / Z2 * tp**2; tW = tI * cos(tt) / cos(ti)
    assert abs(rp**2 + tW - 1) < 1e-12
print('2022-三 r_W + t_W = 1: ok')

# chapter 6 analytic checks: far fields by direct summation of point sources e^{-jk r_i}/r_i at large r
def farfield(sources, theta, k, R=1e5):
    """sources: list of (amplitude, z position on the axis); theta measured from the +z axis"""
    x, z = R * sin(theta), R * cos(theta)
    return sum(a * np.exp(-1j * k * np.hypot(x, z - zs)) / np.hypot(x, z - zs) for a, zs in sources) * R * np.exp(1j * k * R)
k = 2.0
for th in (0.3, 1.0, 2.0):
    l = 0.7
    Q1, Q2 = 1.3, 0.4   # 6-11: sources at z=±l/2 (Q1 at +l/2), formula with x = pi l cos(theta)/lambda = k l cos/2
    num = farfield([(Q1, l / 2), (Q2, -l / 2)], th, k)
    x_ = k * l * cos(th) / 2
    assert abs(num - ((Q1 + Q2) * cos(x_) + 1j * (Q1 - Q2) * sin(x_))) < 1e-4
    D = 0.4  # 6-14 / 6-15 / 2017b: dipole (+ at 3D/2, - at D/2) above a boundary at z=0; image method
    soft = farfield([(1, 1.5 * D), (-1, 0.5 * D), (1, -0.5 * D), (-1, -1.5 * D)], th, k)
    rigid = farfield([(1, 1.5 * D), (-1, 0.5 * D), (-1, -0.5 * D), (1, -1.5 * D)], th, k)
    c = cos(th)
    assert abs(soft - 4j * cos(k * D * c) * sin(k * D * c / 2)) < 1e-4
    assert abs(rigid - (-4) * sin(k * D * c) * sin(k * D * c / 2)) < 1e-4
print('6-11, 6-14, 6-15, 2017b far fields: ok')
for th in (0.0, pi / 2, pi):   # 6-13 with l = lambda/4: cardioid-like |e^{jx} + j e^{-jx}|^2 = 2(1 + sin 2x)
    lam = 2 * pi / k; l = lam / 4; x_ = k * l * cos(th) / 2
    num = farfield([(1, l / 2), (1j, -l / 2)], th, k)
    assert abs(abs(num)**2 - 2 * (1 + sin(2 * x_))) < 1e-4
print('6-13 magnitude 2(1+sin 2x): ok')

# 2017-二（5）: dipole field at any distance, p = -j k A l cos(th)/r (1 + 1/(jkr)) e^{-jkr}, book convention
# (+ source at z=-l/2 so that r_+ = r + l/2 cos th); exact two-source sum for small kl
k, A, l = 2.0, 1.0, 1e-3
for r in (0.05, 0.5, 5.0):
    for th in (0.2, 1.1):
        x, z = r * sin(th), r * cos(th)
        rp, rm = np.hypot(x, z + l / 2), np.hypot(x, z - l / 2)
        exact = A * np.exp(-1j * k * rp) / rp - A * np.exp(-1j * k * rm) / rm
        approx = -1j * k * A * l * cos(th) / r * (1 + 1 / (1j * k * r)) * np.exp(-1j * k * r)
        assert abs(exact - approx) / abs(approx) < 1e-3
# N dipoles on a line along their axis: product of |cos th| and the array factor (direct sum check)
N, d, k = 5, 0.6, 3.0
for th in (0.3, 0.9, 1.4):
    tot = sum(farfield([(1, n * d + l / 2), (-1, n * d - l / 2)], th, k) for n in range(N))
    one = farfield([(1, l / 2), (-1, -l / 2)], th, k)
    u = k * d * cos(th)
    af = abs(sin(N * u / 2) / sin(u / 2)) if abs(sin(u / 2)) > 1e-12 else N
    assert abs(abs(tot) - abs(one) * af) < 1e-6
print('2017-二（5） dipole near/far field and array product: ok')
# the in-phase array factor along the axis is largest broadside, not at theta = 0 (2017-二（5）, case a)
N, d, k = 5, 0.6, 3.0
af = lambda th: abs(sin(N * k * d * cos(th) / 2) / (N * sin(k * d * cos(th) / 2))) if abs(sin(k * d * cos(th) / 2)) > 1e-12 else 1.0
assert af(pi / 2) > af(0.0) and abs(af(pi / 2) - 1) < 1e-9
print('2017-二（5） array factor maximum is broadside: ok')
# 2025-三: instantaneous intensity of p = A/r e^{j(wt-kr)}: Re p * Re v = A^2/(rho c r^2) [cos^2 + cos sin /(kr)]
A_, kr = 1.0, 0.7
for ph in (0.3, 1.2, 2.5):
    v = (1 + 1 / (1j * kr)) * np.exp(1j * ph)
    assert abs(cos(ph) * v.real - (cos(ph)**2 + cos(ph) * sin(ph) / kr)) < 1e-12
print('2025-三 instantaneous intensity sign: ok')
