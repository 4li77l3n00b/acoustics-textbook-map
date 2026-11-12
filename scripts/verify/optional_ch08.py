"""选做习题 8-2 8-4 8-5 8-8 8-9 8-10 8-11 的数值（解答在 ch08-opt.md）"""
from math import pi, log10, sqrt
rc = 415.0; pref = 2e-5
dB = lambda p2: 10 * log10(p2 / pref ** 2)

# 8-2 修正赛宾公式 (8-1-20)，4m 取 §8.1.5 的 20 ℃、50% 数值
V = 6 * 7 * 5; S = 2 * (6 * 7 + 7 * 5 + 6 * 5)
for f, ac, ad, m4 in ((250, 0.01, 0.05, 0.0), (4000, 0.02, 0.10, 0.0244)):
    A = (S - 4) * ac + 4 * ad
    print('8-2 %4d Hz: V=%d S=%d Sα=%.2f 4mV=%.2f T60=%.2f s (不计空气吸收 %.2f s)' % (f, V, S, A, m4 * V, 0.161 * V / (A + m4 * V), 0.161 * V / A))

# 8-4 立方体
V = 40; S = 6 * V ** (2 / 3); a = 0.02; R = S * a / (1 - a); p2 = (pref * 10 ** 7) ** 2
print('8-4 S=%.1f m² R=%.3f m² W=%.1f W' % (S, R, p2 * R / (4 * rc)))

# 8-5 系数
print('8-5 0.161/(4ρ0c0) = %.3g' % (0.161 / (4 * rc)))

# 8-9 ρ0c0 与 W_ref 的换算
print('8-9 10lg(4e-10/(ρ0c0·1e-12)) = %.2f dB' % (10 * log10(pref ** 2 / (rc * 1e-12))))

# 8-10
R = 50; d = lambda r: 1 / (4 * pi * r * r)
own = d(1) + 4 / R; noise = 50 * 4 / R
Wrc = (pref * 1e3) ** 2 / own
print('8-10 (1) noise−speech = %.2f dB (只算直达声 %.2f dB); W=%.3g W, 语噪声 %.1f dB' % (10 * log10(noise / own), 10 * log10(noise / d(1)), Wrc / rc, dB(noise * Wrc)))
own2 = d(0.1) + 4 / R
print('8-10 (3) speech +%.2f dB, speech−noise = %.2f dB' % (10 * log10(own2 / own), 10 * log10(own2 / noise)))

# 8-11
r = sqrt(2); p2 = rc * 4 * 0.05 * (d(r) + 4 / 20)
print('8-11 p²=%.2f Pa², SPL=%.1f dB; 直达 %.4f 混响 %.4f' % (p2, dB(p2), d(r), 4 / 20))
