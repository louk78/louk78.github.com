/* ==================================================================
  ly/js/diagram.js —— 卦象爻画图：把六爻画成"本卦一列、有动爻就再并排一列变卦"的直观图形
  谁在用：plate.js（起卦当下的 renderPlate / 刷新恢复的 renderPlateFromCastData）、
          ai-core.js（历史记录回看的 historyCastHtml），三处共用这一份画法。
  本模块只认"几何"：入参就是 {yang, moving, isWorld, isResponse}，不认识"结构化六爻"那套
  中文字段名——那层换算（structLineToDiagram）跟字段契约一起放在 plate.js，改数据结构不用动这里。
  样式：css/diagram.css（历史记录里空间窄，那边有 .history-cast 一套缩小版）
  依赖：escapeHtml（render-helpers.js，比本模块先加载）。
  加载顺序见 index.html 里的模块地图。
================================================================== */
// ---- 卦象爻画图：把六爻的阴阳/动爻/世应画成"从下往上六道爻线"的直观图形。
// 布局是两行：第一行标签（有动爻时排成"本卦：X → 变卦：Y"，箭头夹在两段标签文字中间），
// 第二行并排两列六爻（变卦=动爻翻转阴阳）；没有动爻时只有一个 .gua-diagram-single 单列容器
// ——标签在上、六爻在下。
// 比排盘表格里逐行去看"状态"和"变出"两列更直观，一眼能看出整卦长什么样、变在哪一爻。
// 三处调用方各自把六爻数据整理成下面这个统一的入参形状再传进来
// （"结构化六爻 → 这个形状"的换算是 plate.js 里的 structLineToDiagram）。
// diagramLines：长度为6的数组，下标0=初爻(1爻)…下标5=上爻(6爻)，每项 {yang, moving, isWorld, isResponse}
function buildGuaDiagramHtml(diagramLines, guaName, bianGuaName){
  if(!Array.isArray(diagramLines) || diagramLines.length !== 6) return '';
  const hasMoving = diagramLines.some(l => l.moving);
  // 一列六爻画：6爻最上、1爻最下，跟传统卦画自下而上的顺序对应
  const linesHtml = arr => arr.slice().reverse().map(l => {
      const bar = l.yang
        ? `<span class="gd-bar-full"></span>`
        : `<span class="gd-bar-half gd-bar-left"></span><span class="gd-bar-half gd-bar-right"></span>`;
      const mark = l.moving ? (l.yang ? '○' : '✕') : '';
      const tag = (l.isWorld ? '世' : '') + (l.isResponse ? '应' : '');
      return `<div class="gd-line${l.moving ? ' moving' : ''}">
        <span class="gd-bar">${bar}</span><span class="gd-mark">${mark}</span><span class="gd-tag">${tag}</span>
      </div>`;
    }).join('');
  const labelHtml = (label, name) => `${label}${name ? `：<b>${escapeHtml(name)}</b>` : ''}`;
  const benLines = linesHtml(diagramLines);
  // 没有动爻：单列，标签在上、六爻在下
  if(!hasMoving){
    return `<div class="gua-diagram gua-diagram-single">
      <div class="gua-diagram-label">${labelHtml('本卦', guaName)}</div>
      <div class="gua-diagram-lines">${benLines}</div>
    </div>`;
  }
  // 有动爻：标签那一行是"本卦：X → 变卦：Y"（箭头夹在两段标签中间），下一行并排两列六爻
  const bianArr = diagramLines.map(l => ({ yang: l.moving ? !l.yang : l.yang, moving:false, isWorld:false, isResponse:false }));
  return `<div class="gua-diagram">
    <div class="gua-diagram-label">${labelHtml('本卦', guaName)}</div>
    <div class="gua-diagram-arrow">→</div>
    <div class="gua-diagram-label">${labelHtml('变卦', bianGuaName)}</div>
    <div class="gua-diagram-lines">${benLines}</div>
    <div class="gua-diagram-lines">${linesHtml(bianArr)}</div>
  </div>`;
}
