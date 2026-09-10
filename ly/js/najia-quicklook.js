/* ==================================================================
  ly/js/najia-quicklook.js —— 纳甲速查：查卦输入框 + 八宫口诀表 + 六十四卦装卦表
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ---------------- najia quick lookup：纳甲速查表（#najia 面板的两张表） ----------------
   两张表都不另存一份纳甲数据，而是拿排盘用的那几份现算：口诀取自 NAJIA，
   64 卦取自 eight-palace 生成的 EIGHT_PALACE_MAP（已带宫位、卦序、世应位），
   每一爻再用上面的 najiaLineInfo 取干支五行六亲。"起卦排盘"里算出什么，
   速查表里就显示什么。

   结构上分三层，从上往下一层比一层具体：
     renderNajiaQuickLookup()  总入口：把两张表各自填好
       najiaRuleRowHtml()        口诀表的一行
       najiaPalaceSectionHtml()  某个宫那一整块（标题 + 折叠 + 表）
         najiaPalaceGuaEntries() 这一宫的八卦，按八纯→一世→…→归魂排好
         najiaGuaRowHtml()       其中一个卦的一行
   ---------------- */
// 口诀原文：宫位 + 本宫五行 + 内卦（初二三爻）纳甲 + 外卦（四五六爻）纳甲
const NAJIA_RULE_TEXT = {
  '乾':'乾金甲子外壬午', '坎':'坎水戊寅外戊申', '艮':'艮土丙辰外丙戌', '震':'震木庚子外庚午',
  '巽':'巽木辛丑外辛未', '离':'离火己卯外己酉', '坤':'坤土乙未外癸丑', '兑':'兑金丁巳外丁亥',
};
// 装卦表的表头：一卦一行，六爻从上爻排到初爻
const NAJIA_GUA_TABLE_HEAD =
  '<thead><tr><th>卦名</th><th>卦序</th><th>上爻</th><th>五爻</th><th>四爻</th><th>三爻</th><th>二爻</th><th>初爻</th></tr></thead>';

const elementOfTrigram = name => TRIGRAM_BY_NAME[name].el;

// 口诀表一行：内卦、外卦各三个干支，干支后面括注地支五行
function najiaRuleRowHtml(palaceName){
  const nj = NAJIA[palaceName];
  const cell = gz => `${gz}<span class="nj-el">（${BRANCH_EL[gz[1]]}）</span>`;
  return `<tr>
      <td class="nj-name">${palaceName}</td>
      <td>${elementOfTrigram(palaceName)}</td>
      <td>${nj.inner.map(cell).join('　')}</td>
      <td>${nj.outer.map(cell).join('　')}</td>
      <td class="nj-kj">${NAJIA_RULE_TEXT[palaceName]}</td>
    </tr>`;
}

// 装卦表一行：卦名、卦序，加六爻（每格上排干支+五行、下排六亲，世应各挂一枚小签）
function najiaGuaRowHtml(guaKey, guaInfo){
  // guaKey = 下卦三位 + 上卦三位（每位 0/1，三位从左到右是初爻→三爻 / 四爻→上爻）
  const lowerName = TRIGRAM_BY_KEY[guaKey.slice(0,3)].name;
  const upperName = TRIGRAM_BY_KEY[guaKey.slice(3)].name;
  const cells = [];
  for(let lineIndex = 0; lineIndex < 6; lineIndex++){
    const line = najiaLineInfo(lowerName, upperName, lineIndex, guaInfo.element);
    const lineNum = lineIndex + 1;
    const badge = lineNum === guaInfo.world ? '<span class="nj-badge shih">世</span>'
      : (lineNum === guaInfo.response ? '<span class="nj-badge">应</span>' : '');
    // 表头是从上爻排到初爻的，所以第 lineIndex 爻（0 就是初爻）要放到倒数第 lineIndex+1 格
    cells[5 - lineIndex] = `<td><span class="nj-gz">${line.ganzhi}<em>${line.branchEl}</em>${badge}</span>`
      + `<span class="nj-lq">${line.liuqin}</span></td>`;
  }
  return `<tr><td class="nj-name">${guaInfo.name}</td><td>${guaInfo.type}</td>${cells.join('')}</tr>`;
}

// 一个宫一整块：可折叠的标题 + 装卦表（表体 id 形如 njGua-乾，方便对照调试）
function najiaPalaceSectionHtml(palaceName){
  const rows = najiaPalaceGuaEntries(palaceName)
    .map(([guaKey, guaInfo]) => najiaGuaRowHtml(guaKey, guaInfo)).join('');
  return `
  <section class="block-collapse">
    <h2>${palaceName}宫八卦（本宫属${elementOfTrigram(palaceName)}）</h2>
    <div class="block-collapse-body">
      <div class="scroll-hint">← 左右滑动查看完整表格 →</div>
      <div class="ref-scroll"><table class="ref ref-wide nj-table">
        ${NAJIA_GUA_TABLE_HEAD}
        <tbody id="njGua-${palaceName}">${rows}</tbody>
      </table></div>
    </div>
  </section>`;
}

function renderNajiaQuickLookup(){
  const ruleBody = document.getElementById('najiaRuleBody');
  if(ruleBody){
    ruleBody.innerHTML = NAJIA_PALACE_ORDER.map(najiaRuleRowHtml).join('');
  }
  const guaSections = document.getElementById('najiaGuaSections');
  if(guaSections){
    guaSections.innerHTML = NAJIA_PALACE_ORDER.map(najiaPalaceSectionHtml).join('');
    setupCollapsibleSections(guaSections); // 后生成出来的折叠区块要单独接一次事件
  }
}
renderNajiaQuickLookup();

/* ---------------- 查卦纳甲：结果卡片 ----------------
   "输入 → 是哪个卦"这层解析在 liuyao-core.js 的"查卦解析"一节（两个查询标签页共用），
   这里只负责把命中的卦画成卡片：卦名/宫位/世应 + 六爻（上爻→初爻）的爻画、干支五行、六亲。
   命中的卦照旧从 NAJIA / EIGHT_PALACE_MAP 现算，跟排盘、跟下面的装卦表是同一份数据。
   ---------------- */
const YAO_LABELS = ['初','二','三','四','五','上'];   // 下标 0 = 初爻

// 命中一个卦时的结果卡片：卦名/宫位/世应 + 六爻（上爻→初爻）的干支五行六亲
function najiaGuaCardHtml(guaKey, guaInfo, mismatch){
  const lowerName = TRIGRAM_BY_KEY[guaKey.slice(0,3)].name;
  const upperName = TRIGRAM_BY_KEY[guaKey.slice(3)].name;
  const upperTrig = TRIGRAM_BY_NAME[upperName], lowerTrig = TRIGRAM_BY_NAME[lowerName];
  const lines = [];
  for(let lineIndex = 5; lineIndex >= 0; lineIndex--){  // 上爻排在最上面，跟排盘表一个方向
    const line = najiaLineInfo(lowerName, upperName, lineIndex, guaInfo.element);
    const lineNum = lineIndex + 1;
    const badge = lineNum === guaInfo.world ? '<span class="nj-badge shih">世</span>'
      : (lineNum === guaInfo.response ? '<span class="nj-badge">应</span>' : '');
    // 爻画复用排盘表那一套 .yao/.full/.half：阳爻一条整线，阴爻中间断开
    // （guaKey 的六位 0/1 跟六爻一一对应，下标 0 就是初爻，所以直接按下标取阴阳）
    const yaoBar = guaKey[lineIndex] === '1'
      ? '<span class="full"></span>'
      : '<span class="half left"></span><span class="half right"></span>';
    lines.push(`<li><span class="yao" aria-hidden="true"><span class="yao-bar">${yaoBar}</span></span>`
      + `<span class="nj-pos">${YAO_LABELS[lineIndex]}爻</span>`
      + `<span class="nj-gz">${line.ganzhi}<em>${line.branchEl}</em></span>`
      + `<span class="nj-lq">${line.liuqin}</span>${badge}</li>`);
  }
  const mismatchHtml = mismatch
    ? `<p class="nj-result-warn">输入的卦名跟上下卦象对不上：上${upperName}下${lowerName}按卦象定下来的是「${guaInfo.name}」，这里以卦象为准。</p>`
    : '';
  return `<div class="nj-result-card">
    <div class="nj-result-head"><b>${guaInfo.name}</b><span>${guaInfo.palace} · ${guaInfo.type}卦（本宫五行：${guaInfo.element}）</span></div>
    <div class="nj-result-sub">上卦 ${upperTrig.sym} ${upperName}（${TRIGRAM_IMAGE[upperName]}）　下卦 ${lowerTrig.sym} ${lowerName}（${TRIGRAM_IMAGE[lowerName]}）　世${YAO_LABELS[guaInfo.world-1]}爻 · 应${YAO_LABELS[guaInfo.response-1]}爻</div>
    ${mismatchHtml}
    <ul class="nj-lines">${lines.join('')}</ul>
  </div>`;
}

function najiaSearchResultHtml(result){
  if(result.status === 'empty'){
    return `<div class="nj-result-card"><p class="nj-result-hint">写个卦名或上下卦象就能查：<b>否</b>、<b>泰</b>、<b>天地否</b>、<b>地天泰</b>、<b>上乾下坤</b>。</p></div>`;
  }
  if(result.status === 'candidates'){
    return `<div class="nj-result-card"><p class="nj-result-hint">对得上的不止一个卦，挑一个：</p>`
      + `<div class="nj-cands">${result.hits.map(([key, info]) => `<button type="button" data-gua="${key}">${info.name}</button>`).join('')}</div></div>`;
  }
  if(result.status === 'none'){
    return `<div class="nj-result-card"><p class="nj-result-hint">没找到这个卦。卦名可以直接写（否、泰、大有）；上下卦象写两个八卦字就行（天地、地天）；八卦字用卦名、卦象、符号都可以。</p></div>`;
  }
  return najiaGuaCardHtml(result.guaKey, result.guaInfo, result.mismatch);
}

// 展开某一宫的装卦表并滚过去（结果里那个"展开"按钮）
function openNajiaPalaceSection(palaceName){
  const tbody = document.getElementById('njGua-' + palaceName);
  const section = tbody && tbody.closest('section.block-collapse');
  if(!section) return;
  section.classList.add('open');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupNajiaSearch(){
  const input = document.getElementById('najiaSearchInput');
  const resultBox = document.getElementById('najiaSearchResult');
  const searchBtn = document.getElementById('najiaSearchBtn');
  if(!input || !resultBox) return;

  const run = ()=>{ resultBox.innerHTML = najiaSearchResultHtml(resolveGuaQuery(input.value)); };
  input.addEventListener('input', run);          // 边打边查，输入框里就一个字也能立刻看到结果
  input.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); run(); }
  });
  if(searchBtn) searchBtn.addEventListener('click', ()=>{ run(); input.focus(); });
  // 结果区里的按钮：候选卦名点一下就查它；"展开"按钮打开对应那一宫的装卦表
  resultBox.addEventListener('click', e=>{
    const cand = e.target.closest('button[data-gua]');
    if(cand){
      const info = EIGHT_PALACE_MAP[cand.dataset.gua];
      if(info){ input.value = info.name; run(); }
      return;
    }
    const expand = e.target.closest('button[data-palace]');
    if(expand) openNajiaPalaceSection(expand.dataset.palace);
  });
  run();  // 一开始先给一句"能怎么写"的提示
}
setupNajiaSearch();
