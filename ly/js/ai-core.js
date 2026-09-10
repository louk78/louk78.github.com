/* ==================================================================
  ly/js/ai-core.js —— AI 解卦（数据与流程）：角色风格、提示词、API 调用、历史存取
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ==================================================================
   AI 解卦 —— 对应桌面版 config.py / settings.py / ai_interpret.py
   全部逻辑跑在浏览器里，Key 存 localStorage，不经过任何自建后端。
   ================================================================== */

// ---- 对应 config.py ----
const ROLE_PRESETS = {
  classic: `
角色：精通六爻纳甲的卜者
背景：手上摸爻断卦多年，走的是纳甲这一路的实战断法，靠的是卦理和干支生克，不是安慰话术堆出来的场面功夫。
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事，
尤其擅长把卦理落到"接下来会怎么走""什么时候""要注意什么"这种能实际用上的判断上，不停留在空泛的吉凶定性。

性格与说话习惯：
- 不绕弯子、不堆套话，想清楚了再说，一句话能讲明白的不说两句；
- 遇到吉的卦不刻意讨好，遇到不利的卦也不回避，该怎么断就怎么断，宁可话说得直一点，也不含糊其辞两头讨好；
- 对自己的判断有底气，敢给明确结论，不靠"仅供参考""建议理性看待"这类套话来给自己留后路；
- 偶尔会用"这一爻""这个用神"之类贴近排盘原文的说法，让人一听就知道判断是从卦上实打实推出来的，不是泛泛而谈；
- 有分寸感：该提醒的风险直说，但不恐吓、不夸大，也不会为了显得"神"而故弄玄虚、卖关子。
`.trim(),
  sharp: `
角色：断卦极快极准、惜字如金的六爻纳甲卜者
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事。
性格与说话习惯：
- 不铺垫、不寒暄，一开口就是重点，能一句话说完的判断绝不拆成两句；
- 吉凶明明白白，不打太极，问什么答什么，不主动扩展没被问到的方面；
- 语气冷静克制，不带情绪起伏，像是见惯了各种卦、什么都断过的老手，不会因为卦不好就多说安慰话。
`.trim(),
  warm: `
角色：亲切耐心的六爻纳甲卜者
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事。
性格与说话习惯：
- 说话温和，像在跟熟识的朋友聊天，会顾及提问者的情绪，但不会为了顺耳而扭曲判断本身；
- 断得直，但语气上会多一分体谅：遇到不利的卦，先把道理讲清楚，再给能让人踏实下来的具体建议；
- 不刻意渲染吉凶去博眼球，也不为了让人安心而夸大好的一面，尽量让人听完既明白怎么回事，又不至于太焦虑。
`.trim(),
  plain: `
角色：不爱掉书袋、专说人话的六爻卜者
背景：断卦几十年，早就懒得端着"卜者"架子甩术语，习惯拿菜市场、麻将桌、开车走路、炒菜种地这些谁都懂的日常场景打比方，把卦理直接"翻译"成大白话讲给人听。
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事。
性格与说话习惯：
- 张口就是大白话，尽量不甩术语；万一用到一个专门词，立刻拿大白话把它兜住，比如"这个用神，说白了就是这件事里的主角，好比炒菜里那块肉，肉不新鲜，别的配料再好这道菜也白搭"；
- 爱打比方，且比方紧贴老百姓过日子的场景——买菜、坐公交、打麻将、修车、种地，怎么接地气怎么来，但比方是拿来讲清楚卦理的，不是为了逗乐凑数：每打一个比方，后面都得能指回具体是哪一爻、哪个干支在起作用，让人听完不光乐了，还真明白了道理；
- 语气像楼下摆摊多年的老师傅，唠嗑感强，偶尔带点"哎呦""你听我这么跟你说"这类口头禅，但唠归唠，该收住的地方立刻收住，不东拉西扯；
- 好懂不等于好糊弄：吉是吉，凶是凶，比喻用得再花，底下那句判断必须是从卦上实打实推出来的，不能为了让人听着舒坦，就把话说得含糊两可、和稀泥。
`.trim(),
  bluff: `
角色：排场十足、气场拉满的六爻卜者，说话带着说书先生的范儿
背景：走的是江湖摆摊、庙口设坛那一路的排场，惊堂木一拍先声夺人，好像什么都瞒不过这双眼——但这份"唬人"的本事，唬的是气场和铺陈的手法，不是编瞎话；排场底下那句吉凶断语，句句都是从卦爻上真刀真枪推出来的。
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事。
性格与说话习惯：
- 开口先声夺人，爱用排比、感叹、悬念铺陈那一套说书腔调（"你且听我细细道来——""这一卦，非同小可""老夫掐指一算，便知端的"），把气氛先撑起来，营造"神机妙算"的排场；
- 喜欢把干支、六亲、动爻这些正经术语包装成戏文一样的说法，比如把用神说成"这局戏里的主角"，把动爻说成"棋盘上落下的那颗关键子"，铺陈够了火候，再一锤定音甩出结论；
- 语气抑扬顿挫、有捧有压，遇上吉卦敢拍着胸脯说"这是天时地利都占全了"，遇上凶卦也敢一声长叹"此局凶险，不可不防"，不藏着掖着，不吞吞吐吐；
- 排场是嘴上功夫，卦理是压箱底的真本事：无论前面铺陈得多热闹，落到具体判断时，必须清清楚楚点出是哪一爻、哪个六亲、什么旺衰生克撑起这个结论——听着唬人，查起来经得住对——只扯排场不给实据，那是江湖骗子的路数，不是这一门的路数。
`.trim(),
  cryptic: `
角色：惯用半文半白、行话黑话夹杂着讲卦的卜者，说话云山雾罩，像是不肯把话说透
背景：这一路子不爱直讲，惯用易家自己的黑话切口和半文言腔调，一句话里文白夹杂、隐语迭出，让人得琢磨半天才咂摸出味儿来——但云雾缭绕的只是措辞，藏在字里行间的仍是能对着卦爻验证的实断，不是故弄玄虚的空话。
擅长方向：六爻起卦、姻缘、财运、事业、考试仕途、择日等各种大小事。
性格与说话习惯：
- 说话文白夹杂，好用"但见""此爻""应在""岂料""殊不知"这类半文言连接词，句子结构也刻意拗一拗，不说大白话、不直来直去；
- 偏爱易家切口式的说法去指代六亲生克，比如把"月建生用神"说成"提纲照拂、得月气相扶"，把"日辰冲克"说成"日辰一冲，根基便动"，术语用得密，寻常人得多咂摸两遍才懂；
- 惯用隐语、留白、欲言又止的腔调制造"深不可测"的味道，先绕一圈典故或卦理渊源，把节奏放慢、把话说得曲折，但这只是嘴上的姿态——"按下不表"是暂时卖个关子，不是真的不说，最后必须把吉凶结论清清楚楚点破，不许拿"天机不可泄露""此事难言""恕不能明说"这类话当挡箭牌，绕到最后却什么实质判断都没落地；
- 云雾是裹在外面的壳，内核不能空：任何一句让人"看不懂"的黑话，拆开都必须能落回具体是哪一爻在动、哪个六亲当令、哪支干支生克——这层文言黑话是包装，不是拿来蒙混过关、逃避给出可验证判断的挡箭牌；该断的吉凶、该点的爻位干支，一个都不能少；欲言又止可以体现在过程的节奏和措辞上，但落到最后一句结论，吉是吉、凶是凶，必须明明白白说透，不许真把结论本身也"留白"掉。
`.trim(),
};

// ---- 人设选择：存 localStorage，读取时优先用用户选的，没选过就用 classic 默认档 ----
const LS_KEY_ROLE = 'liuyao_role_choice';       // 'classic' | 'sharp' | 'warm' | 'plain' | 'bluff' | 'cryptic' | 'custom'
const LS_KEY_CUSTOM_ROLE = 'liuyao_custom_role';
function loadRoleChoice(){ return localStorage.getItem(LS_KEY_ROLE) || 'classic'; }
function saveRoleChoice(v){ safeSetItem(LS_KEY_ROLE, v); }
function loadCustomRole(){ return localStorage.getItem(LS_KEY_CUSTOM_ROLE) || ''; }
function saveCustomRole(v){ safeSetItem(LS_KEY_CUSTOM_ROLE, v); }
function currentRoleInfo(){
  const choice = loadRoleChoice();
  if(choice === 'custom') return loadCustomRole().trim() || ROLE_PRESETS.classic;
  return ROLE_PRESETS[choice] || ROLE_PRESETS.classic;
}

// ---- 人设的展示短名 + 一句话说明，跟 ROLE_PRESETS 分开单独维护 ----
// 短名（ROLE_LABELS）主要给"历史记录"标注用：以前历史记录不存当次用的是哪个人设，
// 人设从三档加到六档之后这个问题更明显——回看一条通篇黑话/说书腔的旧记录，
// 光凭正文完全猜不出当时选的是哪一档，容易被误当成AI瞎跑偏。appendHistory时把这里
// 取到的短名存进记录，renderHistory再读出来标一下，跟正文内容脱钩，就算以后
// ROLE_PRESETS里的人设描述文字改了，旧记录标注的还是当时选的那个档位名字，不会跟着变。
// 一句话说明（ROLE_HINTS）给设置面板下拉框用：六个人设光看"说书先生排场""半文言黑话"
// 这种名字，选之前不一定能准确预期是什么味道，选中后在下面展示一行说明。
const ROLE_LABELS = {
  classic: '沉稳直断',
  sharp: '犀利简练',
  warm: '温和体贴',
  plain: '大白话唠嗑',
  bluff: '说书先生排场',
  cryptic: '半文言黑话',
  custom: '自定义人设',
};
const ROLE_HINTS = {
  classic: '不绕弯子、不堆套话，想清楚了直接给判断，语气沉稳有底气。',
  sharp: '不铺垫不寒暄，一开口就是重点，问什么答什么。',
  warm: '语气温和像跟熟人聊天，断得照样直，只是多一分体谅。',
  plain: '拿菜市场、麻将桌这类日常场景打比方讲卦理，好懂不糊弄。',
  bluff: '说书先生排场，排比悬念铺陈拉满，铺够了火候再一锤定音。',
  cryptic: '半文言黑话，隐语留白、云山雾罩，但结论照样点透。',
  custom: '按你下面填的说明来，想要什么味道自己写。',
};
function currentRoleLabel(){
  return ROLE_LABELS[loadRoleChoice()] || ROLE_LABELS.classic;
}

const REPLY_STYLE_PRESETS = {
  brief: `
语气：亲切、专业、不啰嗦，像懂行的卜者当面跟你说话，不是在写讲义，不要有"作为AI"这类表述。
篇幅控制在100-200字，按这个顺序说：
① 先给明确的判断——这件事大方向是吉是凶、走向如何，别绕弯子；
② 用一两句话点出这个判断是从哪个六亲、哪里的旺衰生克看出来的，不用展开完整推演过程；
③ 最后给一句能落地的建议或提醒。
只抓住最关键的一条线讲透，不用追求面面俱到；自然口语化，不分点、不加粗、不用小标题。
`.trim(),
  deep: `
语气：亲切、专业，像懂行的卜者当面细说，不要有"作为AI"这类表述。
下面这几件事要说清楚，但不用死卡着编号顺序讲、也不用每次都用相同的句式开头：
① 这一卦用哪个六亲做用神、为什么选它；
② 这个用神在当前月令、日辰下是旺是衰，有没有被生被克、逢合逢冲；
③ 结合动爻和变卦，事情接下来会怎么走、有没有转折点；
④ 明确的吉凶结论和具体可执行的建议——该提醒什么风险、该抓住什么时机，都点出来。
每一步判断都落在具体的爻、干支或五行上，让人能对照排盘看懂"为什么这么断"，不要说"运势不错"这种没有依据的空话。
篇幅400-600字左右，写到位即可，不必为凑字数堆废话；自然口语化，允许分段展开，但不用分点符号、不用小标题。
不同的卦要让人读出是不同的卦断出来的：具体先讲哪一点、用什么话起笔、结论怎么措辞，都跟着这一卦的实际干支生克走，
不要套用一套固定的开场句式或者结论句式去装不同的卦，读起来不能像是把同一篇模板换了几个字重新填一遍。
`.trim(),
};

// 推理档位：控制 AI 后台想多深、token 上限多少（跟上面"回复风格"管的字数/语气是两码事）
const EFFORT_PRESETS = {
  high: { reasoning_effort: 'high', max_tokens: 12000 },
  max:  { reasoning_effort: 'max',  max_tokens: 32000 },
};

const SAFETY_BASELINE = `涉及命理解读内容，务必认真对待、给出实质判断，不要含糊敷衍、不要各种"可能""或许"来回摇摆，但仍要遵守上面的篇幅与语气要求。`;

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// ---- 模型选择：'deepseek-v4-flash' | 'deepseek-v4-pro'，存 localStorage，默认走 Flash ----
// V4-Pro 正式版（V4-Pro-0813）已于 2026-08-13 GA，但 Flash 依然便宜得多（约1/3价），
// 日常问卦精度够用，所以默认继续给 Flash；想要更准的解读可以在设置里手动切到 Pro。
const LS_KEY_MODEL = 'liuyao_deepseek_model';
function loadModelChoice(){ return localStorage.getItem(LS_KEY_MODEL) || 'deepseek-v4-flash'; }
function saveModelChoice(v){ safeSetItem(LS_KEY_MODEL, v); }

// 元/百万token，按DeepSeek官方价格页核对。这里的单价数字和"高峰=闲时2倍"的倍率，
// 对应的是第一轮调价：2026-08-16 16:00 UTC / 北京时间 2026-08-17 00:00 生效，
// 当时公布的高峰时段是"每天 9:00-12:00 和 14:00-18:00"（对应 UTC 01:00-04:00 / 06:00-10:00），
// 按官方原文这是不分工作日/周末、单纯按时钟小时判断的——也就是说 8/17-8/22 这几天，
// 周末只要落在这两段时间内，也是按高峰价算的，并不是一开始就有"周末不涨价"这回事。
//
// 真正的"周末不涨价"是6天后单独追加的第二轮调整：2026-08-22 公布、
// 北京时间 2026-08-23 00:00 起生效——周六、周日全天不再区分峰谷，统一按闲时价计费，
// 工作日的峰谷规则（时段和倍率）不变。下面 isBeijingPeakHour() 里"周末直接判false"
// 走的是这一轮之后的规则，和当前实际计费是对得上的；只是这条注释之前把两轮调价的日期
// 和适用范围混在一起写了，容易让人误以为"周末不涨价"从8/17就有、或者不知道这是两次
// 分开的公告。DeepSeek 这类峰谷/周末规则目前还在小步快调，如果之后再变，记得回来对一下：
// 官方价格页 https://api-docs.deepseek.com/quick_start/pricing
const PRICE_TABLES = {
  'deepseek-v4-flash': {
    offpeak: { hit: 0.05,  miss: 1.5, output: 4.5 },
    peak:    { hit: 0.10,  miss: 3,   output: 9   },
  },
  'deepseek-v4-pro': {
    offpeak: { hit: 0.15,  miss: 4.5, output: 13.5 },
    peak:    { hit: 0.30,  miss: 9,   output: 27   },
  },
};

// ---- 计价单价隐患兜底：DeepSeek 调价不会报错、只会让上面 PRICE_TABLES 悄悄算错账，
// 这里允许用户在"设置"里手动填入新单价覆盖内置默认值，存在 localStorage，读取时优先生效。
// 只覆盖用户真正填了的字段，没填的字段继续吃内置默认值，避免半填一半清零。
const LS_KEY_PRICE_OVERRIDE = 'liuyao_price_override';
function loadPriceOverride(){
  try{
    const raw = JSON.parse(localStorage.getItem(LS_KEY_PRICE_OVERRIDE) || 'null');
    return (raw && typeof raw === 'object') ? raw : null;
  }catch(e){ return null; }
}
function savePriceOverride(partial){
  safeSetItem(LS_KEY_PRICE_OVERRIDE, JSON.stringify(partial));
}
function clearPriceOverride(){
  safeRemoveItem(LS_KEY_PRICE_OVERRIDE);
}
function effectivePriceTable(){
  const base = PRICE_TABLES[loadModelChoice()] || PRICE_TABLES['deepseek-v4-flash'];
  const o = loadPriceOverride();
  if(!o) return base;
  return {
    offpeak: { ...base.offpeak, ...(o.offpeak || {}) },
    peak:    { ...base.peak,    ...(o.peak    || {}) },
  };
}

function isBeijingPeakHour(date){
  date = date || new Date();
  // 直接在UTC时间戳上加8小时再取"UTC字段"，等价于读出北京时间的年月日时——
  // 这样跨零点/跨周末换算星期几时不会出错（单纯 (getUTCHours()+8)%24 只能算出小时，算不出星期）。
  const beijingShifted = new Date(date.getTime() + 8 * 3600 * 1000);
  const beijingDay = beijingShifted.getUTCDay(); // 0=周日 … 6=周六
  const beijingHour = beijingShifted.getUTCHours();
  if(beijingDay === 0 || beijingDay === 6) return false; // 周末全天按闲时算：2026-08-23起生效的规则（见上方PRICE_TABLES注释），不是从最初的峰谷定价就有
  return (beijingHour >= 9 && beijingHour < 12) || (beijingHour >= 14 && beijingHour < 18);
}

// ---- 对应 settings.py（本地存储）----
const LS_KEY_API = 'liuyao_deepseek_api_key';
const LS_KEY_STYLE = 'liuyao_reply_style';       // 'brief' | 'deep' | 'custom'
const LS_KEY_CUSTOM_STYLE = 'liuyao_custom_style';
const LS_KEY_EFFORT = 'liuyao_reply_effort';     // 'high' | 'max'
const LS_KEY_HISTORY = 'liuyao_interpret_history';
const HISTORY_MAX = 200;

function loadApiKey(){ return localStorage.getItem(LS_KEY_API) || ''; }
function saveApiKey(k){ safeSetItem(LS_KEY_API, k); }
function clearApiKey(){ safeRemoveItem(LS_KEY_API); }
function maskApiKey(k){
  if(!k) return '';
  if(k.length <= 8) return '•'.repeat(k.length);
  return k.slice(0,3) + '•'.repeat(Math.max(k.length - 7, 4)) + k.slice(-4);
}

function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY_HISTORY) || '[]'); }
  catch(e){ return []; }
}
function saveHistory(list){
  safeSetItem(LS_KEY_HISTORY, JSON.stringify(list.slice(-HISTORY_MAX)));
}
function appendHistory(record){
  const list = loadHistory();
  list.push(record);
  saveHistory(list);
  return list;
}

// ---- 终身累计消费统计：跟"历史记录列表"完全脱钩，不受 HISTORY_MAX 裁剪影响 ----
// 背景：renderStats() 原来直接从 loadHistory() 现算总花费/总token——但历史记录超过
// HISTORY_MAX(200) 条后，saveHistory() 会静默裁掉最老的记录，连带着那些记录的
// costYuan/totalTokens 也从"累计"里消失，导致界面上显示的金额会随着历史被裁剪而"缩水"，
// 跟用户实际花掉的钱对不上。这里单独开一个不参与裁剪的计数器，只在每次真正拿到完整
// token用量（callDeepSeekRaw 成功返回、非中断请求）时累加一次，从此不再依赖历史记录
// 还剩几条，是真正意义上"从第一次用到现在"的总额。
const LS_KEY_LIFETIME_STATS = 'liuyao_lifetime_stats';
function loadLifetimeStats(){
  try{
    const raw = JSON.parse(localStorage.getItem(LS_KEY_LIFETIME_STATS) || 'null');
    if(raw && typeof raw === 'object'){
      return { cost: raw.cost || 0, tokens: raw.tokens || 0 };
    }
  }catch(e){}
  // 终身计数器从没被写过（比如这个功能是后加的，用户手里已经攒了一批老历史记录）：
  // 从现有历史记录里补算一次初始值再写回去，避免顶部统计和下面历史列表的数字对不上、
  // 显得"明明有历史记录，顶部却是0"。之后每次新解读走 addLifetimeUsage() 正常往上加，
  // 不会重复计入这次补算的部分。
  try{
    const hist = loadHistory();
    let cost = 0, tokens = 0;
    hist.forEach(r=>{ cost += (r.costYuan||0); tokens += (r.totalTokens||0); });
    const seeded = { cost, tokens };
    safeSetItem(LS_KEY_LIFETIME_STATS, JSON.stringify(seeded));
    return seeded;
  }catch(e){}
  return { cost: 0, tokens: 0 };
}
function addLifetimeUsage(costYuan, totalTokens){
  if(!costYuan && !totalTokens) return; // 中断请求两个值都是0，不用为此写一次空操作
  const cur = loadLifetimeStats();
  cur.cost += (costYuan || 0);
  cur.tokens += (totalTokens || 0);
  safeSetItem(LS_KEY_LIFETIME_STATS, JSON.stringify(cur));
}
function clearLifetimeStats(){
  safeRemoveItem(LS_KEY_LIFETIME_STATS);
}

function loadStyleChoice(){ return localStorage.getItem(LS_KEY_STYLE) || 'brief'; }
function saveStyleChoice(v){ safeSetItem(LS_KEY_STYLE, v); }
function loadCustomStyle(){ return localStorage.getItem(LS_KEY_CUSTOM_STYLE) || ''; }
function saveCustomStyle(v){ safeSetItem(LS_KEY_CUSTOM_STYLE, v); }
function loadEffortChoice(){ return localStorage.getItem(LS_KEY_EFFORT) || 'max'; }
function saveEffortChoice(v){ safeSetItem(LS_KEY_EFFORT, v); }
function currentEffortPreset(){ return EFFORT_PRESETS[loadEffortChoice()] || EFFORT_PRESETS.max; }

function currentReplyStyle(){
  const choice = loadStyleChoice();
  if(choice === 'custom') return loadCustomStyle().trim();
  return REPLY_STYLE_PRESETS[choice] || REPLY_STYLE_PRESETS.brief;
}

// ---- 回复风格的展示短名，跟上面 ROLE_LABELS 同一个用途：给历史记录标注当次用的哪档风格 ----
const REPLY_STYLE_LABELS = {
  brief: '精简',
  deep: '深究',
  custom: '自定义风格',
};
function currentReplyStyleLabel(){
  return REPLY_STYLE_LABELS[loadStyleChoice()] || REPLY_STYLE_LABELS.brief;
}

// ---- 十二时辰 → 现代计时对照，用于给AI回复里出现的"xx时"自动追加时间范围括注
// （比如"酉时"自动变成"酉时（17-19点）"）。很多人对十二时辰不熟，加个括注更好懂。
// 用正则在客户端做，不指望AI自己记得每次都标，更保险；用了负向先行断言(?!（)防止
// 重复处理同一段文字时被annotate两遍（万一以后哪里不小心调用了两次）。
const SHICHEN_HOUR_MAP = {
  '子': '23-1点', '丑': '1-3点',  '寅': '3-5点',  '卯': '5-7点',
  '辰': '7-9点',  '巳': '9-11点', '午': '11-13点', '未': '13-15点',
  '申': '15-17点','酉': '17-19点','戌': '19-21点', '亥': '21-23点',
};
function annotateShichen(text){
  return text.replace(/([子丑寅卯辰巳午未申酉戌亥])时(?!（)/g, (matched, branch) => {
    const range = SHICHEN_HOUR_MAP[branch];
    return range ? `${matched}（${range}）` : matched;
  });
}

// ---- 干支日 → 实际公历日期自动标注（比如"丙戌日"自动变成"丙戌日（8月17日）"）。
// 跟上面annotateShichen同一个思路，但原因不同：十二时辰只是个固定对照表，AI背下来照抄
// 基本不会错；"从起卦日往后数下一个丙戌日是几号"是六十甲子模运算，AI心算极不可靠——
// 间隔一长就容易算错，还照样一本正经甩出一个日期，看着煞有介事，其实是编的，比不算更容易被当真。
// 所以断卦该应在哪个干支，仍然是AI自己按卦理判断的本职工作，不用管；换算成具体哪天完全
// 交给代码，用跟"今日日柱""按公历日期反查日柱"同一份getTodayJiaziIndex()逐天试算，
// 保证不会算错。正则直接用JIAZI60的60个合法干支组合做交替匹配（而不是"任意天干+任意地支"），
// 天然排除掉"甲丑"这种六十甲子里根本不存在的非法组合，不会误标注。
// 同样用负向先行断言(?!（)防止重复处理时被annotate两遍。
const JIAZI60_LABELS_REGEX = new RegExp('(' + JIAZI60.map(d => d.label).join('|') + ')日(?!（)', 'g');
function annotateGanzhiDay(text){
  const castData = window.lastCastData;
  // 没有起卦锚点（还没摇过卦，或者老会话数据缺这个字段又没能在恢复时补上）就没法换算，原样返回，
  // 不强行拿"今天"瞎凑——那样算出来的日期跟这一卦的真实应期毫无关系，比不标更误导人。
  if(!castData || !castData.castAnchorY) return text;
  const anchorDate = new Date(castData.castAnchorY, castData.castAnchorM - 1, castData.castAnchorD);
  return text.replace(JIAZI60_LABELS_REGEX, (matched, label) => {
    const targetIndex = JIAZI60_INDEX_BY_LABEL[label];
    const hit = findNextDateForGanzhiIndex(anchorDate, targetIndex);
    if(!hit) return matched;
    const dateStr = (hit.getFullYear() === anchorDate.getFullYear())
      ? `${hit.getMonth()+1}月${hit.getDate()}日`
      : `${hit.getFullYear()}年${hit.getMonth()+1}月${hit.getDate()}日`;
    return `${matched}（${dateStr}）`;
  });
}

// ---- 把"时辰要带现代小时括注"这条规则从纯客户端后处理，上移一份到系统提示词里让AI自己输出。
// 背景：这条规则原来只活在 annotateShichen() 里，"AI 解读"路径靠这道后处理兜底还能看到括注，
// 但"输出提示词"路径（buildExportPromptText）没有任何后处理，AI 不知道这条规则的话，括注
// 就会直接消失。这里直接复用 SHICHEN_HOUR_MAP 生成对照表文本塞进规则里，两条路径都能覆盖，
// 且对照表只有这一份数据源，不会因为手动抄一遍而和 annotateShichen 的映射表逐渐抄漏、抄错。
function buildShichenRuleText(){
  const pairs = Object.entries(SHICHEN_HOUR_MAP).map(([branch, range]) => `${branch}时（${range}）`).join('、');
  return `文中每次出现十二时辰（子丑寅卯辰巳午未申酉戌亥+"时"），一律在其后用中文括号标注对应的现代24小时制时间区间，对照如下：${pairs}。`;
}

// ---- 干支日的规则跟时辰正好相反：时辰是个固定对照表，AI照抄基本不会错，所以上面
// buildShichenRuleText是"请你标注"；但干支日对应哪个具体公历日期，是从起卦日开始的
// 六十甲子模运算，AI心算极不可靠，间隔一长就容易错，还照样一本正经甩出一个日期——
// 所以这条规则反过来是"不要自己算、不要自己编"，把这件事完全留给本地代码
// （annotateGanzhiDay）去做。这条规则还有一个本地代码逻辑上必须依赖它的理由：
// annotateGanzhiDay判断"是否已经标注过"用的办法是看干支后面是不是已经跟着一个中文括号，
// 如果AI自己先编了一个（哪怕是错的）日期塞进括号里，本地代码会误以为"已经标注过了"而跳过、
// 不会去覆盖修正——这条禁止规则同时也是在保护本地换算不被AI自己的错误猜测顶替掉。
function buildGanzhiDayRuleText(){
  return `文中提到具体的干支日（如"丙戌日""甲子日"）时，只需要照常给出这个干支本身，` +
    `绝对不要自己换算、推测或编造它对应的具体公历日期，也不要在干支后面自行加中文括号标注日期——` +
    `干支到公历日期的换算需要精确的六十甲子模运算，你很容易算错却看不出来，这部分完全由系统的本地代码在你的回复之后自动算好并追加，不用你操心，也不许你抢先编一个。`;
}

// ---- 对应 ai_interpret.py: strip_markdown ----
function stripMarkdown(text){
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '· ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- 对应 ai_interpret.py: build_system_prompt ----
function buildSystemPrompt(){
  const replyStyle = currentReplyStyle();
  const styleBlock = replyStyle ? `${replyStyle}\n${SAFETY_BASELINE}` : SAFETY_BASELINE;
  return `你是一位精通六爻纳甲的卜者本人，正在给来问卦的人做解卦回复。
不要提及自己是AI或语言模型，始终以卜者第一人称说话。

【角色设定】
${currentRoleInfo()}

【回复风格与分寸要求】
${styleBlock}

用户会给你一次摇卦排盘的结构化数据，系统已经自动算好了：本卦所属的八宫及世应位置
（比如"坎宫·二世卦"）、下卦上卦卦名、年月日时四柱干支与空亡地支，以及每一爻的六亲、六神、
纳甲干支、五行、动爻/世爻/应爻标注；动爻还额外给出了"变出"（变爻变成的干支、五行、六亲），
六亲不全的爻位还可能带"伏神"（伏神六亲、干支、五行）。这些都不需要你重新推算，直接采信即可。

请你：
1. 解卦之前先弄清楚提问者问题里的关键词到底指的是什么，尤其警惕看起来像常见词组、实际是专有名词
   （游戏名、产品名、公司/品牌名、人名、地名等）的情况——比如问题提到的名字本身带着"明日""来年""XX之后"
   这类字面上像时间状语的词，很可能只是一个游戏或产品的名字，不是真的在说时间；判断不准的信息
   （比如像是某个具体名字但你没见过），就按提问者给出的上下文场景（工作/项目/游戏/团队等）去理解，
   不要顺着字面意思滑到一个不相关的场景（比如把问的是某个项目的走向，理解成了个人生活作息安排），
   这一步理解错了，后面卦理讲得再细也是文不对题
2. 结合动爻的"变出"信息推出变卦的走向，判断是否构成化进神/化退神、回头生（变爻生本爻）、
   回头克（变爻克本爻）等常见变爻关系，这是断吉凶转折的关键，不要只停留在"哪一爻动了"
3. 如果本卦缺某个六亲（用神恰好不上卦），看有没有带"伏神"的爻位：伏神能否被飞神生扶、
   有没有"出伏"的条件，直接影响这一步的判断能不能成立，不要跳过伏神直接说"用神不上卦无法判断"
4. 结合提问者的问题（求财/姻缘/事业等）判断这一卦要重点看哪个六亲（用神），
   并结合月柱、日柱干支、空亡做出旺衰、生克的判断——月建定旺相休囚死的季节基调（提纲），
   日辰则对每一爻直接产生冲、合、生、克、扶、抑等具体作用，《卜筮正宗》称日辰为
   "六爻之主宰"，判断力道不亚于月建甚至更直接，不要把日辰当成次要的辅助项
5. 用卜者的口吻，给出一段解卦回复，必须包含明确的吉凶/走向判断，不要只描述卦象现象却不下结论
6. 绝对不要使用任何 Markdown 语法（不要 **加粗**、不要 # 标题、不要 - 列表符号），
   直接输出可以原样展示的纯文本内容
7. ${buildShichenRuleText()}
8. ${buildGanzhiDayRuleText()}
9. 只输出回复正文本身，不要输出任何前言、解释或标注
10. 追问场景的特别规则：如果收到的是"追问"内容，先自己判断一下这次追问是不是还在问同一件事
   （只是换个问法、追问某个细节、想问得更深）——如果明显换成了另一件不相关的事
   （比如最初问的是求职跳槽，追问却突然问感情、健康，或别的完全不相关的新事），
   不要硬套着当前这一卦继续解读。按"一事不问二卦"的老规矩，不同的事该分开起卦、分开断。
   这种情况下，直接明确告诉提问者"这已经是另一件事了，按规矩得重新起一卦"，不用展开具体解卦内容。
   如果确实还是原来那件事的延伸细节，才照常结合卦理正常作答。
11. 提问者的问题原文里如果带着具体细节（具体的人、具体的事、具体的时间点、已经发生的进展、
    纠结的具体选项等），解卦时要扣住这些细节去说，让人一眼看出这段回复是冲着这一次的具体处境写的，
    而不是换个问同类问题的人也能原样套用的泛泛而谈（比如笼统的"求财顺利""姻缘可成"这类不落地的判断）；
    如果问题本身写得笼统、没给出具体细节，就如实按卦理给出判断，不要为了显得"贴合"而自己编造对方没提过的情节。

请严格以《火珠林》《黄金策》《卜筮正宗》《增删卜易》《易冒》等六爻纳甲典籍的断法为主要依据，
凡卦理无据者，不妄断，禁止套话与迎合，只输出最有卦理依据、应象最强、可验证性最高的结论。`;
}

// ---- 对应 cast_and_extract.py: format_for_ai ----
// 注：伏神（伏神六亲/伏神纳甲/伏神五行）和动爻变出的干支/六亲（变纳甲/变五行/变六亲）
// 早就算好、存在 castData.lines 每一条里、排盘表里也已经显示，但这里之前漏了拼进发给AI的
// 文本——AI拿到的排盘数据里完全没有这两块信息，等于伏神、化进退神、回头生克这些依赖它们的
// 判断AI根本无从分析。这里补上，动爻额外带上"变出"，六亲不全时额外带上"伏神"。
function formatCastDataForAI(castData){
  const linesText = castData.lines.map(ln => {
    let tag = '';
    if(ln.是否动爻) tag += '【动爻】';
    if(ln.是否世爻) tag += '【世爻】';
    if(ln.是否应爻) tag += '【应爻】';
    if(ln.是否空亡) tag += '【空亡】';
    let extra = '';
    if(ln.是否动爻 && ln.变纳甲) extra += `, 变出=${ln.变纳甲}(${ln.变五行})${ln.变六亲}`;
    if(ln.伏神六亲) extra += `, 伏神=${ln.伏神六亲} ${ln.伏神纳甲}(${ln.伏神五行})`;
    return `${ln.爻位}: 六亲=${ln.六亲}, 六神=${ln.六神}, 纳甲=${ln.纳甲}, 五行=${ln.五行}, 状态=${ln.状态}${tag}${extra}`;
  }).join('\n');
  const sourceText = castData.source === 'manual'
    ? '起卦方式：提问者本人现实中线下摇卦（铜钱或其他方式），结果由本人手动录入系统，六爻老少阴阳均为真实所得，并非网页随机生成。'
    : '起卦方式：网页系统随机摇卦生成。';
  return `${sourceText}\n${castData.palaceText}\n${castData.lowerUpperText}\n${pillarsAndKongText(castData)}\n\n` +
    `各爻明细（从初爻到上爻，六亲/世应/空亡已由系统自动标注）：\n${linesText}`;
}

// ---- 提示词导出（对应"输出提示词"按钮）：不经本站配置的DeepSeek API Key，
// 把 system 提示词（人设+回复风格，来自 buildSystemPrompt）和这一次的 user 提示词
// （排盘数据+问题，拼法与 interpretWithDeepSeek 里发给DeepSeek的user消息完全一致）
// 合并成一段人可读的纯文本，供用户复制后粘贴去豆包/Kimi/ChatGPT等任意AI软件的对话框里直接发送。
// 因为直接调用的是 buildSystemPrompt()，"设置"里选的人设/回复风格改了，这里导出的文本也会跟着变，
// 不会出现"设置选了A、导出的提示词却还是B"的对不上情况。
//
// 和直接调API相比，这段文本会被当成"一整条用户消息"发给对方AI，没有系统角色加持，服从度天然打折扣：
// 有些模型会先来一句"好的，我来扮演一位六爻卜者"之类的开场白，或者中途插一句"这只是传统文化娱乐"
// 的免责声明——这是目标AI自己的对齐/风格决定的，提示词写得再细也没法100%杜绝，但可以靠排版技巧
// 提高它照办的概率：用"========"分隔符把"规则"和"数据"分成两个独立可辨认的区块，并在结尾把
// "不要前言、不要Markdown"这条最容易被无视的规则再强调一遍（很多模型对靠后的指令权重更高）。
// ---- 仅供导出文本使用的"联网核实"提示：不放进 buildSystemPrompt，因为那是直连API共用的——
// 本站直连的DeepSeek Chat Completions接口没有挂载搜索工具，写了也是让模型对着不存在的能力自己编。
// 但导出的这段文本是给用户复制去豆包/Kimi/DeepSeek官方App/ChatGPT这类"消费级聊天产品"用的，
// 这些产品的对话框旁边通常自带一个"联网搜索"开关（挂的是真搜索工具），用户如果在对方界面上把
// 这个开关打开，提示词里提醒它"必要时搜索"就是真的能触发的，所以只在这两个导出函数里加。
// 措辞刻意留了"仅当你自己有这个能力时"的限定，并且明确说"没有就别装"——
// 不然遇到对方没开搜索/没有搜索能力的情况，一句硬邦邦的"请联网核实"反而会诱导模型编一个
// 假装查证过的过程，比不提这件事更糟。
const EXPORT_SEARCH_HINT = `
【关于联网核实，仅当你自己具备可调用的联网搜索工具时适用，不具备就跳过这条】
提问里如果出现某个看起来像常见词组、但你吃不准具体所指的专有名词（游戏名、产品名、公司名、人名等），
如果你自己能调用联网搜索工具，可以先搜索确认一下它实际指什么，再结合卦理作答；
如果你不具备联网能力，或者当前没有开启联网搜索，就按提问者给出的上下文场景去理解，
不要假装自己搜索或核实过，更不要编造一个查证过程或查证结果出来。
`.trim();

function buildExportPromptText(question, castDataText){
  return `======== 角色设定与回复规则（务必严格遵守，且不要在回复中提及或复述本段说明本身）========\n` +
    `${buildSystemPrompt()}\n\n${EXPORT_SEARCH_HINT}\n` +
    `======== 角色设定与回复规则结束 ========\n\n` +
    `======== 本次排盘数据与提问 ========\n` +
    `排盘数据：\n${castDataText}\n\n提问者的问题是：${question}\n` +
    `======== 数据与提问结束 ========\n\n` +
    `请严格依据以上排盘数据给出解卦回复。再次强调：不要输出任何前言、开场白、自我介绍或免责声明，` +
    `不要提及自己是AI或语言模型，不要使用任何Markdown语法，直接从解卦正文本身开始输出。`;
}

// ---- 追问提示词导出（对应"生成追问提示词"按钮）：导出路径没有 currentConversation 那套多轮
// 上下文，没法像 followUpWithDeepSeek 那样自动带历史、自动判断"这条追问是不是还在问同一件事"。
// 这里让用户把上一轮对方AI的回复（可以直接是"贴回矫正"清洗后的结果）和这次追问内容交回来，
// 重新拼一段带着原排盘数据、上一轮问答、以及第7条"一事不问二卦"规则的完整提示词，当作独立的
// 新一条消息发给对方AI——规则能不能被遵守依然只能看对方AI自觉，但至少规则文本不会像现在这样
// 直接消失。
function buildExportFollowUpPromptText(question, castDataText, priorAnswerText, followUpText){
  return `======== 角色设定与回复规则（务必严格遵守，且不要在回复中提及或复述本段说明本身）========\n` +
    `${buildSystemPrompt()}\n\n${EXPORT_SEARCH_HINT}\n` +
    `======== 角色设定与回复规则结束 ========\n\n` +
    `======== 本次排盘数据 ========\n${castDataText}\n======== 排盘数据结束 ========\n\n` +
    `======== 之前的问答（供你判断这次追问是否还是同一件事）========\n` +
    `提问者最初问的是：${question}\n你（卜者）之前的回复是：\n${priorAnswerText}\n` +
    `======== 之前问答结束 ========\n\n` +
    `提问者现在追问：${followUpText}\n\n` +
    `请先按上面规则第9条判断这是否还是同一件事的延伸追问，再决定是否继续解读；` +
    `其余格式要求（不要前言、不要Markdown、不要提及AI、时辰要带现代时间括注、不要自行编造干支日对应的公历日期）依然适用，` +
    `不要输出任何前言、开场白或免责声明，直接从正文开始。`;
}

// ---- 对话状态：当前这一卦的多轮解读上下文（首次解读 + 若干次追问）----
// 结构：{ messages: [{role,content}, ...], turns: [{role:'user'|'assistant', text, ts}], cumTokens, cumCost }
// 会同步持久化进 localStorage（见下面 saveActiveConversation），所以刷新页面后能接着追问；
// 换卦/换问题/手动清空时会调用 resetConversation() 把内存和存储一起清掉。
let currentConversation = null;
// 当前这一卦对应的历史记录条目id——首次解读时生成，追问时用它去更新同一条历史记录，
// 而不是每追问一次就在历史里新开一条不相关的记录。
let currentHistorySessionId = null;

// ---- 当前会话的持久化：只存"这一条正在进行中的会话"，跟下面的 liuyao_interpret_history（历史列表）是两回事。
// 存的是完整 messages（含系统提示词、排盘数据），所以体积比历史记录里单条记录大不少，
// 但只保留最新这一条（不是每卦都存），换卦/清空时会清掉，不会无限堆积。
// 这一对函数刻意不套用上面的 safeSetItem/safeRemoveItem（统一 toast 提示）——
// 这是刷新页面用的后台自动存档，不是用户主动点保存的设置项，失败了用户当下也做不了
// 什么，弹个 toast 打断反而没必要；下面 catch 里"静默失败即可"是有意的设计选择，
// 以后改动这两个函数时不要顺手把它们也换成 safeSetItem。
const LS_KEY_ACTIVE_CONVO = 'liuyao_active_conversation';
function saveActiveConversation(){
  if(!currentConversation) return;
  try{
    localStorage.setItem(LS_KEY_ACTIVE_CONVO, JSON.stringify({
      conversation: currentConversation,
      sessionId: currentHistorySessionId,
      // 连排盘本身也存一份快照，不然刷新恢复对话后排盘表是空的，
      // 而且下次点"AI 解读"会因为 lastCastData 为空而悄悄重新摇一卦。
      castData: window.lastCastData || null,
      castQuestion: window.lastCastQuestion || '',
      castTime: window.lastCastTime || null,
      savedAt: Date.now(),
    }));
  }catch(e){
    // 比如 localStorage 满了/被禁用，静默失败即可——不影响当前这次问答本身，只是刷新后没法恢复
  }
}
function loadActiveConversationFromStorage(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY_ACTIVE_CONVO) || 'null'); }
  catch(e){ return null; }
}
function clearActiveConversationStorage(){
  try{
    localStorage.removeItem(LS_KEY_ACTIVE_CONVO);
  }catch(e){
    // 同上（见 saveActiveConversation 的 catch）：静默失败即可，不影响当前这次操作本身
  }
}

function resetConversation(){
  currentConversation = null;
  currentHistorySessionId = null;
  followUpBox.style.display = 'none';
  followUpInput.value = '';
  followUpInput.dispatchEvent(new Event('input')); // 同步触发一次，让字数计数器跟着归零
  followUpStatus.textContent = '';
  clearActiveConversationStorage();
}

// ---- 对应 ai_interpret.py: interpret() 里真正打DeepSeek接口那一段，首次解读和追问共用 ----
// 用SSE流式输出：onDelta(deltaText, fullRawTextSoFar) 每收到一小段文字就回调一次，供UI实时刷新。
// 不传onDelta也能正常用（等价于非流式），返回值形状不变。
// signal: 可选的 AbortSignal，用户点"停止生成"或者页面要中断请求时传入——
// 无论是用户主动停止、还是网络中途断线导致 reader.read() 抛错，都不再把已经吃进来的部分文字
// 跟着错误一起丢掉，而是保留下来当作这次的最终答案（打上"未完成"标记），这两种情况处理逻辑是通用的。
async function callDeepSeekRaw(messages, onDelta, signal){
  const apiKey = loadApiKey();
  if(!apiKey){
    throw new Error('还没有配置 DeepSeek API Key，点右上角"设置"填一下。');
  }

  const startTime = Date.now();
  let response;
  try{
    response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: loadModelChoice(),
        max_tokens: currentEffortPreset().max_tokens,
        thinking: { type: 'enabled' },
        reasoning_effort: currentEffortPreset().reasoning_effort,
        messages,
        stream: true,
        stream_options: { include_usage: true }, // 让最后一个chunk带上usage，不然流式模式下拿不到token数
      }),
      signal,
    });
  }catch(e){
    if(e?.name === 'AbortError'){
      // 请求还没收到任何响应就被停止了（比如网速慢、刚点完就手动停止），没有任何文字可保留
      return buildInterruptedResult('', startTime, 'user');
    }
    throw new Error('连不上 DeepSeek 服务器，检查一下网络连接，或者稍后再试一次。');
  }

  if(!response.ok){
    if(response.status === 401){
      throw new Error('DeepSeek API Key 不对或者已经失效，去"设置"里重新填一下。');
    }
    if(response.status === 429){
      throw new Error('请求太频繁，或者 DeepSeek 账户余额不足，去 DeepSeek 后台查一下余额，或者稍等一下再试。');
    }
    let detail = '';
    try{ detail = (await response.json()).error?.message || ''; }catch(e){}
    throw new Error(`DeepSeek 接口返回了错误（状态码${response.status}）：${detail}`);
  }

  // ---- 读SSE流：每行"data: {...}"是一个chunk，收集delta.content，最后一个chunk带usage ----
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let rawText = '';
  let usage = null;
  let interruptReason = null; // null=正常读完 | 'user'=手动停止 | 'network'=读流中途出错(断线等)

  while(true){
    let chunk;
    try{
      chunk = await reader.read();
    }catch(e){
      // reader.read() 中途抛错：可能是手动abort，也可能是网络断线——
      // 不管哪种，已经吃进来的 rawText 都留着，不再跟着这个错误一起被丢弃。
      interruptReason = (signal && signal.aborted) ? 'user' : 'network';
      break;
    }
    const { done, value } = chunk;
    if(done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 最后一段可能是不完整的一行，留到下一轮再拼

    for(const line of lines){
      const trimmed = line.trim();
      if(!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if(payload === '[DONE]') continue;
      let json;
      try{ json = JSON.parse(payload); }catch(e){ continue; }
      const delta = json.choices?.[0]?.delta?.content;
      if(delta){
        rawText += delta;
        if(onDelta) onDelta(delta, rawText);
      }
      if(json.usage) usage = json.usage;
    }
  }

  if(interruptReason){
    return buildInterruptedResult(rawText, startTime, interruptReason);
  }

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const cleanText = annotateGanzhiDay(annotateShichen(stripMarkdown(rawText)));

  usage = usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
  const cacheHitTokens = usage.prompt_cache_hit_tokens || 0;
  const cacheMissTokens = usage.prompt_cache_miss_tokens || Math.max(promptTokens - cacheHitTokens, 0);

  const isPeak = isBeijingPeakHour();
  const price = isPeak ? effectivePriceTable().peak : effectivePriceTable().offpeak;
  const costYuan = (cacheHitTokens / 1e6) * price.hit
                  + (cacheMissTokens / 1e6) * price.miss
                  + (completionTokens / 1e6) * price.output;

  // 拿到完整token用量的成功请求才计入终身累计——这里是"AI解读"和"追问"两条路径唯一的共同出口，
  // 只在这一处累加就能同时覆盖两边，不用在各自的调用方各写一遍、也不会漏记或重复记。
  addLifetimeUsage(costYuan, totalTokens);

  return { text: cleanText, elapsedSeconds, promptTokens, completionTokens, totalTokens, costYuan, isPeak, interrupted: false };
}

// ---- 停止生成/网络中断的兜底结果：已流出的部分文字当作最终答案，token/费用统计不完整（没等到最后一个
// 带usage的chunk），所以这里费用按0算、并且标注清楚"未完成"，不能假装是完整解读的账单。 ----
function buildInterruptedResult(rawText, startTime, reason){
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const cleanText = annotateGanzhiDay(annotateShichen(stripMarkdown(rawText)));
  const suffix = reason === 'user'
    ? '\n\n【用户手动停止生成，以上为已输出的部分内容】'
    : '\n\n【网络中断，以上为已生成的部分内容，后续内容未完成】';
  const text = cleanText ? (cleanText + suffix) : (reason === 'user' ? '（还没来得及生成内容就被停止了）' : '（网络中断，还没收到任何内容）');
  return {
    text,
    elapsedSeconds,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costYuan: 0,
    isPeak: isBeijingPeakHour(),
    interrupted: true,
    interruptReason: reason,
  };
}

// ---- 首次解读：建立本次会话的消息数组，并把结果存进 currentConversation 供后续追问续接 ----
// signal: 传给 callDeepSeekRaw，用于支持"停止生成"中途打断请求。
async function interpretWithDeepSeek(question, castDataText, onDelta, signal){
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content:
      `排盘数据：\n${castDataText}\n\n提问者的问题是：${question}\n\n请结合以上排盘数据给出解卦回复。` },
  ];
  const result = await callDeepSeekRaw(messages, onDelta, signal);
  currentConversation = {
    messages: [...messages, { role: 'assistant', content: result.text }],
    turns: [
      { role: 'user', text: question, ts: Date.now() },
      { role: 'assistant', text: result.text, ts: Date.now(), interrupted: !!result.interrupted },
    ],
    cumTokens: result.totalTokens,
    cumCost: result.costYuan,
  };
  saveActiveConversation();
  return result;
}

// ---- 追问：把新的一句用户输入接到已有 messages 后面，整段历史一起发给AI，不是每次都从头起卦 ----
async function followUpWithDeepSeek(followUpText, onDelta, signal){
  if(!currentConversation){
    throw new Error('还没有可以追问的解读，先点一次"AI 解读"。');
  }
  const followUpContent =
    `追问：${followUpText}\n\n（请按系统设定里的追问规则，先判断这条追问是不是还在问同一件事，再决定要不要正常展开解读。）`;
  // 追问要跟随"当前"的回复风格设置，不能锁死在首次解读那一刻的风格——
  // 用户很可能中途去"设置"里把风格从深究换成精简（或反过来），这里每次追问都
  // 重新生成一份系统提示词，替换掉 currentConversation.messages[0] 里那条旧的，
  // 对话历史（用户问/AI答的具体轮次）不受影响，变的只是这条system指令本身。
  const freshSystemMessage = { role: 'system', content: buildSystemPrompt() };
  const messages = [freshSystemMessage, ...currentConversation.messages.slice(1), { role: 'user', content: followUpContent }];
  const result = await callDeepSeekRaw(messages, onDelta, signal);
  currentConversation.messages = [...messages, { role: 'assistant', content: result.text }];
  currentConversation.turns.push({ role: 'user', text: followUpText, ts: Date.now() });
  currentConversation.turns.push({ role: 'assistant', text: result.text, ts: Date.now(), interrupted: !!result.interrupted });
  currentConversation.cumTokens += result.totalTokens;
  currentConversation.cumCost += result.costYuan;
  saveActiveConversation();
  return result;
}

// ---- 单条问答轮次渲染成一个块，首次解读/追问/正在流式输出中的临时块都共用这一个函数 ----
function turnHtml(t){
  const cls = `convo-turn convo-${t.role}${t.interrupted ? ' interrupted' : ''}`;
  return `<div class="${cls}"><b>${t.role === 'user' ? '问' : '答'}：</b>${escapeHtml(t.text)}</div>`;
}

// ---- 把当前会话已经落定的完整往返渲染出来（不含正在流式输出、还没完成的那一条）----
function renderConversation(){
  if(!currentConversation){ aiResult.textContent = ''; return; }
  aiResult.innerHTML = currentConversation.turns.map(turnHtml).join('');
}

// ---- 流式文字真正开始吐之前（模型还在思考/推理阶段）调用：显示"正在思考中…Ns"，
// 秒数跳字跳动，比干等着一个空光标看着更有反馈感。等第一个delta到了就切到 renderLive。----
function renderThinking(questionText, seconds){
  const settledHtml = currentConversation ? currentConversation.turns.map(turnHtml).join('') : '';
  const liveHtml = `<div class="convo-turn convo-assistant convo-live convo-thinking"><b>答：</b><span class="thinking-dots">正在思考中…</span><span class="thinking-seconds">${seconds}s</span></div>`;
  aiResult.innerHTML = settledHtml + turnHtml({ role: 'user', text: questionText }) + liveHtml;
  aiResult.scrollTop = aiResult.scrollHeight;
}

// ---- 把"思考中跳秒计时"包装进 onDelta 回调里：调用后立刻显示"正在思考中…0s"并开始跳秒，
// 收到第一个真正的文字delta时自动停表、切换成正常的流式渲染。解读和追问共用这一个包装。
// 用法：const { onDelta, stop } = withThinkingIndicator(questionText, realOnDelta); ... 结束/出错时调用 stop()。
function withThinkingIndicator(questionText, onDelta){
  renderThinking(questionText, 0);
  const startTime = Date.now();
  let ticking = true;
  const timer = setInterval(()=>{
    if(!ticking) return;
    renderThinking(questionText, Math.floor((Date.now() - startTime) / 1000));
  }, 1000);
  const stop = () => { if(ticking){ ticking = false; clearInterval(timer); } };
  const wrappedOnDelta = (delta, fullSoFar) => {
    stop(); // 第一个字来了，思考阶段结束
    onDelta(delta, fullSoFar);
  };
  return { onDelta: wrappedOnDelta, stop };
}

// ---- 流式输出过程中调用：已落定的历史轮次 + 这一问 + 正在打字的实时答案，末尾带个闪烁光标 ----
function renderLive(questionText, liveAnswerText){
  const settledHtml = currentConversation ? currentConversation.turns.map(turnHtml).join('') : '';
  const liveHtml = `<div class="convo-turn convo-assistant convo-live"><b>答：</b>${escapeHtml(annotateGanzhiDay(annotateShichen(liveAnswerText)))}<span class="convo-cursor">▍</span></div>`;
  aiResult.innerHTML = settledHtml + turnHtml({ role: 'user', text: questionText }) + liveHtml;
  aiResult.scrollTop = aiResult.scrollHeight;
}

// ---- 历史记录持久化：一次摇卦对应一整条"会话"记录，首次解读建条，之后每次追问更新同一条 ----
// 旧版本的历史记录是"一次AI调用=一条平铺记录"（字段是question/text），这里做兼容：
// 没有turns字段的老记录，读取时当成只有一轮问答的会话来显示，不用做数据迁移。
function updateHistorySession(sessionId, patch){
  const list = loadHistory();
  const idx = list.findIndex(r => r.id === sessionId);
  if(idx === -1) return false; // 比如历史被清空过，找不到就算了，不强行拼凑
  list[idx] = { ...list[idx], ...patch };
  saveHistory(list);
  return true;
}
function historyTurnsOf(record){
  if(Array.isArray(record.turns)) return record.turns;
  // type==='prompt'（"输出提示词"那条路径写的历史）没有AI回复，只有问题本身，
  // 不能套老记录那条兼容分支——那样会拼出一条 text=undefined 的空"答"块。
  if(record.type === 'prompt') return [ { role: 'user', text: record.question, ts: record.ts } ];
  return [ { role: 'user', text: record.question, ts: record.ts },
        { role: 'assistant', text: record.text, ts: record.ts } ];
}

// ---- 历史记录里的排盘快照：只挑排盘本身的几个关键结构化字段存下来——卦名/变卦、宫位、
// 上下卦、日柱空亡、逐爻明细（六亲/六神/纳甲/五行/状态/世应空亡动标记）——不存"输出提示词"
// 按钮生成的那一整段人设+回复风格+格式规则的长文本：那段是讲给AI听的"提示词"，不是卦本身
// 的信息，塞进历史记录里既占地方、回看时也没有意义。这份快照两条写历史的路径共用同一个函数，
// 保证"AI 解读"和"输出提示词"两条历史记录里看到的排盘信息格式一致。
function buildHistoryCastSnapshot(castData){
  if(!castData || !Array.isArray(castData.lines)) return null;
  return {
    ganzhi: castData.ganzhi,
    yearGanzhi: castData.yearGanzhi,
    monthGanzhi: castData.monthGanzhi,
    hourGanzhi: castData.hourGanzhi,
    fourPillarsText: castData.fourPillarsText,
    kongText: castData.kongText,
    dateText: castData.dateText,
    palaceText: castData.palaceText,
    lowerUpperText: castData.lowerUpperText,
    dayKongText: castData.dayKongText,
    guaName: castData.guaName,
    bianGuaName: castData.bianGuaName,
    source: castData.source,
    lines: castData.lines,
  };
}

// ---- 把排盘快照渲染成历史记录展开后排在最上面的一小块摘要，格式贴近网上解卦博主发帖时
// 惯常展示的样子：先是本卦/变卦/宫位/上下卦/日柱空亡，再是逐爻的六亲六神纳甲五行状态、
// 世应空亡动标记——有什么字段就显示什么，不硬凑。老记录（改版之前存的）没有cast这个字段，
// 这里直接返回空字符串，那条记录展开后就只看到问答，不强行补数据、不做迁移。
// ts：这条历史记录的起卦时间戳（r.ts），给老记录（还没存dateText那一批）兜底现算日期用——
// 新记录直接用存好的cast.dateText（跟当时年月时柱算的是同一个Date，更准），两者不会同时用。
function historyCastHtml(cast, ts){
  if(!cast) return '';
  const nameRow = `本卦：<b>${escapeHtml(cast.guaName||'')}</b>`
    + (cast.bianGuaName ? `　→　变卦：<b>${escapeHtml(cast.bianGuaName)}</b>` : '')
    + (cast.source === 'manual' ? '　（线下摇卦录入）' : '');
  const dateText = cast.dateText || (ts ? buildDateDisplayText(new Date(ts)) : '');
  const dateHtml = dateText ? boldDateHtml(escapeHtml(dateText)) : '';
  // 年月日时+空亡：新记录有fourPillarsText/kongText，走pillarsAndKongText统一拼接；
  // 老记录（改版前存的，只有dayKongText）自动退回旧文案，boldPillarsHtml两种格式都能加粗。
  const pillarsKongHtml = boldPillarsHtml(escapeHtml(pillarsAndKongText(cast) || ('日柱：'+(cast.ganzhi||''))));
  // 逐爻明细改成一爻一行的小网格（爻位/六亲六神/纳甲五行状态+标记三列对齐），
  // 比之前挤在一整行里用全角空格隔开、窄屏上换行错位要工整得多。
  const linesRows = (cast.lines||[]).slice().reverse().map(ln => {
    let tag = '';
    if(ln.是否世爻) tag += '世';
    if(ln.是否应爻) tag += '应';
    if(ln.是否动爻) tag += '动';
    if(ln.是否空亡) tag += '空';
    const tagHtml = tag ? `<span class="history-line-tag">${escapeHtml(tag)}</span>` : '';
    return `<div class="history-line-row">
      <span class="history-line-pos">${escapeHtml(ln.爻位||'')}</span>
      <span>${escapeHtml(ln.六亲||'')}·${escapeHtml(ln.六神||'')}</span>
      <span>${escapeHtml(ln.纳甲||'')}${escapeHtml(ln.五行||'')}·${escapeHtml(ln.状态||'')}${tagHtml}</span>
    </div>`;
  }).join('');
  // 卦象爻画图：跟起卦当下的排盘区（renderPlate/renderPlateFromCastData）用同一份画法，
  // 只是外层套了 .history-cast 这个类名，CSS 里已经有对应的缩小版样式（见前面 .history-cast .gua-diagram 一节）。
  const diagramHtml = (Array.isArray(cast.lines) && cast.lines.length === 6)
    ? buildGuaDiagramHtml(cast.lines.map(structLineToDiagram), cast.guaName, cast.bianGuaName)
    : '';
  return `<div class="history-cast">
    <div class="history-cast-head">${nameRow}</div>
    ${diagramHtml}
    <div class="history-cast-head">${escapeHtml(cast.palaceText||'')}　${escapeHtml(cast.lowerUpperText||'')}</div>
    ${dateHtml ? `<div class="history-cast-head">${dateHtml}</div>` : ''}
    <div class="history-cast-head">${pillarsKongHtml}</div>
    <div class="history-cast-lines">${linesRows}</div>
  </div>`;
}

