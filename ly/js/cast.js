/* ==================================================================
  ly/js/cast.js —— 摇卦规矩（一事一卦/频率限制）与系统摇卦、线下摇卦
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ==================================================================
   生死寿数类问题过滤 —— 呼应传统占卦规矩"不轻断生死寿数"：
   这类判断风险高、容易断错，也怕给提问的人带来不必要的心理暗示，
   命中关键词就不生成解读，而不是靠 AI 自己去把握分寸。
   ================================================================== */
const LIFESPAN_KEYWORDS = [
  '还能活多久', '还能活几年', '还能活几天', '还能活多长时间',
  '寿命还有', '寿命有多长', '阳寿', '大限',
  '什么时候死', '啥时候死', '哪天死', '几岁死', '死期',
  '还有多久死', '还能撑多久', '命还有多久',
];
// 纯子字符串匹配会误伤"这盆绿植还能活多久"这类问的根本不是人命的问题——
// 补一份"非人类主体"提示词，命中其一就不当成生死寿数问题拦截，只在没有这些词、
// 又命中上面关键词时才判定为真的在问人（含默认问自己）的寿数。这不是万能的语义理解，
// 但能挡掉审查报告里指出的这类典型误伤场景。
const LIFESPAN_NON_HUMAN_HINTS = [
  '植物','绿植','花','树','草','苗','盆栽','盆景','种子','多肉','花草',
  '宠物','猫','狗','鱼','乌龟','仓鼠','兔子','鸟','虫','昆虫',
  '手机','电脑','电池','轮胎','汽车','爱车','摩托','电动车','冰箱','空调','家电','机器','设备','硬盘','灯泡','充电宝',
  '西瓜','水果','蔬菜','菜','面包','食物',
];
function isLifespanQuestion(text){
  if(!LIFESPAN_KEYWORDS.some(kw => text.includes(kw))) return false;
  if(LIFESPAN_NON_HUMAN_HINTS.some(kw => text.includes(kw))) return false;
  return true;
}

/* ==================================================================
   安全本地存储写入 —— localStorage.setItem/removeItem 在隐私模式受限、
   存储被浏览器/企业策略/隐私扩展禁用、或容量超限等场景下会抛异常。这类
   异常发生在普通 addEventListener 回调里不会崩页面（只会打到控制台），
   但后果是用户以为设置保存了、实际上悄悄没保存——尤其是 API Key 这种
   "填一次以后不用再管"的场景，用户看到界面显示"已保存"，刷新后才发现
   丢了，会很困惑且毫无提示。这里统一包一层，失败时用已有的 toast 系统
   告诉用户，不再是"看起来保存了、其实没有"。
   下面所有用户直接触发的设置写入（摇卦频率日志、新手教程已读标记、人设/
   模型/回复风格/努力程度选择、单价覆盖、API Key、历史记录、终身统计）
   都改走这两个函数。
   例外：saveActiveConversation/clearActiveConversationStorage（当前会话
   自动存档，见对应小节）刻意不走这一层——那是刷新页面用的后台自动存档，
   原作者已经明确设计为"静默失败即可，不影响当前这次问答本身"，不需要用
   toast 打扰用户，这里保留原设计判断，没有改动那两个函数。
   ================================================================== */
function safeSetItem(key, val){
  try{
    localStorage.setItem(key, val);
    return true;
  }catch(e){
    showToast(`设置没能保存到本地（${(e && e.message) || '存储失败'}），可能是隐私模式或存储空间限制`, 'error');
    return false;
  }
}
function safeRemoveItem(key){
  try{
    localStorage.removeItem(key);
    return true;
  }catch(e){
    showToast(`清除本地设置失败（${(e && e.message) || '存储失败'}），可能是隐私模式限制`, 'error');
    return false;
  }
}

/* ==================================================================
   摇卦前置校验 —— 呼应传统六爻两条基本规矩：
   1)"一事不问二卦"：同一件事只起一次卦，反复摇卦骗自己的结果不算数
   2) 短时间内不宜连续摇很多卦（心诚则灵），做一个简单的频率限制
   ================================================================== */
const LS_KEY_CAST_LOG = 'liuyao_cast_log';
const CAST_COOLDOWN_WINDOW_MS = 10 * 60 * 1000; // 10 分钟窗口
const CAST_COOLDOWN_MAX = 3;                    // 窗口内最多摇 3 次

function loadCastLog(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY_CAST_LOG) || '[]'); }
  catch(e){ return []; }
}
function pruneCastLog(log){
  const now = Date.now();
  return log.filter(ts => now - ts < CAST_COOLDOWN_WINDOW_MS);
}
function logCastEvent(){
  const log = pruneCastLog(loadCastLog());
  log.push(Date.now());
  safeSetItem(LS_KEY_CAST_LOG, JSON.stringify(log));
  renderCastQuota(); // 每次真正占用一次摇卦名额，顺手刷新一下常驻的"还剩几次"提示
}
function castsRemainingInWindow(){
  return Math.max(CAST_COOLDOWN_MAX - pruneCastLog(loadCastLog()).length, 0);
}
// 常驻显示"10分钟窗口内还能摇几次"，不用等点击被拦下才知道有这个限制。
// 用 getElementById 现查而不是顶层 const，是因为这个函数在DOM元素定义之前就已经声明，
// 调用时（页面初始化/每次摇卦后）DOM早就ready了，没有先后顺序问题。
function renderCastQuota(){
  const el = document.getElementById('castQuotaHint');
  if(!el) return;
  const remaining = castsRemainingInWindow();
  el.textContent = remaining > 0
    ? `本窗口（10分钟）内还可摇 ${remaining} 次`
    : `已达上限：10分钟内最多摇3次，稍等窗口过去再摇`;
  el.classList.toggle('cast-quota-warn', remaining <= 0);
}

// 问题文字归一化：只用于"是不是同一个问题"的判断，
// 忽略空白和末尾标点，避免用户补个问号、多敲个空格就被判成新问题而重摇重扣费。
function normQuestion(s){
  return String(s || '').replace(/\s+/g, '').replace(/[。．.!！?？~～、，,]+$/, '');
}
function isSameQuestion(a, b){
  return normQuestion(a) === normQuestion(b);
}

// 摇卦前统一走这个校验：频率限制 + 一事一挂硬性规矩。
// 通过则记一次摇卦事件并返回 true；不通过则给提示并返回 false。
// 规矩：同一个问题只能摇一卦，问题没换就不允许重摇（没有确认弹窗，直接拦住）；
//       想再摇，先把输入框里的问题换成一件新的事。
async function guardBeforeCast(){
  if(castsRemainingInWindow() <= 0){
    showToast('短时间内已经摇太多次了，心诚则灵，稍等一会再摇（10 分钟内最多 3 次）', 'error', 4500);
    return false;
  }
  if(window.lastCastData){
    const qEl = document.getElementById('questionInput');
    const currentQuestion = qEl ? qEl.value.trim() : '';
    if(currentQuestion === ''){
      showToast('上一卦还在。按"一事不问二卦"的规矩，想再摇，先在"AI 解卦"的输入框里写上要问的新问题', 'error', 4500);
      return false;
    }
    if(isSameQuestion(currentQuestion, window.lastCastQuestion || '')){
      showToast('一事不问二卦：这个问题已经摇过卦了，直接看上一卦就行。想问别的，先把问题换成一件新的事', 'error', 4500);
      return false;
    }
  }
  logCastEvent();
  return true;
}

/* ---------------- caster ---------------- */
const castBtn = document.getElementById('castBtn');
const plateWrap = document.getElementById('plateWrap');
const coinLog = document.getElementById('coinLog');

// 排盘表每次重新渲染（摇卦完成/手动生成/历史记录回看）都要重新播一遍跟标签切换
// 同款的淡入动效，而不是硬切出现。同一个元素反复扣同一个class浏览器不会重放
// CSS动画，这里先移除class、强制触发一次回流（读一下offsetWidth），再加回去，
// 让每次调用都能重新触发 .fade-in 对应的 fade 关键帧。
function replayFadeIn(el){
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

function tossLine(){
  // 3 coins: head(value3)=陽, tail(value2)=陰
  let sum=0, coins=[];
  for(let i=0;i<3;i++){
    const head = Math.random()<0.5;
    coins.push(head?'正':'反');
    sum += head?3:2;
  }
  // 6 老阴(变) 7少阳 8少阴 9老阳(变)
  const yang = (sum===7||sum===9);
  const moving = (sum===6||sum===9);
  return {sum, coins, yang, moving};
}

function performCast(){
  return new Promise(resolve=>{
    castBtn.disabled = true;
    const lines = [];
    let i = 0;
    plateWrap.innerHTML = '<div class="placeholder">摇卦中…</div>';
    const timer = setInterval(()=>{
      const r = tossLine();
      lines.push(r);
      const dots = r.coins.map(c=>`<span class="coin-dot ${c==='正'?'head':''}">${c}</span>`).join('');
      const resultName = r.moving ? (r.yang?'老阳':'老阴') : (r.yang?'少阳':'少阴');
      coinLog.innerHTML = `<b>第${i+1}爻</b> ${dots} <span class="sum">${resultName}</span>`;
      i++;
      if(i===6){
        clearInterval(timer);
        renderPlate(lines);
        castBtn.disabled = false;
        resolve(window.lastCastData);
      }
    }, 260);
  });
}

castBtn.addEventListener('click', async ()=>{
  if(!(await guardBeforeCast())) return;
  // 摇卦动画有约1.56秒的过程（6次setInterval），renderPlate()要等最后一爻摇完才会调用，
  // 这期间 window.lastCastData/lastCastQuestion 还停在"上一卦"。这段时间如果去点"AI解读"
  // /"输出提示词"，读到的就是即将被替换掉的旧卦；如果去点"线下摇卦·生成排盘"，动画结束时
  // 系统摇出的新卦又会把手动填的排盘直接覆盖掉——所以动画期间把这几个按钮一并锁住。
  manualCastBtn.disabled = true;
  interpretBtn.disabled = true;
  promptBtn.disabled = true;
  // 摇卦动画结束时 renderPlate() 会调用 resetConversation() 把 currentConversation 置空；
  // 如果这期间"追问"或"清空"还能点，追问请求返回时对着已被置空的 currentConversation
  // 写数据会直接报错（追问那次问答白问、token 白扣），"清空"同理会跟这次摇卦互相打架，
  // 所以这两个按钮也要在动画期间一并锁住。
  followUpBtn.disabled = true;
  clearResultBtn.disabled = true;
  try{
    await performCast();
  }finally{
    manualCastBtn.disabled = false;
    interpretBtn.disabled = false;
    promptBtn.disabled = false;
    followUpBtn.disabled = false;
    clearResultBtn.disabled = false;
  }
});

/* ---------------- 线下摇卦 · 手动填入 ---------------- */
const castModeToggle = document.getElementById('castModeToggle');
const systemCastPanel = document.getElementById('systemCastPanel');
const manualCastPanel = document.getElementById('manualCastPanel');
const manualLinesWrap = document.getElementById('manualLines');
const manualCastBtn = document.getElementById('manualCastBtn');

let castMode = 'system'; // 'system' | 'manual'

const MANUAL_LINE_LABELS = ['初爻','二爻','三爻','四爻','五爻','上爻'];
const MANUAL_LINE_OPTIONS = [
  { value: '7', label: '少阳（阳，不变）' },
  { value: '8', label: '少阴（阴，不变）' },
  { value: '9', label: '老阳（阳，动 ○）' },
  { value: '6', label: '老阴（阴，动 ✕）' },
];

// 生成六行手动选择器：三枚铜钱正面记3、反面记2，三枚之和 6/7/8/9
// 对应 老阴(6,动)/少阳(7)/少阴(8)/老阳(9,动)，跟现实摇钱结果一一对应，
// 用户只要照着自己现实摇出的老少阴阳选就行，不用换算铜钱正反数。
function buildManualLinesUI(){
  manualLinesWrap.innerHTML = MANUAL_LINE_LABELS.map((label, idx) => `
    <div class="manual-line-row">
      <label for="manualLine${idx}">${label}</label>
      <select id="manualLine${idx}">
        ${MANUAL_LINE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
    </div>
  `).join('');
}
buildManualLinesUI();

castModeToggle.addEventListener('click', (e)=>{
  const btn = e.target.closest('.mode-btn');
  if(!btn) return;
  castMode = btn.dataset.mode;
  [...castModeToggle.querySelectorAll('.mode-btn')].forEach(b => b.classList.toggle('active', b === btn));
  systemCastPanel.style.display = castMode === 'system' ? '' : 'none';
  manualCastPanel.style.display = castMode === 'manual' ? '' : 'none';
});

function lineFromSum(sum){
  const yang = (sum === 7 || sum === 9);
  const moving = (sum === 6 || sum === 9);
  return { sum, coins: [], yang, moving };
}

function performManualCast(isCorrection){
  const lines = [];
  for(let i = 0; i < 6; i++){
    const sel = document.getElementById(`manualLine${i}`);
    lines.push(lineFromSum(parseInt(sel.value, 10)));
  }
  coinLog.innerHTML = ''; // 清掉上一次系统摇卦残留的铜钱记录，避免和手动排盘混淆
  renderPlate(lines, 'manual');
  showToast(isCorrection
    ? '已按修正后的录入重新排盘（修正填错的爻不算重新起卦，不占摇卦次数）'
    : '已按你手动填入的结果排盘，AI 解读会知道这是你亲自摇的卦', 'success');
}

manualCastBtn.addEventListener('click', async ()=>{
  // 修正录入的特例：上一卦本来就是手动填的、问题也没换，
  // 说明大概率是填错了某一爻想改——现实中的摇卦只发生了一次，
  // 重新生成排盘只是数据修正，不算重新起卦，不受"一事不问二卦"拦截。
  // 但注意：这里只豁免"同一件事"的判定，不豁免频率限制——
  // 否则只要一直把问题框留空、反复改六爻选项点"生成排盘"，就能绕开
  // 10分钟最多3次的频率限制无限重摇，跟系统摇卦模式的规矩不一致。
  // 所以修正录入依然要占用一次摇卦名额（logCastEvent），只是跳过"是否同一件事"的比对。
  const currentQuestion = questionInput ? questionInput.value.trim() : '';
  const sameQuestion = window.lastCastData &&
    (currentQuestion === '' || isSameQuestion(currentQuestion, window.lastCastQuestion || ''));
  if(window.lastCastData && window.lastCastData.source === 'manual' && sameQuestion){
    if(castsRemainingInWindow() <= 0){
      showToast('短时间内已经摇太多次了，心诚则灵，稍等一会再摇（10 分钟内最多 3 次）', 'error', 4500);
      return;
    }
    logCastEvent();
    performManualCast(true);
    return;
  }
  if(!(await guardBeforeCast())) return;
  performManualCast(false);
});

