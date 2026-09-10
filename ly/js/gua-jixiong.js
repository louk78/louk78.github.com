/* ==================================================================
  ly/js/gua-jixiong.js —— 吉凶查询：六十四卦吉凶简表（输入框查一个卦的吉凶）
  输入怎么写、卦名和上下卦象怎么定，都跟"纳甲速查"共用 liuyao-core.js 里的
  resolveGuaQuery（先看上下卦象、再看卦名，卦象与卦名不一致时以卦象为准）；
  本文件只负责"查到之后显示什么"：吉凶等级 + 一句断语。
  依赖：之前加载的模块（liuyao-core 的卦数据与查卦解析）。
================================================================== */

/* ---------------- 六十四卦吉凶简表 ----------------
   全部六十四卦的唯一数据源：键用八宫表里那套标准卦名（乾为天、泽风大过……），
   跟排盘、装卦表的卦名一一对应；值是 [等级, 断语]。
   等级用民间流传的简表口径：上上 / 中上 / 中下 / 下下——只给大方向，不作卦理推演。
   要改等级或断语，改这一张表就够了，两个查询标签页里的卦名、卦象、爻画都另取自卦数据，
   不会因为这里改了字而跟着错位。
   ---------------- */
const GUA_JIXIONG = {
  // 乾宫
  '乾为天':   ['上上', '刚健中正，自强不息'],
  '天风姤':   ['中下', '邂逅相遇，防患未然'],
  '天山遁':   ['下下', '退避隐遁，以退为进'],
  '天地否':   ['下下', '闭塞不通，上下不交'],
  '风地观':   ['中上', '静观其变，审时度势'],
  '山地剥':   ['下下', '剥落侵蚀，不宜妄动'],
  '火地晋':   ['上上', '旭日东升，晋升进取'],
  '火天大有': ['上上', '顺天依时，大有收获'],
  // 兑宫
  '兑为泽':   ['上上', '和悦相说，喜悦通达'],
  '泽水困':   ['下下', '受困重重，守正待援'],
  '泽地萃':   ['中上', '荟萃聚集，物以类聚'],
  '泽山咸':   ['上上', '交感相应，情投意合'],
  '水山蹇':   ['下下', '艰险难行，宜止不宜进'],
  '地山谦':   ['上上', '谦逊有德，内高外低'],
  '雷山小过': ['下下', '小有过越，宜下不宜上'],
  '雷泽归妹': ['下下', '婚嫁失序，事有不当'],
  // 离宫
  '离为火':   ['中上', '光明附丽，柔顺守正'],
  '火山旅':   ['下下', '漂泊在外，行止不定'],
  '火风鼎':   ['上上', '鼎新致养，稳重图变'],
  '火水未济': ['中下', '事未竟功，仍需努力'],
  '山水蒙':   ['中下', '蒙昧待启，需人指点'],
  '风水涣':   ['中上', '涣散重聚，聚而能散'],
  '天水讼':   ['下下', '争讼不利，两败俱伤'],
  '天火同人': ['中上', '同心同德，以和为贵'],
  // 震宫
  '震为雷':   ['中上', '震动惊惧，处变不惊'],
  '雷地豫':   ['中上', '和乐安豫，顺时依势'],
  '雷水解':   ['中上', '解难舒困，转危为安'],
  '雷风恒':   ['中上', '恒久不易，持之以恒'],
  '地风升':   ['上上', '柔顺上升，步步高升'],
  '水风井':   ['中上', '井养不穷，滋养有方'],
  '泽风大过': ['中下', '过度，非常之举'],
  '泽雷随':   ['中上', '随顺应时，顺水推舟'],
  // 巽宫
  '巽为风':   ['中上', '谦顺入微，随风而行'],
  '风天小畜': ['中上', '蓄养待时，密云不雨'],
  '风火家人': ['中上', '家和有序，内外有别'],
  '风雷益':   ['上上', '损上益下，受益匪浅'],
  '天雷无妄': ['中上', '无妄而行，不可妄为'],
  '火雷噬嗑': ['中上', '咬合致合，刚柔相济'],
  '山雷颐':   ['中上', '颐养自养，慎言节食'],
  '山风蛊':   ['中下', '积弊待治，拨乱反正'],
  // 坎宫
  '坎为水':   ['下下', '险阻重重，谨慎而行'],
  '水泽节':   ['中上', '节制有度，适可而止'],
  '水雷屯':   ['下下', '起始维艰，困难重重'],
  '水火既济': ['中上', '功成守成，盛极当慎'],
  '泽火革':   ['中上', '革故鼎新，顺天应人'],
  '雷火丰':   ['上上', '丰盛圆满，日中则昃'],
  '地火明夷': ['下下', '光明受伤，韬光养晦'],
  '地水师':   ['中上', '行险而顺，统众有方'],
  // 艮宫
  '艮为山':   ['中上', '静止安守，动静得宜'],
  '山火贲':   ['中上', '文饰之美，以质为本'],
  '山天大畜': ['上上', '厚积薄发，日新其德'],
  '山泽损':   ['中上', '损下益上，先损后益'],
  '火泽睽':   ['下下', '乖离背向，求同存异'],
  '天泽履':   ['中上', '如履薄冰，谨慎前行'],
  '风泽中孚': ['上上', '诚信相孚，中正而立'],
  '风山渐':   ['上上', '循序渐进，稳步向前'],
  // 坤宫
  '坤为地':   ['上上', '厚德载物，柔顺伸展'],
  '地雷复':   ['中上', '一阳来复，反复其道'],
  '地泽临':   ['中上', '居高临下，以德临人'],
  '地天泰':   ['上上', '天地交泰，通泰安顺'],
  '雷天大壮': ['中上', '壮而有节，不可妄动'],
  '泽天夬':   ['中上', '当断则断，决而能和'],
  '水天需':   ['中上', '守正待时，需而有获'],
  '水地比':   ['上上', '亲比和谐，诚信团结'],
};

// 等级 → 配色档：上上（吉，青玉）/ 中上（平，黄铜）/ 中下（偏凶，朱砂字）/ 下下（凶，朱砂实底）
const JIXIONG_TONE = { '上上': 'ji', '中上': 'ping', '中下': 'xiong-soft', '下下': 'xiong' };

// 六爻爻画：阳爻一条完整的实线，阴爻中间断开（跟排盘表、"纳甲速查"共用同一套 .yao 样式）。
// 从上爻画到初爻，跟排盘表的阅读方向一致；guaKey 六位 0/1 的下标 0 就是初爻。
function jixiongHexagramHtml(guaKey){
  const bars = [];
  for(let lineIndex = 5; lineIndex >= 0; lineIndex--){
    const yaoBar = guaKey[lineIndex] === '1'
      ? '<span class="full"></span>'
      : '<span class="half left"></span><span class="half right"></span>';
    bars.push(`<span class="yao"><span class="yao-bar">${yaoBar}</span></span>`);
  }
  return `<div class="jx-hex" aria-hidden="true">${bars.join('')}</div>`;
}

// 命中一个卦时的结果卡片：卦名 + 吉凶等级 + 一句断语（外加上下卦，方便核对查的是不是这个卦）
function jixiongCardHtml(guaKey, guaInfo, mismatch){
  const lowerName = TRIGRAM_BY_KEY[guaKey.slice(0,3)].name;
  const upperName = TRIGRAM_BY_KEY[guaKey.slice(3)].name;
  const upperTrig = TRIGRAM_BY_NAME[upperName], lowerTrig = TRIGRAM_BY_NAME[lowerName];
  const entry = GUA_JIXIONG[guaInfo.name] || ['—', '这个卦的吉凶还没填进表里'];
  const tone = JIXIONG_TONE[entry[0]] || 'ping';
  const mismatchHtml = mismatch
    ? `<p class="nj-result-warn">输入的卦名跟上下卦象对不上：上${upperName}下${lowerName}按卦象定下来的是「${guaInfo.name}」，这里以卦象为准。</p>`
    : '';
  return `<div class="nj-result-card">
    <div class="nj-result-head"><b>${guaInfo.name}</b><span class="jx-level ${tone}">${entry[0]}</span></div>
    <div class="nj-result-sub">上卦 ${upperTrig.sym} ${upperName}（${TRIGRAM_IMAGE[upperName]}）　下卦 ${lowerTrig.sym} ${lowerName}（${TRIGRAM_IMAGE[lowerName]}）</div>
    ${mismatchHtml}
    <div class="jx-body">
      ${jixiongHexagramHtml(guaKey)}
      <p class="jx-text">${entry[1]}</p>
    </div>
  </div>`;
}

function jixiongResultHtml(result){
  if(result.status === 'empty'){
    return `<div class="nj-result-card"><p class="nj-result-hint">写个卦名或上下卦象就能查吉凶：<b>大过</b>、<b>遁</b>、<b>泽风大过</b>、<b>天山遁</b>。</p></div>`;
  }
  if(result.status === 'candidates'){
    return `<div class="nj-result-card"><p class="nj-result-hint">对得上的不止一个卦，挑一个：</p>`
      + `<div class="nj-cands">${result.hits.map(([key, info]) => `<button type="button" data-gua="${key}">${info.name}</button>`).join('')}</div></div>`;
  }
  if(result.status === 'none'){
    return `<div class="nj-result-card"><p class="nj-result-hint">没找到这个卦。卦名可以直接写（大过、遁、大有）；上下卦象写两个八卦字就行（泽风、天山）。</p></div>`;
  }
  return jixiongCardHtml(result.guaKey, result.guaInfo, result.mismatch);
}

function setupJixiongSearch(){
  const input = document.getElementById('jixiongSearchInput');
  const resultBox = document.getElementById('jixiongSearchResult');
  const searchBtn = document.getElementById('jixiongSearchBtn');
  if(!input || !resultBox) return;

  const run = ()=>{ resultBox.innerHTML = jixiongResultHtml(resolveGuaQuery(input.value)); };
  input.addEventListener('input', run);            // 边打边查
  input.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); run(); }
  });
  if(searchBtn) searchBtn.addEventListener('click', ()=>{ run(); input.focus(); });
  // 候选卦名点一下就查它
  resultBox.addEventListener('click', e=>{
    const cand = e.target.closest('button[data-gua]');
    if(!cand) return;
    const info = EIGHT_PALACE_MAP[cand.dataset.gua];
    if(info){ input.value = info.name; run(); }
  });
  run();  // 一开始先给一句"能怎么写"的提示
}
setupJixiongSearch();
