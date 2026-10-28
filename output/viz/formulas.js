/* Formula quick reference: a floating panel on every page (top-bar button or Alt+F).
   Draggable by its title bar, resizable from the corner; position, size and options are remembered.
   Content: one entry per line, "# group" starts a group, otherwise "name | TeX | note" (note may hold $…$).
   Chinese text inside the TeX is wrapped in \text{} automatically. Equation numbers refer to the textbook. */
const FX_SRC = String.raw`
# 常数
空气（20 ℃） | \rho_0=1.21\ \mathrm{kg/m^3},\quad c_0=343\ \mathrm{m/s},\quad \rho_0c_0=415\ \mathrm{N\cdot s/m^3} | §4.5.3 取 343 m/s；附录 A 表 A-2 印 344 m/s
空气声速与温度 | c_0=\sqrt{\frac{\gamma P_0}{\rho_0}},\quad c_0(t)\approx331.6+0.6t\ \mathrm{m/s} | $\gamma=1.4$，$P_0=1.013\times10^5$ Pa
水（20 ℃） | \rho_0=998\ \mathrm{kg/m^3},\quad c_0=1483\ \mathrm{m/s},\quad \rho_0c_0=1.48\times10^6\ \mathrm{N\cdot s/m^3} | 表 A-1；题中常取 $c=1480$、$\rho c=1.48\times10^6$
钢 | \rho=7800,\quad E=21.6\times10^{10},\quad \sigma=0.28,\quad c_{棒}=5050,\quad c_L=6100,\quad c_T=3300 | 表 A-3，单位 kg/m³、N/m²、m/s
铝 | \rho=2700,\quad E=6.85\times10^{10},\quad \sigma=0.34,\quad c_{棒}=5040,\quad c_L=6260,\quad c_T=3080 | 表 A-3
铜 | \rho=8900,\quad E=12.3\times10^{10},\quad \sigma=0.35,\quad c_{棒}=3720,\quad c_L=4710,\quad c_T=2260 | 表 A-3
参考值 | p_{ref}=2\times10^{-5}\ \mathrm{Pa},\quad I_{ref}=10^{-12}\ \mathrm{W/m^2},\quad W_{ref}=10^{-12}\ \mathrm W
空气与水 | \frac{(\rho c)_{水}}{(\rho c)_{气}}\approx3570,\quad 同声压\ \frac{I_{气}}{I_{水}}\approx3570,\quad 同声强\ \frac{p_{水}}{p_{气}}\approx60 | 2021-3 题型

# 质点振动
固有频率 | f_0=\frac1{2\pi}\sqrt{\frac{K_m}{M_m}}=\frac1{2\pi}\sqrt{\frac{1}{M_mC_m}}=\frac1{2\pi}\sqrt{\frac{g}{\xi_{st}}} | (1-2-8)、(1-2-16)
弹簧串并联 | 串：\frac1K=\frac1{K_1}+\frac1{K_2},\quad 并：K=K_1+K_2 | 1.2.4；力顺与之相反
弹簧质量 | f_0=\frac1{2\pi}\sqrt{\frac{K_m}{M_m+M_s/3}} | (1-2-28)
衰减振动 | \xi=\xi_0e^{-\delta t}\cos(\omega_0't-\varphi_0),\quad \delta=\frac{R_m}{2M_m},\quad \omega_0'=\sqrt{\omega_0^2-\delta^2} | (1-3-7)
品质因素 | Q_m=\frac{\omega_0M_m}{R_m}=\frac{\sqrt{M_mK_m}}{R_m}=\frac{\omega_0}{2\delta} | $Q_m>\frac12$ 才振动
力阻抗 | Z_m=R_m+j\Big(\omega M_m-\frac{K_m}\omega\Big),\quad v_a=\frac{F_a}{|Z_m|},\quad \xi_a=\frac{F_a}{\omega|Z_m|} | (1-4-10)
归一化位移 | A=\frac{\xi_a}{F_a/K_m}=\frac{Q_m}{\sqrt{z^2+(z^2-1)^2Q_m^2}} | $z=f/f_0$，速度 $B$ 乘 $z$、加速度 $C$ 乘 $z^2$
位移共振 | f_r=f_0\sqrt{1-\frac1{2Q_m^2}},\quad A_r=\frac{2Q_m^2}{\sqrt{4Q_m^2-1}} | (1-4-13)，$Q_m>1/\sqrt2$
速度共振 | f_r=f_0,\quad B_r=Q_m | (1-4-22)
加速度共振 | f_r=Q_mf_0\sqrt{\frac{2}{2Q_m^2-1}} | (1-4-26)
半功率带宽 | \frac{\Delta f}{f_0}=\frac1{Q_m},\quad \omega_1\omega_2=\omega_0^2 | (1-4-24)
损耗功率 | \bar W_R=\frac12R_mv_a^2=\frac12R_m\omega^2\xi_a^2 | (1-4-30)
能量与 Q | Q_m=2\pi\frac{E}{\Delta E_{周}} | 速度共振时（习题 1-21）
隔振传递率 | \Big|\frac{v}{v_1}\Big|=\frac1{\sqrt{(1-z^2)^2+(z/Q_m)^2}} | 力阻接惯性系（图 3-4-2）；$z>\sqrt2$ 才隔振

# 弹性体振动
弦 | c=\sqrt{\frac T\delta},\quad f_n=\frac{nc}{2l},\quad \eta_n=B_n\sin\frac{n\pi x}l\cos(\omega_nt-\varphi_n) | (2-1-26)
弦的初值系数 | C_n=\frac2l\int_0^l\eta_0\sin k_nx\,dx,\quad D_n=\frac2{\omega_nl}\int_0^lv_0\sin k_nx\,dx | (2-1-36)
弦的能量 | E_n=\frac{T}{4l}n^2\pi^2B_n^2 | (2-1-42)
弦上挂质量 | K=\frac{Tl}{x_0(l-x_0)} | 习题 1-3；中点最小
棒纵振动 | c=\sqrt{\frac E\rho},\quad 两端固定/自由\ f_n=\frac{nc}{2l},\quad 一端固定一端自由\ f_n=\frac{(2n-1)c}{4l} | (2-2-10)、(2-2-20)
棒端负载 | 自由-质量：\frac{\tan kl}{kl}=-\frac{M}{m},\quad 固定-质量：\gamma\tan\gamma=\frac mM | (2-2-25)、(2-2-26)，$m$ 为棒质量
棒横振动 | f_n=\frac{cK}{2\pi l^2}\mu_n^2,\quad 一端钳定一端自由\ \mu_n=1.875,\ 4.694,\ 7.855 | (2-2-62)；泛频不是整数倍，$K$ 为回转半径
膜 | c=\sqrt{\frac T\sigma},\quad f_n=\frac{\mu_n}{2\pi a}\sqrt{\frac T\sigma},\quad \mu_n=2.405,5.520,8.654 | (2-3-16)
膜的节圆 | r_l=\frac{\mu_l}{\mu_n}a | (2-3-21)
膜的等效质量 | M_{en}=mJ_1^2(\mu_n),\quad M_{e1}\approx0.27m | (2-3-30)
膜低频平均位移 | \bar\eta_a\approx\frac{p_aa^2}{8T} | (2-3-41)，电容传声器
圆板（周界钳定） | f_1=\frac{(3.20)^2h}{4\pi a^2}\sqrt{\frac{E}{3\rho(1-\sigma^2)}} | (2-4-19)

# 电-力-声类比
阻抗型类比 | F\leftrightarrow E,\quad v\leftrightarrow I,\quad M_m\leftrightarrow L,\quad C_m\leftrightarrow C,\quad R_m\leftrightarrow R | 速度相同串联、受力相同并联
声学元件 | M_a=\frac{\rho_0l}{S},\quad C_a=\frac{V}{\rho_0c_0^2},\quad R_a=\frac{R_m}{S^2} | (3-3-3)
力↔声 | Z_a=\frac{Z_m}{S^2},\quad M_a=\frac{M_m}{S^2},\quad C_a=C_mS^2 | 面积 $S$ 的变量器 (3-4-10)
腔体空气弹簧 | K_m=\frac{\rho_0c_0^2S^2}{V} | 3.3；耳机压在小腔上 3-11
共鸣器 | f_0=\frac{c_0}{2\pi}\sqrt{\frac{S}{lV_0}},\quad l=l_0+1.7a | 3.3
共鸣器腔内声压 | |p_c|=Q_a|p|,\quad Q_a=\frac{\omega_0M_a}{R_a} | 习题 3-12
滤波器通带 | -1\le\frac{Z_1}{4Z_2}\le0 | (3-5-14)
低通截止 | f_c=\frac1{\pi\sqrt{M_aC_a}} | (3-5-15)
动圈换能 | F=BlI,\quad E=Blv | 机电变量器 $Bl$

# 声波基本性质
三个基本方程 | \rho_0\frac{\partial v}{\partial t}=-\frac{\partial p}{\partial x},\quad -\rho_0\frac{\partial v}{\partial x}=\frac{\partial\rho'}{\partial t},\quad p=c_0^2\rho' | (4-3-1a)～(4-3-3a)
波动方程 | \nabla^2p=\frac1{c_0^2}\frac{\partial^2p}{\partial t^2} | (4-3-10)
速度势 | \boldsymbol v=-\mathrm{grad}\,\Phi,\quad p=\rho_0\frac{\partial\Phi}{\partial t} | (4-3-15)
平面波 | p=p_ae^{j(\omega t-kx)},\quad v=\frac{p}{\rho_0c_0},\quad k=\frac\omega{c_0}=\frac{2\pi}\lambda | (4-5-5)
声阻抗率 | Z_s=\frac pv,\quad 平面波\ Z_s=\rho_0c_0 | (4-5-12)
声能密度 | \varepsilon=\frac12\rho_0\Big(v^2+\frac{p^2}{\rho_0^2c_0^2}\Big),\quad \bar\varepsilon=\frac{p_a^2}{2\rho_0c_0^2} | (4-6-5)、(4-6-7)
声强 | I=\overline{\mathrm{Re}\,p\cdot\mathrm{Re}\,v}=\frac12\mathrm{Re}(pv^*),\quad 平面波\ I=\frac{p_e^2}{\rho_0c_0}=\bar\varepsilon c_0 | (4-6-10)、(4-6-11)
有效声压 | p_e=\frac{p_a}{\sqrt2} | 简谐波
声压级 | SPL=20\lg\frac{p_e}{2\times10^{-5}},\quad SIL=10\lg\frac{I}{10^{-12}},\quad SWL=10\lg\frac{W}{10^{-12}} | (4-7-1)、(4-7-2)
线性化条件 | \frac{v_a}{c_0}=\frac{p_a}{\gamma P_0}=\frac{2\pi\xi_a}{\lambda}=s_a\ll1 | (4-9-2)
相干叠加 | p_a^2=p_{1a}^2+p_{2a}^2+2p_{1a}p_{2a}\cos(\varphi_2-\varphi_1) | (4-12-6)
不相干叠加 | p_e^2=p_{1e}^2+p_{2e}^2+\cdots,\quad \bar\varepsilon=\bar\varepsilon_1+\bar\varepsilon_2 | (4-12-14)
驻波 | p=2p_{ra}\cos kx\,e^{j\omega t}+(p_{ia}-p_{ra})e^{j(\omega t-kx)} | (4-12-4)

# 反射与透射
边界条件 | p_1=p_2,\quad v_{1n}=v_{2n}
垂直入射 | r_p=\frac{R_2-R_1}{R_2+R_1},\quad t_p=\frac{2R_2}{R_2+R_1} | (4-10-11)，$R=\rho c$
声强系数 | r_I=r_p^2,\quad t_I=\frac{4R_1R_2}{(R_1+R_2)^2},\quad r_I+t_I=1
斯奈尔定律 | \theta_i=\theta_r,\quad \frac{\sin\theta_i}{\sin\theta_t}=\frac{c_1}{c_2} | (4-10-22)
斜入射 | r_p=\frac{\rho_2c_2\cos\theta_i-\rho_1c_1\cos\theta_t}{\rho_2c_2\cos\theta_i+\rho_1c_1\cos\theta_t} | (4-10-28)
全透射角 | \sin\theta_{i0}=\sqrt{\frac{m^2-n^2}{m^2-1}},\quad m=\frac{\rho_2}{\rho_1},\ n=\frac{c_1}{c_2} | (4-10-29)，需 $m>n>1$ 或 $m<n<1$
临界角 | \theta_{ic}=\arcsin\frac{c_1}{c_2} | (4-10-31)，$c_2>c_1$；大于它全反射
斜入射功率 | t_W=t_I\frac{\cos\theta_t}{\cos\theta_i},\quad r_I+t_W=1 | (4-10-33)
中间层 | t_I=\frac{4R_1R_3}{(R_1+R_3)^2\cos^2k_2D+\big(R_2+\frac{R_1R_3}{R_2}\big)^2\sin^2k_2D} | (4-10-43)
匹配层 | D=\frac{\lambda_2}{4},\quad R_2=\sqrt{R_1R_3}\ \Rightarrow\ t_I=1 | 半波长层 $k_2D=n\pi$ 透明
质量定律 | TL=20\lg\frac{\omega M}{2\rho_1c_1}\approx20\lg f+20\lg M-42\ \mathrm{dB} | (4-11-1)，$M$ 面密度
双层墙共振 | \omega_r=\rho_1c_1\sqrt{\frac{2}{M\rho_1D}} | (4-11-14)

# 管中声波
管内驻波 | |p_a|=p_{ai}\sqrt{1+|r_p|^2+2|r_p|\cos2k\big(x+\sigma\frac\lambda4\big)} | (5-1-5)，$r_p=|r_p|e^{j\sigma\pi}$
驻波比 | G=\frac{1+|r_p|}{1-|r_p|},\quad |r_p|=\frac{G-1}{G+1} | (5-1-6)、(5-1-7)
吸声系数 | \alpha=1-|r_p|^2=\frac{4R_s\rho_0c_0}{(R_s+\rho_0c_0)^2+X_s^2} | (5-1-23)
端面阻抗 → 反射 | r_p=\frac{Z_s-\rho_0c_0}{Z_s+\rho_0c_0} | 例：$Z_s=(1+2j)\rho_0c_0$，$|r_p|=0.707$
阻抗转移 | Z_{s0}=\rho_0c_0\frac{Z_{sl}+j\rho_0c_0\tan kl}{\rho_0c_0+jZ_{sl}\tan kl} | (5-4-8)
闭管与开管 | 闭端\ Z_{s0}=-j\rho_0c_0\cot kl,\quad 开端（理想）\ Z_{s0}=j\rho_0c_0\tan kl | $kl\ll1$：声容 / 声质量
突变截面 | r_p=\frac{S_{21}-1}{S_{21}+1},\quad t_W=\frac{4S_{12}}{(1+S_{12})^2},\quad S_{21}=\frac{S_1}{S_2} | (5-2-6)、(5-2-9)
扩张管消声 | TL=10\lg\Big[1+\frac14(S_{12}-S_{21})^2\sin^2kD\Big] | (5-2-11)，$kD=\frac\pi2$ 最大
矩形波导 | p=A\cos\frac{n_x\pi x}{l_x}\cos\frac{n_y\pi y}{l_y}e^{j(\omega t-k_zz)},\quad k_z^2=k^2-\Big(\frac{n_x\pi}{l_x}\Big)^2-\Big(\frac{n_y\pi}{l_y}\Big)^2 | (5-7-10)
截止频率 | f_{n_xn_y}=\frac{c_0}{2}\sqrt{\Big(\frac{n_x}{l_x}\Big)^2+\Big(\frac{n_y}{l_y}\Big)^2},\quad 只传平面波：f<\frac{c_0}{2l_{\max}} | (5-7-16)
圆管截止 | f_{10}=1.841\frac{c_0}{2\pi a},\quad 轴对称\ f_{01}=3.832\frac{c_0}{2\pi a} | (5-7-47)、(5-7-48)
相速与群速 | c_p=\frac{c_0}{\sqrt{1-(f_c/f)^2}},\quad c_g=c_0\sqrt{1-(f_c/f)^2},\quad c_pc_g=c_0^2 | (5-7-23)、(5-7-24)
声源激发的振幅 | A_{n_xn_y}=\frac{\omega\rho_0}{k_z}B_{n_xn_y} | (5-7-32)，$B$ 为振速的余弦展开系数
半软波导（水槽） | f=\frac c2\sqrt{\Big(\frac{2n_x+1}{2h}\Big)^2+\Big(\frac{n_y}{a}\Big)^2},\quad f_{\min}=\frac{c}{4h} | 2024-三：底与侧壁硬、水面软

# 声辐射
脉动球 | p=\frac Are^{j(\omega t-kr)},\quad |A|=\frac{\rho_0c_0kr_0^2u_a}{\sqrt{1+(kr_0)^2}} | (6-1-5)、(6-1-8)
球面波速度 | v_r=\frac{p}{\rho_0c_0}\Big(1+\frac1{jkr}\Big),\quad Z_s=\rho_0c_0\frac{jkr}{1+jkr} | (6-1-6)
辐射阻抗 | Z_r=\rho_0c_0S_0\frac{(kr_0)^2+jkr_0}{1+(kr_0)^2} | (6-1-12)
小球源 | R_r\approx\rho_0c_0S_0(kr_0)^2,\quad M_r=3\cdot\frac43\pi r_0^3\rho_0 | (6-1-19)，$kr_0\ll1$
辐射功率 | \bar W=\frac12R_ru_a^2=4\pi r^2\frac{p_e^2}{\rho_0c_0} | (6-1-18)、(6-1-22)
点源 | p=j\frac{k\rho_0c_0}{4\pi r}Q_0e^{j(\omega t-kr)},\quad 障板上\ \frac{k\rho_0c_0}{2\pi r} | (6-4-1)、(6-4-2)，$Q_0=4\pi r_0^2u_a$
偶极子 | p\approx-j\frac{kAl}{r}\cos\theta\,e^{j(\omega t-kr)},\quad D(\theta)=|\cos\theta| | (6-2-4)、(6-2-6)
偶极子功率 | \bar W=\frac23\pi\rho_0c_0k^4r_0^4l^2u_a^2 | (6-2-10)
两同相源 | D(\theta)=\Big|\frac{\sin(kl\sin\theta)}{2\sin(\frac12kl\sin\theta)}\Big|=\Big|\cos\Big(\frac12kl\sin\theta\Big)\Big|,\quad \bar\theta=2\arcsin\frac\lambda{2l} | (6-3-3)、(6-3-6)
声柱 | D(\theta)=\Big|\frac{\sin(\frac n2kl\sin\theta)}{n\sin(\frac12kl\sin\theta)}\Big|,\quad \bar\theta=2\arcsin\frac{\lambda}{nl} | (6-3-23)、(6-3-26)
声柱旁瓣与轴向 | D_1\approx\frac2{3\pi}\ (-13.5\ \mathrm{dB}),\quad I_{轴}=n^2I_1 | (6-3-29)、(6-3-33)
互辐射与互易 | Z_1=Z_{11}+Z_{12},\quad \frac{p_{21}}{U_1}=\frac{p_{12}}{U_2} | (6-3-7)、(6-3-19)
障板活塞 | p=j\frac{\omega\rho_0u_aa^2}{2r}\Big[\frac{2J_1(ka\sin\theta)}{ka\sin\theta}\Big]e^{j(\omega t-kr)} | (6-5-6)；第一零点 $\sin\theta=0.61\lambda/a$
活塞辐射阻抗 | 低频\ R_r\approx\frac{\rho_0c_0k^2}{2\pi}(\pi a^2)^2,\quad M_r=\frac83\rho_0a^3;\quad 高频\ R_r\approx\rho_0c_0\pi a^2 | (6-5-39)～(6-5-41)
活塞近场 | z_g=\frac{a^2}{\lambda} | (6-5-20)：轴上最后一个极大

# 接收与散射
压强式 | F=p_aSe^{j(\omega t-kr)} | (7-1-6)，无指向性
压差式 | F_a=|p_a|kS\Delta\cos\theta\frac{\sqrt{1+k^2r^2}}{kr} | (7-1-9)；近场 $\propto1/r$：近讲效应
复合式 | F_a=|p_a||G|S(1+B\cos\theta),\quad B=\frac{\Delta}{c_0C_aR_a} | (7-1-16)、(7-1-15)；$B=1$ 心形
线阵接收 | D=\Big|\frac{\sin[\frac{\pi b}\lambda(1-\cos\theta)]}{\frac{\pi b}\lambda(1-\cos\theta)}\Big| | (7-1-23)
刚性球散射（小球） | \bar W_s\approx\frac79\pi r_0^2(kr_0)^4I_p | (7-2-18)，$kr_0\ll1$
刚性球散射（大球） | \bar W_s\approx2\pi r_0^2I_p | (7-2-19)，$kr_0\gg1$
气泡共振 | f_r=\frac1{2\pi r_0}\sqrt{\frac{3\gamma P_0}{\rho_0}} | (7-2-37)，明纳尔特频率
多普勒（反射） | f'=f\frac{c+v\cos\theta}{c-v\cos\theta}\approx f\Big(1+\frac{2v\cos\theta}{c}\Big) | 教材外，2006-八

# 室内声场
平均自由程 | \bar L=\frac{4V}{S} | (8-1-2)
平均吸声系数 | \bar\alpha=\frac{\sum\alpha_iS_i}{S} | (8-1-3)
声能衰减 | \bar\varepsilon=\bar\varepsilon_0(1-\bar\alpha)^{\frac{c_0S}{4V}t} | (8-1-5)
艾林公式 | T_{60}=\frac{0.161V}{-S\ln(1-\bar\alpha)} | (8-1-9)
赛宾公式 | T_{60}=\frac{0.161V}{S\bar\alpha} | (8-1-10)，$\bar\alpha<0.2$
空气吸收修正 | T_{60}=\frac{0.161V}{S\bar\alpha+4mV} | (8-1-19)
房间常数 | R=\frac{S\bar\alpha}{1-\bar\alpha},\quad \bar\varepsilon_R=\frac{4\bar W}{Rc_0} | (8-1-22)、(8-1-23)
稳态声压级 | SPL=SWL+10\lg\Big(\frac{Q}{4\pi r^2}+\frac4R\Big) | (8-1-32)
混响半径 | r_c=\frac14\sqrt{\frac{QR}{\pi}} | (8-1-33)，直达声 = 混响声
简正频率 | f=\frac{c_0}2\sqrt{\Big(\frac{n_x}{l_x}\Big)^2+\Big(\frac{n_y}{l_y}\Big)^2+\Big(\frac{n_z}{l_z}\Big)^2} | (8-2-3)
简正方式 | p=A\cos\frac{n_x\pi x}{l_x}\cos\frac{n_y\pi y}{l_y}\cos\frac{n_z\pi z}{l_z}e^{j\omega_nt} | (8-2-2)；墙角为所有方式的波腹
简正频率数 | N\approx\frac{4\pi f^3V}{3c_0^3}+\frac{\pi f^2S}{4c_0^2}+\frac{fL}{8c_0} | (8-2-5)，$L$ 为棱长总和

# 固体中的声波
拉密常数 | \lambda=\frac{E\sigma}{(1+\sigma)(1-2\sigma)},\quad \mu=\frac{E}{2(1+\sigma)} | (11-1-13)
反过来 | E=\frac{(3\lambda+2\mu)\mu}{\lambda+\mu},\quad \sigma=\frac{\lambda}{2(\lambda+\mu)} | 习题 11-1
波动方程 | \rho\ddot{\boldsymbol s}=(\lambda+2\mu)\,\mathrm{grad\,div}\,\boldsymbol s-\mu\,\mathrm{rot\,rot}\,\boldsymbol s | (11-2-5)
纵波与横波 | c_L=\sqrt{\frac{\lambda+2\mu}{\rho}}=\sqrt{\frac{E(1-\sigma)}{\rho(1+\sigma)(1-2\sigma)}},\quad c_T=\sqrt{\frac\mu\rho}=\sqrt{\frac{E}{2\rho(1+\sigma)}}
声速比 | \Big(\frac{c_L}{c_T}\Big)^2=\frac{2(1-\sigma)}{1-2\sigma}>2,\quad \sigma=\frac{2-(c_L/c_T)^2}{2[1-(c_L/c_T)^2]} | 习题 11-2
细棒与块体 | c_{棒}=\sqrt{\frac E\rho}<c_L | 细棒可横向自由收缩
瑞利波 | c_s\approx(0.87\sim0.96)c_T,\quad \sigma=0.25\ 时\ c_s=0.919c_T | 11.2.3；书中下限印作 0.814
液固界面 | \frac{\sin\theta_i}{c_1}=\frac{\sin\theta_{tL}}{c_{2L}}=\frac{\sin\theta_{tT}}{c_{2T}} | (11-2-25)，两个临界角

# 特殊函数
J₀ 的零点 | \mu=2.405,\quad 5.520,\quad 8.654,\quad 11.79 | 圆膜 $J_0(ka)=0$
J₁ 的零点 | 3.832,\quad 7.016,\quad 10.17 | 刚性圆管轴对称 $J_0'=-J_1=0$；活塞指向性零点
J'ₘ 的零点 | m=1:\ 1.841,\ 5.331;\quad m=2:\ 3.054;\quad m=0:\ 3.832 | 刚性圆管截止
常用值 | J_0(0)=1,\quad J_1(x)\approx\frac x2\ (x\ll1),\quad J_1(2)\approx0.577 | 
导数关系 | J_0'(x)=-J_1(x),\quad J_m'=\frac12(J_{m-1}-J_{m+1}),\quad \int xJ_0\,dx=xJ_1
大宗量 | J_m(x)\approx\sqrt{\frac2{\pi x}}\cos\Big(x-\frac{m\pi}2-\frac\pi4\Big) | $x\gg1$
球贝塞尔 | j_0(x)=\frac{\sin x}x,\quad n_0(x)=-\frac{\cos x}x,\quad h_0^{(2)}(x)=\frac{j}{x}e^{-jx} | (6-7-29)、(6-7-33)
勒让德 | P_0=1,\quad P_1=\cos\theta,\quad P_2=\frac12(3\cos^2\theta-1) | 球函数展开
欧拉公式 | e^{j\theta}=\cos\theta+j\sin\theta | 时间因子 $e^{j\omega t}$（教材）
等比求和 | \sum_{i=0}^{n-1}e^{-ji\psi}=e^{-j\frac{(n-1)\psi}2}\frac{\sin\frac{n\psi}2}{\sin\frac\psi2} | 声柱阵因子

# 分贝运算
声压级与声压 | p_e=2\times10^{-5}\times10^{SPL/20},\quad I=10^{-12}\times10^{SIL/10} | 
倍数对应 | 声压\times2:+6\ \mathrm{dB},\quad 能量\times2:+3\ \mathrm{dB},\quad \times10:+20/+10\ \mathrm{dB}
不相干叠加 | L=10\lg\big(10^{L_1/10}+10^{L_2/10}+\cdots\big) | 两个相同声源 +3 dB
同相叠加 | 两个相同相干声源同相：+6\ \mathrm{dB} | 反相为 0（完全抵消）
球面衰减 | \Delta L=20\lg\frac{r_2}{r_1},\quad 距离加倍\ -6\ \mathrm{dB} | 点源自由场
声功率级 | SPL=SWL-20\lg r-11\ (自由场),\quad -8\ (半自由场) | 由 $\bar W=4\pi r^2p_e^2/\rho_0c_0$ 得
`;

const FX = (() => {
  const groups = [];
  for (const raw of FX_SRC.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# ')) { groups.push({ name: line.slice(2), items: [] }); continue; }
    const [name, tex, note = ''] = line.split(' | ');
    groups[groups.length - 1].items.push({ name, tex, note, search: (name + ' ' + tex + ' ' + note).toLowerCase() });
  }
  return groups;
})();

(() => {
  const ST = { x: null, y: null, w: 560, h: 0, open: false, hide: false };
  try { Object.assign(ST, JSON.parse(localStorage.getItem('acou.fx') || '{}')); } catch (e) { /* defaults */ }
  const save = () => { try { localStorage.setItem('acou.fx', JSON.stringify(ST)); } catch (e) { /* ignore */ } };
  const cjk = s => s.replace(/[　-〿一-鿿！-～]+/g, w => `\\text{${w}}`);
  const tex = (s, big = true) => {
    try { return katex.renderToString((big ? '\\displaystyle ' : '') + cjk(s), { throwOnError: false, strict: 'ignore' }); } catch (e) { return esc(s); }
  };
  // "a,\quad b" entries wrap between the pieces, never inside one
  const pieces = s => {
    const ps = s.split(/([,;])\\q?quad\s*/);
    const out = [];
    for (let i = 0; i < ps.length; i += 2) out.push(`<span class="fx-p">${tex(ps[i] + (ps[i + 1] || ''))}</span>`);
    return `<div class="fx-ps">${out.join('')}</div>`;
  };
  // textbook equation numbers in a note link to the book page (linkEq from app.js)
  const note = s => s.split(/\$([^$]+)\$/).map((p, i) => (i % 2 ? tex(p, false) : linkEq(esc(p)))).join('');
  const html = it => it.html || (it.html = `<div class="fx-it"><div class="fx-nm">${esc(it.name)}</div>
    <div class="fx-f">${pieces(it.tex)}${it.note ? `<div class="fx-note">${note(it.note)}</div>` : ''}</div></div>`);

  const box = document.createElement('div');
  box.id = 'fx';
  box.hidden = true;
  box.innerHTML = `<div class="fx-hd" title="拖动移动窗口"><b>公式速查</b>
      <input type="search" id="fxq" placeholder="搜索：共鸣器、截止、混响、J₀、dB…">
      <label class="small" title="遮住公式，点一下显示，用来背诵"><input type="checkbox" id="fxhide">背诵</label>
      <button class="icon" id="fxclose" title="关闭（Esc / Alt+F）">×</button></div>
    <div class="fx-chips">${FX.map((g, i) => `<button data-fxg="${i}">${esc(g.name)}</button>`).join('')}</div>
    <div class="fx-body"></div>`;
  document.body.appendChild(box);
  const body = $('.fx-body', box), q = $('#fxq', box);

  function render() {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    let out = '', n = 0;
    FX.forEach((g, i) => {
      const its = words.length ? g.items.filter(it => words.every(w => it.search.includes(w) || g.name.includes(w))) : g.items;
      if (!its.length) return;
      n += its.length;
      out += `<div class="fx-g" data-fxsec="${i}">${esc(g.name)}</div>` + its.map(html).join('');
    });
    body.innerHTML = out || '<p class="muted small" style="padding:10px 14px">没有找到匹配的公式。</p>';
    box.classList.toggle('hide', ST.hide);
    $$('.fx-chips [data-fxg]', box).forEach(b => { b.disabled = !body.querySelector(`[data-fxsec="${b.dataset.fxg}"]`); });
    return n;
  }
  function place() {  // keep the window on screen (after a resize of the app window too)
    const W = innerWidth, H = innerHeight;
    ST.w = Math.min(Math.max(ST.w || 560, 320), W - 16);
    ST.h = Math.min(Math.max(ST.h || Math.round(H * 0.7), 220), H - 16);
    if (ST.x == null) { ST.x = W - ST.w - 24; ST.y = 100; }
    ST.x = Math.min(Math.max(ST.x, 8), W - ST.w - 8);
    ST.y = Math.min(Math.max(ST.y, 8), H - 60);
    Object.assign(box.style, { left: ST.x + 'px', top: ST.y + 'px', width: ST.w + 'px', height: ST.h + 'px' });
  }
  function toggle(open = box.hidden) {
    ST.open = open;
    save();
    $('#fxBtn').classList.toggle('on', open);
    if (!open) { box.hidden = true; return; }
    if (!body.childElementCount) render();
    box.hidden = false;
    place();
    q.focus();
    q.select();
  }

  // drag by the title bar
  $('.fx-hd', box).addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('input, button, label')) return;
    const dx = e.clientX - ST.x, dy = e.clientY - ST.y, hd = e.currentTarget;
    hd.setPointerCapture(e.pointerId);
    const move = ev => { ST.x = ev.clientX - dx; ST.y = ev.clientY - dy; place(); };
    const up = () => { hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); save(); };
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up);
    e.preventDefault();
  });
  // resized from the corner (CSS resize): remember the size
  new ResizeObserver(() => {
    if (box.hidden) return;
    ST.w = box.offsetWidth; ST.h = box.offsetHeight;
    clearTimeout(box.saveT); box.saveT = setTimeout(save, 300);
  }).observe(box);
  addEventListener('resize', () => { if (!box.hidden) place(); });

  q.addEventListener('input', render);
  $('#fxhide', box).checked = ST.hide;
  $('#fxhide', box).addEventListener('change', e => { ST.hide = e.target.checked; save(); box.classList.toggle('hide', ST.hide); $$('.fx-it.show', box).forEach(x => x.classList.remove('show')); });
  $('#fxclose', box).addEventListener('click', () => toggle(false));
  box.addEventListener('click', e => {
    const c = e.target.closest('[data-fxg]');
    if (c) { const s = body.querySelector(`[data-fxsec="${c.dataset.fxg}"]`); if (s) body.scrollTop = s.offsetTop - body.offsetTop; return; }
    const it = e.target.closest('.fx-it');
    if (it && ST.hide) it.classList.toggle('show');
  });
  box.addEventListener('keydown', e => {
    e.stopPropagation();  // typing in the search box must not trigger page shortcuts
    if (e.key === 'Escape' || (e.altKey && e.code === 'KeyF')) { e.preventDefault(); toggle(false); }
  });
  $('#fxBtn').addEventListener('click', () => toggle());
  addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyF') { e.preventDefault(); toggle(); }
  });
  if (ST.open) toggle(true);
})();
