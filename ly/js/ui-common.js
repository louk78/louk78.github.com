/* ==================================================================
  ly/js/ui-common.js —— 通用界面件：Toast、弹层焦点管理、确认弹层、新手教程
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：之前加载的模块；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ==================================================================
   Toast 弹窗提示 —— 状态/成功/错误提示都走这里，比小字更显眼，
   手机App里尤其需要，不然一行小灰字很容易被忽略掉。
   ================================================================== */
const toastWrap = document.getElementById('toastWrap');
function showToast(message, type = 'info', duration = 3200){
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : (type === 'success' ? 'success' : '')}`;
  el.textContent = message;
  toastWrap.appendChild(el);
  setTimeout(()=>{
    el.classList.add('fade-out');
    setTimeout(()=>el.remove(), 260);
  }, duration);
}

/* ==================================================================
   弹层焦点管理工具 —— showConfirm 和新手教程弹层共用：
   1) 打开时记住当前聚焦的元素，关闭时把焦点还给它，键盘/屏幕阅读器用户
      不会在弹层关闭后"焦点丢失"、要重新从页面顶部摸索去找回来；
   2) Tab / Shift+Tab 在弹层内部循环，不会漏到背后页面——原生 <dialog> 的
      showModal() 会自带这个行为，但这两个弹层是普通 div 实现的（要兼容
      旧一点的浏览器，且样式/动画已经写好了，不想为了原生对话框推翻重来），
      所以手动补上同样效果。
   ================================================================== */
function getFocusableIn(container){
  return Array.from(container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && el.offsetParent !== null);
}
function trapTabKey(container, e){
  if(e.key !== 'Tab') return;
  const focusable = getFocusableIn(container);
  if(!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if(e.shiftKey && document.activeElement === first){
    e.preventDefault();
    last.focus();
  }else if(!e.shiftKey && document.activeElement === last){
    e.preventDefault();
    first.focus();
  }
}

/* ==================================================================
   通用确认弹层 —— 替代原生 confirm()，风格跟页面其他弹层统一。
   用法：const ok = await showConfirm('文字…', {title, okText, cancelText});
   ================================================================== */
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMsg = document.getElementById('confirmMsg');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

// 这个弹层是全局单例（复用同一套 confirmOverlay/confirmTitle/…DOM），本身没有"排队"能力：
// 如果在第一次 showConfirm() 还没等到用户点击时，别的入口（目前已知的是"清空历史"按钮，
// 它没有被"AI 解读"/"输出提示词"那几个流程锁住）又调用了一次 showConfirm()，两次调用会
// 共用同一颗"确定"按钮，第二次调用的文案会静默覆盖掉第一次的、并在同一批按钮上再叠一套
// 监听器——用户看到的是第二个弹层的文字，但点一下"确定"会同时把两个 Promise 都 resolve(true)，
// 相当于用户没看到、也没确认过的第一个决定被顺带"点头"了。这里用一条 Promise 链把
// showConfirm 的调用强制排队、同一时间只弹一个，从根上避免这种串线。
let confirmChain = Promise.resolve();
function showConfirm(message, opts = {}){
  const { title = '确认', okText = '确定', cancelText = '取消' } = opts;
  const run = () => new Promise(resolve=>{
    const previouslyFocused = document.activeElement;
    confirmTitle.textContent = title;
    confirmMsg.textContent = message;
    confirmOkBtn.textContent = okText;
    confirmCancelBtn.textContent = cancelText;
    confirmOverlay.style.display = 'flex';
    // 默认焦点给"取消"而不是"确定"：这个弹层大多用在"清空历史"这类不可逆操作上，
    // 键盘用户如果是习惯性按了个Tab+Enter或者手滑碰到回车，落在"取消"上更安全。
    confirmCancelBtn.focus();

    function cleanup(result){
      confirmOverlay.style.display = 'none';
      confirmOkBtn.removeEventListener('click', onOk);
      confirmCancelBtn.removeEventListener('click', onCancel);
      confirmOverlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
      if(previouslyFocused && typeof previouslyFocused.focus === 'function'){
        previouslyFocused.focus();
      }
      resolve(result);
    }
    function onOk(){ cleanup(true); }
    function onCancel(){ cleanup(false); }
    function onOverlayClick(e){ if(e.target === confirmOverlay) cleanup(false); }
    function onKeydown(e){
      if(e.key === 'Escape'){ cleanup(false); return; }
      trapTabKey(confirmOverlay, e);
    }

    confirmOkBtn.addEventListener('click', onOk);
    confirmCancelBtn.addEventListener('click', onCancel);
    confirmOverlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
  // 排到当前链的后面：不管前一个弹层是"确定"还是"取消"结束，都等它彻底 cleanup() 完了、
  // 弹层关掉之后，才轮到这一次的 run() 真正弹出来，两次调用之间不会共享 DOM/监听器。
  const result = confirmChain.then(run);
  confirmChain = result.catch(()=>{}); // 保底：万一某次 run() 异常，也不能让后面排队的永远卡住
  return result;
}

/* ==================================================================
   新手教程弹层 —— 第一次打开自动弹，之后可以点导航栏的"?"随时重看
   ================================================================== */
const ONBOARD_KEY = 'liuyao_onboarded';
const onboardOverlay = document.getElementById('onboardOverlay');
const onboardCloseBtn = document.getElementById('onboardCloseBtn');
const helpFab = document.getElementById('helpFab');
const onboardScroll = document.getElementById('onboardScroll');
const onboardFade = document.getElementById('onboardFade');
let onboardPreviouslyFocused = null;

// 内容区滚动到底（或者内容本来就没超过可视高度）时，把底部渐隐提示淡出——
// 已经没有更多内容可看了，不用再暗示"下面还有"。留2px余量，避免小数像素误差导致
// 明明到底了却因为0.3px的差距还残留一点提示。
function updateOnboardFade(){
  if(!onboardScroll || !onboardFade) return;
  const remaining = onboardScroll.scrollHeight - onboardScroll.scrollTop - onboardScroll.clientHeight;
  onboardFade.classList.toggle('hidden', remaining <= 2);
}
function onOnboardKeydown(e){
  if(e.key === 'Escape'){ closeOnboard(); return; }
  trapTabKey(onboardOverlay, e);
}
// 点遮罩关闭：跟 confirmOverlay 的 onOverlayClick 是同一个思路——click 事件会冒泡，
// 只有直接点在遮罩本身（不是卡片或卡片内内容）时 e.target 才等于 onboardOverlay，
// 借此把"点卡片外的空白区域"和"点卡片内任意地方"区分开。
function onOnboardOverlayClick(e){
  if(e.target === onboardOverlay) closeOnboard();
}
function openOnboard(){
  onboardPreviouslyFocused = document.activeElement;
  onboardOverlay.style.display = 'flex';
  if(onboardScroll){ onboardScroll.scrollTop = 0; }
  updateOnboardFade();
  onboardCloseBtn.focus();
  document.addEventListener('keydown', onOnboardKeydown);
  onboardOverlay.addEventListener('click', onOnboardOverlayClick);
}
function closeOnboard(){
  onboardOverlay.style.display = 'none';
  document.removeEventListener('keydown', onOnboardKeydown);
  onboardOverlay.removeEventListener('click', onOnboardOverlayClick);
  if(onboardPreviouslyFocused && typeof onboardPreviouslyFocused.focus === 'function'){
    onboardPreviouslyFocused.focus();
  }
  onboardPreviouslyFocused = null;
}

//if(!localStorage.getItem(ONBOARD_KEY)){
  //openOnboard();
//}
onboardCloseBtn.addEventListener('click', ()=>{
  safeSetItem(ONBOARD_KEY, '1');
  closeOnboard();
});
helpFab.addEventListener('click', openOnboard);
if(onboardScroll){
  onboardScroll.addEventListener('scroll', updateOnboardFade);
  // 横竖屏切换/窗口尺寸变化可能让内容从"需要滚动"变成"一屏放得下"（或反过来），
  // 跟着重新算一次，不然提示可能在不该出现的时候还留着。
  window.addEventListener('resize', updateOnboardFade);
}

