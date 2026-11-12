"""选做习题第 5、6 章的数值验算（解答在 output/solutions/src/ch05-opt.md、ch06-opt.md）"""
from math import pi, sqrt, cos, sin, log10
import cmath

rho, c = 1.21, 343.0
R0 = rho * c
# 5-1
f, G, xmin = 500, 10, 0.25
lam = c / f
r = (G - 1) / (G + 1)
sigma = xmin / (lam / 4) - 1
rp = r * cmath.exp(1j * sigma * pi)
Zs = (1 + rp) / (1 - rp)
print('5-1  lam=%.4f |r|=%.4f sigma=%.4f  Zs/rho c = %.4f%+.4fj  alpha=%.4f' % (lam, r, sigma, Zs.real, Zs.imag, 1 - r * r))
# 5-29 J0(3.832 r/a)
def J(m, x):
    t = (x / 2) ** m
    for k in range(1, m + 1): t /= k
    s = 0
    for k in range(200):
        s += t; t *= -(x * x / 4) / ((k + 1) * (k + 1 + m))
    return s
print('5-29', [(x / 10, round(J(0, 3.8317 * x / 10), 3)) for x in range(0, 11)], 'node r/a = %.3f' % (2.4048 / 3.8317))
# 6-29
a, M, C = 0.12, 0.025, 1.8e-4
f0 = 1 / (2 * pi * sqrt(M * C))
w = 2 * pi * 1000; k = w / c
pa = 0.2 * sqrt(2)
Z = abs(w * M - 1 / (w * C))
F = 2 * pa * Z / (rho * w * a * a)
Fm = 2 * M * pa / (rho * a * a)
print('6-29 f0=%.1f Hz ka=%.2f F(mass only)=%.3f N, F(with spring)=%.3f N' % (f0, k * a, Fm, F))
Bl, R, L = 1.0 * 9, 8.0, 7e-4
I = F / Bl
Ze = complex(R, w * L) + Bl ** 2 / complex(0, w * M - 1 / (w * C))
print('6-29 I=%.4f A, |Ze|=%.3f, U=%.3f V (amplitude), without motional %.3f V' % (I, abs(Ze), I * abs(Ze), I * abs(complex(R, w * L))))
pa7 = sqrt(2) * 1.0
w0 = 2 * pi * f0
print('6-29 xi_max at f0: %.3g m' % (2 * pa7 / (rho * w0 ** 2 * a * a)))
