"""选做习题第 3 章的数值验算（解答在 output/solutions/src/ch03-opt.md）"""
from math import pi, sqrt

# 3-13: side-branch Helmholtz resonator tuned to 200 Hz; exhaust gas is hot, so try two sound speeds
f0 = 200
a, l0 = 0.02, 0.05
S = pi * a * a
l = l0 + 1.7 * a
for c in (343, 500):
    V = S * c * c / ((2 * pi * f0) ** 2 * l)
    print('3-13 c = %d m/s: S = %.3g m^2, l = %.3g m, V = %.3g m^3 (%.2f L)' % (c, S, l, V, V * 1e3))
