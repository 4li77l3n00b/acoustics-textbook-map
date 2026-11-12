"""选做习题第 1 章的数值验算（解答在 output/solutions/src/ch01-opt.md）"""
from math import pi, sqrt, exp

# 1-1
f0, M = 600, 8e-4
K = (2 * pi * f0) ** 2 * M
print('1-1  K = %.4g N/m, C = %.4g m/N' % (K, 1 / K))
# 1-16
print('1-16 f0 = %.4g Hz, f0\' = %.4g Hz' % (sqrt(4e3 / 0.04) / 2 / pi, sqrt(1e3 / (0.04 + 0.12 / 3)) / 2 / pi))
# 1-17
g = 9.8
K = 0.2 * g / 0.04
M, delta = 0.5, 1.0
R = 2 * M * delta
w0 = sqrt(K / M); w1 = sqrt(w0 ** 2 - delta ** 2)
E0 = 0.5 * K * 0.04 ** 2
print('1-17 K = %.4g, R = %.4g, f0 = %.4g, f0\' = %.4g Hz, E0 = %.4g J, E(1 s) = %.4g J' % (K, R, w0 / 2 / pi, w1 / 2 / pi, E0, E0 * exp(-2 * delta)))
# 1-19
print('1-19 ratio = %.4g' % ((50 / 300) ** 2))
