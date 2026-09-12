/* ==================================================================
  ly/js/plate.js —— 排盘渲染：每爻数据、表格、卦名信息行、清残留
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ---------------- renderPlate 的分工小函数 ----------------
   排盘是一条流水线，这里按"数据 → 表格 → 卦名信息行 → 收尾清理"拆成四段，
   每段只干一件事；renderPlate() 自己只负责按顺序把它们串起来。
   ---------------- */

// 本宫首卦（八纯卦，比如乾宫首卦就是"乾为天"）六个爻位各自的六亲。
// 伏神就是从这里取的：当前卦缺了哪个六亲，就按同一爻位从首卦借那一爻叠在飞神下面
// （爻位跟首卦保持一致，因为伏神本来就是"寄居"在当前卦对应爻位下面，不是另找位置）。
// seedName 上下卦都用本宫那一卦，所以 lowerName / upperName 传同一个名字。
function pureLiuqinByPosition(palaceInfo){
  const seedName = palaceInfo.palace.slice(0, -1); // "乾宫"→"乾"
  const byPosition = [];
  for(let pos = 0; pos < 6; pos++){
    byPosition.push(najiaLineInfo(seedName, seedName, pos, palaceInfo.element));
  }
  return byPosition;
}

// 摇出来的六爻 → 每一爻的完整数据（纳甲、五行、六亲、六神、世应、空亡、变出、伏神）。
// 先按初爻(0)→上爻(5)整卦算完再交给渲染：伏神要先知道"整卦六亲齐不齐"才知道借哪一爻，
// 不能边算边从上往下拼字符串。
function buildPlateLineData({lines, lower, upper, palaceInfo, startSpirit, kongBranches, bianLowerTrig, bianUpperTrig}){
  const ALL_LIUQIN = ['父母','兄弟','子孙','妻财','官鬼'];
  const lineData = [];
  for(let pos = 0; pos < 6; pos++){
    const l = lines[pos];
    const lineNum = pos + 1;
    const line = najiaLineInfo(lower.name, upper.name, pos, palaceInfo.element);

    // 动爻变出的干支/六亲：只有动爻才有。这一爻变了之后，它所在的那组（上卦或下卦）
    // 三根线的阴阳组合变成了另一个八卦（bianLowerTrig/bianUpperTrig），要按新八卦
    // 同一爻位的纳甲表去查变出来的干支；但六亲判断的锚点仍是"本卦"的宫五行不换——
    // 变爻六亲说的是"这个位置的六亲变成了什么"，参照系还是本卦，不重新按变卦的宫论。
    let bianGanzhi = '', bianBranchEl = '', bianLiuqin = '';
    if(l.moving && bianLowerTrig){
      const bianLine = najiaLineInfo(bianLowerTrig.name, bianUpperTrig.name, pos, palaceInfo.element);
      bianGanzhi = bianLine.ganzhi;
      bianBranchEl = bianLine.branchEl;
      bianLiuqin = bianLine.liuqin;
    }

    lineData.push({
      pos, lineNum, line: l,
      ganzhi: line.ganzhi, stem: line.stem, branch: line.branch,
      branchEl: line.branchEl, liuqin: line.liuqin,
      spirit: SIX_SPIRITS[(startSpirit + pos) % 6],
      isWorld: lineNum === palaceInfo.world,
      isResponse: lineNum === palaceInfo.response,
      isKong: kongBranches.includes(line.branch),
      bianGanzhi, bianBranchEl, bianLiuqin,
    });
  }

  const presentLiuqin = new Set(lineData.map(d => d.liuqin));
  const missingLiuqin = ALL_LIUQIN.filter(x => !presentLiuqin.has(x));
  const pureByPosition = pureLiuqinByPosition(palaceInfo);
  lineData.forEach(d => {
    const pureAtPos = pureByPosition[d.pos];
    d.fushen = missingLiuqin.includes(pureAtPos.liuqin) ? pureAtPos : null;
  });
  return lineData;
}

// 每一爻数据 → 排盘表格的行（上爻在上、初爻在下）+ 一份结构化六爻（初爻→上爻，供AI用）
function buildPlateRows(lineData){
  const rows = [];
  const structuredLines = [];
  for(let pos = 5; pos >= 0; pos--){ // 表格从上爻往下排到初爻
    const d = lineData[pos];
    const { line: l, lineNum, stem, branch, branchEl, spirit, liuqin, isWorld, isResponse, isKong, bianGanzhi, bianBranchEl, bianLiuqin, fushen } = d;
    const bar = l.yang ? '<span class="full"></span>' : '<span class="half left"></span><span class="half right"></span>';
    const mark = l.moving ? (l.yang?'○':'✕') : '';
    const graphic = `<span class="yao"><span class="yao-bar">${bar}</span></span>`;
    // 世/应/空三个签统一带 .pos-tag（左外边距在 CSS 里给），不要用空格硬凑：
    // 主盘表里它们自己占一格、恢复会话的 7 列表里它们紧跟在"纳甲"文字后面，
    // 只靠半角空格在手机上等于贴在一起（"己未世 空"），分开一个真实间距更清楚。
    const posTag = (isWorld?'<b class="pos-tag">世</b>':'') + (isResponse?'<b class="pos-tag">应</b>':'') + (isKong?'<span class="pos-tag" style="color:var(--text-dim)">空</span>':'');
    const stateText = l.moving ? (l.yang?'老阳→变阴':'老阴→变阳') : (l.yang?'少阳':'少阴');
    // 四个语义单元各占一个 <td>，不再把"爻画 + 六亲干支五行"塞进同一格：
    // 宽屏下四列并排显示，跟以前三列肉眼几乎没差别；窄屏下（css/app.css 里
    // 主排盘表 .plate-main 的 @media(max-width:640px) 那一段）直接把每一行变成
    // 一行 grid ——[爻画][六亲干支五行][世应空]，动爻再用第二行补"变出"。
    // 分成四格正是为了这一步：格子拆开了，窄屏才能各自摆位、不会在"妻财戊子/水"
    // 这种地方把一爻的文字劈成两行。
    // "变出"文案再拆成三个最小语义单元（干支 / (五行) / 六亲），段内 nowrap、
    // 段间插零宽空格(\u200B)——平时紧挨着显示还是"丙戌(土)子孙"一整串，不占视觉宽度，
    // 只在真放不下时才在这几处断开，且永远不会断在"(土)"中间。
    // 非动爻这一格留空（不放"－"）：窄屏靠 td.line-bian:empty 整行收起，
    // 宽屏再由 css 的 :empty::after 补一个"－"，两边都不多一个空格。
    const bianText = l.moving
      ? `<span class="bian-chunk">${bianGanzhi}</span>\u200B<span class="bian-chunk">(${bianBranchEl})</span>\u200B<span class="bian-chunk">${bianLiuqin}</span>`
      : '';
    const fushenText = fushen ? `${fushen.liuqin} ${fushen.ganzhi}(${fushen.branchEl})` : '－';
    rows.push(`<tr class="${l.moving?'moving':''}">
      <td class="line-graphic">${graphic}</td>
      <td class="line-info">${liuqin}${stem}${branch}${branchEl}</td>
      <td class="line-tag">${posTag}</td>
      <td class="line-bian">${bianText}</td>
    </tr>`);
    structuredLines.push({
      爻位: `${lineNum}爻`, 六亲: liuqin, 六神: spirit,
      纳甲: `${stem}${branch}`, 五行: branchEl, 状态: stateText,
      是否动爻: l.moving, 是否世爻: isWorld, 是否应爻: isResponse, 是否空亡: isKong,
      变纳甲: l.moving ? bianGanzhi : '', 变五行: l.moving ? bianBranchEl : '', 变六亲: l.moving ? bianLiuqin : '',
      伏神六亲: fushen ? fushen.liuqin : '', 伏神纳甲: fushen ? fushen.ganzhi : '', 伏神五行: fushen ? fushen.branchEl : '',
    });
  }
  structuredLines.reverse(); // 变成初爻→上爻，跟AI提示词的阅读顺序一致
  return { rowsHtml: rows.join(''), structuredLines };
}

// 排盘表下面那一段"卦名 / 宫位 / 上下卦 / 日期 / 四柱 / 空亡"
function plateSummaryHtml({guaName, bianGuaName, palaceText, lowerUpperText, dateText, fourPillarsText, kongText}){
  const guaNameRowText = `本卦：<b>${guaName}</b>` + (bianGuaName ? `　→　变卦：<b>${bianGuaName}</b>` : '');
  const lowerUpperHtml = lowerUpperText.replace('下卦：','下卦：<b>').replace('　上卦：','</b>　上卦：<b>') + '</b>';
  return `
    <div class="gua-name-row">
      <div>${guaNameRowText}</div>
      <div>${palaceText}</div>
      <div>${lowerUpperHtml}</div>
      <div class="gua-date-row">${boldDateHtml(dateText)}</div>
      <div>${boldPillarsHtml(fourPillarsText)}</div>
      <div>${boldPillarsHtml(kongText)}</div>
    </div>`;
}

// 换了一卦之后，上一卦的解读结果、对话上下文和"输出提示词"那一套全部过期，统一在这里清干净，
// 否则会出现"排盘表已经是新卦、AI 却在接着上一卦的上下文回答"或者"提示词框还停在旧卦"的错位。
// resetConversation() / hidePromptExportBoxes() 定义在后面加载的 js/ai-ui.js 里，但这里只在
// 用户摇卦完成后才会被调用（不是脚本首次执行时），届时那两个模块早已加载好，所以能直接用。
function clearStaleResultsForNewCast(){
  if(typeof resetConversation === 'function'){ resetConversation(); }
  const oldResult = document.getElementById('aiResult');
  const oldMeta = document.getElementById('aiMeta');
  const oldCopyRow = document.getElementById('copyRow');
  if(oldResult){ oldResult.textContent=''; }
  if(oldMeta){ oldMeta.textContent=''; }
  if(oldCopyRow){ oldCopyRow.style.display='none'; }
  if(typeof hidePromptExportBoxes === 'function'){ hidePromptExportBoxes(); }
  if(typeof lastExportCastText !== 'undefined'){ lastExportCastText = null; }
  if(typeof lastExportQuestion !== 'undefined'){ lastExportQuestion = null; }
}

function renderPlate(lines, source='system'){
  // ---- 卦象：下卦、上卦三爻的阴阳各定一个八卦，八宫表给出宫位、卦序与世应；
  //      有动爻的话，把动爻翻一翻得到的就是变卦 ----
  const toTrigramKey = arr => arr.map(l => l.yang ? '1' : '0').join('');
  const toBianTrigramKey = arr => arr.map(l => (l.moving ? !l.yang : l.yang) ? '1' : '0').join('');
  const lowerKey = toTrigramKey(lines.slice(0,3));
  const upperKey = toTrigramKey(lines.slice(3,6));
  const lower = TRIGRAM_BY_KEY[lowerKey];
  const upper = TRIGRAM_BY_KEY[upperKey];
  const palaceInfo = EIGHT_PALACE_MAP[lowerKey+upperKey];

  // ---- 起卦日与起卦时刻：日柱沿用上面下拉框选好的那个（见本节上方的大段注释），
  // 年月时柱按起卦这一刻的"时刻"现算 ----
  // 这个"时刻"优先用knownCastDate（如果最近一次是靠"反查日期"定的这个日柱，就用那个真实历史
  // 日期），没有的话才退回"现在"——公历/农历日期显示用的也是同一个now，三者不会各算各的对不上。
  const dayIdx = parseInt(dayGanzhiSelect.value,10);
  const day = JIAZI60[dayIdx];
  const startSpirit = STEM_SPIRIT_GROUP[day.stem];
  const kongBranches = KONG_PAIRS[day.kongGroup];
  const now = knownCastDate || new Date();
  const ymh = buildYearMonthHourPillars(day.stem, now);
  const dateText = buildDateDisplayText(now);
  const fourPillarsText = `年柱：${ymh.yearLabel}　月柱：${ymh.monthLabel}　日柱：${day.label}　时柱：${ymh.hourLabel}`;
  const kongText = `空亡：${kongBranches.join('、')}`;

  // ---- 卦名 / 变卦：提到最前面统一算好——"动爻变出的干支/六亲"这一列也要用同一份
  // 变卦上下卦信息，两处共用，不重复算一遍 ----
  const guaName = palaceInfo.name;
  const hasMoving = lines.some(l => l.moving);
  const bianLowerKey = toBianTrigramKey(lines.slice(0,3));
  const bianUpperKey = toBianTrigramKey(lines.slice(3,6));
  const bianLowerTrig = TRIGRAM_BY_KEY[bianLowerKey];
  const bianUpperTrig = TRIGRAM_BY_KEY[bianUpperKey];
  const bianInfo = hasMoving ? EIGHT_PALACE_MAP[bianLowerKey+bianUpperKey] : null;
  const bianGuaName = bianInfo ? bianInfo.name : null;

  const lineData = buildPlateLineData({
    lines, lower, upper, palaceInfo, startSpirit, kongBranches, bianLowerTrig, bianUpperTrig,
  });

  const { rowsHtml, structuredLines } = buildPlateRows(lineData);

  const palaceText = `${palaceInfo.palace} · ${palaceInfo.type}卦（本宫五行：${palaceInfo.element}）`;
  const lowerUpperText = `下卦：${lower.sym} ${lower.name}　上卦：${upper.sym} ${upper.name}`;
  const dayKongText = `日柱：${day.label}　空亡：${kongBranches.join('、')}`;
  const diagramHtml = buildGuaDiagramHtml(structuredLines.map(structLineToDiagram), guaName, bianGuaName);

  plateWrap.innerHTML = `
    <table class="plate-main">
      <tbody>${rowsHtml}</tbody>
    </table>
    ${diagramHtml}${plateSummaryHtml({guaName, bianGuaName, palaceText, lowerUpperText, dateText, fourPillarsText, kongText})}`;
  replayFadeIn(plateWrap);

  // 存一份结构化数据供"AI解卦"区域使用（原有字段与之前完全一致，guaName/bianGuaName不参与AI输入，仅供页面展示；
  // yearGanzhi/monthGanzhi/hourGanzhi/fourPillarsText/kongText是新增的年月时柱信息，dayKongText原样保留不改，
  // 供还没升级过的老代码路径兜底读取；dateText是这次新加的公历/农历日期显示文本；
  // castAnchorY/M/D是"干支日→实际日期"换算要用的起卦锚点，跟上面算年月时柱用的是同一个now
  // （复盘历史卦时是knownCastDate反查到的那天，不是"今天"），只存Y/M/D三个数字、不存时分秒，
  // 应期换算只关心日历上的哪一天，跟起卦具体几点几分无关）
  window.lastCastData = {
    ganzhi: day.label,
    yearGanzhi: ymh.yearLabel, monthGanzhi: ymh.monthLabel, hourGanzhi: ymh.hourLabel,
    fourPillarsText, kongText, dateText,
    palaceText, lowerUpperText, dayKongText,
    lines: structuredLines,
    guaName, bianGuaName,
    source, // 'system'=网页随机摇卦 / 'manual'=用户线下摇卦手动填入
    castAnchorY: now.getFullYear(), castAnchorM: now.getMonth()+1, castAnchorD: now.getDate(),
  };
  // 同步记一下这次摇卦时输入框里的问题文字和摇卦时间，
  // 供下次摇卦时判断是不是换了新问题、以及空问题的卦能否被后写的问题"认领"
  const qEl = document.getElementById('questionInput');
  window.lastCastQuestion = qEl ? qEl.value.trim() : '';
  window.lastCastTime = Date.now();
  clearStaleResultsForNewCast();
}

// ---- 从已保存的结构化排盘数据（不是原始摇出的六个铜钱结果）重建排盘表格 ----
// 用途：刷新页面后恢复"上次未结束的AI会话"时，把这次会话对应的卦重新画出来，
// 而不是让排盘区空着、对不上正在续接的问答。跟 renderPlate() 的区别是：
// 这里输入的已经是当时算好的结构化数据（爻位/六亲/六神/纳甲/五行/状态/世应/空亡等），
// 不需要重新按日柱推算一次，只负责按同样的表格样式渲染，并把 window.lastCastData /
// lastCastQuestion / lastCastTime 一并写回去，避免恢复对话后"卦是空的"。
function renderPlateFromCastData(castData, question, castTime){
  if(!castData || !Array.isArray(castData.lines)) return;
  // 日期显示：优先用当时存好的castData.dateText（跟那次年月时柱算的是同一个Date，最准）；
  // 老会话（改版前存的，没有dateText字段）就退回用castTime（那次起卦的时间戳）现算一个。
  const resumeDateText = castData.dateText || (castTime ? buildDateDisplayText(new Date(castTime)) : '');
  // 同样的兼容思路：castAnchorY/M/D（干支日应期换算要用的锚点）是这次改版新增的字段，
  // 更早存的会话没有——这里就地补一份，退回用castTime（没有就用现在）当锚点，
  // 尽量让老会话也能算，宁可稍微不准也别整个功能直接失效不标注。
  if(!castData.castAnchorY){
    const fallback = castTime ? new Date(castTime) : new Date();
    castData.castAnchorY = fallback.getFullYear();
    castData.castAnchorM = fallback.getMonth() + 1;
    castData.castAnchorD = fallback.getDate();
  }
  const rowsHtml = castData.lines.slice().reverse().map(ln => {
    // 结构化数据里没有直接存 yang 布尔值，但"状态"文案是固定的四种之一
    // （少阳/少阴/老阳→变阴/老阴→变阳），从文案头两个字就能还原阴阳。
    const yang = ln.状态.startsWith('少阳') || ln.状态.startsWith('老阳');
    const bar = yang ? '<span class="full"></span>' : '<span class="half left"></span><span class="half right"></span>';
    const mark = ln.是否动爻 ? (yang ? '○' : '✕') : '';
    const graphic = `<span class="yao"><span class="yao-bar">${bar}</span><span class="yao-mark">${mark}</span></span>`;
    const posTag = (ln.是否世爻?'<b class="pos-tag">世</b>':'') + (ln.是否应爻?'<b class="pos-tag">应</b>':'') + (ln.是否空亡?'<span class="pos-tag" style="color:var(--text-dim)">空</span>':'');
    return `<tr class="${ln.是否动爻?'moving':''}">
      <td>${ln.爻位}</td>
      <td>${ln.六亲}</td>
      <td>${ln.六神}</td>
      <td class="line-graphic">${graphic}</td>
      <td>${ln.纳甲}${posTag}</td>
      <td>${ln.五行}</td>
      <td>${ln.状态}</td>
    </tr>`;
  }).join('');

  const guaNameRowText = `本卦：<b>${castData.guaName||''}</b>` + (castData.bianGuaName ? `　→　变卦：<b>${castData.bianGuaName}</b>` : '');
  const lowerUpperText = (castData.lowerUpperText || '')
    .replace('下卦：','下卦：<b>').replace('　上卦：','</b>　上卦：<b>') + '</b>';
  // 优先用新版"年月日时+空亡"文本；这次改版前存的老会话（castData只有日柱+空亡）靠
  // pillarsAndKongText内部兜底自动退回旧文案，boldPillarsHtml两种文案格式都认得，照样能加粗。
  const dayKongHtml = boldPillarsHtml(pillarsAndKongText(castData));
  const diagramHtml = (Array.isArray(castData.lines) && castData.lines.length === 6)
    ? buildGuaDiagramHtml(castData.lines.map(structLineToDiagram), castData.guaName, castData.bianGuaName)
    : '';

  plateWrap.innerHTML = `
    <table class="plate-resume">
      <thead><tr><th>爻位</th><th>六亲</th><th>六神</th><th>卦画</th><th>纳甲</th><th>五行</th><th>状态</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${diagramHtml}
    <div class="gua-name-row">
      <div>${guaNameRowText}</div>
      <div>${castData.palaceText || ''}</div>
      <div>${lowerUpperText}</div>
      ${resumeDateText ? `<div class="gua-date-row">${boldDateHtml(resumeDateText)}</div>` : ''}
      <div>${dayKongHtml}</div>
    </div>
    <div class="placeholder" style="padding:10px 0 0;font-size:var(--fs-2);">（以上是刷新前留存的排盘，对应下面正在续接的追问）</div>`;
  replayFadeIn(plateWrap);

  window.lastCastData = castData;
  window.lastCastQuestion = question || '';
  window.lastCastTime = castTime || Date.now();
}
