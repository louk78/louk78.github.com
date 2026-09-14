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
// ---- 卦象爻画图：把六爻的阴阳/动爻/世应画成"从下往上六道爻线"的直观图形，本卦一列，
// 若有动爻则右边并排再画一列变卦（动爻翻转阴阳后的新卦），中间一个箭头表示"变"——
// 比排盘表格里逐行去看"状态"和"变出"两列更直观，一眼能看出整卦长什么样、变在哪一爻。
// 三处调用方各自把六爻数据整理成下面这个统一的入参形状再传进来
// （"结构化六爻 → 这个形状"的换算是 plate.js 里的 structLineToDiagram）。
// diagramLines：长度为6的数组，下标0=初爻(1爻)…下标5=上爻(6爻)，每项 {yang, moving, isWorld, isResponse}
function buildGuaDiagramHtml(diagramLines, guaName, bianGuaName){
  if(!Array.isArray(diagramLines) || diagramLines.length !== 6) return '';
  const hasMoving = diagramLines.some(l => l.moving);
  const renderCol = (arr, label, name) => {
    const rows = arr.slice().reverse().map(l => { // 6爻画最上、1爻画最下，跟传统卦画自下而上的顺序对应
      const bar = l.yang
        ? `<span class="gd-bar-full"></span>`
        : `<span class="gd-bar-half gd-bar-left"></span><span class="gd-bar-half gd-bar-right"></span>`;
      const mark = l.moving ? (l.yang ? '○' : '✕') : '';
      const tag = (l.isWorld ? '世' : '') + (l.isResponse ? '应' : '');
      return `<div class="gd-line${l.moving ? ' moving' : ''}">
        <span class="gd-bar">${bar}</span><span class="gd-mark">${mark}</span><span class="gd-tag">${tag}</span>
      </div>`;
    }).join('');
    const nameHtml = name ? `：<b>${escapeHtml(name)}</b>` : '';
    return `<div class="gua-diagram-col">
      <div class="gua-diagram-label">${label}${nameHtml}</div>
      <div class="gua-diagram-lines">${rows}</div>
    </div>`;
  };
  const benCol = renderCol(diagramLines, '本卦', guaName);
  if(!hasMoving) return `<div class="gua-diagram">${benCol}</div>`;
  const bianArr = diagramLines.map(l => ({ yang: l.moving ? !l.yang : l.yang, moving:false, isWorld:false, isResponse:false }));
  const bianCol = renderCol(bianArr, '变卦', bianGuaName);
  return `<div class="gua-diagram">${benCol}<div class="gua-diagram-arrow">→</div>${bianCol}</div>`;
}
