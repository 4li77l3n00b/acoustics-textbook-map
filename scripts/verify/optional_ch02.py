"""选做习题第 2 章的数值验算（解答在 output/solutions/src/ch02-opt.md）"""
from math import pi, sqrt, cosh, cos

# 2-7: A_n = 8 ξ0 (-1)^(n+1) / ((2n-1)^2 π^2); check the series gives ξ0 at the free end
s = sum(8 / ((2 * n - 1) ** 2 * pi ** 2) for n in range(1, 20001))
print('2-7  sum A_n sin(k_n l)/ξ0 =', round(s, 6), '; A_1..3/ξ0 =', [round(8 * (-1) ** (n + 1) / ((2 * n - 1) ** 2 * pi ** 2), 4) for n in (1, 2, 3)])
# 2-21: membrane 1:2, f ∝ sqrt(m^2 + n^2/4)
modes = sorted((sqrt(m * m + n * n / 4), m, n) for m in range(1, 6) for n in range(1, 9))
f1 = modes[0][0]
print('2-21', [(m, n, round(f / f1, 4)) for f, m, n in modes[:7]])
# 2-16/2-17: cosh μ cos μ = 1
def bis(f, a, b):
    for _ in range(100):
        m = (a + b) / 2
        if f(a) * f(m) <= 0: b = m
        else: a = m
    return (a + b) / 2
F = lambda x: cosh(x) * cos(x) - 1
roots = [bis(F, a, a + 1.5) for a in (4, 7.2, 10.4, 13.6)]
print('2-16/17 roots', [round(r, 4) for r in roots], 'ratios f_n/f_1', [round((r / roots[0]) ** 2, 3) for r in roots])
