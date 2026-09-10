/* ==================================================================
  ly/js/liuyao-core.js —— 六爻核心数据与算法：纳甲表、八宫生成、六亲、一爻纳甲查询
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ---------------- najia data ---------------- */
const NAJIA = {
  '乾':{inner:['甲子','甲寅','甲辰'], outer:['壬午','壬申','壬戌']},
  '坤':{inner:['乙未','乙巳','乙卯'], outer:['癸丑','癸亥','癸酉']},
  '震':{inner:['庚子','庚寅','庚辰'], outer:['庚午','庚申','庚戌']},
  '巽':{inner:['辛丑','辛亥','辛酉'], outer:['辛未','辛巳','辛卯']},
  '坎':{inner:['戊寅','戊辰','戊午'], outer:['戊申','戊戌','戊子']},
  '离':{inner:['己卯','己丑','己亥'], outer:['己酉','己未','己巳']},
  '艮':{inner:['丙辰','丙午','丙申'], outer:['丙戌','丙子','丙寅']},
  '兑':{inner:['丁巳','丁卯','丁丑'], outer:['丁亥','丁酉','丁未']},
};
const BRANCH_EL = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
const SIX_SPIRITS = ['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
const TRIGRAM_BY_KEY = {};
BAGUA.forEach(g=>TRIGRAM_BY_KEY[g.key]=g);
const TRIGRAM_BY_NAME = {};
BAGUA.forEach(g=>{ TRIGRAM_BY_NAME[g.name]=g; });

/* ---------------- eight-palace (八宫) generation ---------------- */
const PALACE_SEEDS = [
  {name:'乾', bits:[1,1,1], el:'金'},
  {name:'兑', bits:[1,1,0], el:'金'},
  {name:'离', bits:[1,0,1], el:'火'},
  {name:'震', bits:[1,0,0], el:'木'},
  {name:'巽', bits:[0,1,1], el:'木'},
  {name:'坎', bits:[0,1,0], el:'水'},
  {name:'艮', bits:[0,0,1], el:'土'},
  {name:'坤', bits:[0,0,0], el:'土'},
];
const STEP_TYPES = ['八纯','一世','二世','三世','四世','五世','游魂','归魂'];
const STEP_WORLD = [6,1,2,3,4,5,4,3];
// 八宫64卦标准卦名，顺序与 STEP_TYPES 对齐（八纯→一世→...→游魂→归魂）
const GUA_NAME_TABLE = {
  '乾': ['乾为天','天风姤','天山遁','天地否','风地观','山地剥','火地晋','火天大有'],
  '兑': ['兑为泽','泽水困','泽地萃','泽山咸','水山蹇','地山谦','雷山小过','雷泽归妹'],
  '离': ['离为火','火山旅','火风鼎','火水未济','山水蒙','风水涣','天水讼','天火同人'],
  '震': ['震为雷','雷地豫','雷水解','雷风恒','地风升','水风井','泽风大过','泽雷随'],
  '巽': ['巽为风','风天小畜','风火家人','风雷益','天雷无妄','火雷噬嗑','山雷颐','山风蛊'],
  '坎': ['坎为水','水泽节','水雷屯','水火既济','泽火革','雷火丰','地火明夷','地水师'],
  '艮': ['艮为山','山火贲','山天大畜','山泽损','火泽睽','天泽履','风泽中孚','风山渐'],
  '坤': ['坤为地','地雷复','地泽临','地天泰','雷天大壮','泽天夬','水天需','水地比'],
};
const EIGHT_PALACE_MAP = {};
function b2s(arr){return arr.join('');}
PALACE_SEEDS.forEach(seed=>{
  const [p0,p1,p2] = seed.bits;
  const f = x=>1-x;
  const steps = [
    {lower:[p0,p1,p2], upper:[p0,p1,p2]},
    {lower:[f(p0),p1,p2], upper:[p0,p1,p2]},
    {lower:[f(p0),f(p1),p2], upper:[p0,p1,p2]},
    {lower:[f(p0),f(p1),f(p2)], upper:[p0,p1,p2]},
    {lower:[f(p0),f(p1),f(p2)], upper:[f(p0),p1,p2]},
    {lower:[f(p0),f(p1),f(p2)], upper:[f(p0),f(p1),p2]},
    {lower:[f(p0),f(p1),f(p2)], upper:[p0,f(p1),p2]},
    {lower:[p0,p1,p2], upper:[p0,f(p1),p2]},
  ];
  steps.forEach((s,i)=>{
    const key = b2s(s.lower)+b2s(s.upper);
    const world = STEP_WORLD[i];
    const response = ((world+3-1)%6)+1;
    EIGHT_PALACE_MAP[key] = {palace:seed.name+'宫', element:seed.el, type:STEP_TYPES[i], world, response, name:GUA_NAME_TABLE[seed.name][i]};
  });
});

/* ---------------- six relatives ---------------- */
function sixRelative(lineEl, palaceEl){
  if(lineEl===palaceEl) return '兄弟';
  if(SHENG[lineEl]===palaceEl) return '父母';
  if(SHENG[palaceEl]===lineEl) return '子孙';
  if(KE[lineEl]===palaceEl) return '官鬼';
  if(KE[palaceEl]===lineEl) return '妻财';
  return '－';
}

/* ---------------- najia line info：一爻的纳甲干支/五行/六亲 ----------------
   "下卦用 inner、上卦用 outer"这条纳甲规矩只写在这一处：排盘表、纳甲速查表、
   伏神（按本宫首卦取同一爻位）都从这里取，三处不会因为各写一遍而对不上。
   lineIndex 从 0 起（0=初爻，5=上爻）；palaceElement 是本宫五行，六亲以它为锚点。
   ---------------- */
function najiaLineInfo(lowerName, upperName, lineIndex, palaceElement){
  const ganzhi = lineIndex < 3 ? NAJIA[lowerName].inner[lineIndex] : NAJIA[upperName].outer[lineIndex-3];
  const stem = ganzhi[0], branch = ganzhi[1];
  const branchEl = BRANCH_EL[branch];
  return { ganzhi, stem, branch, branchEl, liuqin: sixRelative(branchEl, palaceElement) };
}

/* ---------------- 查卦解析：把用户打的几个字定位到一个卦 ----------------
   "纳甲速查"和"吉凶查询"两个标签页共用这一段：这里只负责"输入 → 是哪个卦"，
   怎么显示（画爻、列纳甲、报吉凶）由各自的模块自己决定。
   认这几种写法，判断顺序是"先卦象、后卦名"：
     ① 天地             —— 两个八卦字，第一个是上卦、第二个是下卦
     ② 天地否 / 地天泰   —— 卦象后面跟着卦名
     ③ 上乾下坤 / 乾上坤下 / 下坤上乾 —— 带上下标记的写法
     ④ ☰☷              —— 八卦的符号
     ⑤ 否 / 泰 / 大有    —— 只写卦名（先比整名，再比结尾，最后比包含）
   八卦字认三种写法：卦名（乾兑离震巽坎艮坤）、卦象（天泽火雷风水山地）、符号（☰…），另收几个繁体。
   规矩是"以卦象为准"：写了上下卦象时，卦名只是参考——"天地泰"里上乾下坤定下来的是否卦，
   就按否卦算（同时把"卦名与卦象对不上"如实报出来），不会因为后面跟了个"泰"字就当成泰卦。
   ---------------- */
// 八宫顺序按传统口诀"乾坎艮震巽离坤兑"，跟 PALACE_SEEDS / NAJIA 的键顺序都不同，单独列一份
const NAJIA_PALACE_ORDER = ['乾','坎','艮','震','巽','离','坤','兑'];
const TRIGRAM_IMAGE = {'乾':'天','兑':'泽','离':'火','震':'雷','巽':'风','坎':'水','艮':'山','坤':'地'};
const GUA_NAME_FILLERS = ['为','卦','之','的','是','叫'];

// 一宫的八卦。不能直接用 Object.entries(EIGHT_PALACE_MAP) 的顺序当卦序：键是六位 0/1 组成的
// 字符串，不带前导零的那些（比如 "111111" 乾为天、"111101" 火天大有）会被 JS 当成"整数式键"
// 排到最前面、按数值大小排——于是乾宫会变成"火天大有打头"。按卦序在 STEP_TYPES 里的位置排
// 才稳定是"八纯→一世→…→归魂"。
function najiaPalaceGuaEntries(palaceName){
  return Object.entries(EIGHT_PALACE_MAP)
    .filter(([, info]) => info.palace === palaceName + '宫')
    .sort((a, b) => STEP_TYPES.indexOf(a[1].type) - STEP_TYPES.indexOf(b[1].type));
}

// 八宫全部 64 卦，按"乾宫→坎宫→…→兑宫、每宫八纯→…→归魂"的固定顺序，结果稳定可预期
function allGuaEntries(){
  return NAJIA_PALACE_ORDER.flatMap(palace => najiaPalaceGuaEntries(palace));
}

// 八卦字 → 卦名：卦名本身、卦象字、八卦符号，外加几个常见繁体
const TRIGRAM_ALIASES = {};
BAGUA.forEach(g=>{
  TRIGRAM_ALIASES[g.name] = g.name;
  TRIGRAM_ALIASES[TRIGRAM_IMAGE[g.name]] = g.name;
  TRIGRAM_ALIASES[g.sym] = g.name;
});
Object.assign(TRIGRAM_ALIASES, {'澤':'兑','兌':'兑','風':'巽','離':'离'});
const TRIGRAM_CHARS = Object.keys(TRIGRAM_ALIASES).join('');

// 带上下标记的四种写法（上X下Y / X上Y下 / 下X上Y / X下Y上），谁写在前面就是谁
const RE_UPPER_THEN_LOWER = new RegExp('上([' + TRIGRAM_CHARS + '])下([' + TRIGRAM_CHARS + '])');
const RE_X_UP_Y_DOWN = new RegExp('([' + TRIGRAM_CHARS + '])上([' + TRIGRAM_CHARS + '])下');
const RE_LOWER_THEN_UPPER = new RegExp('下([' + TRIGRAM_CHARS + '])上([' + TRIGRAM_CHARS + '])');
const RE_X_DOWN_Y_UP = new RegExp('([' + TRIGRAM_CHARS + '])下([' + TRIGRAM_CHARS + '])上');

// 找出输入里的"上卦、下卦"；找不到就返回 null（交给卦名那条路）
function parseTrigramPair(text){
  let m;
  if((m = RE_UPPER_THEN_LOWER.exec(text))) return { upper: TRIGRAM_ALIASES[m[1]], lower: TRIGRAM_ALIASES[m[2]] };
  if((m = RE_X_UP_Y_DOWN.exec(text)))      return { upper: TRIGRAM_ALIASES[m[1]], lower: TRIGRAM_ALIASES[m[2]] };
  if((m = RE_LOWER_THEN_UPPER.exec(text))) return { upper: TRIGRAM_ALIASES[m[2]], lower: TRIGRAM_ALIASES[m[1]] };
  if((m = RE_X_DOWN_Y_UP.exec(text)))      return { upper: TRIGRAM_ALIASES[m[2]], lower: TRIGRAM_ALIASES[m[1]] };
  // 没带标记就按位置认：第一个八卦字是上卦，第二个是下卦（跟卦名"天风姤=上乾下巽"同一个读法）
  const names = Array.from(text).map(ch => TRIGRAM_ALIASES[ch]).filter(Boolean);
  if(names.length >= 2) return { upper: names[0], lower: names[1] };
  return null;
}

// 把卦象字、符号和"上下为卦"这类虚词去掉，剩下的就是用户写的卦名线索（可能为空）
function guaNameHintOf(text){
  let rest = text;
  Object.keys(TRIGRAM_ALIASES).forEach(ch => { rest = rest.split(ch).join(''); });
  GUA_NAME_FILLERS.forEach(word => { rest = rest.split(word).join(''); });
  return rest.replace(/[上下]/g, '');
}

// 按卦名找：先整名，再结尾，最后包含（"否""泰"这种单字走结尾这一档）
function findGuaByName(needle){
  const all = allGuaEntries();
  const byExact = all.filter(([, info]) => info.name === needle);
  if(byExact.length) return byExact;
  const byEnd = all.filter(([, info]) => info.name.endsWith(needle));
  if(byEnd.length) return byEnd;
  return all.filter(([, info]) => info.name.includes(needle));
}

// 一次查询的结果：empty（还没输入）/ gua（定到一个卦）/ candidates（有多个候选）/ none（没找到）
function resolveGuaQuery(raw){
  const text = String(raw || '').replace(/\s+/g, '');
  if(!text) return { status: 'empty' };

  const pair = parseTrigramPair(text);
  if(pair){
    const guaKey = TRIGRAM_BY_NAME[pair.lower].key + TRIGRAM_BY_NAME[pair.upper].key;
    const guaInfo = EIGHT_PALACE_MAP[guaKey];
    if(guaInfo){
      const hint = guaNameHintOf(text);
      // 写了卦名却跟卦象对不上时，以卦象为准，并如实说一句（比如"天地泰"）
      const mismatch = (hint && !guaInfo.name.includes(hint)) ? true : false;
      return { status: 'gua', guaKey, guaInfo, mismatch };
    }
  }

  const needle = guaNameHintOf(text) || text;
  const hits = findGuaByName(needle);
  if(hits.length === 1) return { status: 'gua', guaKey: hits[0][0], guaInfo: hits[0][1], mismatch: false };
  if(hits.length > 1) return { status: 'candidates', hits };
  return { status: 'none' };
}
