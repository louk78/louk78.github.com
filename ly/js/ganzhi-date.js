/* ==================================================================
  ly/js/ganzhi-date.js —— 六十甲子与空亡、今日日柱推算、按日期反查、年月时柱（节气）
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ----------------  / kongwang ---------------- */
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const STEM_SPIRIT_GROUP = {'甲':0,'乙':0,'丙':1,'丁':1,'戊':2,'己':3,'庚':4,'辛':4,'壬':5,'癸':5};
const BRANCHES12 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const KONG_PAIRS = [['戌','亥'],['申','酉'],['午','未'],['辰','巳'],['寅','卯'],['子','丑']];
const JIAZI60 = [];
for(let i=0;i<60;i++){
  JIAZI60.push({label:STEMS[i%10]+BRANCHES12[i%12], stem:STEMS[i%10], kongGroup:Math.floor(i/10)});
}
const dayGanzhiSelect = document.getElementById('dayGanzhi');
dayGanzhiSelect.innerHTML = JIAZI60.map((d,i)=>`<option value="${i}">${d.label}</option>`).join('');

// ---- 自动选中今天的日柱（对应桌面版 ganzhi.py 的算法，用同一批日期校准过）----
function getTodayJiaziIndex(date = new Date()){
  const daysSinceEpoch = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const OFFSET = 17; // 校准过：2026-07-25→庚子(36)、07-26→辛丑(37)、07-27→壬寅(38)
  return ((daysSinceEpoch + OFFSET) % 60 + 60) % 60;
}
dayGanzhiSelect.value = String(getTodayJiaziIndex());

// ---- "干支日→实际公历日期"换算要用到的两个基础工具：
// 1) 干支文字（如"戊戌"）反查是第几个甲子（0-59），供下面annotateGanzhiDay按文本匹配到的干支
//    去查它的下标；跟dayGanzhiIndex用的是同一份JIAZI60数据源，不会出现两边表对不上的情况。
const JIAZI60_INDEX_BY_LABEL = {};
JIAZI60.forEach((d,i)=>{ JIAZI60_INDEX_BY_LABEL[d.label] = i; });
// 2) 从某个"起卦锚点日"（真实公历日期）开始，往后找第一个干支下标等于targetIndex的那天。
//    直接复用getTodayJiaziIndex()逐天试算，而不是自己另写一套模运算——干支和日期的对应关系
//    只有这一份代码在算，"今日日柱""按日期反查日柱""干支日应期换算"三处用的是同一个函数，
//    不会因为分别抄一遍公式而互相走漏、算出两个不一致的结果。60甲子每60天必然轮完一圈，
//    所以最多找60天一定能命中，理论上不会落空。
function findNextDateForGanzhiIndex(anchorDate, targetIndex){
  for(let offset = 0; offset < 60; offset++){
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + offset);
    if(getTodayJiaziIndex(d) === targetIndex) return d;
  }
  return null; // 防御性兜底，正常不会走到这里
}

// ---- 年月时柱/日期显示要用哪个"时刻"算：默认是null，表示用renderPlate()里现取的
// "现在"（正常摇卦场景）；只有下面"按公历日期反查日柱"成功命中之后，才会把那个具体日期
// 存进来，让年月时柱和日期显示也对上那次反查的真实日期，而不是"现在"——
// 这样AI断卦时用到的月柱（月建定旺相休囚死）才是那个历史卦例真正的月柱，不是复盘当天的。
// 只要用户之后没有手动去改日柱下拉框，这个关联就一直有效；一旦手动改了下拉框
// （见下面dayGanzhiSelect的change监听），就清空退回"现在"——因为单选一个干支
// 本身是模糊的（六十天一轮回，没法反推唯一对应哪一天），没法再关联到具体日期。
let knownCastDate = null;
dayGanzhiSelect.addEventListener('change', ()=>{ knownCastDate = null; });

// ---- 按公历日期反查日柱：想复盘某个历史案例（比如书上的老案例、以前手动摇的卦）
// 之前只能自己心算六十甲子再去下拉框里找，这里加个日期选择器，选完直接调用上面已有的
// getTodayJiaziIndex(date) 反推那天的日柱下标，自动帮下拉框选中，不用再手动数。
// 只负责"选中"，不自动触发摇卦/生成排盘——选完日柱后用户仍按原来的流程点"摇卦"或
// "生成排盘"，跟直接手动在下拉框里选一样，不额外改变其他状态。
const dayLookupDateInput = document.getElementById('dayLookupDate');
if(dayLookupDateInput){
  dayLookupDateInput.addEventListener('change', ()=>{
    const v = dayLookupDateInput.value; // "YYYY-MM-DD"
    if(!v) return;
    const [y,m,d] = v.split('-').map(Number);
    if(!y || !m || !d) return;
    const picked = new Date(y, m-1, d); // 按本地日历日期算，跟getTodayJiaziIndex(new Date())默认走同一套时区口径
    // 用JS赋值.value不会触发上面dayGanzhiSelect的'change'监听（那个监听只认用户手动在下拉框里
    // 选选项这种真实交互），所以这里设置knownCastDate不会被自己刚改的下拉框清空。
    dayGanzhiSelect.value = String(getTodayJiaziIndex(picked));
    knownCastDate = picked;
    showToast(`已按 ${v} 反查并选中日柱：${JIAZI60[getTodayJiaziIndex(picked)].label}`);
  });
}

/* ==================================================================
   年月时柱（干支）：配合上面的日柱下拉框，一起凑成"年月日时"四柱。
   日柱本来就有下拉框可以手动改成任意一天（用来复原线下摇卦发生的那天）；
   年柱、月柱、时柱这里改成完全按"起卦这一刻的系统时间"现算，不跟着日柱下拉框联动——
   一来年月柱变化很慢（一年一变 / 一个节气一变），二来如果日柱被手动改成了别的日子，
   非要联动着去反推那天对应的年月时柱，反而容易算错、也偏离了这三柱在这里的用途：
   六爻真正要用的只有日柱（起六神、算空亡），年月日时四柱只是给用户/AI看的一份
   "起卦时刻"参考信息，写法上贴近网上解卦博主发帖时惯常带的那行"公历/干支"。

   月柱、年柱的边界严格来说都不是按固定公历日期走的，是按"节气"走的（准确说是
   十二个"节"，不含"气"）——原来用固定日期近似表（比如立春按2/4）多数年份是准的，
   但节气本身每年在公历上会前后浮动一两天，边界年份就可能被近似表判错。比如
   2025年"立春"实际发生在2月3日22点多（北京时间），比常见的"2/4"早了一天多，
   2月3日晚上起卦就会被近似表误判成还在上一个月柱、上一个年柱。
   这里换成直接计算太阳视黄经（apparent ecliptic longitude）来判定节气边界，不再
   查近似表：太阳视黄经每年绕一圈360°，"节"（不算"气"）固定卡在315°/345°/15°/
   45°...每隔30°一个，谁跨过这些刻度线谁就换月柱；315°这个刻度（立春）额外兼任
   年柱的分界。算法用天文测算里通行的低精度太阳坐标公式（Meeus《Astronomical
   Algorithms》第25章的简化版本：平黄经+几项周期修正项，精度约0.01°，换算成时间
   误差通常在几分钟以内，判定节气边界绰绰有余），只是三角函数和多项式运算，
   不依赖外部天文库/网络请求/逐年数据表，符合本项目"零依赖单文件"的约束。
   ================================================================== */
// 儒略日（Julian Day）：date.getTime()本身就是UTC毫秒数，天然已经按时区换算好，
// 不需要再手动处理时区偏移。
function julianDay(date){
  return date.getTime() / 86400000 + 2440587.5;
}
// 太阳视黄经（0°~360°），Meeus低精度公式：平黄经 + 中心差修正 + 章动/光行差修正，
// T是从J2000.0起算的儒略世纪数。精度约0.01°（对应约几分钟的时间误差），
// 判定节气边界（我们只需要日甚至时级精度）绰绰有余，不需要更高阶的行星历表。
function sunApparentLongitude(date){
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983*T + 0.0003032*T*T;      // 太阳平黄经
  const M  = 357.52911 + 35999.05029*T - 0.0001537*T*T;      // 平近点角
  const Mr = M * rad;
  const C = (1.914602 - 0.004817*T - 0.000014*T*T) * Math.sin(Mr)
          + (0.019993 - 0.000101*T) * Math.sin(2*Mr)
          + 0.000289 * Math.sin(3*Mr);                       // 中心差
  const trueLong = L0 + C;
  const Omega = 125.04 - 1934.136*T;
  const apparentLong = trueLong - 0.00569 - 0.00478*Math.sin(Omega*rad); // 章动+光行差修正
  return ((apparentLong % 360) + 360) % 360;
}
// 十二"节"对应的地支，按太阳视黄经315°起排（315°=立春=寅月起点），此后每隔30°换一档，
// 顺序跟传统节气表完全一致（不掺"气"，"气"只影响中气/闰月判断，跟六爻月柱无关）。
const JIE_BRANCHES_FROM_LICHUN = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
function getSolarMonthBranch(date){
  const lon = sunApparentLongitude(date);
  const idx = Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
  return JIE_BRANCHES_FROM_LICHUN[idx];
}
// 年柱同样按"立春"换年，是同一套边界：上面12档里的最后一档"丑"（315°往前推30°，
// 也就是小寒到立春之间那段，通常落在公历1月上旬到2月上旬）此时还没跨过立春，
// 哪怕公历已经翻到新一年，年柱仍算上一年——用idx===11（丑）直接判断"是否还没立春"，
// 比原来卡固定"2/4"更准，边界年份也不会错判。
function getYearPillar(date){
  const lon = sunApparentLongitude(date);
  const idx = Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
  const y = idx === 11 ? date.getFullYear() - 1 : date.getFullYear();
  const gzIdx = ((y-4)%60+60)%60;
  return { stemIdx: gzIdx%10, label: STEMS[gzIdx%10]+BRANCHES12[gzIdx%12] };
}
// 五虎遁：由年干推月干（寅月起）。口诀"甲己丙寅头/乙庚戊寅头/丙辛庚寅头/丁壬壬寅头/戊癸甲寅头"，
// 换算成STEMS数组下标就是 (年干下标%5)*2+2 = 寅月天干下标，其余月依次顺推。
function getMonthPillar(date, yearStemIdx){
  const branch = getSolarMonthBranch(date);
  const offsetFromYin = (BRANCHES12.indexOf(branch) - 2 + 12) % 12; // 寅=0，往后顺数
  const startStemIdx = ((yearStemIdx % 5) * 2 + 2) % 10;
  return { label: STEMS[(startStemIdx + offsetFromYin) % 10] + branch };
}
function hourBranchOf(hour){
  if(hour===23 || hour===0) return '子';
  if(hour>=1  && hour<3)  return '丑';
  if(hour>=3  && hour<5)  return '寅';
  if(hour>=5  && hour<7)  return '卯';
  if(hour>=7  && hour<9)  return '辰';
  if(hour>=9  && hour<11) return '巳';
  if(hour>=11 && hour<13) return '午';
  if(hour>=13 && hour<15) return '未';
  if(hour>=15 && hour<17) return '申';
  if(hour>=17 && hour<19) return '酉';
  if(hour>=19 && hour<21) return '戌';
  return '亥'; // 21-23点
}
// 五鼠遁：由日干推时干（子时起）。口诀"甲己还加甲/乙庚丙作初/丙辛从戊起/丁壬庚子居/戊癸壬子是真途"，
// 换算成STEMS数组下标就是 (日干下标%5)*2 = 子时天干下标，其余时辰依次顺推。
function getHourPillar(date, dayStemIdx){
  const branch = hourBranchOf(date.getHours());
  const startStemIdx = ((dayStemIdx % 5) * 2) % 10;
  return { label: STEMS[(startStemIdx + BRANCHES12.indexOf(branch)) % 10] + branch };
}
// 拼出这次起卦要用的"年柱/月柱/时柱"（日柱沿用调用方已经选好的日柱，这里不重复算）。
// now 可选传入：调用方（renderPlate）如果同一时刻还要用这个 Date 对象去生成"公历/农历"日期显示，
// 就传进来共用同一个 Date，避免这里再 new 一次跟外面差几毫秒（虽然基本不影响年月日，但没必要）。
function buildYearMonthHourPillars(dayStem, now = new Date()){
  const year = getYearPillar(now);
  const month = getMonthPillar(now, year.stemIdx);
  const hour = getHourPillar(now, STEMS.indexOf(dayStem));
  return { yearLabel: year.label, monthLabel: month.label, hourLabel: hour.label };
}
