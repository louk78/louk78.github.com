/* ==================================================================
  ly/js/ui-shell.js —— 界面基础：折叠区块、标签切换、八卦卡片、五行轮盘
  从 ly/index.html 单文件版按原顺序原样拆出，加载顺序见 index.html 里的模块地图。
  依赖：无（最先加载）；本文件不要改加载顺序以外的全局假设。
================================================================== */
/* ---------------- 折叠区块：进阶/参考内容默认收起，点标题展开 ----------------
   写成函数而不是只在脚本开头跑一遍，是因为"纳甲速查"里八个宫的装卦表是后面
   用 JS 现生成的：生成完拿新容器再调一次本函数，新出来的折叠区块才有人管。
   ---------------- */
function setupCollapsibleSections(root = document){
  root.querySelectorAll('section.block-collapse').forEach(sec=>{
    const h2 = sec.querySelector('h2');
    const hint = document.createElement('span');
    hint.className = 'collapse-hint';
    h2.appendChild(hint);
    h2.addEventListener('click', ()=> sec.classList.toggle('open'));
  });
  root.querySelectorAll('.settings-group.collapsible').forEach(group=>{
    const title = group.querySelector('.settings-group-title');
    title.addEventListener('click', ()=> group.classList.toggle('open'));
  });
}
setupCollapsibleSections();

/* ---------------- tabs ----------------
   role="tablist"/"tab"/"tabpanel" 用的是标准 ARIA tabs 模式：每次切换要同步
   aria-selected（哪个tab被选中）和"roving tabindex"（tabindex在tab之间挪动，
   同一时刻只有当前激活的tab能被Tab键聚焦到，符合键盘用户对"标签页"控件的
   标准预期——Tab键只在tablist和当前面板之间跳两下，不会挨个把6个tab都走一遍）。
   鼠标点击的视觉效果和之前完全一样，这里只是把底层语义和键盘可达性补上。
   ---------------- */
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
function switchTab(tabName){
  tabButtons.forEach(b=>{
    const active = b.dataset.tab === tabName;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
    b.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id === tabName));
}
tabButtons.forEach((btn, i)=>{
  btn.addEventListener('click',()=> switchTab(btn.dataset.tab));
  // 左右方向键 / Home / End 在标签之间移动焦点并直接切换面板（标准tablist行为，
  // 不需要用户额外按Tab/Enter）；上下方向键留给页面自身滚动，不拦截。
  btn.addEventListener('keydown', (e)=>{
    let targetIndex = null;
    if(e.key === 'ArrowRight') targetIndex = (i + 1) % tabButtons.length;
    else if(e.key === 'ArrowLeft') targetIndex = (i - 1 + tabButtons.length) % tabButtons.length;
    else if(e.key === 'Home') targetIndex = 0;
    else if(e.key === 'End') targetIndex = tabButtons.length - 1;
    if(targetIndex === null) return;
    e.preventDefault();
    const target = tabButtons[targetIndex];
    switchTab(target.dataset.tab);
    target.focus();
  });
});

/* ---------------- bagua grid ---------------- */
const BAGUA = [
  {key:'111',name:'乾',sym:'☰',el:'金',meta:'三阳 · 天 · 父'},
  {key:'110',name:'兑',sym:'☱',el:'金',meta:'上阴 · 泽 · 少女'},
  {key:'101',name:'离',sym:'☲',el:'火',meta:'中虚 · 火 · 中女'},
  {key:'100',name:'震',sym:'☳',el:'木',meta:'下阳 · 雷 · 长男'},
  {key:'011',name:'巽',sym:'☴',el:'木',meta:'下阴 · 风 · 长女'},
  {key:'010',name:'坎',sym:'☵',el:'水',meta:'中满 · 水 · 中男'},
  {key:'001',name:'艮',sym:'☶',el:'土',meta:'上阳 · 山 · 少男'},
  {key:'000',name:'坤',sym:'☷',el:'土',meta:'三阴 · 地 · 母'},
];
document.getElementById('baguaGrid').innerHTML = BAGUA.map(g=>`
  <div class="gua-card">
    <div class="sym">${g.sym}</div>
    <div class="name">${g.name}　·　${g.el}</div>
    <div class="meta">${g.meta}</div>
  </div>`).join('');

/* ---------------- wuxing wheel ---------------- */
const WX = ['木','火','土','金','水'];
const SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
const KE = {'木':'土','土':'水','水':'火','火':'金','金':'木'};
const svg = document.getElementById('wuxingSvg');
const cx=140, cy=140, R=95;
const pos = {};
WX.forEach((w,i)=>{
  const a = -Math.PI/2 + i*(2*Math.PI/5);
  pos[w] = {x:cx+R*Math.cos(a), y:cy+R*Math.sin(a)};
});
let svgHtml = '';
// sheng arrows (outer pentagon, i -> i+1)
WX.forEach((w,i)=>{
  const a=pos[w], b=pos[WX[(i+1)%5]];
  svgHtml += `<path class="wx-arrow sheng" data-from="${w}" data-to="${WX[(i+1)%5]}" d="${arcPath(a,b,cx,cy,26)}"/>`;
});
// ke arrows (inner star, i -> i+2)
WX.forEach((w,i)=>{
  const a=pos[w], b=pos[WX[(i+2)%5]];
  svgHtml += `<path class="wx-arrow ke" data-from="${w}" data-to="${WX[(i+2)%5]}" d="${arcPath(a,b,cx,cy,-14,0.72)}"/>`;
});
function arcPath(a,b,cx,cy,bend,shrink){
  shrink = shrink||0.85;
  const ax = cx+(a.x-cx)*shrink, ay = cy+(a.y-cy)*shrink;
  const bx = cx+(b.x-cx)*shrink, by = cy+(b.y-cy)*shrink;
  const mx=(ax+bx)/2, my=(ay+by)/2;
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const ctrlx = mx+nx*bend, ctrly = my+ny*bend;
  return `M${ax},${ay} Q${ctrlx},${ctrly} ${bx},${by}`;
}
WX.forEach(w=>{
  const p=pos[w];
  svgHtml += `<g class="wx-node" data-el="${w}" transform="translate(${p.x},${p.y})">
    <circle r="22"/><text x="0" y="6" text-anchor="middle">${w}</text></g>`;
});
svg.insertAdjacentHTML('beforeend', svgHtml);
svg.querySelectorAll('.wx-node').forEach(node=>{
  node.addEventListener('click',()=>{
    const el = node.dataset.el;
    document.querySelectorAll('.wx-node').forEach(n=>n.classList.remove('active'));
    document.querySelectorAll('.wx-arrow').forEach(a=>a.classList.remove('hl'));
    node.classList.add('active');
    document.querySelectorAll(`.wx-arrow[data-from="${el}"]`).forEach(a=>a.classList.add('hl'));
    document.querySelectorAll(`.wx-arrow[data-to="${el}"]`).forEach(a=>a.classList.add('hl'));
    const genTo = SHENG[el], genBy = Object.keys(SHENG).find(k=>SHENG[k]===el);
    const keTo = KE[el], keBy = Object.keys(KE).find(k=>KE[k]===el);
    document.getElementById('wxInfo').innerHTML =
      `<b>${el}</b> 生 ${genTo}　·　${genBy} 生 <b>${el}</b><br>
       <b>${el}</b> 克 ${keTo}　·　${keBy} 克 <b>${el}</b>`;
  });
});

