/* =========================================================================
 * 四柱八字智能排盘 - 神煞规则
 * 把原 index.html 中约 1300 行重复的“for + if(gz==…) ”匹配循环,
 * 统一压缩为“规则表 + 通用匹配引擎”。每条规则:
 *   { t: 查找表名, p: [候选串1, 候选串2, …] }
 * 候选串由若干“原子”拼接而成。原子对照表:
 *   Y/M/D/T = 年/月/日/时柱;  gan/zhi/gz/nayin = 干/支/干支/纳音
 *   Mv = 移动柱(大运/流年/流月/流日/流时);  MvGan/MvZhi/MvNaYin 同理
 * 例如 p: [["Yzhi","Mzhi","Dzhi"]] 表示候选串 = 年支+月支+日支
 * ========================================================================= */
var ShenShaRules = (function () {
  var R = {};
  // ---- 年柱神煞规则(12条) ----
  R.year = [
    {t: "shenShaGanGan", p: [["Ygan", "Mgan", "Dgan"], ["Mgan", "Dgan", "Tgan"]]},
    {t: "shenShaZhiZhi", p: [["Yzhi", "Mzhi", "Dzhi"], ["Yzhi", "Mzhi", "Tzhi"], ["Yzhi", "Dzhi", "Tzhi"], ["Mzhi", "Dzhi", "Tzhi"]]},
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "Yzhi"], ["Dgan", "Yzhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Dzhi", "Yzhi"], ["Yzhi", "Yzhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "Yzhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "Ygan"], ["Mzhi", "Yzhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "Yzhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Dgan", "Ygz"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "Yzhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "Ygz"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Dnayin", "Ynayin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "Yzhi"]]},
  ];

  // ---- 月柱神煞规则(13条) ----
  R.month = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "Mzhi"], ["Dgan", "Mzhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "Mzhi"], ["Dzhi", "Mzhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "Mzhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "Mgan"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "Mzhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "Mzhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "Mgz"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "Mgz"], ["Dgan", "Mgz"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "Mzhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "Mgz"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "Mzhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "Mnayin"], ["Dnayin", "Mnayin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "Mzhi"]]},
  ];

  // ---- 日柱神煞规则(17条) ----
  R.day = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "Dzhi"], ["Dgan", "Dzhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "Dzhi"], ["Dzhi", "Dzhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "Dzhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "Dgan"], ["Mzhi", "Dzhi"]]},
    {t: "shenShaDayTimeGanZhi", p: [["Dgz"]]},
    {t: "shenShaDayDayGanZhi", p: [["Dgz"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgz"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "Dzhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "Dgz"]]},
    {t: "shenShaMonthZhiDayZhiTimeZhi", p: [["Mzhi", "Dzhi"]]},
    {t: "shenShaYearNaYinDayZhiTimeZhi", p: [["Ynayin", "Dzhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "Dgz"], ["Dgan", "Dgz"]]},
    {t: "shenShaMonthZhiDayGanZhi", p: [["Mzhi", "Dgz"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "Dzhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "Dzhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "Dgz"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "Dnayin"]]},
  ];

  // ---- 时柱神煞规则(19条) ----
  R.time = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "Tzhi"], ["Dgan", "Tzhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "Tzhi"], ["Dzhi", "Tzhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "Tzhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "Tgan"], ["Mzhi", "Tzhi"]]},
    {t: "shenShaDayTimeGanZhi", p: [["Tgz"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "Tzhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "Tzhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "Tgz"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "Tgz"], ["Dgan", "Tgz"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "Tzhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "Tzhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "Tgz"]]},
    {t: "shenShaDayGanTimeZhi", p: [["Dgan", "Tzhi"]]},
    {t: "shenShaDayZhiTimeZhi", p: [["Dzhi", "Tzhi"]]},
    {t: "shenShaDayGanZhiTimeGanZhi", p: [["Dgz", "Tgz"]]},
    {t: "shenShaMonthZhiDayZhiTimeZhi", p: [["Mzhi", "Tzhi"]]},
    {t: "shenShaYearNaYinDayZhiTimeZhi", p: [["Ynayin", "Tzhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "Tnayin"], ["Dnayin", "Tnayin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "Tzhi"]]},
  ];

  // ---- 大运神煞规则(15条) ----
  R.daYun = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "MvZhi"], ["Dgan", "MvZhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "MvGan"], ["Mzhi", "MvZhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "MvZhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "MvGan", "MvZhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "MvGan", "MvZhi"], ["Dgan", "MvGan", "MvZhi"]]},
    {t: "shenShaYearZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiDayZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "MvGan", "MvZhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "MvNaYin"], ["Dnayin", "MvNaYin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "MvZhi"]]},
  ];

  // ---- 流年神煞规则(15条) ----
  R.liuNian = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "MvZhi"], ["Dgan", "MvZhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "MvGan"], ["Mzhi", "MvZhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "MvZhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "MvGan", "MvZhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "MvGan", "MvZhi"], ["Dgan", "MvGan", "MvZhi"]]},
    {t: "shenShaYearZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiDayZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "MvGan", "MvZhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "MvNaYin"], ["Dnayin", "MvNaYin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "MvZhi"]]},
  ];

  // ---- 流月神煞规则(15条) ----
  R.liuYue = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "MvZhi"], ["Dgan", "MvZhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "MvGan"], ["Mzhi", "MvZhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "MvZhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiDayZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "MvGan", "MvZhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "MvGan", "MvZhi"], ["Dgan", "MvGan", "MvZhi"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "MvGan", "MvZhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "MvNaYin"], ["Dnayin", "MvNaYin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "MvZhi"]]},
  ];

  // ---- 流日神煞规则(15条) ----
  R.liuRi = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "MvZhi"], ["Dgan", "MvZhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "MvGan"], ["Mzhi", "MvZhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "MvZhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiDayZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "MvGan", "MvZhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "MvGan", "MvZhi"], ["Dgan", "MvGan", "MvZhi"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "MvGan", "MvZhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "MvNaYin"], ["Dnayin", "MvNaYin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "MvZhi"]]},
  ];

  // ---- 流时神煞规则(15条) ----
  R.liuShi = [
    {t: "shenShaYearDayGanZhi", p: [["Ygan", "MvZhi"], ["Dgan", "MvZhi"]]},
    {t: "shenShaYearNaYinYearDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaMonthZhiGanZhi", p: [["Mzhi", "MvGan"], ["Mzhi", "MvZhi"]]},
    {t: "shenShaDayGanDiZhi", p: [["Dgan", "MvZhi"]]},
    {t: "shenShaYearZhiDiZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearZhiDayZhidaYunliuNianZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearZhiGanZhi", p: [["Yzhi", "MvGan", "MvZhi"]]},
    {t: "shenShaYearGanDayGanGanZhi", p: [["Ygan", "MvGan", "MvZhi"], ["Dgan", "MvGan", "MvZhi"]]},
    {t: "shenShaYearZhiZhiNN", p: [["Yzhi", "MvZhi"]]},
    {t: "shenShaYearDayZhiZhi", p: [["Yzhi", "MvZhi"], ["Dzhi", "MvZhi"]]},
    {t: "shenShaYearNaYinDiZhi", p: [["Ynayin", "MvZhi"]]},
    {t: "shenShaYearNaYinGanZhi", p: [["Ynayin", "MvGan", "MvZhi"]]},
    {t: "shenShaYearNaYinDayNaYin", p: [["Ynayin", "MvNaYin"], ["Dnayin", "MvNaYin"]]},
    {t: "shenShaDayZhiDiZhi", p: [["Dzhi", "MvZhi"]]},
  ];

  return R;
})();
