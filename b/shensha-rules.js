/* =========================================================================
 * 四柱八字智能排盘 - 神煞规则
 * 把原 index.html 中约 1300 行重复的“for + if(gz==…) ”匹配循环,
 * 统一压缩为“规则表 + 通用匹配引擎”(匹配引擎见 main.js)。
 *
 * 每条规则: { table: 查找表名, patterns: [候选串1, 候选串2, …] }
 *   table    data.js 中的神煞查找表名
 *   patterns 若干候选串; 只要表中任一组合串等于任一候选串, 该星曜即算出现
 *
 * 候选串由若干“原子”拼接而成。原子 = 柱 + 取值:
 *   year / month / day / time + Gan / Zhi / GanZhi / NaYin
 *       年柱 / 月柱 / 日柱 / 时柱 的 天干 / 地支 / 干支 / 纳音
 *   moving + Gan / Zhi / NaYin
 *       移动柱(大运/流年/流月/流日/流时)的 天干 / 地支 / 纳音
 * 例如 patterns: [["yearZhi","monthZhi","dayZhi"]] 表示候选串 = 年支+月支+日支
 * ========================================================================= */
var ShenShaRules = (function () {
  var ruleSet = {};
  // ---- 年柱神煞规则(12条) ----
  ruleSet.year = [
    {table: "shenShaGanGan", patterns: [["yearGan", "monthGan", "dayGan"], ["monthGan", "dayGan", "timeGan"]]},
    {table: "shenShaZhiZhi", patterns: [["yearZhi", "monthZhi", "dayZhi"], ["yearZhi", "monthZhi", "timeZhi"], ["yearZhi", "dayZhi", "timeZhi"], ["monthZhi", "dayZhi", "timeZhi"]]},
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "yearZhi"], ["dayGan", "yearZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["dayZhi", "yearZhi"], ["yearZhi", "yearZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "yearZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "yearGan"], ["monthZhi", "yearZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "yearZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["dayGan", "yearGanZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "yearZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "yearGanZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["dayNaYin", "yearNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "yearZhi"]]},
  ];

  // ---- 月柱神煞规则(13条) ----
  ruleSet.month = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "monthZhi"], ["dayGan", "monthZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "monthZhi"], ["dayZhi", "monthZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "monthZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "monthGan"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "monthZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "monthZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "monthGanZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "monthGanZhi"], ["dayGan", "monthGanZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "monthZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "monthGanZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "monthZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "monthNaYin"], ["dayNaYin", "monthNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "monthZhi"]]},
  ];

  // ---- 日柱神煞规则(17条) ----
  ruleSet.day = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "dayZhi"], ["dayGan", "dayZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "dayZhi"], ["dayZhi", "dayZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "dayZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "dayGan"], ["monthZhi", "dayZhi"]]},
    {table: "shenShaDayTimeGanZhi", patterns: [["dayGanZhi"]]},
    {table: "shenShaDayDayGanZhi", patterns: [["dayGanZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGanZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "dayZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "dayGanZhi"]]},
    {table: "shenShaMonthZhiDayZhiTimeZhi", patterns: [["monthZhi", "dayZhi"]]},
    {table: "shenShaYearNaYinDayZhiTimeZhi", patterns: [["yearNaYin", "dayZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "dayGanZhi"], ["dayGan", "dayGanZhi"]]},
    {table: "shenShaMonthZhiDayGanZhi", patterns: [["monthZhi", "dayGanZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "dayZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "dayZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "dayGanZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "dayNaYin"]]},
  ];

  // ---- 时柱神煞规则(19条) ----
  ruleSet.time = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "timeZhi"], ["dayGan", "timeZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "timeZhi"], ["dayZhi", "timeZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "timeZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "timeGan"], ["monthZhi", "timeZhi"]]},
    {table: "shenShaDayTimeGanZhi", patterns: [["timeGanZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "timeZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "timeZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "timeGanZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "timeGanZhi"], ["dayGan", "timeGanZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "timeZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "timeZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "timeGanZhi"]]},
    {table: "shenShaDayGanTimeZhi", patterns: [["dayGan", "timeZhi"]]},
    {table: "shenShaDayZhiTimeZhi", patterns: [["dayZhi", "timeZhi"]]},
    {table: "shenShaDayGanZhiTimeGanZhi", patterns: [["dayGanZhi", "timeGanZhi"]]},
    {table: "shenShaMonthZhiDayZhiTimeZhi", patterns: [["monthZhi", "timeZhi"]]},
    {table: "shenShaYearNaYinDayZhiTimeZhi", patterns: [["yearNaYin", "timeZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "timeNaYin"], ["dayNaYin", "timeNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "timeZhi"]]},
  ];

  // ---- 大运神煞规则(15条) ----
  ruleSet.daYun = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "movingZhi"], ["dayGan", "movingZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "movingGan"], ["monthZhi", "movingZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "movingZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "movingGan", "movingZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "movingGan", "movingZhi"], ["dayGan", "movingGan", "movingZhi"]]},
    {table: "shenShaYearZhiDaYunLiuNianZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDayZhidaYunliuNianZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "movingGan", "movingZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "movingNaYin"], ["dayNaYin", "movingNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "movingZhi"]]},
  ];

  // ---- 流年神煞规则(15条) ----
  ruleSet.liuNian = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "movingZhi"], ["dayGan", "movingZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "movingGan"], ["monthZhi", "movingZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "movingZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "movingGan", "movingZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "movingGan", "movingZhi"], ["dayGan", "movingGan", "movingZhi"]]},
    {table: "shenShaYearZhiDaYunLiuNianZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDayZhidaYunliuNianZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "movingGan", "movingZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "movingNaYin"], ["dayNaYin", "movingNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "movingZhi"]]},
  ];

  // ---- 流月神煞规则(15条) ----
  ruleSet.liuYue = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "movingZhi"], ["dayGan", "movingZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "movingGan"], ["monthZhi", "movingZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "movingZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDaYunLiuNianZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDayZhidaYunliuNianZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "movingGan", "movingZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "movingGan", "movingZhi"], ["dayGan", "movingGan", "movingZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "movingGan", "movingZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "movingNaYin"], ["dayNaYin", "movingNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "movingZhi"]]},
  ];

  // ---- 流日神煞规则(15条) ----
  ruleSet.liuRi = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "movingZhi"], ["dayGan", "movingZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "movingGan"], ["monthZhi", "movingZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "movingZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDaYunLiuNianZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDayZhidaYunliuNianZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "movingGan", "movingZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "movingGan", "movingZhi"], ["dayGan", "movingGan", "movingZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "movingGan", "movingZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "movingNaYin"], ["dayNaYin", "movingNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "movingZhi"]]},
  ];

  // ---- 流时神煞规则(15条) ----
  ruleSet.liuShi = [
    {table: "shenShaYearDayGanZhi", patterns: [["yearGan", "movingZhi"], ["dayGan", "movingZhi"]]},
    {table: "shenShaYearNaYinYearDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaMonthZhiGanZhi", patterns: [["monthZhi", "movingGan"], ["monthZhi", "movingZhi"]]},
    {table: "shenShaDayGanDiZhi", patterns: [["dayGan", "movingZhi"]]},
    {table: "shenShaYearZhiDiZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDaYunLiuNianZhi", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearZhiDayZhidaYunliuNianZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearZhiGanZhi", patterns: [["yearZhi", "movingGan", "movingZhi"]]},
    {table: "shenShaYearGanDayGanGanZhi", patterns: [["yearGan", "movingGan", "movingZhi"], ["dayGan", "movingGan", "movingZhi"]]},
    {table: "shenShaYearZhiZhiGenderVariant", patterns: [["yearZhi", "movingZhi"]]},
    {table: "shenShaYearDayZhiZhi", patterns: [["yearZhi", "movingZhi"], ["dayZhi", "movingZhi"]]},
    {table: "shenShaYearNaYinDiZhi", patterns: [["yearNaYin", "movingZhi"]]},
    {table: "shenShaYearNaYinGanZhi", patterns: [["yearNaYin", "movingGan", "movingZhi"]]},
    {table: "shenShaYearNaYinDayNaYin", patterns: [["yearNaYin", "movingNaYin"], ["dayNaYin", "movingNaYin"]]},
    {table: "shenShaDayZhiDiZhi", patterns: [["dayZhi", "movingZhi"]]},
  ];

  return ruleSet;
})();
