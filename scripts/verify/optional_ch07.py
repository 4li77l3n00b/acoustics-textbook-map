"""选做习题第 7 章的数值验算（解答在 output/solutions/src/ch07-opt.md）"""
from math import pi, sqrt
# 7-2: nickel membrane of §2.3.5 (T = P h, P = 4e8 N/m^2), low-frequency mean displacement p a^2 / 8T, E = E0 * eta / D
a, h, D, E0, pe = 1e-2, 1e-5, 1e-5, 200, 1.0
T = 4e8 * h
sigma = 8800 * h
f1 = 2.405 / (2 * pi * a) * sqrt(T / sigma)
eta = pe * a * a / (8 * T)
print('7-2  T=%.0f N/m, f1=%.0f Hz, mean eta_e=%.3g m, E_e=%.4g V' % (T, f1, eta, E0 * eta / D))
