"""选做习题 11-4：纵波从固体斜入射到液体，数值解三个边界条件，检验反射系数的闭式（解答在 ch11-opt.md）"""
from math import pi, sin, cos, asin, sqrt
import cmath

def solve3(A, b):
    A = [row[:] + [bb] for row, bb in zip(A, b)]
    n = 3
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(A[r][i])); A[i], A[p] = A[p], A[i]
        for r in range(n):
            if r != i:
                f = A[r][i] / A[i][i]
                A[r] = [x - f * y for x, y in zip(A[r], A[i])]
    return [A[i][n] / A[i][i] for i in range(n)]

def numeric(th, rs=7800, cL=5900, cT=3200, rf=1000, cf=1480, w=2 * pi * 1e5):
    mu = rs * cT ** 2; lam = rs * cL ** 2 - 2 * mu
    kL, kT, kf = w / cL, w / cT, w / cf
    q = kL * sin(th)
    ga = asin(cT / cL * sin(th)); tf = cmath.asin(cf / cL * sin(th))
    a, b, c = kL * cos(th), kT * cos(ga), kf * cmath.cos(tf)
    # unknowns Φr, ψr, Φt with Φi = 1 (see the solution for the three conditions)
    A = [[1j * a, 1j * q, 1j * c],
         [-lam * kL ** 2 - 2 * mu * a * a, -2 * mu * b * q, w * w * rf],
         [2 * a * q, q * q - b * b, 0]]
    rhs = [1j * a, lam * kL ** 2 + 2 * mu * a * a, 2 * a * q]
    Pr, Sr, Pt = solve3(A, rhs)
    ZL, ZT, Zf = rs * cL / cos(th), rs * cT / cos(ga), rf * cf / cmath.cos(tf)
    D = Zf + ZT * sin(2 * ga) ** 2 + ZL * cos(2 * ga) ** 2
    rP = (Zf + ZT * sin(2 * ga) ** 2 - ZL * cos(2 * ga) ** 2) / D          # closed form for Φr/Φi
    rS = -2 * (cT / cL) ** 2 * ZL * sin(2 * th) * cos(2 * ga) / D          # closed form for ψr/Φi
    rS2 = -2 * ZT * sin(2 * ga) * cos(2 * ga) / D                          # same, simplified with Snell
    tP = (rs / rf) * 2 * Zf * cos(2 * ga) / D                              # closed form for Φt/Φi
    assert abs(rS - rS2) < 1e-12 and abs(Pt - tP) < 1e-9
    # energy: normal flux of each wave ∝ ρ ω^2 k cos(angle) |potential|^2 · (velocity amplitude = k|potential|)
    #   flux_x = (1/2) ρ c |v|^2 cos(angle), |v| = k |potential|
    fi = rs * cL * kL ** 2 * cos(th)
    fr = rs * cL * kL ** 2 * cos(th) * abs(Pr) ** 2 + rs * cT * kT ** 2 * cos(ga) * abs(Sr) ** 2
    ft = (rf * cf * kf ** 2 * cmath.cos(tf)).real * abs(Pt) ** 2
    shear = rs * cT * kT ** 2 * cos(ga) * abs(Sr) ** 2 / fi
    return Pr, Sr, rP, rS, (fr + ft) / fi, shear

print('steel (7800 kg/m³, cL 5900, cT 3200) into water; Φ, ψ are velocity potentials as in (11-2-9)')
for deg in (0, 10, 20, 30, 45, 60, 65, 70, 80):
    Pr, Sr, rP, rS, e, sh = numeric(deg * pi / 180)
    assert abs(Pr - rP) < 1e-9 and abs(Sr - rS) < 1e-9, deg
    print('11-4 θ=%2d°  Φr/Φi=%+.4f  ψr/Φi=%+.4f  (closed forms agree)  energy: |r|²=%.3f shear=%.3f total=%.6f' % (deg, Pr.real, Sr.real, abs(Pr) ** 2, sh, e))
print('normal incidence check: (ρc_f − ρc_L)/(ρc_f + ρc_L) =', (1000 * 1480 - 7800 * 5900) / (1000 * 1480 + 7800 * 5900))

