/* ==================================================================
  ly/js/ai-ui.js —— AI 解卦（界面绑定）：按钮、设置项、历史面板、主流程
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
// ---- UI 绑定 ----
const questionInput = document.getElementById('questionInput');
const questionCharCounter = document.getElementById('questionCharCounter');
const interpretBtn = document.getElementById('interpretBtn');
const aiStatus = document.getElementById('aiStatus');
const aiResult = document.getElementById('aiResult');
const aiMeta = document.getElementById('aiMeta');
const aiStats = document.getElementById('aiStats');
const copyRow = document.getElementById('copyRow');
const copyResultBtn = document.getElementById('copyResultBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const clearResultBtn = document.getElementById('clearResultBtn');
// ---- 提示词导出（不经API Key）相关元素 ----
const promptBtn = document.getElementById('promptBtn');
const promptOutputBox = document.getElementById('promptOutputBox');
const promptOutputText = document.getElementById('promptOutputText');
const copyPromptBtn = document.getElementById('copyPromptBtn');
const closePromptBtn = document.getElementById('closePromptBtn');
// ---- 备用工具折叠容器（整理格式/追问提示词收在里面，默认折叠） ----
const promptExtraTools = document.getElementById('promptExtraTools');
const promptExtraToggle = document.getElementById('promptExtraToggle');
// ---- 贴回矫正（本地清洗对方AI回复，不经网络）相关元素 ----
// （外层 promptCleanupBox 这个包裹div本身不再需要单独控制显隐——它跟着 promptExtraTools
// 折叠容器一起显示，这里只取里面真正要读写的几个子元素）
const cleanupInputText = document.getElementById('cleanupInputText');
const cleanupOutputText = document.getElementById('cleanupOutputText');
const cleanupRunBtn = document.getElementById('cleanupRunBtn');
const cleanupCopyRow = document.getElementById('cleanupCopyRow');
const copyCleanupBtn = document.getElementById('copyCleanupBtn');
// ---- 追问提示词导出相关元素 ----
// （外层 promptFollowupExportBox 同理，显隐交给 promptExtraTools，这里只取要读写的子元素）
const followUpExportInput = document.getElementById('followUpExportInput');
const followUpExportOutput = document.getElementById('followUpExportOutput');
const followUpExportBtn = document.getElementById('followUpExportBtn');
const followUpExportCopyRow = document.getElementById('followUpExportCopyRow');
const copyFollowUpExportBtn = document.getElementById('copyFollowUpExportBtn');
// 记住"输出提示词"最近一次用的排盘文本和问题，供"生成追问提示词"复用——
// 导出路径没有 currentConversation 那套多轮状态，只能靠这两个变量单独记一份。
let lastExportCastText = null;
let lastExportQuestion = null;
const followUpBox = document.getElementById('followUpBox');
const followUpInput = document.getElementById('followUpInput');
const followUpCharCounter = document.getElementById('followUpCharCounter');
const followUpBtn = document.getElementById('followUpBtn');
const followUpStatus = document.getElementById('followUpStatus');
const stopGenBtn = document.getElementById('stopGenBtn');

// ---- 提问框/追问框字数计数：跟 textarea 上的 maxlength="500" 配套，输入过程中就能
// 看到还剩多少字，不用等真被浏览器硬截断才发现写多了；快到上限（剩余<=20字）时
// 变朱砂色提醒一下。程序化清空这两个输入框的几处（清空回复/重置会话/追问发送后）
// 都手动 dispatchEvent(new Event('input')) 了一次，所以这里只用管用户真实敲键盘的情况。
function bindCharCounter(textareaEl, counterEl, max){
  const update = () => {
    const len = textareaEl.value.length;
    counterEl.textContent = `${len} / ${max} 字`;
    counterEl.classList.toggle('near-limit', max - len <= 20);
  };
  textareaEl.addEventListener('input', update);
  update();
}
bindCharCounter(questionInput, questionCharCounter, 500);
bindCharCounter(followUpInput, followUpCharCounter, 500);

// ---- 收起"输出提示词"这一整套（主提示词/贴回矫正/追问提示词三个框），并把跟"上一次输出提示词"
// 绑定的 lastExportCastText/lastExportQuestion 一并作废。用在两个场景：
// 1) renderPlate() 里——一旦真的重新起了一卦，这三个框和这两个变量就全部过期了，
//    不清掉的话会出现"排盘已经是新卦，提示词框还停在旧卦"（错位）或者"生成追问提示词
//    时悄悄用了上一卦的数据"（内容错误）。
// 2) interpretBtn 点击时——即便这次没有触发重摇（同一件事继续问），只是切去"AI解读"这条
//    路径，也应该把"输出提示词"那一屏收起来，避免两条路径的结果区同屏叠着，分不清该看哪个。
//    这种情况下不强制清空 lastExportCastText/lastExportQuestion（卦没变，数据仍然有效），
//    真正的作废只交给 renderPlate() 在"确实重摇了"的时候去做。
function hidePromptExportBoxes(){
  promptOutputBox.style.display = 'none';
  promptExtraTools.style.display = 'none';
  promptExtraTools.classList.remove('open'); // 下次重新弹出时重新从折叠态开始，不记住上次展没展开
  cleanupInputText.value = '';
  cleanupOutputText.value = '';
  cleanupOutputText.style.display = 'none';
  cleanupCopyRow.style.display = 'none';
  followUpExportInput.value = '';
  followUpExportOutput.value = '';
  followUpExportOutput.style.display = 'none';
  followUpExportCopyRow.style.display = 'none';
}

// ---- 停止生成：同一时间只会有一个流式请求在跑（解读和追问互相锁定按钮），
// 所以一个 AbortController + 一个共用的停止按钮就够用了。 ----
let activeAbortController = null;
function showStopBtn(){ stopGenBtn.style.display = 'inline-flex'; }
function hideStopBtn(){ stopGenBtn.style.display = 'none'; }
stopGenBtn.addEventListener('click', ()=>{
  if(activeAbortController){
    activeAbortController.abort();
    stopGenBtn.disabled = true; // 点一下就禁用，避免中断过程中重复点击
  }
});

const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
const aiSettings = document.getElementById('aiSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const clearKeyBtn = document.getElementById('clearKeyBtn');
const styleSelect = document.getElementById('styleSelect');
const customStyleWrap = document.getElementById('customStyleWrap');
const customStyleInput = document.getElementById('customStyleInput');
const roleSelect = document.getElementById('roleSelect');
const roleHint = document.getElementById('roleHint');
const customRoleWrap = document.getElementById('customRoleWrap');
const customRoleInput = document.getElementById('customRoleInput');
const effortSelect = document.getElementById('effortSelect');
const modelSelect = document.getElementById('modelSelect');

// ---- Key 状态徽标：不用点开输入框，一眼就知道当前有没有存过 Key ----
// 同时联动"AI 解读"按钮的显隐：填了Key才出现"AI解读"（调本站配置的API直接解卦），
// 没填Key时只保留"输出提示词"（导出文本去别的AI软件问）；这里统一改这一处，
// saveKeyBtn/clearKeyBtn/页面初始化三处都会调用到本函数，不用在三处分别加显隐判断。
function updateApiKeyStatus(){
  const has = !!loadApiKey();
  apiKeyStatus.textContent = has ? '● 已设置' : '○ 未设置';
  apiKeyStatus.classList.toggle('has-key', has);
  apiKeyStatus.classList.toggle('no-key', !has);
  interpretBtn.style.display = has ? '' : 'none';
  // 没填Key时"AI 解读"整个隐藏，"输出提示词"是这个状态下唯一走得通的路径，
  // 不该继续顶着描边的次要按钮样式（那样这一屏就没有一个实心主按钮，找不到"从哪下手"）。
  // 这里让它跟着有没有Key切换：没Key时摘掉.ghost、升级成实心主按钮；填了Key后
  // "AI 解读"重新出现当主按钮，"输出提示词"退回描边样式，避免两个同权重主按钮并排。
  promptBtn.classList.toggle('ghost', has);
}


// ---- 计价单价覆盖：3个输入框（缓存命中/未命中/输出），留空的字段用内置默认值。
// 官方目前是峰谷两档计费、高峰固定是闲时的2倍，但这里UI仍只留一份输入，图省事——
// 填的就当"闲时"单价，保存时按 ×2 自动换算出高峰单价，一起写进 {offpeak,peak} 结构
// （跟 effectivePriceTable() 保持一致）。如果官方以后把峰谷倍率从2倍改成别的数，
// 或者干脆取消峰谷价，这里的 ×2 换算要跟着改。 ----
const priceHit = document.getElementById('priceHit');
const priceMiss = document.getElementById('priceMiss');
const priceOutput = document.getElementById('priceOutput');
const savePriceOverrideBtn = document.getElementById('savePriceOverrideBtn');
const resetPriceOverrideBtn = document.getElementById('resetPriceOverrideBtn');

// ---- 价格覆盖输入框的占位数字（灰字提示"不填的话会用这个默认值"）要跟着当前选中的模型走，
// 不然切换模型后这里还显示旧模型的单价，容易让人误以为默认值没变。 ----
function refreshPriceOverridePlaceholders(){
  const base = PRICE_TABLES[loadModelChoice()] || PRICE_TABLES['deepseek-v4-flash'];
  priceHit.placeholder = base.offpeak.hit;
  priceMiss.placeholder = base.offpeak.miss;
  priceOutput.placeholder = base.offpeak.output;
}
function fillPriceOverrideInputs(){
  const o = loadPriceOverride() || {};
  // 输入框回显的是"闲时"单价那一份；peak是保存时按×2自动换算出来的，不用单独读回显
  priceHit.value = (o.offpeak && o.offpeak.hit != null) ? o.offpeak.hit : '';
  priceMiss.value = (o.offpeak && o.offpeak.miss != null) ? o.offpeak.miss : '';
  priceOutput.value = (o.offpeak && o.offpeak.output != null) ? o.offpeak.output : '';
  refreshPriceOverridePlaceholders();
}
fillPriceOverrideInputs();

savePriceOverrideBtn.addEventListener('click', ()=>{
  const pick = (el) => {
    const v = parseFloat(el.value);
    return Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  const filled = { hit: pick(priceHit), miss: pick(priceMiss), output: pick(priceOutput) };
  Object.keys(filled).forEach(k => filled[k] === undefined && delete filled[k]);
  if(Object.keys(filled).length === 0){
    clearPriceOverride();
    showToast('没填任何单价，已恢复用内置默认值');
  }else{
    // 填的按"闲时"单价存；高峰单价 = 闲时 ×2（官方峰谷倍率），自动换算好一起存，不用用户再填一遍。
    const peakFilled = {};
    Object.keys(filled).forEach(k => { peakFilled[k] = filled[k] * 2; });
    savePriceOverride({ offpeak: filled, peak: peakFilled });
    showToast('单价已保存（按闲时价填写，高峰价已自动×2换算），之后的计费会按新单价估算');
  }
});

resetPriceOverrideBtn.addEventListener('click', ()=>{
  clearPriceOverride();
  fillPriceOverrideInputs();
  showToast('已恢复内置默认单价');
});

const gotoAiTabBtn = document.getElementById('gotoAiTabBtn');
if(gotoAiTabBtn){
  gotoAiTabBtn.addEventListener('click', ()=> switchTab('ai'));
}

const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyCount = document.getElementById('historyCount');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// ---- Key 输入框：保存后只显示打码值，防止在框内复制出明文 ----
function lockApiKeyInput(rawKey){
  apiKeyInput.value = maskApiKey(rawKey);
  apiKeyInput.readOnly = true;
  apiKeyInput.classList.add('masked');
}
function unlockApiKeyInput(){
  apiKeyInput.value = '';
  apiKeyInput.readOnly = false;
  apiKeyInput.classList.remove('masked');
}
['copy','cut','contextmenu'].forEach(evt=>{
  apiKeyInput.addEventListener(evt, e=>{
    if(apiKeyInput.readOnly) e.preventDefault();
  });
});

// 初始化设置区域显示值
{
  const existingKey = loadApiKey();
  if(existingKey){ lockApiKeyInput(existingKey); } else { unlockApiKeyInput(); }
  updateApiKeyStatus();
}
// 人设/风格这两处的"自定义说明框"和说明文字都跟着各自的下拉框走：
// 初始化和用户改动时同步一次，共用同一对小函数，免得两处各写一遍判断。
function syncStyleUi(){
  customStyleWrap.style.display = (styleSelect.value === 'custom') ? 'block' : 'none';
}
function syncRoleUi(){
  customRoleWrap.style.display = (roleSelect.value === 'custom') ? 'block' : 'none';
  roleHint.textContent = ROLE_HINTS[roleSelect.value] || '';
}
styleSelect.value = loadStyleChoice();
customStyleInput.value = loadCustomStyle();
syncStyleUi();
roleSelect.value = loadRoleChoice();
customRoleInput.value = loadCustomRole();
syncRoleUi();
roleSelect.addEventListener('change', ()=>{
  saveRoleChoice(roleSelect.value);
  syncRoleUi();
});
customRoleInput.addEventListener('input', ()=>{
  saveCustomRole(customRoleInput.value);
});
effortSelect.value = loadEffortChoice();
effortSelect.addEventListener('change', ()=>{ saveEffortChoice(effortSelect.value); });
modelSelect.value = loadModelChoice();
modelSelect.addEventListener('change', ()=>{
  saveModelChoice(modelSelect.value);
  refreshPriceOverridePlaceholders();
});

toggleSettingsBtn.addEventListener('click', ()=>{
  aiSettings.classList.toggle('open');
});

saveKeyBtn.addEventListener('click', ()=>{
  if(apiKeyInput.readOnly){
    showToast('已经保存过了，要换Key的话先点"清除 Key"', 'error');
    return;
  }
  const v = apiKeyInput.value.trim();
  if(!v){ showToast('Key 不能为空', 'error'); return; }
  saveApiKey(v);
  lockApiKeyInput(v);
  updateApiKeyStatus();
  showToast('Key 已保存在本机浏览器', 'success');
});

clearKeyBtn.addEventListener('click', ()=>{
  clearApiKey();
  unlockApiKeyInput();
  updateApiKeyStatus();
  apiKeyInput.focus();
  showToast('Key 已清除，可以重新粘贴新的了');
});

// ---- 历史记录 & 累计统计 ----
function formatTime(ts){
  const d = new Date(ts);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderStats(){
  const list = loadHistory();
  if(!list.length){ aiStats.textContent = ''; return; }
  // tokens/费用改从终身计数器读（不受历史记录 HISTORY_MAX 裁剪影响，见 loadLifetimeStats 上方注释），
  // 卦数/问答轮数依然从当前历史列表现算——这两项本来就是"当前还留着的记录"的计数，
  // 语义上跟着列表走是对的，只有涉及真金白银的tokens/费用才必须是不会被裁没的终身总额。
  const lifetime = loadLifetimeStats();
  const totalRounds = list.reduce((s,r)=> s + historyTurnsOf(r).filter(t=>t.role==='assistant').length, 0);
  // "输出提示词"那条路径现在也会写历史，但它没调AI、不产生token/费用，混进"累计解读"的
  // 卦数里容易让人误以为都是AI解读；这里把"提示词导出"单独报个数，list.length依然是总条数。
  const promptCount = list.filter(r => r.type === 'prompt').length;
  const breakdown = promptCount ? `（AI解读${list.length-promptCount} · 提示词导出${promptCount}）` : '';
  aiStats.innerHTML = `累计 <b>${list.length}</b> 卦${breakdown} · 问答共 <b>${totalRounds}</b> 轮 · 共 <b>${lifetime.tokens.toLocaleString()}</b> tokens · 约 <b>¥${lifetime.cost.toFixed(4)}</b>`;
}

// 一条历史记录 → 一个列表项（折叠时只看到问题、标签、时间、meta，点开才看正文）
function historyItemHtml(r){
  const turns = historyTurnsOf(r);
  const roundCount = turns.filter(t=>t.role==='assistant').length;
  // historyTurnsOf()两条分支里turns[0]永远是这一条记录最初的那个"问"（不管是prompt类型
  // 只有一轮，还是AI解读类型有问有答），这里单独摘出来放在展开正文最上面，
  // 剩下的turns（第一轮的"答"、以及后续追问的"问/答"）照旧排在卦象信息下面——
  // 呼应"问题要在上面"的要求：先看清问的是什么事，再看卦象数据和回复。
  const firstQuestion = turns[0]?.text || r.question || '';
  const restTurnsHtml = turns.slice(1).map(t =>
    `<div class="history-turn history-turn-${t.role}"><b>${t.role==='user'?'问':'答'}：</b>${escapeHtml(t.text)}</div>`
  ).join('');
  const isPrompt = r.type === 'prompt';
  const tagHtml = isPrompt
    ? `<span class="history-item-tag">提示词导出</span>`
    : (roundCount>1 ? `<span class="history-item-tag">共${roundCount}轮</span>` : '');
  // roleLabel/styleLabel 是后加的字段，早于这次改动生成的老记录里没有，
  // 这里做兼容：没有就不拼这一截，不显示"undefined · undefined"这种东西。
  const configLabel = r.roleLabel ? `${r.roleLabel}${r.styleLabel ? '·' + r.styleLabel : ''}` : '';
  const baseMetaText = isPrompt
    ? '未直接调用AI，仅生成提示词'
    : `token共${r.totalTokens||0} · 约¥${(r.costYuan||0).toFixed(4)}`;
  const metaText = configLabel ? `${baseMetaText} · ${configLabel}` : baseMetaText;
  const questionHtml = `<div class="history-turn history-turn-user history-q-top"><b>问：</b>${escapeHtml(firstQuestion)}</div>`;
  return `
    <div class="history-item" data-id="${r.id}">
      <div class="history-item-head" data-action="toggle">
        <span class="history-item-q">${escapeHtml(firstQuestion)}</span>
        ${tagHtml}
        <span class="history-item-time">${formatTime(r.ts)}</span>
      </div>
      <div class="history-item-meta">${metaText}</div>
      <div class="history-item-body">${questionHtml}${historyCastHtml(r.cast, r.ts)}${restTurnsHtml}</div>
      <button class="history-item-del" data-action="delete">删除这条</button>
    </div>
  `;
}

// 每条历史记录是一整次摇卦对应的会话（首次解读+若干次追问都在同一条里），不是每次AI调用一条平铺记录。
// 旧版本存的是扁平记录（question/text字段，没有turns），historyTurnsOf已经做了兼容读取，这里不用管新旧格式。
function renderHistory(){
  const list = loadHistory().slice().reverse(); // 最新的在最上面
  historyCount.textContent = list.length;
  historyEmpty.style.display = list.length ? 'none' : 'block';
  historyList.innerHTML = list.map(historyItemHtml).join('');
  renderStats();
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

toggleHistoryBtn.addEventListener('click', ()=>{
  historyPanel.classList.toggle('open');
  if(historyPanel.classList.contains('open')) renderHistory();
});

historyList.addEventListener('click', (e)=>{
  const actionEl = e.target.closest('[data-action]');
  if(!actionEl) return;
  const item = e.target.closest('.history-item');
  const id = item?.dataset.id;
  if(actionEl.dataset.action === 'toggle'){
    item.classList.toggle('expanded');
  }else if(actionEl.dataset.action === 'delete'){
    const list = loadHistory().filter(r => String(r.id) !== id);
    saveHistory(list);
    renderHistory();
    showToast('已删除这条记录');
  }
});

clearHistoryBtn.addEventListener('click', async ()=>{
  if(!loadHistory().length) return;
  const ok = await showConfirm('确定清空全部历史记录和累计统计吗？此操作不可撤销。', {
    title: '清空历史记录', okText: '清空', cancelText: '取消'
  });
  if(!ok) return;
  saveHistory([]);
  clearLifetimeStats(); // 确认弹窗里说的是"清空历史记录和累计统计"，累计统计现在存在独立计数器里，这里得一并清掉
  renderHistory();
  renderStats();
  showToast('历史记录已清空');
});

renderStats();

// 摇卦配额提示：页面一打开先渲染一次；配额是10分钟滑动窗口，就算用户什么都不点，
// 名额也会随时间自动恢复，所以额外开一个定时器每30秒刷新一次，不然"已用完"的提示
// 会一直停在页面刚打开时的状态，看不出窗口已经过去、其实可以再摇了。
// 顺带在页面重新回到前台时也刷新一次，覆盖"切到别的标签页/锁屏放了一会儿再回来"这种
// 定时器在后台被浏览器节流、没按时触发的情况。
renderCastQuota();
setInterval(renderCastQuota, 30000);
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'visible') renderCastQuota();
});

// ---- 跨标签页同步：如果同时开了两个标签页用这个工具（比如手机和电脑各开一个，或者
// 电脑上开了两个标签），每个标签页的 currentConversation/currentHistorySessionId 都是
// 各自独立的内存状态，互相不知道对方的存在。这里只做"只读视图跟着刷新"这一层——
// 另一个标签页写了 localStorage，这个标签页的历史面板/统计条/配额提示如果正显示着，
// 就跟着重新读一遍，不会一直停留在打开这个标签页那一刻的旧数据。
// 注意：这解决的是"看到的是过期数据"，不是"两个标签页同时各自摇卦/追问时数据互相覆盖"
// 那种更底层的写入竞态——本站所有历史记录的写入本来就是"读最新的 localStorage → 改 → 存回"
// 这种前后紧挨着、中间没有await的同步操作，两个标签页真的在同一毫秒内各自完成一整套
// 读改存、彼此的写入穿插进对方那两步之间——这种概率极低，没有为这个再引入更重的
// 跨标签锁机制，权衡下来不划算。
// storage 事件只会在"别的标签页/窗口"修改了 localStorage 时触发，当前这个标签页自己的
// 修改不会触发给自己，所以不用担心跟本页面自己的 renderHistory()/renderStats() 调用重复触发。
window.addEventListener('storage', (e)=>{
  // e.key 为 null 通常是别的标签页调用了 localStorage.clear()，这种整体清空的情况也一并刷新。
  if(e.key === null || e.key === LS_KEY_HISTORY || e.key === LS_KEY_LIFETIME_STATS){
    renderStats();
    if(historyPanel.classList.contains('open')) renderHistory();
  }
  if(e.key === null || e.key === LS_KEY_CAST_LOG){
    renderCastQuota();
  }
});

// ---- 恢复上次刷新前还没结束的会话（如果有的话），恢复后就能直接在原对话基础上继续追问 ----
(function restoreActiveConversation(){
  const saved = loadActiveConversationFromStorage();
  if(!saved || !saved.conversation || !Array.isArray(saved.conversation.turns) || !saved.conversation.turns.length) return;
  currentConversation = saved.conversation;
  currentHistorySessionId = saved.sessionId || null;
  // 把当时的排盘也一起恢复出来：既让用户能看到这次对话对应的是哪一卦，
  // 也避免 window.lastCastData 空着导致下次点"AI 解读"时被误判成"没摇过卦"而悄悄重摇。
  if(saved.castData){
    renderPlateFromCastData(saved.castData, saved.castQuestion, saved.castTime);
  }
  renderConversation();
  aiMeta.textContent =
    `（已从上次未结束的会话恢复，累计约¥${(currentConversation.cumCost||0).toFixed(4)}，仅供参考，以DeepSeek账单为准）`;
  copyRow.style.display = 'flex';
  followUpBox.style.display = 'flex';
})();

styleSelect.addEventListener('change', ()=>{
  saveStyleChoice(styleSelect.value);
  syncStyleUi();
});

customStyleInput.addEventListener('input', ()=>{
  saveCustomStyle(customStyleInput.value);
});

// ---- 统一的"复制到剪贴板"封装：全站5个复制按钮共用这一个函数，不再各写一遍 ----
// 优先用 navigator.clipboard.writeText；但这个API不保证存在——部分受限WebView
// （比如某些App内嵌浏览器）里 navigator.clipboard 本身就是 undefined，直接调用
// 会同步抛TypeError，根本走不到后面的 .catch()，之前的写法在这类环境里连
// "复制没成功"的提示都弹不出来，用户只会看到点了没反应。这里做一层兜底：
// 不存在时退回旧式 document.execCommand('copy')（造一个临时textarea选中文字执行复制），
// 两条路都失败，调用方的 .catch() 才会被触发、走到"请长按手动复制"的提示。
function copyTextToClipboard(text){
  if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject)=>{
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand复制失败'));
    }catch(e){
      reject(e);
    }
  });
}

// ---- 复制按钮统一绑定：全站五个"复制XX"按钮的点击行为都长一个样，共用这一段 ----
// 点一下 → 用调用方给的 getText() 取要复制的文字 → 成功后按钮文字临时变成"已复制"，
// 1.5 秒后恢复；失败统一弹同一句提示。按钮"本来叫什么"直接从 DOM 上读，
// 不用每个按钮再手写一遍自己的文案（写错就跟按钮上印的对不上了）。
function bindCopyButton(btn, getText){
  const idleLabel = btn.textContent;
  btn.addEventListener('click', ()=>{
    copyTextToClipboard(getText()).then(()=>{
      btn.textContent = '已复制';
      setTimeout(()=>{ btn.textContent = idleLabel; }, 1500);
    }).catch(()=>{
      showToast('自动复制没成功（可能是浏览器权限限制），请长按文字手动复制', 'error');
    });
  });
}

// 复制最新回复：优先取对话里最后一条"答"，没有对话（比如只导出了提示词）就退回结果区文字
bindCopyButton(copyResultBtn, ()=>{
  const turns = currentConversation?.turns || [];
  const lastAnswer = [...turns].reverse().find(t => t.role === 'assistant');
  return lastAnswer ? lastAnswer.text : aiResult.textContent;
});

// ---- 复制全部对话：把首次解读 + 所有追问轮次按"问/答"顺序拼成一段文字一起复制，
// 不再只有最后一条回复——追问多轮之后想整段留档/转发的场景就靠这个。 ----
bindCopyButton(copyAllBtn, ()=>{
  const turns = currentConversation?.turns || [];
  return turns.length
    ? turns.map(t => `${t.role === 'user' ? '问' : '答'}：${t.text}`).join('\n\n')
    : aiResult.textContent;
});

clearResultBtn.addEventListener('click', ()=>{
  aiResult.textContent = '';
  aiMeta.textContent = '';
  copyRow.style.display = 'none';
  resetConversation();
  questionInput.value = ''; // 答案清空的同时把提问框也清掉，避免刷新后"问题还在、答案没了"的错觉
  questionInput.dispatchEvent(new Event('input')); // 同步触发一次，让字数计数器跟着归零
});

// ---- 提示词导出结果的显示/复制/收起 ----
function showPromptOutput(text){
  promptOutputText.value = text;
  promptOutputBox.style.display = 'block';
  // "贴回矫正"和"生成追问提示词"这两步只在少数场景才用得上（换个AI软件接着问、
  // 对方AI没有上下文记忆、想把这次问答也存一份在本站）——多数人复制主提示词发出去后
  // 会直接在对方AI那边接着聊，所以这里只露出折叠起来的入口，不强行展开占地方。
  promptExtraTools.style.display = 'block';
  promptExtraTools.classList.remove('open');
  promptOutputBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 复制的对象是 promptOutputText 这个只读文本框里的完整提示词
bindCopyButton(copyPromptBtn, ()=> promptOutputText.value);

closePromptBtn.addEventListener('click', ()=>{
  promptOutputBox.style.display = 'none';
  promptExtraTools.style.display = 'none';
  promptExtraTools.classList.remove('open');
});

// 备用工具折叠入口：点一下展开/收起里面的"整理格式"和"生成追问提示词"，
// 用法与页面里其它折叠区块（block-collapse / settings-group.collapsible）一致。
promptExtraToggle.addEventListener('click', ()=> promptExtraTools.classList.toggle('open'));

// ---- 贴回矫正：把对方AI回复原文本地跑一遍 stripMarkdown + annotateShichen，
// 不发任何网络请求，纯字符串处理，复用"AI 解读"清洗回复用的同一对函数，保证
// 两条路径最终展示给用户的格式风格一致。 ----
cleanupRunBtn.addEventListener('click', ()=>{
  const raw = cleanupInputText.value;
  if(!raw.trim()){
    showToast('先把对方AI的回复粘贴进来', 'error');
    return;
  }
  cleanupOutputText.value = annotateGanzhiDay(annotateShichen(stripMarkdown(raw)));
  cleanupOutputText.style.display = 'block';
  cleanupCopyRow.style.display = 'flex';
});

bindCopyButton(copyCleanupBtn, ()=> cleanupOutputText.value);

// ---- 生成追问提示词：优先用"贴回矫正"清洗后的结果当作"上一轮回复"，没清洗过就退回用原始粘贴内容，
// 都没有就提示用户先去上面贴一次。lastExportCastText/lastExportQuestion 由 promptBtn 那次点击时记下。 ----
followUpExportBtn.addEventListener('click', ()=>{
  const followUpText = followUpExportInput.value.trim();
  if(!followUpText){
    showToast('先写一下这次想追问的内容', 'error');
    return;
  }
  const priorAnswerText = (cleanupOutputText.value || cleanupInputText.value || '').trim();
  if(!priorAnswerText){
    showToast('先把对方AI上一轮的回复粘贴到上面"整理格式"里', 'error');
    return;
  }
  if(!lastExportCastText || !lastExportQuestion){
    showToast('请先点一次"输出提示词"生成初次提示词', 'error');
    return;
  }
  followUpExportOutput.value = buildExportFollowUpPromptText(lastExportQuestion, lastExportCastText, priorAnswerText, followUpText);
  followUpExportOutput.style.display = 'block';
  followUpExportCopyRow.style.display = 'flex';
});

bindCopyButton(copyFollowUpExportBtn, ()=> followUpExportOutput.value);

interpretBtn.addEventListener('click', async ()=>{
  const question = questionInput.value.trim();
  if(!question){
    showToast('先写一下想问的问题', 'error');
    return;
  }
  if(isLifespanQuestion(question)){
    showToast('传统上卦师不轻断生死寿数，这类问题这里不会生成解读——如果是身体或者情绪上的真实担忧，更建议找医生或者信得过的人聊聊', 'error', 6000);
    return;
  }
  if(!loadApiKey()){
    aiSettings.classList.add('open');
    showToast('先在下面"设置"里填一下 DeepSeek API Key', 'error');
    apiKeyInput.focus();
    return;
  }

  interpretBtn.disabled = true;
  // 解读进行中锁住两个摇卦入口，防止中途换卦导致"旧卦的解读显示在新卦下面"的错位
  castBtn.disabled = true;
  manualCastBtn.disabled = true;
  // 同时锁住"清空回复"：这里马上要调用 resetConversation()，如果解读请求跑到一半用户又点了
  // 清空（其实这时候清不清效果一样），问题不大；但真正要防的是反过来的顺序——如果不锁，用户
  // 能在下面 DeepSeek 请求流式返回期间点"清空回复"，那次清空会把 currentConversation 置空，
  // 等请求结束回来准备写回结果时可能就对着一个已经被清空的对象操作，体验很怪。统一锁住最省心。
  clearResultBtn.disabled = true;
  // "AI 解读"这里马上会调用 resetConversation()，把 currentConversation 置空；如果这期间
  // "追问"还能点，追问请求返回时对着已被置空的 currentConversation 写数据会直接报错
  // （那次追问白问、token 照样扣但结果丢了），所以追问按钮也要在这整个流程期间锁住。
  followUpBtn.disabled = true;
  aiResult.textContent = '';
  aiMeta.textContent = '';
  copyRow.style.display = 'none';
  // 点"AI 解读"意味着开始一次新的解卦会话（换问题、重新起卦、或者对同一卦重新生成都算），
  // 之前如果有追问上下文，这里清掉，避免新一卦的解读里混进上一卦追问的对话历史。
  resetConversation();
  // 切到"AI 解读"这条路径，就把"输出提示词"那一屏（主提示词/贴回矫正/追问提示词）收起来，
  // 避免两条路径的结果区同屏叠着分不清该看哪个；卦是否真的换了由下面的重摇逻辑决定，
  // 真重摇了会经 performCast→renderPlate 把 lastExportCastText/lastExportQuestion 一并作废。
  hidePromptExportBoxes();

  try{
    // 如果已经摇过一卦、但摇的时候问题框还是空的（先摇卦、后写问题的顺序），
    // 就把当前问题"认领"给这一卦——这卦就是为这个问题摇的，不重摇、不多扣次数。
    // 只认领 10 分钟内摇的卦：放太久的空问题旧卦（比如页面开着忘了）不认领，直接重摇新卦。
    const ADOPT_WINDOW_MS = 10 * 60 * 1000;
    if(window.lastCastData && !(window.lastCastQuestion || '').trim()
       && (Date.now() - (window.lastCastTime || 0)) <= ADOPT_WINDOW_MS){
      window.lastCastQuestion = question;
    }
    // 判断是否要重新起卦：要么根本没摇过卦，要么问题跟上次摇卦时不一样——
    // 但"字面不一样"不代表真的是另一件事（可能只是同一件事换个说法/继续追问），
    // 所以这里不再静默自动重摇，改成弹窗让用户自己确认。
    const questionChanged = !!window.lastCastData && !isSameQuestion(question, window.lastCastQuestion || '');
    let shouldRecast = !window.lastCastData; // 压根没摇过卦，必须起一卦，不用问

    if(window.lastCastData && questionChanged){
      const userSaysNewEvent = await showConfirm(
        `这次问题和上一卦提问的文字不完全一样：\n\n上一卦问的：${window.lastCastQuestion}\n这次写的：${question}\n\n是同一件事换个说法/继续追问，还是确实换了件不相关的新事？`,
        { title: '是同一件事，还是换新事了？', okText: '换新事了，重摇', cancelText: '同一件事，不重摇' }
      );
      if(userSaysNewEvent){
        shouldRecast = true;
      }else{
        // 用户确认还是同一件事：把这次的说法记成"这一卦对应的问题"，
        // 免得下次又换个说法问，还得再弹一次确认。
        window.lastCastQuestion = question;
        showToast('沿用上一卦解读', 'info');
      }
    }

    if(shouldRecast){
      if(castMode === 'manual'){
        const msg = questionChanged
          ? '换了新事，按规矩得重新起一卦——去"线下摇卦"里重新填一次结果，再点"生成排盘"'
          : '请先在"线下摇卦"里填好六爻结果，点"生成排盘"再解读';
        showToast(msg, 'error', 4000);
        interpretBtn.disabled = false;
        return;
      }
      if(!(await guardBeforeCast())){
        interpretBtn.disabled = false;
        return;
      }
      aiStatus.textContent = '正在自动摇卦…';
      showToast(questionChanged ? '换了新问题，先帮你重新摇一卦' : '还没摇卦，先帮你自动摇一卦');
      await performCast();
      castBtn.disabled = true; // performCast 结束会解锁摇卦按钮，这里重新锁住直到本次解读完成
    }

    aiStatus.textContent = '正在调用 DeepSeek 生成解卦回复…';
    showToast('正在调用 DeepSeek 生成解卦回复…');
    const castText = formatCastDataForAI(window.lastCastData);
    // 这条历史记录id必须在调用 interpretWithDeepSeek 之前就生成好：interpretWithDeepSeek 内部
    // 拿到回复后会立刻调用一次 saveActiveConversation()，把 sessionId 存进"当前会话"缓存里；
    // 如果这里不提前赋值，那次保存用的还是 resetConversation() 刚清成的 null，
    // 等回复结束回到这里才把 currentHistorySessionId 换成真正的新id——这中间就产生了错位：
    // localStorage 里"当前会话"记的 sessionId 还是旧的 null，可后面 appendHistory() 建的
    // 历史记录用的却是新id。这时候如果刷新/关闭页面，恢复出来的 currentHistorySessionId 就是
    // null，后续追问会拿着这个 null 去 updateHistorySession() 找记录，永远找不到匹配项，
    // 追问内容就悄悄没能存进历史（且不会报错提示），历史记录里就只剩最初那一问一答，
    // 后面继续追问的内容全部看不到。
    currentHistorySessionId = Date.now();
    const controller = new AbortController();
    activeAbortController = controller;
    stopGenBtn.disabled = false;
    showStopBtn();
    const thinking = withThinkingIndicator(question, (delta, fullSoFar)=>{
      renderLive(question, fullSoFar);
    });
    let result;
    try{
      result = await interpretWithDeepSeek(question, castText, thinking.onDelta, controller.signal);
    }finally{
      thinking.stop(); // 保底：万一中途出错/被中断，没等到第一个delta，也要把跳秒计时器停掉
      activeAbortController = null;
      hideStopBtn();
    }
    renderConversation();
    aiMeta.textContent = result.interrupted
      ? `耗时 ${result.elapsedSeconds.toFixed(1)}s · ${result.interruptReason === 'user' ? '手动停止生成，未走完整流程' : '网络中断，未收全'} · 未获得完整token用量，本站这里显示¥0只是没拿到计费数据，不代表DeepSeek没扣费——已生成的部分通常仍会计费，请以DeepSeek账单为准`
      : `耗时 ${result.elapsedSeconds.toFixed(1)}s · ` +
      `token 输入${result.promptTokens}/输出${result.completionTokens}/共${result.totalTokens} · ` +
      `约¥${result.costYuan.toFixed(4)} · 仅供参考，以DeepSeek账单为准`;
    copyRow.style.display = 'flex';
    followUpBox.style.display = 'flex';

    // 一次摇卦对应一条历史"会话"记录：这里建条，用的是前面已经提前生成好的
    // currentHistorySessionId（跟 saveActiveConversation 里存的 sessionId 是同一个值），
    // 后面每次追问都更新同一条，而不是每问一句就在历史列表里新开一条互不相干的记录。
    // 这一步单独包一层try/catch：此时AI回复其实已经拿到、也已经渲染出来了，
    // 写历史记录失败（比如某些浏览器隐私模式禁用了localStorage、或者存储配额满了）
    // 不该把下面"完成"的状态和提示覆盖成报错，让用户误以为这次白问了、回去重新问一遍。
    try{
      appendHistory({
        id: currentHistorySessionId,
        ts: currentHistorySessionId,
        type: 'ai',
        question,
        cast: buildHistoryCastSnapshot(window.lastCastData),
        turns: currentConversation.turns.slice(),
        totalTokens: currentConversation.cumTokens,
        costYuan: currentConversation.cumCost,
        isPeak: result.isPeak,
        roleLabel: currentRoleLabel(),
        styleLabel: currentReplyStyleLabel(),
      });
      renderStats();
      if(historyPanel.classList.contains('open')) renderHistory();
    }catch(histErr){
      showToast('回复已经生成，但这条没能存进历史记录（' + (histErr.message || '本地存储异常') + '）', 'error', 5000);
    }
    aiStatus.textContent = '完成';
    showToast('解读完成', 'success');
  }catch(e){
    const msg = e.message || '出错了，再试一次';
    aiStatus.textContent = msg;
    showToast(msg, 'error', 5000);
  }finally{
    interpretBtn.disabled = false;
    castBtn.disabled = false;
    manualCastBtn.disabled = false;
    clearResultBtn.disabled = false;
    followUpBtn.disabled = false;
  }
});

// ---- "输出提示词"主流程：和"AI 解读"共用同一套"要不要重新起卦"的判断逻辑
// （问题认领10分钟时效 / 问题变了要不要重摇的确认弹窗 / 手动模式下的提示），
// 这几步特意按interpretBtn那边的写法原样再写一遍、不做抽取合并，避免为了复用而牵动
// 已经跑通的interpretBtn主流程。区别只在最后一步：不调用DeepSeek、不计费、不写历史，
// 而是把 buildSystemPrompt + 排盘数据 + 问题 拼成文本，直接显示出来给用户复制。
// 开头会顺手把 interpretBtn 也锁住，防止"AI解读"和"输出提示词"这两个入口同时抢同一个
// window.lastCastData / 摇卦次数配额；反过来 interpretBtn 点击时也会顺带锁住摇卦按钮，
// 这里额外检查 interpretBtn.disabled，防止"AI解读"正在跑的时候被"输出提示词"插队。
promptBtn.addEventListener('click', async ()=>{
  if(interpretBtn.disabled){
    showToast('"AI 解读"正在进行中，请稍等它结束', 'error');
    return;
  }
  const question = questionInput.value.trim();
  if(!question){
    showToast('先写一下想问的问题', 'error');
    return;
  }
  if(isLifespanQuestion(question)){
    showToast('传统上卦师不轻断生死寿数，这类问题这里不会生成解读——如果是身体或者情绪上的真实担忧，更建议找医生或者信得过的人聊聊', 'error', 6000);
    return;
  }

  promptBtn.disabled = true;
  interpretBtn.disabled = true;
  castBtn.disabled = true;
  manualCastBtn.disabled = true;
  // 这条路径如果判断需要重新起卦，内部会走到跟"摇卦"按钮一样的 performCast()，
  // 同样会把 currentConversation 置空；"清空"按钮同理会跟这里的流程互相打架，
  // 所以追问和清空这两个按钮也要在这整个流程期间锁住，理由与"摇卦"按钮那边一致。
  followUpBtn.disabled = true;
  clearResultBtn.disabled = true;
  // 切到"输出提示词"这条路径，同样把"AI 解读"那边的结果区收起来（不清空 aiResult 文本本身，
  // 只收起复制/追问这两排按钮），避免两条路径的结果区同屏叠着。
  copyRow.style.display = 'none';
  followUpBox.style.display = 'none';

  try{
    const ADOPT_WINDOW_MS = 10 * 60 * 1000;
    if(window.lastCastData && !(window.lastCastQuestion || '').trim()
       && (Date.now() - (window.lastCastTime || 0)) <= ADOPT_WINDOW_MS){
      window.lastCastQuestion = question;
    }
    const questionChanged = !!window.lastCastData && !isSameQuestion(question, window.lastCastQuestion || '');
    let shouldRecast = !window.lastCastData;

    if(window.lastCastData && questionChanged){
      const userSaysNewEvent = await showConfirm(
        `这次问题和上一卦提问的文字不完全一样：\n\n上一卦问的：${window.lastCastQuestion}\n这次写的：${question}\n\n是同一件事换个说法/继续追问，还是确实换了件不相关的新事？`,
        { title: '是同一件事，还是换新事了？', okText: '换新事了，重摇', cancelText: '同一件事，不重摇' }
      );
      if(userSaysNewEvent){
        shouldRecast = true;
      }else{
        window.lastCastQuestion = question;
        showToast('沿用上一卦排盘生成提示词');
      }
    }

    if(shouldRecast){
      if(castMode === 'manual'){
        const msg = questionChanged
          ? '换了新事，按规矩得重新起一卦——去"线下摇卦"里重新填一次结果，再点"生成排盘"'
          : '请先在"线下摇卦"里填好六爻结果，点"生成排盘"再输出提示词';
        showToast(msg, 'error', 4000);
        return;
      }
      if(!(await guardBeforeCast())){
        return;
      }
      showToast(questionChanged ? '换了新问题，先帮你重新摇一卦' : '还没摇卦，先帮你自动摇一卦');
      await performCast();
    }

    const castText = formatCastDataForAI(window.lastCastData);
    lastExportCastText = castText;
    lastExportQuestion = question;
    showPromptOutput(buildExportPromptText(question, castText));
    showToast('提示词已生成，复制后可以粘贴去其他AI软件解卦', 'success');

    // "输出提示词"这条路径之前不写历史，导致这里生成过的卦在"历史记录"里完全找不到。
    // 这里补一条记录，但只存问题+这一卦的关键排盘信息（跟"AI 解读"共用同一个快照函数），
    // 不把 buildExportPromptText() 拼出来的那一整段人设/规则长文本存进去。
    // 同理单独包一层try/catch：提示词此时已经生成并展示给用户了，写历史失败不该
    // 被外层catch误报成"生成提示词时出错了"，那会让人误以为上面显示的提示词也不作数。
    try{
      appendHistory({
        id: Date.now(),
        ts: Date.now(),
        type: 'prompt',
        question,
        cast: buildHistoryCastSnapshot(window.lastCastData),
        roleLabel: currentRoleLabel(),
        styleLabel: currentReplyStyleLabel(),
      });
      renderStats();
      if(historyPanel.classList.contains('open')) renderHistory();
    }catch(histErr){
      showToast('提示词已生成，但这条没能存进历史记录（' + (histErr.message || '本地存储异常') + '）', 'error', 5000);
    }
  }catch(e){
    showToast(e.message || '生成提示词时出错了，再试一次', 'error', 5000);
  }finally{
    promptBtn.disabled = false;
    interpretBtn.disabled = false;
    castBtn.disabled = false;
    manualCastBtn.disabled = false;
    followUpBtn.disabled = false;
    clearResultBtn.disabled = false;
  }
});

followUpBtn.addEventListener('click', async ()=>{
  const followUpText = followUpInput.value.trim();
  if(!followUpText){
    showToast('先写一下想追问的内容', 'error');
    return;
  }
  if(isLifespanQuestion(followUpText)){
    showToast('传统上卦师不轻断生死寿数，这类问题这里不会生成解读——如果是身体或者情绪上的真实担忧，更建议找医生或者信得过的人聊聊', 'error', 6000);
    return;
  }
  if(!currentConversation){
    showToast('还没有可以追问的解读，先点一次"AI 解读"', 'error');
    return;
  }
  if(!loadApiKey()){
    aiSettings.classList.add('open');
    showToast('先在下面"设置"里填一下 DeepSeek API Key', 'error');
    return;
  }

  followUpBtn.disabled = true;
  interpretBtn.disabled = true; // 追问期间也锁住"AI 解读"，避免同时起两个请求把 currentConversation 弄乱
  // "输出提示词"内部会检查 interpretBtn.disabled 来判断能不能执行，锁住 interpretBtn 已经能
  // 功能上挡住它；这里再顺手把它也显式禁用，避免按钮看着能点、点了却只弹出一句
  // "AI 解读正在进行中"（其实是追问在进行中）这种文案对不上的体验。
  promptBtn.disabled = true;
  // 追问期间同样要锁住摇卦入口：这两个按钮之前一直没被追问锁住，用户能在追问的流式请求还没
  // 返回时就点"摇卦"，performCast→renderPlate 里的 resetConversation() 会把 currentConversation
  // 提前置空，等追问请求回来 followUpWithDeepSeek 里再往 currentConversation.messages 写东西时
  // 就是对着 null 操作，直接报错，这次回答也白白问了（token 照样扣，结果却丢了）。
  castBtn.disabled = true;
  manualCastBtn.disabled = true;
  // "清空回复"同理会调 resetConversation()，追问期间也先锁住，等这轮追问完整结束再放开。
  clearResultBtn.disabled = true;
  followUpStatus.textContent = '正在追问…';

  try{
    // 追问的实时预览要接在"已经落定的对话"后面，renderLive/renderThinking内部本来就会先铺settled turns，
    // 但此时followUpWithDeepSeek还没把这轮user文本push进turns，所以这里传的questionText就是followUpText本身。
    const controller = new AbortController();
    activeAbortController = controller;
    stopGenBtn.disabled = false;
    showStopBtn();
    const thinking = withThinkingIndicator(followUpText, (delta, fullSoFar)=>{
      renderLive(followUpText, fullSoFar);
    });
    let result;
    try{
      result = await followUpWithDeepSeek(followUpText, thinking.onDelta, controller.signal);
    }finally{
      thinking.stop();
      activeAbortController = null;
      hideStopBtn();
    }
    followUpInput.value = '';
    followUpInput.dispatchEvent(new Event('input')); // 同步触发一次，让字数计数器跟着归零
    renderConversation();
    aiMeta.textContent = result.interrupted
      ? `本轮${result.interruptReason === 'user' ? '手动停止生成' : '网络中断'}，未获得完整token用量，这里显示¥0只是没拿到计费数据，不代表DeepSeek没扣费 · 本次追问会话累计约¥${currentConversation.cumCost.toFixed(4)}（不含本轮，已生成部分请以DeepSeek账单为准）`
      : `本轮耗时 ${result.elapsedSeconds.toFixed(1)}s · 本轮token共${result.totalTokens} · 本轮约¥${result.costYuan.toFixed(4)} · ` +
      `本次追问会话累计约¥${currentConversation.cumCost.toFixed(4)}（每次追问都会带上前面的问答一起发给AI，累计费用会往上涨）`;
    followUpStatus.textContent = result.interrupted ? (result.interruptReason === 'user' ? '已停止' : '网络中断') : '完成';

    // 更新同一条历史会话记录（用首次解读时记住的sessionId去找），把新的这两轮追加进turns里；
    // 找不到就说明历史被清空过，直接放弃写回，不强行拼一条新的。
    // 同上，单独包一层try/catch：追问的回复此时已经拿到并渲染出来、followUpStatus也已经
    // 设成"完成"了，写历史失败不该被外层catch覆盖成报错状态。
    try{
      const updated = updateHistorySession(currentHistorySessionId, {
        turns: currentConversation.turns.slice(),
        totalTokens: currentConversation.cumTokens,
        costYuan: currentConversation.cumCost,
        isPeak: result.isPeak,
      });
      if(updated){
        renderStats();
        if(historyPanel.classList.contains('open')) renderHistory();
      }
    }catch(histErr){
      showToast('追问回复已经生成，但这条没能存进历史记录（' + (histErr.message || '本地存储异常') + '）', 'error', 5000);
    }
  }catch(e){
    const msg = e.message || '出错了，再试一次';
    followUpStatus.textContent = msg;
    showToast(msg, 'error', 5000);
  }finally{
    followUpBtn.disabled = false;
    interpretBtn.disabled = false;
    castBtn.disabled = false;
    manualCastBtn.disabled = false;
    clearResultBtn.disabled = false;
    promptBtn.disabled = false;
  }
});
