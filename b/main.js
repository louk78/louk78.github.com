/* =========================================================================
 * 四柱八字智能排盘 - 主逻辑
 * 依赖脚本加载顺序: lunar.js -> data.js(神煞表) -> shensha-rules.js(规则) -> main.js
 *
 * 模块结构:
 *   1. 通用小工具 / DOM 初始化 / 输入校验
 *   2. 神煞引擎(数据表 + 规则驱动, 取代原 1300 行重复匹配)
 *   3. computeEightChar(): 排盘主流程
 *        a. 四柱与“当前(大运/流年/流月/流日/流时)”数据准备
 *        b. 神煞收集(见上引擎)
 *        c. 命盘表格渲染(字符串拼接后 innerHTML)
 *   4. computeLunar()/computeSolar()/compute(): 输入解析与分发
 * ========================================================================= */
(function (W, D) {
  'use strict';

  // ===== 通用小工具 / DOM / 输入事件 =====
  var setClass = function(el,v){
    try{
      el.className = v;
    }catch(e){
      el.setAttribute('class', v);
    }
  };
  var trim = function(s){
    return s.replace(/(^\s*)|(\s*$)/g, '');
　};
  var padding = function(n){
    return (n<10?'0':'') + n;
  };
  var selectSect = 1;  
  var result = D.getElementById('pan');
  var input = D.getElementById('birthday');

  var startBtn = D.getElementById('start_btn');

  // ===== 渲染后的视觉增强 =====
  var FG = {
    '甲':'wood','乙':'wood','寅':'wood','卯':'wood',
    '丙':'fire','丁':'fire','巳':'fire','午':'fire',
    '戊':'earth','己':'earth','辰':'earth','戌':'earth','丑':'earth','未':'earth',
    '庚':'metal','辛':'metal','申':'metal','酉':'metal',
    '壬':'water','癸':'water','亥':'water','子':'water'
  };
  var PHEAD = {'年柱':1,'月柱':1,'日柱':1,'时柱':1,'大运':1,'流年':1,'流月':1,'流日':1,'流时':1};
  function decorate(){
    var tables = result.getElementsByTagName('table');
    for(var ti=0;ti<tables.length;ti++){
      var tds = tables[ti].getElementsByTagName('td');
      for(var i=0;i<tds.length;i++){
        var td = tds[i];
        var txt = td.textContent;
        if(!txt){ continue; }
        var cls = (td.className||'').trim();
        var t = txt.replace(/\s+/g,'');
        var isBazi = cls.split(' ').indexOf('bazi') > -1;
        if(/[:：]$/.test(t)){
          td.className = cls ? (cls + ' rlabel') : 'rlabel';
        }else if(PHEAD[t]){
          td.className = cls ? (cls + ' phead') : 'phead';
        }
        if(isBazi && /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/.test(txt)){
          var parts = txt.split('').map(function(ch){
            var k = FG[ch];
            return k ? '<span class="fg-'+k+'">'+ch+'</span>' : ch;
          });
          td.innerHTML = parts.join('');
        }
      }
    }
  }

  startBtn.addEventListener('click', function () {
    var birthday = input;
    var gender = D.querySelector('input[name="gender"]:checked').value;
    var resultValue = birthday.value + gender;

    if(!/^\s*\d{4}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*[+-]?$/.test(resultValue)){
      setClass(birthday,'error');
      return;
    }
    setClass(birthday,'');
    compute(resultValue);
  });
  var CHANG_SHENG_OFFSET = {'甲':1,'丙':10,'戊':10,'庚':7,'壬':4,'乙':6,'丁':9,'己':9,'辛':0,'癸':3};
  function getChangSheng(gan, ganIndex, zhiIndex){
    var offset = CHANG_SHENG_OFFSET[gan];
    var index = offset + (ganIndex%2==0?zhiIndex:-zhiIndex);
    if(index>=12){
      index -= 12;
    }
    if(index<0){
      index += 12;
    }
    return EightChar.CHANG_SHENG[index];
  }
  function getGanIndex(gan){
    for(var i=0,j=LunarUtil.GAN.length;i<j;i++){
      if(gan===LunarUtil.GAN[i]){
        return i-1;
      }
    }
    return 0;
  }
  function getZhiIndex(zhi){
    for(var i=0,j=LunarUtil.ZHI.length;i<j;i++){
      if(zhi===LunarUtil.ZHI[i]){
        return i-1;
      }
    }
    return 0;
  }
  
  // ===== 神煞引擎 ===== (规则数据见 shensha-rules.js)

  /* ===================================================================
   * 神煞引擎
   * 取代原文件中约 1300 行重复的 “for(var i in 表){…if(gz==…)…}” 匹配循环。
   * 规则(见 shensha-rules.js)形如 {t:表名, p:[[原子…],…]}, 候选串 = 原子值拼接,
   * 只要命中表中任一组合串, 该星曜即算出现。
   * 原子: Y/M/D/T=年月日时柱; gan/zhi/gz/nayin=干/支/干支/纳音; Mv=移动柱。
   * =================================================================== */

  // 取“四柱”某原子对应的实际字符
  function baziAtom(bazi, atom) {
    switch (atom) {
      case 'Ygan': return bazi.getYearGan();
      case 'Yzhi': return bazi.getYearZhi();
      case 'Ygz':  return bazi.getYear();
      case 'Ynayin': return bazi.getYearNaYin();
      case 'Mgan': return bazi.getMonthGan();
      case 'Mzhi': return bazi.getMonthZhi();
      case 'Mgz':  return bazi.getMonth();
      case 'Mnayin': return bazi.getMonthNaYin();
      case 'Dgan': return bazi.getDayGan();
      case 'Dzhi': return bazi.getDayZhi();
      case 'Dgz':  return bazi.getDay();
      case 'Dnayin': return bazi.getDayNaYin();
      case 'Tgan': return bazi.getTimeGan();
      case 'Tzhi': return bazi.getTimeZhi();
      case 'Tgz':  return bazi.getTime();
      case 'Tnayin': return bazi.getTimeNaYin();
      default: return '';
    }
  }

  // 取“移动柱”(大运/流年/流月/流日/流时)某原子的值
  function movingAtom(m, atom) {
    switch (atom) {
      case 'MvGan': return m.gan;
      case 'MvZhi': return m.zhi;
      case 'MvNaYin': return m.nayin;
      default: return '';
    }
  }

  // 构造候选串取值函数: 返回 原子->字符串
  function makeCharAt(bazi, moving) {
    return function (atom) {
      if (atom.charAt(1) === 'v') {           // 以 "Mv" 开头 => 移动柱
        return moving ? movingAtom(moving, atom) : '';
      }
      return baziAtom(bazi, atom);
    };
  }

  // 执行单条规则: 返回命中星曜名(按表内顺序且去重)
  // tables: 表名 -> 查找表对象(含运行时选定的 shenShaYearZhiZhiNN)
  function matchRule(rule, charAt, tables) {
    var table = tables[rule.t];
    // 预生成候选串
    var cands = [];
    for (var pi = 0; pi < rule.p.length; pi++) {
      var part = rule.p[pi];
      var c = '';
      for (var ai = 0; ai < part.length; ai++) {
        c += charAt(part[ai]);
      }
      cands.push(c);
    }
    // 任一组合串等于任一候选串 => 命中
    var hit = [];
    for (var star in table) {
      var list = table[star];
      outer:
      for (var ci = 0; ci < cands.length; ci++) {
        for (var li = 0; li < list.length; li++) {
          if (list[li] === cands[ci]) {
            hit.push(star);
            break outer;
          }
        }
      }
    }
    return hit;
  }

  // 四柱(年/月/日/时)神煞: 柱内所有规则命中星曜合并去重, 按首次出现顺序
  function collectBasicPillar(rules, bazi, tables) {
    var seen = {};
    var out = [];
    var charAt = makeCharAt(bazi, null);
    for (var r = 0; r < rules.length; r++) {
      var names = matchRule(rules[r], charAt, tables);
      for (var i = 0; i < names.length; i++) {
        if (!seen[names[i]]) {
          seen[names[i]] = 1;
          out.push(names[i]);
        }
      }
    }
    return out;
  }

  // 移动柱(大运/流年/流月/流日/流时)神煞:
  // 与原逻辑一致 —— 每条规则单独去重并写入数组, 因此跨规则可重复出现同一星曜
  function collectMovingPillar(rules, bazi, moving, tables) {
    var out = [];
    var charAt = makeCharAt(bazi, moving);
    for (var r = 0; r < rules.length; r++) {
      var names = matchRule(rules[r], charAt, tables);
      for (var i = 0; i < names.length; i++) {
        out.push(names[i]);
      }
    }
    return out;
  }

  // 由 currentYun 提取移动柱信息 {gan,zhi,nayin}
  function movingOf(currentYun, key) {
    var gz = currentYun[key + 'GanZhi'];
    return {
      gan: gz ? gz.substr(0, 1) : '',
      zhi: gz ? gz.substr(1) : '',
      nayin: currentYun[key + 'NaYin'] || ''
    };
  }

  // 收集全部 9 柱神煞 -> {year,month,day,time,daYun,liuNian,liuYue,liuRi,liuShi}
  // nnTable: 依“阳男阴女 / 阴男阳女”运行时选定的 勾煞/绞煞/元辰 表
  function collectAllShenSha(bazi, currentYun, nnTable) {
    // 建立“表名 -> 表”索引, 补入运行时选定的 NN 表
    var tables = {};
    for (var k in PanData) {
      tables[k] = PanData[k];
    }
    tables['shenShaYearZhiZhiNN'] = nnTable;

    var list = {
      year:  collectBasicPillar(ShenShaRules.year, bazi, tables),
      month: collectBasicPillar(ShenShaRules.month, bazi, tables),
      day:   collectBasicPillar(ShenShaRules.day, bazi, tables),
      time:  collectBasicPillar(ShenShaRules.time, bazi, tables),
      daYun: [], liuNian: [], liuYue: [], liuRi: [], liuShi: []
    };
    if (currentYun) {
      if (currentYun.daYunGanZhi) {
        list.daYun = collectMovingPillar(ShenShaRules.daYun, bazi, movingOf(currentYun, 'daYun'), tables);
      }
      list.liuNian = collectMovingPillar(ShenShaRules.liuNian, bazi, movingOf(currentYun, 'liuNian'), tables);
      list.liuYue  = collectMovingPillar(ShenShaRules.liuYue, bazi, movingOf(currentYun, 'liuYue'), tables);
      list.liuRi   = collectMovingPillar(ShenShaRules.liuRi, bazi, movingOf(currentYun, 'liuRi'), tables);
      list.liuShi  = collectMovingPillar(ShenShaRules.liuShi, bazi, movingOf(currentYun, 'liuShi'), tables);
    }
    return list;
  }

  // ===== 排盘主流程 =====
  var computeEightChar = function(lunar,solar,gender){
    var bazi = lunar.getEightChar();
    // 选择流派
    bazi.setSect(selectSect);	
    var currentYear,startYunSolar,daYun,daYunSize,currentYun;
    if(-1!=gender){
      var date = new Date();
      currentYear = date.getFullYear();
      var yun = bazi.getYun(gender);
      startYunSolar = yun.getStartSolar();
      daYun = yun.getDaYun();
      daYunSize = daYun.length;
      var currentLunar = Lunar.fromDate(date);
      
      var yZhi = currentLunar.getYearZhiByLiChun();
      var yHideGan = LunarUtil.ZHI_HIDE_GAN[yZhi];
      var yShiShenZhi = [];
      for(var u=0,v=yHideGan.length;u<v;u++){
        yShiShenZhi.push(yHideGan[u]+'-'+LunarUtil.SHI_SHEN_ZHI[bazi.getDayGan()+yZhi+yHideGan[u]]);
      }
      
      var mZhi = currentLunar.getMonthZhi();
      var mHideGan = LunarUtil.ZHI_HIDE_GAN[mZhi];
      var mShiShenZhi = [];
      for(var u=0,v=mHideGan.length;u<v;u++){
        mShiShenZhi.push(mHideGan[u]+'-'+LunarUtil.SHI_SHEN_ZHI[bazi.getDayGan()+mZhi+mHideGan[u]]);
      }
      
      var rZhi = currentLunar.getDayZhi();
      var rHideGan = LunarUtil.ZHI_HIDE_GAN[rZhi];
      var rShiShenZhi = [];
      for(var u=0,v=rHideGan.length;u<v;u++){
        rShiShenZhi.push(rHideGan[u]+'-'+LunarUtil.SHI_SHEN_ZHI[bazi.getDayGan()+rZhi+rHideGan[u]]);
      }
      
      var sZhi = currentLunar.getTimeZhi();
      var sHideGan = LunarUtil.ZHI_HIDE_GAN[sZhi];
      var sShiShenZhi = [];
      for(var u=0,v=sHideGan.length;u<v;u++){
        sShiShenZhi.push(sHideGan[u]+'-'+LunarUtil.SHI_SHEN_ZHI[bazi.getDayGan()+sZhi+sHideGan[u]]);
      }	
	  
      currentYun = {
        daYunWuXing: '',
        liuNianWuXing: LunarUtil.WU_XING_GAN[currentLunar.getYearGanByLiChun()] + LunarUtil.WU_XING_ZHI[currentLunar.getYearZhiByLiChun()],
        liuYueWuXing: LunarUtil.WU_XING_GAN[currentLunar.getMonthGan()] + LunarUtil.WU_XING_ZHI[currentLunar.getMonthZhi()],
        liuRiWuXing: LunarUtil.WU_XING_GAN[currentLunar.getDayGan()] + LunarUtil.WU_XING_ZHI[currentLunar.getDayZhi()],
        liuShiWuXing: LunarUtil.WU_XING_GAN[currentLunar.getTimeGan()] + LunarUtil.WU_XING_ZHI[currentLunar.getTimeZhi()],
		
        daYunDiShi: '',
        liuNianDiShi: getChangSheng(bazi.getDayGan(), bazi.getDayGanIndex(), currentLunar.getYearZhiIndexByLiChun()),
        liuYueDiShi: getChangSheng(bazi.getDayGan(), bazi.getDayGanIndex(), currentLunar.getMonthZhiIndex()),
        liuRiDiShi: getChangSheng(bazi.getDayGan(), bazi.getDayGanIndex(), currentLunar.getDayZhiIndex()),
        liuShiDiShi: getChangSheng(bazi.getDayGan(), bazi.getDayGanIndex(), currentLunar.getTimeZhiIndex()),
		
        daYunChangSheng: '',
        liuNianChangSheng: getChangSheng(currentLunar.getYearGanByLiChun(), currentLunar.getYearGanIndexByLiChun(), currentLunar.getYearZhiIndexByLiChun()),
        liuYueChangSheng: getChangSheng(currentLunar.getMonthGan(), currentLunar.getMonthGanIndex(), currentLunar.getMonthZhiIndex()),
        liuRiChangSheng: getChangSheng(currentLunar.getDayGan(), currentLunar.getDayGanIndex(), currentLunar.getDayZhiIndex()),
        liuShiChangSheng: getChangSheng(currentLunar.getTimeGan(), currentLunar.getTimeGanIndex(), currentLunar.getTimeZhiIndex()),
		
        daYunXunKong: '',
        liuNianXunKong: LunarUtil.getXunKong(currentLunar.getYearInGanZhiByLiChun()),
        liuYueXunKong: LunarUtil.getXunKong(currentLunar.getMonthInGanZhi()),
        liuRiXunKong: LunarUtil.getXunKong(currentLunar.getDayInGanZhi()),		
        liuShiXunKong: LunarUtil.getXunKong(currentLunar.getTimeInGanZhi()),
		
        daYunNaYin: '',
        liuNianNaYin: LunarUtil.NAYIN[currentLunar.getYearInGanZhiByLiChun()],
        liuYueNaYin: LunarUtil.NAYIN[currentLunar.getMonthInGanZhi()],
        liuRiNaYin: LunarUtil.NAYIN[currentLunar.getDayInGanZhi()],
        liuShiNaYin: LunarUtil.NAYIN[currentLunar.getTimeInGanZhi()],
        
        daYunShiShen:'',
        daYunShiShenZhi:[],		
        liuNianGanZhi:currentLunar.getYearInGanZhiByLiChun(),
        liuNianShiShen:LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + currentLunar.getYearGanByLiChun()],
        liuNianShiShenZhi:yShiShenZhi,		
        liuYueGanZhi:currentLunar.getMonthInGanZhi(),
        liuYueShiShen:LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + currentLunar.getMonthGan()],
        liuYueShiShenZhi:mShiShenZhi,		
        liuRiGanZhi:currentLunar.getDayInGanZhi(),
        liuRiShiShen:LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + currentLunar.getDayGan()],
        liuRiShiShenZhi:rShiShenZhi,
        liuShiGanZhi:currentLunar.getTimeInGanZhi(),
        liuShiShiShen:LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + currentLunar.getTimeGan()],
        liuShiShiShenZhi:sShiShenZhi		
      };
      currentYun.liuNianGan = currentYun.liuNianGanZhi.substr(0,1);
      currentYun.liuNianZhi = currentYun.liuNianGanZhi.substr(1);      
      currentYun.liuYueGan = currentYun.liuYueGanZhi.substr(0,1);
      currentYun.liuYueZhi = currentYun.liuYueGanZhi.substr(1);	  
      currentYun.liuRiGan = currentYun.liuRiGanZhi.substr(0,1);
      currentYun.liuRiZhi = currentYun.liuRiGanZhi.substr(1);	  
      currentYun.liuShiGan = currentYun.liuShiGanZhi.substr(0,1);
      currentYun.liuShiZhi = currentYun.liuShiGanZhi.substr(1);	  
	  
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        if(d.getStartYear()<=currentYear&&currentYear<=d.getEndYear()){
          var gz = d.getGanZhi();
          if(gz){
            var g = gz.substr(0,1);
            var z = gz.substr(1);
            var zIndex = getZhiIndex(z);
            currentYun.daYunWuXing = LunarUtil.WU_XING_GAN[g] + LunarUtil.WU_XING_ZHI[z];
            currentYun.daYunDiShi = getChangSheng(bazi.getDayGan(), bazi.getDayGanIndex(), zIndex);
            currentYun.daYunChangSheng = getChangSheng(g, getGanIndex(g), zIndex);
            currentYun.daYunXunKong = LunarUtil.getXunKong(gz);
            currentYun.daYunNaYin = LunarUtil.NAYIN[gz];
            
            currentYun.daYunGan = g;
            currentYun.daYunZhi = z;
            currentYun.daYunGanZhi = gz;
            currentYun.daYunShiShen = LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + g];
            var dHideGan = LunarUtil.ZHI_HIDE_GAN[z];
            var dShiShenZhi = [];
            for(var x=0,y=dHideGan.length;x<y;x++){
              dShiShenZhi.push(dHideGan[x]+'-'+LunarUtil.SHI_SHEN_ZHI[bazi.getDayGan()+z+dHideGan[x]]);
            }
            currentYun.daYunShiShenZhi = dShiShenZhi;
          }
          break;
        }
      }
    }
    var s = '<table><tbody>';
    s += '<tr>';
    s += '<td>出生：</td>';
    s += '<td colspan="10" class="left small">' + solar.getYear() + '年' + solar.getMonth() + '月' + solar.getDay() + '日(' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() + ')' + padding(solar.getHour()) + ':' + padding(solar.getMinute()) +' 星期'+solar.getWeekInChinese() + '生肖' + lunar.getYearShengXiao() + solar.getXingZuo()+'座</td>';
    s += '</tr>';
    
    s += '<tr>';
    s += '<td>节气：</td>';
    var prevJieQi = lunar.getPrevJie();
    var jieQiSolar = prevJieQi.getSolar();
    s += '<td colspan="10" class="left small">' + prevJieQi.getName() + '：' + jieQiSolar.getMonth() + '月' + jieQiSolar.getDay() + '日' + padding(jieQiSolar.getHour()) + ':' + padding(jieQiSolar.getMinute()) + '；';
    var nextJieQi = lunar.getNextJie();
    jieQiSolar = nextJieQi.getSolar();
    s += nextJieQi.getName() + '：' + jieQiSolar.getMonth() + '月' + jieQiSolar.getDay() + '日' + padding(jieQiSolar.getHour()) + ':' + padding(jieQiSolar.getMinute());
    s += '</td>';
    s += '</tr>';
    
    var riGan = '日干';
    var baziTitle = '八字';
    var daYunTitle = '大运';
    var liuNianTitle = '流年';
    var liuYueTitle = '流月';
    var liuRiTitle = '流日';
    var liuShiTitle = '流时';	
    if(1==gender){
      baziTitle = '乾造';
      riGan = '元男';
    }else if(0==gender){
      baziTitle = '坤造';
      riGan = '元女';
    }else{
      daYunTitle = '';
      liuNianTitle = '';
      liuYueTitle = '';
      liuRiTitle = '';	  
    }
    s += '<tr>';
    s += '<td rowspan="4" valign="top">' + baziTitle + '：</td>';
    s += '<td>年柱</td>';
    s += '<td>月柱</td>';
    s += '<td>日柱</td>';
    s += '<td>时柱</td>';

    s += '<td>'+daYunTitle+'</td>';
    s += '<td>'+liuNianTitle+'</td>';
    s += '<td>'+liuYueTitle+'</td>';
    s += '<td>'+liuRiTitle+'</td>';
    s += '<td>'+liuShiTitle+'</td>';	
    s += '<td colspan="2"></td>';
    s += '</tr>';
    s += '<tr>';
    s += '<td class="small">' + bazi.getYearShiShenGan() + '</td>';
    s += '<td class="small">' + bazi.getMonthShiShenGan() + '</td>';
    s += '<td class="small red">' + riGan + '</td>';
    s += '<td class="small">' + bazi.getTimeShiShenGan() + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunShiShen+'</td>';
      s += '<td class="small">'+currentYun.liuNianShiShen+'</td>';
      s += '<td class="small">'+currentYun.liuYueShiShen+'</td>';
      s += '<td class="small">'+currentYun.liuRiShiShen+'</td>';
      s += '<td class="small">'+currentYun.liuShiShiShen+'</td>';
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';
    s += '<tr>';
    s += '<td class="bazi">' + bazi.getYearGan()+'<br>'+bazi.getYearZhi() + '</td>';
    s += '<td class="bazi">' + bazi.getMonthGan()+'<br>'+bazi.getMonthZhi() + '</td>';
    s += '<td class="bazi">' + bazi.getDayGan()+'<br>'+bazi.getDayZhi() + '</td>';
    s += '<td class="bazi">' + bazi.getTimeGan()+'<br>'+bazi.getTimeZhi() + '</td>';
    if(currentYun){

      s += '<td class="bazi">'+(currentYun.daYunGanZhi?(currentYun.daYunGanZhi.substr(0,1)+'<br>'+currentYun.daYunGanZhi.substr(1)):'')+'</td>';
      s += '<td class="bazi">'+currentYun.liuNianGanZhi.substr(0,1)+'<br>'+currentYun.liuNianGanZhi.substr(1)+'</td>';
      s += '<td class="bazi">'+currentYun.liuYueGanZhi.substr(0,1)+'<br>'+currentYun.liuYueGanZhi.substr(1)+'</td>';
      s += '<td class="bazi">'+currentYun.liuRiGanZhi.substr(0,1)+'<br>'+currentYun.liuRiGanZhi.substr(1)+'</td>';
      s += '<td class="bazi">'+currentYun.liuShiGanZhi.substr(0,1)+'<br>'+currentYun.liuShiGanZhi.substr(1)+'</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';
    s += '<tr>';
    var hideGan = bazi.getYearHideGan();
    var shiShenZhi = bazi.getYearShiShenZhi();
    s += '<td valign="top" class="small">';
    for(var i=0,j=hideGan.length;i<j;i++){
      s += '<div' + (i==0?' class="red"':'') + '>'
      s += hideGan[i] + '-' + shiShenZhi[i];
      s += '</div>';
    }
    s += '</td>';
    hideGan = bazi.getMonthHideGan();
    shiShenZhi = bazi.getMonthShiShenZhi();
    s += '<td valign="top" class="small">';
    for(var i=0,j=hideGan.length;i<j;i++){
      s += '<div' + (i==0?' class="red"':'') + '>'
      s += hideGan[i] + '-' + shiShenZhi[i];
      s += '</div>';
    }
    s += '</td>';
    hideGan = bazi.getDayHideGan();
    shiShenZhi = bazi.getDayShiShenZhi();
    s += '<td valign="top" class="small">';
    for(var i=0,j=hideGan.length;i<j;i++){
      s += '<div' + (i==0?' class="red"':'') + '>'
      s += hideGan[i] + '-' + shiShenZhi[i];
      s += '</div>';
    }
    s += '</td>';
    hideGan = bazi.getTimeHideGan();
    shiShenZhi = bazi.getTimeShiShenZhi();
    s += '<td valign="top" class="small">';
    for(var i=0,j=hideGan.length;i<j;i++){
      s += '<div' + (i==0?' class="red"':'') + '>'
      s += hideGan[i] + '-' + shiShenZhi[i];
      s += '</div>';
    }
    s += '</td>';
    if(currentYun){

      s += '<td class="small" valign="top">';
      for(var i=0,j=currentYun.daYunShiShenZhi.length;i<j;i++){
        s += '<div' + (i==0?' class="red"':'') + '>'
        s += currentYun.daYunShiShenZhi[i];
        s += '</div>';
      }
      s += '</td>';
      s += '<td class="small" valign="top">';
      for(var i=0,j=currentYun.liuNianShiShenZhi.length;i<j;i++){
        s += '<div' + (i==0?' class="red"':'') + '>'
        s += currentYun.liuNianShiShenZhi[i];
        s += '</div>';
      }
      s += '</td>';
      s += '<td class="small" valign="top">';
      for(var i=0,j=currentYun.liuYueShiShenZhi.length;i<j;i++){
        s += '<div' + (i==0?' class="red"':'') + '>'
        s += currentYun.liuYueShiShenZhi[i];
        s += '</div>';
      }
      s += '</td>';
      s += '<td class="small" valign="top">';
      for(var i=0,j=currentYun.liuRiShiShenZhi.length;i<j;i++){
        s += '<div' + (i==0?' class="red"':'') + '>'
        s += currentYun.liuRiShiShenZhi[i];
        s += '</div>';
      }
      s += '</td>';
      s += '<td class="small" valign="top">';
      for(var i=0,j=currentYun.liuShiShiShenZhi.length;i<j;i++){
        s += '<div' + (i==0?' class="red"':'') + '>'
        s += currentYun.liuShiShiShenZhi[i];
        s += '</div>';
      }
      s += '</td>';
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';
     
    s += '<tr>';
    s += '<td>纳音：</td>';
    s += '<td class="small">' + bazi.getYearNaYin() + '</td>';
    s += '<td class="small">' + bazi.getMonthNaYin() + '</td>';
    s += '<td class="small">' + bazi.getDayNaYin() + '</td>';
    s += '<td class="small">' + bazi.getTimeNaYin() + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunNaYin+'</td>';
      s += '<td class="small">'+currentYun.liuNianNaYin+'</td>';
      s += '<td class="small">'+currentYun.liuYueNaYin+'</td>';
      s += '<td class="small">'+currentYun.liuRiNaYin+'</td>';
      s += '<td class="small">'+currentYun.liuShiNaYin+'</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';

    s += '<tr>';
    s += '<td>空亡：</td>';
    s += '<td class="small">' + bazi.getYearXunKong() + '</td>';
    s += '<td class="small">' + bazi.getMonthXunKong() + '</td>';
    s += '<td class= "red small">' + bazi.getDayXunKong() + '</td>';
    s += '<td class="small">' + bazi.getTimeXunKong() + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunXunKong+'</td>';
      s += '<td class="small">'+currentYun.liuNianXunKong+'</td>';
      s += '<td class="small">'+currentYun.liuYueXunKong+'</td>';
      s += '<td class="small">'+currentYun.liuRiXunKong+'</td>';
      s += '<td class="small">'+currentYun.liuShiXunKong+'</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';

    s += '<tr>';
    s += '<td>日干：</td>';
    s += '<td class="small">' + bazi.getYearDiShi() + '</td>';
    s += '<td class="small">' + bazi.getMonthDiShi() + '</td>';
    s += '<td class="small">' + bazi.getDayDiShi() + '</td>';
    s += '<td class="small">' + bazi.getTimeDiShi() + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunDiShi+'</td>';
      s += '<td class="small">'+currentYun.liuNianDiShi+'</td>';
      s += '<td class="small">'+currentYun.liuYueDiShi+'</td>';
      s += '<td class="small">'+currentYun.liuRiDiShi+'</td>';
      s += '<td class="small">'+currentYun.liuShiDiShi+'</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';
    
    s += '<tr>';
    s += '<td>坐宫：</td>';
    s += '<td class="small">' + getChangSheng(bazi.getYearGan(), lunar.getYearGanIndexExact(), lunar.getYearZhiIndexExact()) + '</td>';
    s += '<td class="small">' + getChangSheng(bazi.getMonthGan(), lunar.getMonthGanIndexExact(), lunar.getMonthZhiIndexExact()) + '</td>';
    s += '<td class="small">' + getChangSheng(bazi.getDayGan(), 2 == bazi.getSect() ? lunar.getDayGanIndexExact2() : lunar.getDayGanIndexExact(), 2 == bazi.getSect() ? lunar.getDayZhiIndexExact2() : lunar.getDayZhiIndexExact()) + '</td>';
    s += '<td class="small">' + getChangSheng(bazi.getTimeGan(), lunar.getTimeGanIndex(), lunar.getTimeZhiIndex()) + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunChangSheng+'</td>';
      s += '<td class="small">'+currentYun.liuNianChangSheng+'</td>';
      s += '<td class="small">'+currentYun.liuYueChangSheng+'</td>';
      s += '<td class="small">'+currentYun.liuRiChangSheng+'</td>';
      s += '<td class="small">'+currentYun.liuShiChangSheng+'</td>';		  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';
 	
    var YinYang = {
      '甲':'阳',
      '丙':'阳',
      '戊':'阳',
      '庚':'阳',
      '壬':'阳',
      
      '子':'阳',
      '寅':'阳',
      '辰':'阳',
      '午':'阳',
      '申':'阳',
      '戌':'阳',
      
      '乙':'阴',
      '丁':'阴',
      '己':'阴',
      '辛':'阴',
      '癸':'阴',
      
      '丑':'阴',
      '卯':'阴',
      '巳':'阴',
      '未':'阴',
      '酉':'阴',
      '亥':'阴'
    };
    
    s += '<tr>';
    s += '<td>阴阳：</td>';
    s += '<td class="small">' + YinYang[bazi.getYearGan()] + YinYang[bazi.getYearZhi()] + '</td>';
    s += '<td class="small">' + YinYang[bazi.getMonthGan()] + YinYang[bazi.getMonthZhi()] + '</td>';
    s += '<td class="small">' + YinYang[bazi.getDayGan()] + YinYang[bazi.getDayZhi()] + '</td>';
    s += '<td class="small">' + YinYang[bazi.getTimeGan()] + YinYang[bazi.getTimeZhi()] + '</td>';
    if(currentYun){

      s += '<td class="small">' + (currentYun.daYunGan ? YinYang[currentYun.daYunGan]:'') + (currentYun.daYunZhi ? YinYang[currentYun.daYunZhi]:'') + '</td>';
      s += '<td class="small">' + (currentYun.liuNianGan ? YinYang[currentYun.liuNianGan]:'') + (currentYun.liuNianZhi ? YinYang[currentYun.liuNianZhi]:'') + '</td>';
      s += '<td class="small">' + (currentYun.liuYueGan ? YinYang[currentYun.liuYueGan]:'') + (currentYun.liuYueZhi ? YinYang[currentYun.liuYueZhi]:'') + '</td>';
      s += '<td class="small">' + (currentYun.liuRiGan ? YinYang[currentYun.liuRiGan]:'') + (currentYun.liuRiZhi ? YinYang[currentYun.liuRiZhi]:'') + '</td>';
      s += '<td class="small">' + (currentYun.liuShiGan ? YinYang[currentYun.liuShiGan]:'') + (currentYun.liuShiZhi ? YinYang[currentYun.liuShiZhi]:'') + '</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';

    s += '<tr>';
    s += '<td>五行：</td>';
    s += '<td class="small">' + bazi.getYearWuXing() + '</td>';
    s += '<td class="small">' + bazi.getMonthWuXing() + '</td>';
    s += '<td class="small">' + bazi.getDayWuXing() + '</td>';
    s += '<td class="small">' + bazi.getTimeWuXing() + '</td>';
    if(currentYun){

      s += '<td class="small">'+currentYun.daYunWuXing+'</td>';
      s += '<td class="small">'+currentYun.liuNianWuXing+'</td>';
      s += '<td class="small">'+currentYun.liuYueWuXing+'</td>';
      s += '<td class="small">'+currentYun.liuRiWuXing+'</td>';
      s += '<td class="small">'+currentYun.liuShiWuXing+'</td>';	  
      s += '<td colspan="2"></td>';
    }else{
      s += '<td colspan="6"></td>';
    }
    s += '</tr>';

    // 神煞行(先开 <tr>, 计算完毕后由下方“空亡与后续命盘行”填充单元格)
    s += '<tr>';

    // ---------- 神煞计算(引擎化) ----------
    // 依出生年干阴阳与性别选定“勾煞/绞煞/元辰”所查之表(阳男阴女 vs 阴男阳女)
    var yang = (0 == lunar.getYearGanIndexExact() % 2);
    var man = (1 == gender);
    var nnTable = ((yang && man) || (!yang && !man))
      ? PanData.shenShaYearZhiZhiYangNanYinNv
      : PanData.shenShaYearZhiZhiYinNanYangNv;
    var shen = collectAllShenSha(bazi, currentYun, nnTable);
    var shenShaYear = shen.year;
    var shenShaMonth = shen.month;
    var shenShaDay = shen.day;
    var shenShaTime = shen.time;
    var shenShadaYun = shen.daYun;
    var shenShaliuNian = shen.liuNian;
    var shenShaliuYue = shen.liuYue;
    var shenShaliuRi = shen.liuRi;
    var shenShaliuShi = shen.liuShi;

    // ===== 空亡与后续命盘行 =====
    //日柱空亡
    var rzkw=bazi.getDayXunKong();
        //年支
		var yearZhi=bazi.getYearZhi();
		//月支
		var monthZhi=bazi.getMonthZhi();
		//日支
		var dayZhi=bazi.getDayZhi();
		//时支
		var timeZhi=bazi.getTimeZhi();
        //大运支
		var daYunZhi;
		if(currentYun.daYunGanZhi){
			daYunZhi=currentYun.daYunGanZhi.substr(1);
		}
		//流年支
		var liuNianZhi;
		if(currentYun.liuNianGanZhi){
			liuNianZhi=currentYun.liuNianGanZhi.substr(1);
		}
		//流月支
		var liuYueZhi;
		if(currentYun.liuYueGanZhi){
			liuYueZhi=currentYun.liuYueGanZhi.substr(1);
		}
		//流日支
		var liuRiZhi;
		if(currentYun.liuRiGanZhi){
			liuRiZhi=currentYun.liuRiGanZhi.substr(1);
		}
		//流时支
		var liuShiZhi;
		if(currentYun.liuShiGanZhi){
			liuShiZhi=currentYun.liuShiGanZhi.substr(1);
		}
		
		if(rzkw.indexOf(yearZhi) != -1){
				shenShaYear.push("空亡");
		}
		if(rzkw.indexOf(monthZhi) != -1){
				shenShaMonth.push("空亡");
		}
		if(rzkw.indexOf(dayZhi) != -1){
				shenShaDay.push("空亡");
		}
		if(rzkw.indexOf(timeZhi) != -1){
				shenShaTime.push("空亡");
		}
 		if(rzkw.indexOf(daYunZhi) != -1){
				shenShadaYun.push("空亡");
		}
		if(rzkw.indexOf(liuNianZhi) != -1){
				shenShaliuNian.push("空亡");
		}
		if(rzkw.indexOf(liuYueZhi) != -1){
				shenShaliuYue.push("空亡");
		}    
		if(rzkw.indexOf(liuRiZhi) != -1){
				shenShaliuRi.push("空亡");
		}
		if(rzkw.indexOf(liuShiZhi) != -1){
				shenShaliuShi.push("空亡");
		}
	
    s += '<td>神煞：</td>';
    s += '<td class="small">'+ (shenShaYear.length<1 ? '无' : shenShaYear.join('<br>')) + '</td>';
    s += '<td class="small">'+ (shenShaMonth.length<1 ? '无' : shenShaMonth.join('<br>')) +'</td>';
    s += '<td class="small">'+ (shenShaDay.length<1 ? '无' : shenShaDay.join('<br>')) +'</td>';	
    s += '<td class="small">'+ (shenShaTime.length<1 ? '无' : shenShaTime.join('<br>')) +'</td>';		
    s += '<td class="small">'+ (shenShadaYun.length<1 ? '无' : shenShadaYun.join('<br>')) +'</td>';	
    s += '<td class="small">'+ (shenShaliuNian.length<1 ? '无' : shenShaliuNian.join('<br>')) +'</td>';	
    s += '<td class="small">'+ (shenShaliuYue.length<1 ? '无' : shenShaliuYue.join('<br>')) +'</td>';	
    s += '<td class="small">'+ (shenShaliuRi.length<1 ? '无' : shenShaliuRi.join('<br>')) +'</td>';	
    s += '<td class="small">'+ (shenShaliuShi.length<1 ? '无' : shenShaliuShi.join('<br>')) +'</td>';
    s += '</tr>';
   
    s += '<tr>';
    s += '<td>旺衰：</td>';
    var wxguanxi = {
	'寅卯':'木旺 火相 水休 金囚 土死',
	'巳午':'火旺 土相 木休 水囚 金死',
	'申酉':'金旺 水相 土休 火囚 木死',
	'亥子':'水旺 木相 金休 土囚 火死',
	'辰戌丑未':'土旺 金相 火休 木囚 水死'
    };
    var monthZhi = bazi.getMonthZhi();
    var wx = '';
    for(var i in wxguanxi){
        if(i.indexOf(monthZhi )>-1){
            wx = wxguanxi[i];
            break;
        }
    }
    s += '<td colspan="20" class="left small">' + bazi.getDayGan() + LunarUtil.WU_XING_GAN[bazi.getDayGan()] + '生于' + bazi.getMonthZhi() + '月 ' + wx +'</td>';
    s += '</tr>';
		
    s += '<tr>';
    s += '<td>天干：</td>';
    var tgguanxi = {
	'甲己':'甲己合土',
	'乙庚':'乙庚合金',
	'丙辛':'丙辛合水',
	'丁壬':'丁壬合木',
	'戊癸':'戊癸合火',
	'甲庚':'甲庚相冲',
	'乙辛':'乙辛相冲',
	'丙壬':'丙壬相冲',
	'丁癸':'丁癸相冲' 
    };
    var gans = [];
    gans.push(bazi.getYearGan());
    gans.push(bazi.getMonthGan());
    gans.push(bazi.getDayGan());
    gans.push(bazi.getTimeGan());
    if(currentYun){
      if(currentYun.daYunGanZhi){
        gans.push(currentYun.daYunGanZhi.substr(0,1));
      }
      if(currentYun.liuNianGanZhi){
        gans.push(currentYun.liuNianGanZhi.substr(0,1));
      }
      if(currentYun.liuYueGanZhi){
        gans.push(currentYun.liuYueGanZhi.substr(0,1));
      }
      if(currentYun.liuRiGanZhi){
        gans.push(currentYun.liuRiGanZhi.substr(0,1));		
      }
      if(currentYun.liuShiGanZhi){
        gans.push(currentYun.liuShiGanZhi.substr(0,1));		
      }	  
    }
        
    var matched=[];
    var gxs = {};    
        var size=gans.length;
        for(var i=0;i<size;i++){
          for(var j=0;j<size;j++){
            if(i===j){
              continue;
    }
    var v=tgguanxi[gans[i]+gans[j]];
    if(v){
      gxs[v] = true;
        }
      }
    }
    for(var i in gxs){
     matched.push(i);
    }
    s += '<td colspan="20" class="left small">'+(matched.length<1 ? '天干无冲合' : matched.join(' '))+'</td>';;
    s += '</tr>'; 
    
    s += '<tr>';
    s += '<td>地支：</td>';
    var dzguanxi = {
	'亥子丑':'亥子丑三会水',
	'寅卯辰':'寅卯辰三会木',
	'巳午未':'巳午未三会火',
	'申酉戌':'申酉戌三会金',
	'申子辰':'申子辰三合水',
	'寅午戌':'寅午戌三合火',
	'亥卯未':'亥卯未三合木',
	'巳酉丑':'巳酉丑三合金', 
	'申子':'申子半合水',
	'子辰':'子辰半合水',	
	'午戌':'午戌半合火',	
	'亥卯':'亥卯半合木',
	'卯未':'卯未半合木',	
	'酉丑':'酉丑半合金',
	'寅午':'寅午半合火(暗合土)',
	'巳酉':'巳酉半合金(暗合水)',	
	'子巳':'子巳暗合火',
	'卯申':'卯申暗合金',
	'亥午':'亥午暗合木', 	
	'巳申':'巳申六合水(相破)',
	'辰酉':'辰酉六合金',
	'卯戌':'卯戌六合火',
	'寅亥':'寅亥六合木(相破)',
	'子丑':'子丑六合土',
	'午未':'午未六合火或土',
	'子卯':'子卯无礼相刑',
	'丑未戌':'丑未戌恃势刑',
	'寅巳申':'寅巳申无恩刑',
	
	'辰辰':'辰辰自刑',
	'午午':'午午自刑',
	'酉酉':'酉酉自刑',
	'亥亥':'亥亥自刑',
	
	'辰辰辰':'辰辰自刑',
	'午午午':'午午自刑',
	'酉酉酉':'酉酉自刑',	
	'亥亥亥':'亥亥自刑',
	
	'辰辰辰辰':'辰辰自刑',
	'午午午午':'午午自刑',
	'酉酉酉酉':'酉酉自刑',	
	'亥亥亥亥':'亥亥自刑',
	
	'辰辰辰辰辰':'辰辰自刑',
	'午午午午午':'午午自刑',
	'酉酉酉酉酉':'酉酉自刑',	
	'亥亥亥亥亥':'亥亥自刑',
	
	'辰辰辰辰辰辰':'辰辰自刑',
	'午午午午午午':'午午自刑',
	'酉酉酉酉酉酉':'酉酉自刑',	
	'亥亥亥亥亥亥':'亥亥自刑',	
	
	'子午':'子午相冲',
	'卯酉':'卯酉相冲',
	'寅申':'寅申相冲',
	'巳亥':'巳亥相冲',
	'辰戌':'辰戌相冲',
	'丑未':'丑未相冲',
	'子未':'子未相害',
	'丑午':'丑午相害',
	'寅巳':'寅巳相害',
	'卯辰':'卯辰相害',
	'申亥':'申亥相害',
	'酉戌':'酉戌相害',
	'子酉':'子酉相破',
	'卯午':'卯午相破',
	'辰丑':'辰丑相破',
	'未戌':'未戌相破'
    };
    var zhis = {};
    zhis[bazi.getYearZhi()] = zhis[bazi.getYearZhi()] ? zhis[bazi.getYearZhi()]+1 : 1;
    zhis[bazi.getMonthZhi()] = zhis[bazi.getMonthZhi()] ? zhis[bazi.getMonthZhi()]+1 : 1;
    zhis[bazi.getDayZhi()] = zhis[bazi.getDayZhi()] ? zhis[bazi.getDayZhi()]+1 : 1;
    zhis[bazi.getTimeZhi()] = zhis[bazi.getTimeZhi()] ? zhis[bazi.getTimeZhi()]+1 : 1;
    if(currentYun){
      if(currentYun.daYunZhi){
        zhis[currentYun.daYunZhi] = zhis[currentYun.daYunZhi] ? zhis[currentYun.daYunZhi]+1 : 1;
      }
      if(currentYun.liuNianZhi){
        zhis[currentYun.liuNianZhi] = zhis[currentYun.liuNianZhi] ? zhis[currentYun.liuNianZhi]+1 : 1;
      }
      if(currentYun.liuYueZhi){
        zhis[currentYun.liuYueZhi] = zhis[currentYun.liuYueZhi] ? zhis[currentYun.liuYueZhi]+1 : 1;
      }
      if(currentYun.liuRiZhi){
        zhis[currentYun.liuRiZhi] = zhis[currentYun.liuRiZhi] ? zhis[currentYun.liuRiZhi]+1 : 1;
      }
      if(currentYun.liuShiZhi){
        zhis[currentYun.liuShiZhi] = zhis[currentYun.liuShiZhi] ? zhis[currentYun.liuShiZhi]+1 : 1;
      }	  
    }

    var matched=[];
    var gxs = {};
    for(var i in zhis){
      for(var j in zhis){
        for(var k in zhis){
          if(i==j||j==k||i==k){
            continue;
          }
          var v=dzguanxi[i+j];
          if(v){
            gxs[v] = true;
          }
          v=dzguanxi[i+j+k];
          if(v){
            gxs[v] = true;
          }
        }
      }
    }
    for(var i in zhis){
      var n = zhis[i];
      var vs = [];
      for(var j=0;j<n;j++){
        vs.push(i);
      }
      var v=dzguanxi[vs.join('')];
      if(v){
        gxs[v] = true;
      }
    }

    var matchIndex = 0;
    for(var i in gxs){
         matched.push(i);
         matchIndex ++;
         if(matchIndex%4==0){
             matched.push('<br>');
         }
    }
    s += '<td colspan="20" class="left small">'+(matched.join(' '))+'</td>';
    
    s += '<tr>';
    s += '<td>太岁：</td>';
    var tsguanxi = {
	'子子':'值太岁',
	'丑丑':'值太岁',
	'寅寅':'值太岁',
	'卯卯':'值太岁',
	'巳巳':'值太岁',
	'未未':'值太岁',
	'申申':'值太岁',
	'戌戌':'值太岁',	
	'子卯':'刑太岁',
	'丑戌':'刑太岁(丑戌未三刑)',	
	'辰辰':'刑太岁(值)',
	'午午':'刑太岁(值)',
	'酉酉':'刑太岁(值)',
	'亥亥':'刑太岁(值)',
	'子午':'冲太岁',
	'卯酉':'冲太岁',
	'寅申':'冲太岁(寅巳申三刑)',
	'巳亥':'冲太岁',
	'辰戌':'冲太岁',
	'丑未':'冲太岁(丑戌未三刑)',
	'子未':'害太岁',
	'丑午':'害太岁',
	'寅巳':'害太岁(寅巳申三刑)',
	'卯辰':'害太岁',
	'申亥':'害太岁',
	'酉戌':'害太岁',
	'子酉':'破太岁',
	'卯午':'破太岁',
	'辰丑':'破太岁',
	'寅亥':'破太岁',	
	'巳申':'破太岁(寅巳申三刑)',
	'未戌':'破太岁(丑戌未三刑)'	
    };
    var zhis = [];
    zhis.push(bazi.getYearZhi());
    if(currentYun){
      if(currentYun.liuNianGanZhi){
        zhis.push(currentYun.liuNianGanZhi.substr(1));
      }
    }

    var matched=[];
    var gxs = {};
    var size=zhis.length;
        for(var i=0;i<size;i++){
          for(var j=0;j<size;j++){
            if(i===j){
              continue;
    }
    var v=tsguanxi[zhis[i]+zhis[j]];
    if(v){
      gxs[v] = true;
        }
      }
    }
    for(var i in gxs){
     matched.push(i);
    }
    s += '<td colspan="20" class="left small">'+(matched.length<1 ? '未犯太岁' : matched.join(' '))+'</td>';
    s += '</tr>';

    s += '<tr>';
    s += '<td>婚配：</td>';	
    var hunpei = {
	'子':'宜 (子丑合 申子辰合)  <span style="color:red">忌</span> (子午冲 子卯刑 子未害 子酉破)',
	'丑':'宜 (子丑合 巳酉丑合)  <span style="color:red">忌</span> (丑未冲 丑戌未刑 丑午害 辰丑破)',
	'寅':'宜 (寅亥合<破> 寅午戌合)  <span style="color:red">忌</span> (寅申冲 寅巳申刑 寅巳害)',
	'卯':'宜 (卯戌合 亥卯未合)  <span style="color:red">忌</span> (卯酉冲 子卯刑 卯辰害 卯午破)',
	'辰':'宜 (辰酉合 申子辰合)  <span style="color:red">忌</span> (辰戌冲 辰辰刑 卯辰害 辰丑破)',
	'巳':'宜 (巳申合 巳酉丑合)  <span style="color:red">忌</span> (巳亥冲 寅巳申刑 寅巳害 巳申破)',
	'午':'宜 (午未合 寅午戌合)  <span style="color:red">忌</span> (子午冲 午午刑 丑午害 卯午破)',
	'未':'宜 (午未合 亥卯未合)  <span style="color:red">忌</span> (丑未冲 丑戌未刑 子未害 未戌破)',
	'申':'宜 (巳申合<破> 申子辰合)  <span style="color:red">忌</span> (寅申冲 寅巳申刑 申亥害)',
	'酉':'宜 (辰酉合 巳酉丑合)  <span style="color:red">忌</span> (卯酉冲 酉酉刑 酉戌害 子酉破)',
	'戌':'宜 (卯戌合 寅午戌合)  <span style="color:red">忌</span> (辰戌冲 丑戌未刑 酉戌害 未戌破)',
	'亥':'宜 (寅亥合<破> 亥卯未合)  <span style="color:red">忌</span> (巳亥冲 亥亥刑 申亥害)'
    };
    var yearZhi = bazi.getYearZhi();
    var hp = '';
    for(var i in hunpei){
        if(i.indexOf(yearZhi )>-1){
            hp = hunpei[i];
            break;
        }
    }
    s += '<td colspan="20" class="left small">' + hp +'</td>';
    s += '</tr>';
    
    // 2 end>
    
    if(-1!=gender){

      s += '<tr>';
      s += '<td>三垣：</td>';
      s += '<td colspan="20" class="left small">' + '胎元 ' + bazi.getTaiYuan() + '(' + bazi.getTaiYuanNaYin() + ')' + '；命宫 '+ bazi.getMingGong() + '(' + bazi.getMingGongNaYin() + ')' + '；身宫 '+ bazi.getShenGong() + '(' + bazi.getShenGongNaYin() + ')' + '</td>';
      s += '</tr>';

      s += '<tr>';
      s += '<td>起运：</td>';
      s += '<td colspan="20" class="left small">'+startYunSolar.getYear()+'年'+startYunSolar.getMonth()+'月'+startYunSolar.getDay()+'日</td>';
      s += '</tr>';
      
      s += '<tr>';
      s += '<td>周岁：</td>';
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        s += '<td'+(i>=daYunSize-2?' class="hide"':'')+'>' + d.getStartAge() + '</td>';
      }
      s += '</tr>';
      s += '<tr>';
      s += '<td>换运：</td>';
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        s += '<td'+(i>=daYunSize-2?' class="hide"':'')+'>' + d.getStartYear() + '</td>';
      }
      s += '</tr>';
      s += '<tr>';
      s += '<td>十神：</td>';
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        var shiShen = LunarUtil.SHI_SHEN_GAN[bazi.getDayGan() + d.getGanZhi().substr(0,1)];
        s += '<td class="small'+(i>=daYunSize-2?' hide':'')+'">' + (shiShen ? shiShen:'') + '</td>';
      }
      s += '</tr>';
      s += '<tr>';
      s += '<td>大运：</td>';
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        var ganZhi = d.getGanZhi();
        if(!ganZhi){
          s += '<td class="red">童限</td>';
        }else{
          s += '<td class="bold'+(d.getStartYear()<=currentYear&&currentYear<=d.getEndYear()?' red':'')+(i>=daYunSize-2?' hide':'')+'">' + ganZhi + '</td>';
        }
      }
      s += '</tr>';
      s += '<tr>';
      s += '<td valign="top">流年：</td>';
      for(var i=0;i<daYunSize;i++){
        var d = daYun[i];
        var liuNian = d.getLiuNian();
        s += '<td valign="top"'+(i>=daYunSize-2?' class="hide"':'')+'>';
        for(var x=0,y=liuNian.length;x<y;x++){
          var n = liuNian[x];
          s += '<div'+(n.getYear()==currentYear?' class="red"':'')+'>'+n.getGanZhi() + '</div>';
        }
        s += '</td>';
      }
      s += '</tr>';



    }
    
    s += '</tbody></table>';
    result.innerHTML = s;
    decorate();
    try{
      result.scrollIntoView({behavior:'smooth', block:'nearest'});
    }catch(e){}
  };
  
  // ===== 输入解析与分发 =====
  var computeLunar = function(year,month,day,hour,minute,gender){
    var lunar = Lunar.fromYmdHms(year,month,day,hour,minute,0);
    var solar = lunar.getSolar();
    computeEightChar(lunar,solar,gender);
  };
  
  var computeSolar = function(year,month,day,hour,minute,gender){
    var solar = Solar.fromYmdHms(year,month,day,hour,minute,0);
    var lunar = solar.getLunar();
    computeEightChar(lunar,solar,gender);
  };
  
  var compute = function(v){
    result.innerHTML = '';
    v = trim(v);
    var lunar = D.getElementById('lunar').checked;
    if(lunar){
      var year = parseInt(v.substr(0,4));
      v = v.substr(4);
      var leapMonth = false;
      if(v.indexOf(' ') == 0){
        leapMonth = true;
      }
      v = trim(v);
      var month = parseInt(v.substr(0,2),10);
      if(leapMonth){
        if(LunarUtil.getLeapMonth(year)==month){
          month = -month;
        }
      }
      
      v = trim(v.substr(2));
      var day = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var hour = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var minute = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var gender = -1;
      if('+'==v){
        gender = 1;
      }else if('-'==v){
        gender = 0;
      }
      if(year<1||year>9999){
        return;
      }
      if(month>=0&&(month<1||month>12)){
        return;
      }
      if(month<0&&(month<-12||month>-1)){
        return;
      }
      if(day<1||day>30){
        return;
      }
      if(hour<0||hour>23){
        return;
      }
      if(minute<0||minute>59){
        return;
      }
      computeLunar(year,month,day,hour,minute,gender);
    }else{
      var year = parseInt(v.substr(0,4));
      v = trim(v.substr(4));
      var month = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var day = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var hour = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var minute = parseInt(v.substr(0,2),10);
      v = trim(v.substr(2));
      var gender = -1;
      if('+'==v){
        gender = 1;
      }else if('-'==v){
        gender = 0;
      }
      if(year<1||year>9999){
        return;
      }
      if(month<1||month>12){
        return;
      }
      if(day<1||day>31){
        return;
      }
      if(hour<0||hour>23){
        return;
      }
      if(minute<0||minute>59){
        return;
      }
      computeSolar(year,month,day,hour,minute,gender);
    }
  };
  
})(window, document);
