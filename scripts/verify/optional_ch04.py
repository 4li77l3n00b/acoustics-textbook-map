"""选做习题第 4 章的数值验算（解答在 output/solutions/src/ch04-opt.md）"""
from math import pi, sqrt, log10, cos, sin

rho, c = 1.21, 343.0
R1 = rho * c
# 4-7  (winter assumed 0 °C)
c40, c0 = 331.6 + 0.6 * 40, 331.6
ce = 331.6 * sqrt(313 / 273)
print('4-7  c(40)=%.1f (exact %.1f), dc=%.1f m/s; I ratio %.4f (%.1f%%), dL %.2f dB' % (c40, ce, c40 - c0, c0 / c40, (c0 / c40 - 1) * 100, 10 * log10(c0 / c40)))
# 4-9
g, T, P0 = 1.40, 293.15, 1.013e5
pa = sqrt(2) * 2e-5 * 10 ** (80 / 20)
print('4-9  p_a = %.3f Pa, dT_a = %.3g K' % (pa, (g - 1) / g * T * pa / P0))
# 4-13
print('4-13 ratio = %.3f' % 10 ** ((110 - (120 - 20)) / 20))
# 4-21
def TL1(f, M): return 20 * log10(f) + 20 * log10(M) - 42
def TL1x(f, M): return 10 * log10(1 + (2 * pi * f * M / (2 * R1)) ** 2)
M = 0.2 * 2000
for f in (100, 1000): print('4-21 single f=%d: %.1f dB (exact %.1f)' % (f, TL1(f, M), TL1x(f, M)))
print('4-21 double thickness 100 Hz: %.1f dB' % TL1(100, 2 * M))
def TL2(f, M, D):
    w = 2 * pi * f; k = w / c; a = w * M / R1
    z = (1 + 1j * a) * cos(k * D) + 1j * ((1 + 1j * a) - 0.5 * a * a) * sin(k * D)
    return 10 * log10(abs(z) ** 2)
w = 2 * pi * 100; k = w / c
print('4-21 double wall 100 Hz: exact %.1f dB, (4-11-13) %.1f dB; f_r = %.1f Hz' % (TL2(100, M, 0.1), 20 * log10(0.5 * k * 0.1 * (w * M / R1) ** 2), R1 * sqrt(2 / (M * rho * 0.1)) / 2 / pi))
