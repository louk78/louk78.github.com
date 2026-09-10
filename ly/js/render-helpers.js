/* ==================================================================
  ly/js/render-helpers.js —— 公历/农历日期文本、四柱文本、加粗与爻画等展示小工具
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ==================================================================
   公历/农历日期显示：跟上面的年月日时干支是两码事——干支是给六爻/八字用的，
   这里是给人看的"今天到底是哪年哪月哪日"，公历、农历都要写到"年"这一级，
   避免年底年初跨农历新年那几天，只写"腊月廿三"分不清是去年还是今年。
   农历换算不自己维护一份"每年月份天数+闰月"的老黄历表（那类表格手抄极易抄错、
   错了还不容易发现），改用浏览器自带的 Intl 农历（Chinese calendar，ICU 提供）现算，
   数据来源和公历一样准。少数很老的浏览器可能不认"chinese"这个日历，
   那种情况下 getLunarDateText 会捕获异常返回空字符串，只显示公历、不硬凑农历。
   ================================================================== */
function formatGregorianText(date){
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
}
// 农历初一到三十的传统写法：初一~初十、十一~十九、二十、廿一~廿九、三十。
function lunarDayCn(d){
  const digit = ['','一','二','三','四','五','六','七','八','九','十'];
  if(d===10) return '初十';
  if(d===20) return '二十';
  if(d===30) return '三十';
  if(d<10) return '初'+digit[d];
  if(d<20) return '十'+digit[d-10];
  return '廿'+digit[d-20];
}
function getLunarDateText(date){
  try{
    // 用 formatToParts 而不是拼好的字符串，是因为要拿到 relatedYear（这个农历年"挂"在
    // 哪个公历年上）和月份原始代码（比如"Mo7"、闰月是"Mo11bis"），自己拼中文，
    // 不依赖某个语言环境刚好把格式拼成我们想要的样子。
    // era:'short' 这个选项必须带上——不带的话月份只会给"7"这种纯数字，看不出是不是闰月；
    // 带上之后才会给"Mo7"/闰月"Mo11bis"这种带闰月标记的代码，下面靠这个代码判断是否闰月。
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', {year:'numeric', month:'numeric', day:'numeric', era:'short'}).formatToParts(date);
    const monthRaw = parts.find(p=>p.type==='month')?.value || '';
    const dayRaw = parts.find(p=>p.type==='day')?.value || '';
    const relatedYearRaw = parts.find(p=>p.type==='relatedYear')?.value || parts.find(p=>p.type==='year')?.value || '';
    const m = monthRaw.match(/^Mo(\d+)(bis)?$/i);
    const monthNum = m ? parseInt(m[1],10) : NaN;
    const isLeap = !!(m && m[2]);
    const dayNum = parseInt(dayRaw,10);
    const relatedYear = parseInt(relatedYearRaw,10);
    if(!monthNum || !dayNum || !relatedYear) return '';
    // 农历年份的干支纪年在这里按"农历新年"换年（跟公历年不是同一天切换），
    // 用的还是 STEMS/BRANCHES12 那套六十甲子，只是换年时间点不同于八字用的"立春"（getYearPillar）。
    const yearIdx = ((relatedYear-4)%60+60)%60;
    const yearGanzhi = STEMS[yearIdx%10] + BRANCHES12[yearIdx%12];
    const monthNames = ['','正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const monthText = (isLeap?'闰':'') + (monthNames[monthNum] || `${monthNum}月`);
    return `农历：${yearGanzhi}年${monthText}${lunarDayCn(dayNum)}`;
  }catch(e){
    return ''; // 极少数不支持"chinese"日历的浏览器，就只显示公历，不强行拼农历
  }
}
// 拼出"公历：X年X月X日　农历：干支年X月X日"这一整行，起卦当下排盘区、历史记录回看两处共用。
function buildDateDisplayText(date){
  const solarText = `公历：${formatGregorianText(date)}`;
  const lunarText = getLunarDateText(date);
  return lunarText ? `${solarText}　${lunarText}` : solarText;
}
// 跟 boldPillarsHtml 同一个思路，把"公历：X"“农历：X”里"："后面的值部分加粗。
function boldDateHtml(text){
  return String(text||'').replace(/(公历|农历)：([^\s　]+)/g, '$1：<b>$2</b>');
}
// ---- 拼出"年柱 月柱 日柱 时柱 + 空亡"这一整行展示/喂给AI用的文本：排盘区展示、AI提示词拼接、
// 历史记录快照三处共用同一份拼接逻辑，避免各处各写一套顺序或文案，越改越不一致。
// 兼容老数据：这次改版之前存的历史记录、或刷新页面后从localStorage续接的castData，
// 只有 dayKongText（日柱+空亡两项），没有年月时三柱，这里直接返回 dayKongText 原样，不强行拼凑。
function pillarsAndKongText(castData){
  if(!castData) return '';
  if(castData.fourPillarsText){
    return castData.kongText ? `${castData.fourPillarsText}　${castData.kongText}` : castData.fourPillarsText;
  }
  return castData.dayKongText || '';
}
// 把"年柱：X"这类文本里，每个"XX柱：值"和"空亡：值"的"值"部分加粗，供排盘区、历史记录展示复用，
// 不用各处各写一遍加粗规则。用正则按"标签：值"的固定格式匹配，不依赖调用方传入的具体是哪几柱。
function boldPillarsHtml(text){
  return String(text||'')
    .replace(/(年柱|月柱|日柱|时柱)：([^\s　]+)/g, '$1：<b>$2</b>')
    .replace(/空亡：(.+)$/, '空亡：<b>$1</b>');
}

// ---- 卦象爻画图：把六爻的阴阳/动爻/世应画成"从下往上六道爻线"的直观图形，本卦一列，
// 若有动爻则右边并排再画一列变卦（动爻翻转阴阳后的新卦），中间一个箭头表示"变"——
// 比排盘表格里逐行去看"状态"和"变出"两列更直观，一眼能看出整卦长什么样、变在哪一爻。
// 起卦当下的实时排盘（renderPlate/renderPlateFromCastData）和历史记录回看（historyCastHtml）
// 三处共用同一份拼图逻辑，各自只需把六爻数据先整理成下面这个统一的入参形状。
// diagramLines：长度为6的数组，下标0=初爻(1爻)…下标5=上爻(6爻)，每项 {yang, moving, isWorld, isResponse}
function buildGuaDiagramHtml(diagramLines, guaName, bianGuaName){
  if(!Array.isArray(diagramLines) || diagramLines.length !== 6) return '';
  const hasMoving = diagramLines.some(l => l.moving);
  const renderCol = (arr, label, name) => {
    const rows = arr.slice().reverse().map(l => { // 6爻画最上、1爻画最下，跟传统卦画自下而上的顺序对应
      const bar = l.yang
        ? `<span class="gd-bar-full"></span>`
        : `<span class="gd-bar-half gd-bar-left"></span><span class="gd-bar-half gd-bar-right"></span>`;
      const mark = l.moving ? (l.yang ? '○' : '✕') : '';
      const tag = (l.isWorld ? '世' : '') + (l.isResponse ? '应' : '');
      return `<div class="gd-line${l.moving ? ' moving' : ''}">
        <span class="gd-bar">${bar}</span><span class="gd-mark">${mark}</span><span class="gd-tag">${tag}</span>
      </div>`;
    }).join('');
    const nameHtml = name ? `：<b>${escapeHtml(name)}</b>` : '';
    return `<div class="gua-diagram-col">
      <div class="gua-diagram-label">${label}${nameHtml}</div>
      <div class="gua-diagram-lines">${rows}</div>
    </div>`;
  };
  const benCol = renderCol(diagramLines, '本卦', guaName);
  if(!hasMoving) return `<div class="gua-diagram">${benCol}</div>`;
  const bianArr = diagramLines.map(l => ({ yang: l.moving ? !l.yang : l.yang, moving:false, isWorld:false, isResponse:false }));
  const bianCol = renderCol(bianArr, '变卦', bianGuaName);
  return `<div class="gua-diagram">${benCol}<div class="gua-diagram-arrow">→</div>${bianCol}</div>`;
}
// 把 renderPlate() 里的 structuredLines / 历史快照里的 cast.lines（字段都是"是否动爻/是否世爻/是否应爻/状态"
// 这套中文键名）统一换算成 buildGuaDiagramHtml 要的 {yang,moving,isWorld,isResponse} 形状，三处共用一份换算逻辑。
function structLineToDiagram(ln){
  return {
    yang: typeof ln.状态 === 'string' && (ln.状态.startsWith('少阳') || ln.状态.startsWith('老阳')),
    moving: !!ln.是否动爻,
    isWorld: !!ln.是否世爻,
    isResponse: !!ln.是否应爻,
  };
}

