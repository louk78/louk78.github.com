/* =========================================================================
 * 四柱八字智能排盘 - 主逻辑
 * 依赖脚本加载顺序: lunar.js -> data.js(神煞表) -> shensha-rules.js(规则) -> main.js
 *
 * 代码结构:
 *   1. 通用工具 / DOM 引用 .... setElementClass、trimText、padTwoDigits、性别常量
 *   2. 渲染增强 ............... styleChartCells(): 给命盘表格补样式、按五行着色
 *   3. 长生与索引 ............. getChangShengStage、findGanIndex、findZhiIndex
 *   4. 神煞引擎 ............... 规则驱动的星曜匹配(规则数据见 shensha-rules.js)
 *   5. 命理关系常量表 ......... 阴阳/旺衰/天干/地支/太岁/婚配 查表
 *   6. 排盘主流程 ............. renderChart(): 组数据 -> 收神煞 -> 渲染表格
 *   7. 输入解析与分发 ......... renderChartFromInput / FromLunar / FromSolar
 *
 * 命名约定:
 *   常量/常量表  UPPER_SNAKE_CASE      (WU_XING_CLASS、TIAN_GAN_RELATIONS)
 *   函数         动词开头 camelCase    (renderChart、collectPillarShenSha、findGanIndex)
 *   布尔值       is/has 前缀           (isLunarInput、isBaziCell)
 *   集合         xxxList/xxxSet/复数   (daYunList、relationSet、zhiCounts)
 *   干支术语     沿用 lunar-javascript 的写法(Gan/Zhi/NaYin/ShiShen/EightChar), 便于与库对照
 * ========================================================================= */
(function (documentRef) {
  'use strict';

  // ===== 通用小工具 / DOM 引用 / 输入事件 =====
  // 设置元素 class; 元素不支持 className 时退回 setAttribute
  var setElementClass = function(element, className){
    try{
      element.className = className;
    }catch(error){
      element.setAttribute('class', className);
    }
  };
  // 去掉字符串首尾空白
  var trimText = function(text){
    return text.replace(/(^\s*)|(\s*$)/g, '');
  };
  // 两位补零(9 -> 09)
  var padTwoDigits = function(value){
    return (value<10?'0':'') + value;
  };
  // 子时流派固定为 1（明日明时）：晚子时 23:00-23:59 的日柱按次日计算
  var ZI_SHI_SECT = 1;
  // 性别代码: 与 lunar-javascript 的 getYun(gender) 约定一致
  var GENDER_CODE = {MALE:1, FEMALE:0, UNKNOWN:-1};
  // 出生信息末尾的性别后缀
  var GENDER_SIGN = {MALE:'+', FEMALE:'-'};
  var resultPanel = documentRef.getElementById('pan');
  var birthdayInput = documentRef.getElementById('birthday');

  var startButton = documentRef.getElementById('start_btn');

  // ===== 渲染后的视觉增强 =====
  var WU_XING_CLASS = {
    '甲':'wood','乙':'wood','寅':'wood','卯':'wood',
    '丙':'fire','丁':'fire','巳':'fire','午':'fire',
    '戊':'earth','己':'earth','辰':'earth','戌':'earth','丑':'earth','未':'earth',
    '庚':'metal','辛':'metal','申':'metal','酉':'metal',
    '壬':'water','癸':'water','亥':'water','子':'water'
  };
  var PILLAR_HEAD_LABELS = {'年柱':1,'月柱':1,'日柱':1,'时柱':1,'大运':1,'流年':1,'流月':1,'流日':1,'流时':1};
  // 命盘渲染后的视觉增强: 标签列右对齐、柱头加粗、干支按五行着色
  function styleChartCells(){
    var tableList = resultPanel.getElementsByTagName('table');
    for(var tableIndex=0;tableIndex<tableList.length;tableIndex++){
      var cells = tableList[tableIndex].getElementsByTagName('td');
      for(var cellIndex=0;cellIndex<cells.length;cellIndex++){
        var cell = cells[cellIndex];
        var rawText = cell.textContent;
        if(!rawText){ continue; }
        var classNames = (cell.className||'').trim();
        var text = rawText.replace(/\s+/g,'');
        var isBaziCell = classNames.split(' ').indexOf('bazi') > -1;
        if(/[:：]$/.test(text)){
          cell.className = classNames ? (classNames + ' rlabel') : 'rlabel';
        }else if(PILLAR_HEAD_LABELS[text]){
          cell.className = classNames ? (classNames + ' phead') : 'phead';
        }
        if(isBaziCell && /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/.test(rawText)){
          var htmlParts = rawText.split('').map(function(character){
            var colorClass = WU_XING_CLASS[character];
            return colorClass ? '<span class="fg-'+colorClass+'">'+character+'</span>' : character;
          });
          cell.innerHTML = htmlParts.join('');
        }
      }
    }
  }

  // 点击“开始排盘”: 校验出生信息, 通过后交给排盘流程
  function handleStartClick() {
    var genderValue = documentRef.querySelector('input[name="gender"]:checked').value;
    var birthdayWithGender = birthdayInput.value + genderValue;

    if(!/^\s*\d{4}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*[+-]?$/.test(birthdayWithGender)){
      setElementClass(birthdayInput, 'error');
      return;
    }
    setElementClass(birthdayInput, '');
    renderChartFromInput(birthdayWithGender);
  }

  startButton.addEventListener('click', handleStartClick);
  // 十天干的长生起点序号
  var CHANG_SHENG_START_OFFSET = {'甲':1,'丙':10,'戊':10,'庚':7,'壬':4,'乙':6,'丁':9,'己':9,'辛':0,'癸':3};
  // 长生十二神: 某天干在某个地支上的长生阶段(阳干顺行/阴干逆行)
  function getChangShengStage(ganChar, ganIndex, zhiIndex){
    var startOffset = CHANG_SHENG_START_OFFSET[ganChar];
    var stageIndex = startOffset + (ganIndex%2==0?zhiIndex:-zhiIndex);
    if(stageIndex>=12){
      stageIndex -= 12;
    }
    if(stageIndex<0){
      stageIndex += 12;
    }
    return EightChar.CHANG_SHENG[stageIndex];
  }
  // 查天干在 LunarUtil.GAN 中的序号(库内数组首位为空占位, 故减 1)
  function findGanIndex(ganChar){
    for(var index=0,ganCount=LunarUtil.GAN.length;index<ganCount;index++){
      if(ganChar===LunarUtil.GAN[index]){
        return index-1;
      }
    }
    return 0;
  }
  // 查地支在 LunarUtil.ZHI 中的序号(库内数组首位为空占位, 故减 1)
  function findZhiIndex(zhiChar){
    for(var index=0,zhiCount=LunarUtil.ZHI.length;index<zhiCount;index++){
      if(zhiChar===LunarUtil.ZHI[index]){
        return index-1;
      }
    }
    return 0;
  }
  
  // ===== 神煞引擎 ===== (规则数据见 shensha-rules.js)

  /* ===================================================================
   * 神煞引擎
   * 取代原文件中约 1300 行重复的 “for(var i in 表){…if(gz==…)…}” 匹配循环。
   * 规则(见 shensha-rules.js)形如 {table:表名, patterns:[[原子…],…]}, 候选串 = 原子值拼接,
   * 只要命中表中任一组合串, 该星曜即算出现。
   * 原子名 = 柱 + 取值: year/month/day/time + Gan/Zhi/GanZhi/NaYin (年/月/日/时柱),
   *                       moving + Gan/Zhi/NaYin (移动柱: 大运/流年/流月/流日/流时)。
   * =================================================================== */

  // 取“四柱”某原子对应的实际字符
  function readBaziAtom(eightChar, atomName) {
    switch (atomName) {
      case 'yearGan': return eightChar.getYearGan();
      case 'yearZhi': return eightChar.getYearZhi();
      case 'yearGanZhi':  return eightChar.getYear();
      case 'yearNaYin': return eightChar.getYearNaYin();
      case 'monthGan': return eightChar.getMonthGan();
      case 'monthZhi': return eightChar.getMonthZhi();
      case 'monthGanZhi':  return eightChar.getMonth();
      case 'monthNaYin': return eightChar.getMonthNaYin();
      case 'dayGan': return eightChar.getDayGan();
      case 'dayZhi': return eightChar.getDayZhi();
      case 'dayGanZhi':  return eightChar.getDay();
      case 'dayNaYin': return eightChar.getDayNaYin();
      case 'timeGan': return eightChar.getTimeGan();
      case 'timeZhi': return eightChar.getTimeZhi();
      case 'timeGanZhi':  return eightChar.getTime();
      case 'timeNaYin': return eightChar.getTimeNaYin();
      default: return '';
    }
  }

  // 取“移动柱”(大运/流年/流月/流日/流时)某原子的值
  function readMovingAtom(moving, atomName) {
    switch (atomName) {
      case 'movingGan': return moving.gan;
      case 'movingZhi': return moving.zhi;
      case 'movingNaYin': return moving.nayin;
      default: return '';
    }
  }

  // 构造候选串取值函数: 返回 原子->字符串
  function createAtomReader(eightChar, movingPillar) {
    return function (atomName) {
      if (atomName.indexOf('moving') === 0) {           // 以 moving 前缀 => 移动柱
        return movingPillar ? readMovingAtom(movingPillar, atomName) : '';
      }
      return readBaziAtom(eightChar, atomName);
    };
  }

  // 执行单条规则: 返回命中星曜名(按表内顺序且去重)
  // lookupTables: 表名 -> 查找表对象(含运行时按性别选定的“勾煞/绞煞/元辰”变体表)
  function matchShenShaRule(rule, readAtom, lookupTables) {
    var lookupTable = lookupTables[rule.table];
    // 预生成候选串
    var candidateStrings = [];
    for (var partIndex = 0; partIndex < rule.patterns.length; partIndex++) {
      var atomNames = rule.patterns[partIndex];
      var candidate = '';
      for (var atomIndex = 0; atomIndex < atomNames.length; atomIndex++) {
        candidate += readAtom(atomNames[atomIndex]);
      }
      candidateStrings.push(candidate);
    }
    // 任一组合串等于任一候选串 => 命中
    var matchedStars = [];
    for (var starName in lookupTable) {
      var combinations = lookupTable[starName];
      outer:
      for (var candidateIndex = 0; candidateIndex < candidateStrings.length; candidateIndex++) {
        for (var combinationIndex = 0; combinationIndex < combinations.length; combinationIndex++) {
          if (combinations[combinationIndex] === candidateStrings[candidateIndex]) {
            matchedStars.push(starName);
            break outer;
          }
        }
      }
    }
    return matchedStars;
  }

  // 四柱(年/月/日/时)神煞: 柱内所有规则命中星曜合并去重, 按首次出现顺序
  function collectPillarShenSha(ruleList, eightChar, lookupTables) {
    var seenStars = {};
    var matchedNames = [];
    var readAtom = createAtomReader(eightChar, null);
    for (var ruleIndex = 0; ruleIndex < ruleList.length; ruleIndex++) {
      var hitStars = matchShenShaRule(ruleList[ruleIndex], readAtom, lookupTables);
      for (var starIndex = 0; starIndex < hitStars.length; starIndex++) {
        if (!seenStars[hitStars[starIndex]]) {
          seenStars[hitStars[starIndex]] = 1;
          matchedNames.push(hitStars[starIndex]);
        }
      }
    }
    return matchedNames;
  }

  // 移动柱(大运/流年/流月/流日/流时)神煞:
  // 与原逻辑一致 —— 每条规则单独去重并写入数组, 因此跨规则可重复出现同一星曜
  function collectMovingPillarShenSha(ruleList, eightChar, movingPillar, lookupTables) {
    var matchedNames = [];
    var readAtom = createAtomReader(eightChar, movingPillar);
    for (var ruleIndex = 0; ruleIndex < ruleList.length; ruleIndex++) {
      var hitStars = matchShenShaRule(ruleList[ruleIndex], readAtom, lookupTables);
      for (var starIndex = 0; starIndex < hitStars.length; starIndex++) {
        matchedNames.push(hitStars[starIndex]);
      }
    }
    return matchedNames;
  }

  // 由 currentYun 提取移动柱信息 {gan,zhi,nayin}
  function extractMovingPillar(cycle, prefix) {
    var ganZhiText = cycle[prefix + 'GanZhi'];
    return {
      gan: ganZhiText ? ganZhiText.substr(0, 1) : '',
      zhi: ganZhiText ? ganZhiText.substr(1) : '',
      nayin: cycle[prefix + 'NaYin'] || ''
    };
  }

  // 收集全部 9 柱神煞 -> {year,month,day,time,daYun,liuNian,liuYue,liuRi,liuShi}
  // nnTable: 依“阳男阴女 / 阴男阳女”运行时选定的 勾煞/绞煞/元辰 表
  function collectAllShenSha(eightChar, currentCycle, nnLookupTable) {
    // 建立“表名 -> 表”索引, 补入运行时选定的 NN 表
    var lookupTables = {};
    for (var tableName in PanData) {
      lookupTables[tableName] = PanData[tableName];
    }
    lookupTables['shenShaYearZhiZhiGenderVariant'] = nnLookupTable;

    var resultByPillar = {
      year:  collectPillarShenSha(ShenShaRules.year, eightChar, lookupTables),
      month: collectPillarShenSha(ShenShaRules.month, eightChar, lookupTables),
      day:   collectPillarShenSha(ShenShaRules.day, eightChar, lookupTables),
      time:  collectPillarShenSha(ShenShaRules.time, eightChar, lookupTables),
      daYun: [], liuNian: [], liuYue: [], liuRi: [], liuShi: []
    };
    if (currentCycle) {
      if (currentCycle.daYunGanZhi) {
        resultByPillar.daYun = collectMovingPillarShenSha(ShenShaRules.daYun, eightChar, extractMovingPillar(currentCycle, 'daYun'), lookupTables);
      }
      resultByPillar.liuNian = collectMovingPillarShenSha(ShenShaRules.liuNian, eightChar, extractMovingPillar(currentCycle, 'liuNian'), lookupTables);
      resultByPillar.liuYue  = collectMovingPillarShenSha(ShenShaRules.liuYue, eightChar, extractMovingPillar(currentCycle, 'liuYue'), lookupTables);
      resultByPillar.liuRi   = collectMovingPillarShenSha(ShenShaRules.liuRi, eightChar, extractMovingPillar(currentCycle, 'liuRi'), lookupTables);
      resultByPillar.liuShi  = collectMovingPillarShenSha(ShenShaRules.liuShi, eightChar, extractMovingPillar(currentCycle, 'liuShi'), lookupTables);
    }
    return resultByPillar;
  }

  // ===== 命理关系常量表(按干支/柱查表) =====
  // 天干地支 -> 阴/阳
  var YIN_YANG_BY_CHAR = {
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

  // 月支 -> 五行旺衰
  var WANG_SHUAI_BY_MONTH_ZHI = {
	'寅卯':'木旺 火相 水休 金囚 土死',
	'巳午':'火旺 土相 木休 水囚 金死',
	'申酉':'金旺 水相 土休 火囚 木死',
	'亥子':'水旺 木相 金休 土囚 火死',
	'辰戌丑未':'土旺 金相 火休 木囚 水死'
  };

  // 两天干 -> 合/冲
  var TIAN_GAN_RELATIONS = {
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

  // 两个或三个地支 -> 会/合/刑/冲/害/破
  var DI_ZHI_RELATIONS = {
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

  // 年支 + 流年支 -> 值/刑/冲/害/破太岁
  var TAI_SUI_RELATIONS = {
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

  // 年支 -> 婚配宜忌
  var MARRIAGE_MATCH_BY_YEAR_ZHI = {
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

  // ===== 排盘主流程 =====
  // 组装四柱/大运/流年数据 -> 收集神煞 -> 拼出命盘表格 HTML 并写入 #pan
  var renderChart = function(birthLunar, birthSolar, genderCode){
    var eightChar = birthLunar.getEightChar();
    // 选择流派
    eightChar.setSect(ZI_SHI_SECT);	
    var nowYear,yunStartSolar,daYunList,daYunCount,currentCycle;
    if(GENDER_CODE.UNKNOWN !== genderCode){
      var now = new Date();
      nowYear = now.getFullYear();
      var yunInfo = eightChar.getYun(genderCode);
      yunStartSolar = yunInfo.getStartSolar();
      daYunList = yunInfo.getDaYun();
      daYunCount = daYunList.length;
      var nowLunar = Lunar.fromDate(now);
      
      var nowYearZhi = nowLunar.getYearZhiByLiChun();
      var nowYearHiddenGan = LunarUtil.ZHI_HIDE_GAN[nowYearZhi];
      var nowYearShiShenZhi = [];
      for(var hiddenGanIndex=0,hiddenGanCount=nowYearHiddenGan.length;hiddenGanIndex<hiddenGanCount;hiddenGanIndex++){
        nowYearShiShenZhi.push(nowYearHiddenGan[hiddenGanIndex]+'-'+LunarUtil.SHI_SHEN_ZHI[eightChar.getDayGan()+nowYearZhi+nowYearHiddenGan[hiddenGanIndex]]);
      }
      
      var nowMonthZhi = nowLunar.getMonthZhi();
      var nowMonthHiddenGan = LunarUtil.ZHI_HIDE_GAN[nowMonthZhi];
      var nowMonthShiShenZhi = [];
      for(var hiddenGanIndex=0,hiddenGanCount=nowMonthHiddenGan.length;hiddenGanIndex<hiddenGanCount;hiddenGanIndex++){
        nowMonthShiShenZhi.push(nowMonthHiddenGan[hiddenGanIndex]+'-'+LunarUtil.SHI_SHEN_ZHI[eightChar.getDayGan()+nowMonthZhi+nowMonthHiddenGan[hiddenGanIndex]]);
      }
      
      var nowDayZhi = nowLunar.getDayZhi();
      var nowDayHiddenGan = LunarUtil.ZHI_HIDE_GAN[nowDayZhi];
      var nowDayShiShenZhi = [];
      for(var hiddenGanIndex=0,hiddenGanCount=nowDayHiddenGan.length;hiddenGanIndex<hiddenGanCount;hiddenGanIndex++){
        nowDayShiShenZhi.push(nowDayHiddenGan[hiddenGanIndex]+'-'+LunarUtil.SHI_SHEN_ZHI[eightChar.getDayGan()+nowDayZhi+nowDayHiddenGan[hiddenGanIndex]]);
      }
      
      var nowHourZhi = nowLunar.getTimeZhi();
      var nowHourHiddenGan = LunarUtil.ZHI_HIDE_GAN[nowHourZhi];
      var nowHourShiShenZhi = [];
      for(var hiddenGanIndex=0,hiddenGanCount=nowHourHiddenGan.length;hiddenGanIndex<hiddenGanCount;hiddenGanIndex++){
        nowHourShiShenZhi.push(nowHourHiddenGan[hiddenGanIndex]+'-'+LunarUtil.SHI_SHEN_ZHI[eightChar.getDayGan()+nowHourZhi+nowHourHiddenGan[hiddenGanIndex]]);
      }	
	  
      currentCycle = {
        daYunWuXing: '',
        liuNianWuXing: LunarUtil.WU_XING_GAN[nowLunar.getYearGanByLiChun()] + LunarUtil.WU_XING_ZHI[nowLunar.getYearZhiByLiChun()],
        liuYueWuXing: LunarUtil.WU_XING_GAN[nowLunar.getMonthGan()] + LunarUtil.WU_XING_ZHI[nowLunar.getMonthZhi()],
        liuRiWuXing: LunarUtil.WU_XING_GAN[nowLunar.getDayGan()] + LunarUtil.WU_XING_ZHI[nowLunar.getDayZhi()],
        liuShiWuXing: LunarUtil.WU_XING_GAN[nowLunar.getTimeGan()] + LunarUtil.WU_XING_ZHI[nowLunar.getTimeZhi()],
		
        daYunDiShi: '',
        liuNianDiShi: getChangShengStage(eightChar.getDayGan(), eightChar.getDayGanIndex(), nowLunar.getYearZhiIndexByLiChun()),
        liuYueDiShi: getChangShengStage(eightChar.getDayGan(), eightChar.getDayGanIndex(), nowLunar.getMonthZhiIndex()),
        liuRiDiShi: getChangShengStage(eightChar.getDayGan(), eightChar.getDayGanIndex(), nowLunar.getDayZhiIndex()),
        liuShiDiShi: getChangShengStage(eightChar.getDayGan(), eightChar.getDayGanIndex(), nowLunar.getTimeZhiIndex()),
		
        daYunChangSheng: '',
        liuNianChangSheng: getChangShengStage(nowLunar.getYearGanByLiChun(), nowLunar.getYearGanIndexByLiChun(), nowLunar.getYearZhiIndexByLiChun()),
        liuYueChangSheng: getChangShengStage(nowLunar.getMonthGan(), nowLunar.getMonthGanIndex(), nowLunar.getMonthZhiIndex()),
        liuRiChangSheng: getChangShengStage(nowLunar.getDayGan(), nowLunar.getDayGanIndex(), nowLunar.getDayZhiIndex()),
        liuShiChangSheng: getChangShengStage(nowLunar.getTimeGan(), nowLunar.getTimeGanIndex(), nowLunar.getTimeZhiIndex()),
		
        daYunXunKong: '',
        liuNianXunKong: LunarUtil.getXunKong(nowLunar.getYearInGanZhiByLiChun()),
        liuYueXunKong: LunarUtil.getXunKong(nowLunar.getMonthInGanZhi()),
        liuRiXunKong: LunarUtil.getXunKong(nowLunar.getDayInGanZhi()),		
        liuShiXunKong: LunarUtil.getXunKong(nowLunar.getTimeInGanZhi()),
		
        daYunNaYin: '',
        liuNianNaYin: LunarUtil.NAYIN[nowLunar.getYearInGanZhiByLiChun()],
        liuYueNaYin: LunarUtil.NAYIN[nowLunar.getMonthInGanZhi()],
        liuRiNaYin: LunarUtil.NAYIN[nowLunar.getDayInGanZhi()],
        liuShiNaYin: LunarUtil.NAYIN[nowLunar.getTimeInGanZhi()],
        
        daYunShiShen:'',
        daYunShiShenZhi:[],		
        liuNianGanZhi:nowLunar.getYearInGanZhiByLiChun(),
        liuNianShiShen:LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + nowLunar.getYearGanByLiChun()],
        liuNianShiShenZhi:nowYearShiShenZhi,		
        liuYueGanZhi:nowLunar.getMonthInGanZhi(),
        liuYueShiShen:LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + nowLunar.getMonthGan()],
        liuYueShiShenZhi:nowMonthShiShenZhi,		
        liuRiGanZhi:nowLunar.getDayInGanZhi(),
        liuRiShiShen:LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + nowLunar.getDayGan()],
        liuRiShiShenZhi:nowDayShiShenZhi,
        liuShiGanZhi:nowLunar.getTimeInGanZhi(),
        liuShiShiShen:LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + nowLunar.getTimeGan()],
        liuShiShiShenZhi:nowHourShiShenZhi		
      };
      currentCycle.liuNianGan = currentCycle.liuNianGanZhi.substr(0,1);
      currentCycle.liuNianZhi = currentCycle.liuNianGanZhi.substr(1);      
      currentCycle.liuYueGan = currentCycle.liuYueGanZhi.substr(0,1);
      currentCycle.liuYueZhi = currentCycle.liuYueGanZhi.substr(1);	  
      currentCycle.liuRiGan = currentCycle.liuRiGanZhi.substr(0,1);
      currentCycle.liuRiZhi = currentCycle.liuRiGanZhi.substr(1);	  
      currentCycle.liuShiGan = currentCycle.liuShiGanZhi.substr(0,1);
      currentCycle.liuShiZhi = currentCycle.liuShiGanZhi.substr(1);	  
	  
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        if(daYunItem.getStartYear()<=nowYear&&nowYear<=daYunItem.getEndYear()){
          var ganZhiText = daYunItem.getGanZhi();
          if(ganZhiText){
            var ganChar = ganZhiText.substr(0,1);
            var zhiChar = ganZhiText.substr(1);
            var zhiIndex = findZhiIndex(zhiChar);
            currentCycle.daYunWuXing = LunarUtil.WU_XING_GAN[ganChar] + LunarUtil.WU_XING_ZHI[zhiChar];
            currentCycle.daYunDiShi = getChangShengStage(eightChar.getDayGan(), eightChar.getDayGanIndex(), zhiIndex);
            currentCycle.daYunChangSheng = getChangShengStage(ganChar, findGanIndex(ganChar), zhiIndex);
            currentCycle.daYunXunKong = LunarUtil.getXunKong(ganZhiText);
            currentCycle.daYunNaYin = LunarUtil.NAYIN[ganZhiText];
            
            currentCycle.daYunGan = ganChar;
            currentCycle.daYunZhi = zhiChar;
            currentCycle.daYunGanZhi = ganZhiText;
            currentCycle.daYunShiShen = LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + ganChar];
            var daYunHiddenGan = LunarUtil.ZHI_HIDE_GAN[zhiChar];
            var daYunShiShenZhi = [];
            for(var hiddenGanIndex=0,hiddenGanCount=daYunHiddenGan.length;hiddenGanIndex<hiddenGanCount;hiddenGanIndex++){
              daYunShiShenZhi.push(daYunHiddenGan[hiddenGanIndex]+'-'+LunarUtil.SHI_SHEN_ZHI[eightChar.getDayGan()+zhiChar+daYunHiddenGan[hiddenGanIndex]]);
            }
            currentCycle.daYunShiShenZhi = daYunShiShenZhi;
          }
          break;
        }
      }
    }
    var html = '<table><tbody>';
    html += '<tr>';
    html += '<td>出生：</td>';
    html += '<td colspan="10" class="left small">' + birthSolar.getYear() + '年' + birthSolar.getMonth() + '月' + birthSolar.getDay() + '日(' + birthLunar.getMonthInChinese() + '月' + birthLunar.getDayInChinese() + ')' + padTwoDigits(birthSolar.getHour()) + ':' + padTwoDigits(birthSolar.getMinute()) +' 星期'+birthSolar.getWeekInChinese() + '生肖' + birthLunar.getYearShengXiao() + birthSolar.getXingZuo()+'座</td>';
    html += '</tr>';
    
    html += '<tr>';
    html += '<td>节气：</td>';
    var previousJieQi = birthLunar.getPrevJie();
    var jieQiSolar = previousJieQi.getSolar();
    html += '<td colspan="10" class="left small">' + previousJieQi.getName() + '：' + jieQiSolar.getMonth() + '月' + jieQiSolar.getDay() + '日' + padTwoDigits(jieQiSolar.getHour()) + ':' + padTwoDigits(jieQiSolar.getMinute()) + '；';
    var nextJieQi = birthLunar.getNextJie();
    jieQiSolar = nextJieQi.getSolar();
    html += nextJieQi.getName() + '：' + jieQiSolar.getMonth() + '月' + jieQiSolar.getDay() + '日' + padTwoDigits(jieQiSolar.getHour()) + ':' + padTwoDigits(jieQiSolar.getMinute());
    html += '</td>';
    html += '</tr>';
    
    var dayGanLabel = '日干';
    var chartTitle = '八字';
    var daYunHeading = '大运';
    var liuNianHeading = '流年';
    var liuYueHeading = '流月';
    var liuRiHeading = '流日';
    var liuShiHeading = '流时';	
    if(GENDER_CODE.MALE === genderCode){
      chartTitle = '乾造';
      dayGanLabel = '元男';
    }else if(GENDER_CODE.FEMALE === genderCode){
      chartTitle = '坤造';
      dayGanLabel = '元女';
    }else{
      daYunHeading = '';
      liuNianHeading = '';
      liuYueHeading = '';
      liuRiHeading = '';	  
    }
    html += '<tr>';
    html += '<td rowspan="4" valign="top">' + chartTitle + '：</td>';
    html += '<td>年柱</td>';
    html += '<td>月柱</td>';
    html += '<td>日柱</td>';
    html += '<td>时柱</td>';

    html += '<td>'+daYunHeading+'</td>';
    html += '<td>'+liuNianHeading+'</td>';
    html += '<td>'+liuYueHeading+'</td>';
    html += '<td>'+liuRiHeading+'</td>';
    html += '<td>'+liuShiHeading+'</td>';	
    html += '<td colspan="2"></td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td class="small">' + eightChar.getYearShiShenGan() + '</td>';
    html += '<td class="small">' + eightChar.getMonthShiShenGan() + '</td>';
    html += '<td class="small red">' + dayGanLabel + '</td>';
    html += '<td class="small">' + eightChar.getTimeShiShenGan() + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunShiShen+'</td>';
      html += '<td class="small">'+currentCycle.liuNianShiShen+'</td>';
      html += '<td class="small">'+currentCycle.liuYueShiShen+'</td>';
      html += '<td class="small">'+currentCycle.liuRiShiShen+'</td>';
      html += '<td class="small">'+currentCycle.liuShiShiShen+'</td>';
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';
    html += '<tr>';
    html += '<td class="bazi">' + eightChar.getYearGan()+'<br>'+eightChar.getYearZhi() + '</td>';
    html += '<td class="bazi">' + eightChar.getMonthGan()+'<br>'+eightChar.getMonthZhi() + '</td>';
    html += '<td class="bazi">' + eightChar.getDayGan()+'<br>'+eightChar.getDayZhi() + '</td>';
    html += '<td class="bazi">' + eightChar.getTimeGan()+'<br>'+eightChar.getTimeZhi() + '</td>';
    if(currentCycle){

      html += '<td class="bazi">'+(currentCycle.daYunGanZhi?(currentCycle.daYunGanZhi.substr(0,1)+'<br>'+currentCycle.daYunGanZhi.substr(1)):'')+'</td>';
      html += '<td class="bazi">'+currentCycle.liuNianGanZhi.substr(0,1)+'<br>'+currentCycle.liuNianGanZhi.substr(1)+'</td>';
      html += '<td class="bazi">'+currentCycle.liuYueGanZhi.substr(0,1)+'<br>'+currentCycle.liuYueGanZhi.substr(1)+'</td>';
      html += '<td class="bazi">'+currentCycle.liuRiGanZhi.substr(0,1)+'<br>'+currentCycle.liuRiGanZhi.substr(1)+'</td>';
      html += '<td class="bazi">'+currentCycle.liuShiGanZhi.substr(0,1)+'<br>'+currentCycle.liuShiGanZhi.substr(1)+'</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';
    html += '<tr>';
    var hiddenGanList = eightChar.getYearHideGan();
    var shiShenZhiList = eightChar.getYearShiShenZhi();
    html += '<td valign="top" class="small">';
    for(var index=0,listLength=hiddenGanList.length;index<listLength;index++){
      html += '<div' + (index==0?' class="red"':'') + '>'
      html += hiddenGanList[index] + '-' + shiShenZhiList[index];
      html += '</div>';
    }
    html += '</td>';
    hiddenGanList = eightChar.getMonthHideGan();
    shiShenZhiList = eightChar.getMonthShiShenZhi();
    html += '<td valign="top" class="small">';
    for(var index=0,listLength=hiddenGanList.length;index<listLength;index++){
      html += '<div' + (index==0?' class="red"':'') + '>'
      html += hiddenGanList[index] + '-' + shiShenZhiList[index];
      html += '</div>';
    }
    html += '</td>';
    hiddenGanList = eightChar.getDayHideGan();
    shiShenZhiList = eightChar.getDayShiShenZhi();
    html += '<td valign="top" class="small">';
    for(var index=0,listLength=hiddenGanList.length;index<listLength;index++){
      html += '<div' + (index==0?' class="red"':'') + '>'
      html += hiddenGanList[index] + '-' + shiShenZhiList[index];
      html += '</div>';
    }
    html += '</td>';
    hiddenGanList = eightChar.getTimeHideGan();
    shiShenZhiList = eightChar.getTimeShiShenZhi();
    html += '<td valign="top" class="small">';
    for(var index=0,listLength=hiddenGanList.length;index<listLength;index++){
      html += '<div' + (index==0?' class="red"':'') + '>'
      html += hiddenGanList[index] + '-' + shiShenZhiList[index];
      html += '</div>';
    }
    html += '</td>';
    if(currentCycle){

      html += '<td class="small" valign="top">';
      for(var index=0,listLength=currentCycle.daYunShiShenZhi.length;index<listLength;index++){
        html += '<div' + (index==0?' class="red"':'') + '>'
        html += currentCycle.daYunShiShenZhi[index];
        html += '</div>';
      }
      html += '</td>';
      html += '<td class="small" valign="top">';
      for(var index=0,listLength=currentCycle.liuNianShiShenZhi.length;index<listLength;index++){
        html += '<div' + (index==0?' class="red"':'') + '>'
        html += currentCycle.liuNianShiShenZhi[index];
        html += '</div>';
      }
      html += '</td>';
      html += '<td class="small" valign="top">';
      for(var index=0,listLength=currentCycle.liuYueShiShenZhi.length;index<listLength;index++){
        html += '<div' + (index==0?' class="red"':'') + '>'
        html += currentCycle.liuYueShiShenZhi[index];
        html += '</div>';
      }
      html += '</td>';
      html += '<td class="small" valign="top">';
      for(var index=0,listLength=currentCycle.liuRiShiShenZhi.length;index<listLength;index++){
        html += '<div' + (index==0?' class="red"':'') + '>'
        html += currentCycle.liuRiShiShenZhi[index];
        html += '</div>';
      }
      html += '</td>';
      html += '<td class="small" valign="top">';
      for(var index=0,listLength=currentCycle.liuShiShiShenZhi.length;index<listLength;index++){
        html += '<div' + (index==0?' class="red"':'') + '>'
        html += currentCycle.liuShiShiShenZhi[index];
        html += '</div>';
      }
      html += '</td>';
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';
     
    html += '<tr>';
    html += '<td>纳音：</td>';
    html += '<td class="small">' + eightChar.getYearNaYin() + '</td>';
    html += '<td class="small">' + eightChar.getMonthNaYin() + '</td>';
    html += '<td class="small">' + eightChar.getDayNaYin() + '</td>';
    html += '<td class="small">' + eightChar.getTimeNaYin() + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunNaYin+'</td>';
      html += '<td class="small">'+currentCycle.liuNianNaYin+'</td>';
      html += '<td class="small">'+currentCycle.liuYueNaYin+'</td>';
      html += '<td class="small">'+currentCycle.liuRiNaYin+'</td>';
      html += '<td class="small">'+currentCycle.liuShiNaYin+'</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';

    html += '<tr>';
    html += '<td>空亡：</td>';
    html += '<td class="small">' + eightChar.getYearXunKong() + '</td>';
    html += '<td class="small">' + eightChar.getMonthXunKong() + '</td>';
    html += '<td class= "red small">' + eightChar.getDayXunKong() + '</td>';
    html += '<td class="small">' + eightChar.getTimeXunKong() + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunXunKong+'</td>';
      html += '<td class="small">'+currentCycle.liuNianXunKong+'</td>';
      html += '<td class="small">'+currentCycle.liuYueXunKong+'</td>';
      html += '<td class="small">'+currentCycle.liuRiXunKong+'</td>';
      html += '<td class="small">'+currentCycle.liuShiXunKong+'</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';

    html += '<tr>';
    html += '<td>日干：</td>';
    html += '<td class="small">' + eightChar.getYearDiShi() + '</td>';
    html += '<td class="small">' + eightChar.getMonthDiShi() + '</td>';
    html += '<td class="small">' + eightChar.getDayDiShi() + '</td>';
    html += '<td class="small">' + eightChar.getTimeDiShi() + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunDiShi+'</td>';
      html += '<td class="small">'+currentCycle.liuNianDiShi+'</td>';
      html += '<td class="small">'+currentCycle.liuYueDiShi+'</td>';
      html += '<td class="small">'+currentCycle.liuRiDiShi+'</td>';
      html += '<td class="small">'+currentCycle.liuShiDiShi+'</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';
    
    html += '<tr>';
    html += '<td>坐宫：</td>';
    html += '<td class="small">' + getChangShengStage(eightChar.getYearGan(), birthLunar.getYearGanIndexExact(), birthLunar.getYearZhiIndexExact()) + '</td>';
    html += '<td class="small">' + getChangShengStage(eightChar.getMonthGan(), birthLunar.getMonthGanIndexExact(), birthLunar.getMonthZhiIndexExact()) + '</td>';
    html += '<td class="small">' + getChangShengStage(eightChar.getDayGan(), 2 == eightChar.getSect() ? birthLunar.getDayGanIndexExact2() : birthLunar.getDayGanIndexExact(), 2 == eightChar.getSect() ? birthLunar.getDayZhiIndexExact2() : birthLunar.getDayZhiIndexExact()) + '</td>';
    html += '<td class="small">' + getChangShengStage(eightChar.getTimeGan(), birthLunar.getTimeGanIndex(), birthLunar.getTimeZhiIndex()) + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunChangSheng+'</td>';
      html += '<td class="small">'+currentCycle.liuNianChangSheng+'</td>';
      html += '<td class="small">'+currentCycle.liuYueChangSheng+'</td>';
      html += '<td class="small">'+currentCycle.liuRiChangSheng+'</td>';
      html += '<td class="small">'+currentCycle.liuShiChangSheng+'</td>';		  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';
 	
    
    html += '<tr>';
    html += '<td>阴阳：</td>';
    html += '<td class="small">' + YIN_YANG_BY_CHAR[eightChar.getYearGan()] + YIN_YANG_BY_CHAR[eightChar.getYearZhi()] + '</td>';
    html += '<td class="small">' + YIN_YANG_BY_CHAR[eightChar.getMonthGan()] + YIN_YANG_BY_CHAR[eightChar.getMonthZhi()] + '</td>';
    html += '<td class="small">' + YIN_YANG_BY_CHAR[eightChar.getDayGan()] + YIN_YANG_BY_CHAR[eightChar.getDayZhi()] + '</td>';
    html += '<td class="small">' + YIN_YANG_BY_CHAR[eightChar.getTimeGan()] + YIN_YANG_BY_CHAR[eightChar.getTimeZhi()] + '</td>';
    if(currentCycle){

      html += '<td class="small">' + (currentCycle.daYunGan ? YIN_YANG_BY_CHAR[currentCycle.daYunGan]:'') + (currentCycle.daYunZhi ? YIN_YANG_BY_CHAR[currentCycle.daYunZhi]:'') + '</td>';
      html += '<td class="small">' + (currentCycle.liuNianGan ? YIN_YANG_BY_CHAR[currentCycle.liuNianGan]:'') + (currentCycle.liuNianZhi ? YIN_YANG_BY_CHAR[currentCycle.liuNianZhi]:'') + '</td>';
      html += '<td class="small">' + (currentCycle.liuYueGan ? YIN_YANG_BY_CHAR[currentCycle.liuYueGan]:'') + (currentCycle.liuYueZhi ? YIN_YANG_BY_CHAR[currentCycle.liuYueZhi]:'') + '</td>';
      html += '<td class="small">' + (currentCycle.liuRiGan ? YIN_YANG_BY_CHAR[currentCycle.liuRiGan]:'') + (currentCycle.liuRiZhi ? YIN_YANG_BY_CHAR[currentCycle.liuRiZhi]:'') + '</td>';
      html += '<td class="small">' + (currentCycle.liuShiGan ? YIN_YANG_BY_CHAR[currentCycle.liuShiGan]:'') + (currentCycle.liuShiZhi ? YIN_YANG_BY_CHAR[currentCycle.liuShiZhi]:'') + '</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';

    html += '<tr>';
    html += '<td>五行：</td>';
    html += '<td class="small">' + eightChar.getYearWuXing() + '</td>';
    html += '<td class="small">' + eightChar.getMonthWuXing() + '</td>';
    html += '<td class="small">' + eightChar.getDayWuXing() + '</td>';
    html += '<td class="small">' + eightChar.getTimeWuXing() + '</td>';
    if(currentCycle){

      html += '<td class="small">'+currentCycle.daYunWuXing+'</td>';
      html += '<td class="small">'+currentCycle.liuNianWuXing+'</td>';
      html += '<td class="small">'+currentCycle.liuYueWuXing+'</td>';
      html += '<td class="small">'+currentCycle.liuRiWuXing+'</td>';
      html += '<td class="small">'+currentCycle.liuShiWuXing+'</td>';	  
      html += '<td colspan="2"></td>';
    }else{
      html += '<td colspan="6"></td>';
    }
    html += '</tr>';

    // 神煞行(先开 <tr>, 计算完毕后由下方“空亡与后续命盘行”填充单元格)
    html += '<tr>';

    // ---------- 神煞计算(引擎化) ----------
    // 依出生年干阴阳与性别选定“勾煞/绞煞/元辰”所查之表(阳男阴女 vs 阴男阳女)
    var isYangYearGan = (0 == birthLunar.getYearGanIndexExact() % 2);
    var isMale = (GENDER_CODE.MALE === genderCode);
    var nnLookupTable = ((isYangYearGan && isMale) || (!isYangYearGan && !isMale))
      ? PanData.shenShaYearZhiZhiYangNanYinNv
      : PanData.shenShaYearZhiZhiYinNanYangNv;
    var shenShaByPillar = collectAllShenSha(eightChar, currentCycle, nnLookupTable);
    var shenShaYear = shenShaByPillar.year;
    var shenShaMonth = shenShaByPillar.month;
    var shenShaDay = shenShaByPillar.day;
    var shenShaTime = shenShaByPillar.time;
    var shenShaDaYun = shenShaByPillar.daYun;
    var shenShaLiuNian = shenShaByPillar.liuNian;
    var shenShaLiuYue = shenShaByPillar.liuYue;
    var shenShaLiuRi = shenShaByPillar.liuRi;
    var shenShaLiuShi = shenShaByPillar.liuShi;

    // ===== 空亡：日柱空亡落在哪一柱 =====
    var dayXunKong = eightChar.getDayXunKong();
    var birthYearZhi = eightChar.getYearZhi();
    var birthMonthZhi = eightChar.getMonthZhi();
    var birthDayZhi = eightChar.getDayZhi();
    var birthTimeZhi = eightChar.getTimeZhi();

    var daYunZhi;
    if (currentCycle.daYunGanZhi) {
      daYunZhi = currentCycle.daYunGanZhi.substr(1);
    }
    var liuNianZhi;
    if (currentCycle.liuNianGanZhi) {
      liuNianZhi = currentCycle.liuNianGanZhi.substr(1);
    }
    var liuYueZhi;
    if (currentCycle.liuYueGanZhi) {
      liuYueZhi = currentCycle.liuYueGanZhi.substr(1);
    }
    var liuRiZhi;
    if (currentCycle.liuRiGanZhi) {
      liuRiZhi = currentCycle.liuRiGanZhi.substr(1);
    }
    var liuShiZhi;
    if (currentCycle.liuShiGanZhi) {
      liuShiZhi = currentCycle.liuShiGanZhi.substr(1);
    }

    if (dayXunKong.indexOf(birthYearZhi) != -1) {
      shenShaYear.push('空亡');
    }
    if (dayXunKong.indexOf(birthMonthZhi) != -1) {
      shenShaMonth.push('空亡');
    }
    if (dayXunKong.indexOf(birthDayZhi) != -1) {
      shenShaDay.push('空亡');
    }
    if (dayXunKong.indexOf(birthTimeZhi) != -1) {
      shenShaTime.push('空亡');
    }
    if (dayXunKong.indexOf(daYunZhi) != -1) {
      shenShaDaYun.push('空亡');
    }
    if (dayXunKong.indexOf(liuNianZhi) != -1) {
      shenShaLiuNian.push('空亡');
    }
    if (dayXunKong.indexOf(liuYueZhi) != -1) {
      shenShaLiuYue.push('空亡');
    }
    if (dayXunKong.indexOf(liuRiZhi) != -1) {
      shenShaLiuRi.push('空亡');
    }
    if (dayXunKong.indexOf(liuShiZhi) != -1) {
      shenShaLiuShi.push('空亡');
    }

    html += '<td>神煞：</td>';
    html += '<td class="small">'+ (shenShaYear.length<1 ? '无' : shenShaYear.join('<br>')) + '</td>';
    html += '<td class="small">'+ (shenShaMonth.length<1 ? '无' : shenShaMonth.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaDay.length<1 ? '无' : shenShaDay.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaTime.length<1 ? '无' : shenShaTime.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaDaYun.length<1 ? '无' : shenShaDaYun.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaLiuNian.length<1 ? '无' : shenShaLiuNian.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaLiuYue.length<1 ? '无' : shenShaLiuYue.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaLiuRi.length<1 ? '无' : shenShaLiuRi.join('<br>')) +'</td>';
    html += '<td class="small">'+ (shenShaLiuShi.length<1 ? '无' : shenShaLiuShi.join('<br>')) +'</td>';
    html += '</tr>';

    // 旺衰：按月支查五行旺衰
    html += '<tr>';
    html += '<td>旺衰：</td>';
    var wangShuaiText = '';
    for (var monthZhiKey in WANG_SHUAI_BY_MONTH_ZHI) {
      if (monthZhiKey.indexOf(birthMonthZhi) > -1) {
        wangShuaiText = WANG_SHUAI_BY_MONTH_ZHI[monthZhiKey];
        break;
      }
    }
    html += '<td colspan="20" class="left small">' + eightChar.getDayGan() + LunarUtil.WU_XING_GAN[eightChar.getDayGan()] + '生于' + eightChar.getMonthZhi() + '月 ' + wangShuaiText +'</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>天干：</td>';
    var ganList = [];
    ganList.push(eightChar.getYearGan());
    ganList.push(eightChar.getMonthGan());
    ganList.push(eightChar.getDayGan());
    ganList.push(eightChar.getTimeGan());
    if(currentCycle){
      if(currentCycle.daYunGanZhi){
        ganList.push(currentCycle.daYunGanZhi.substr(0,1));
      }
      if(currentCycle.liuNianGanZhi){
        ganList.push(currentCycle.liuNianGanZhi.substr(0,1));
      }
      if(currentCycle.liuYueGanZhi){
        ganList.push(currentCycle.liuYueGanZhi.substr(0,1));
      }
      if(currentCycle.liuRiGanZhi){
        ganList.push(currentCycle.liuRiGanZhi.substr(0,1));		
      }
      if(currentCycle.liuShiGanZhi){
        ganList.push(currentCycle.liuShiGanZhi.substr(0,1));		
      }	  
    }
        
    // 统计四柱与运岁天干的 合/冲
    var matchedList = [];
    var relationSet = {};
    var ganCount = ganList.length;
    for (var ganIndex = 0; ganIndex < ganCount; ganIndex++) {
      for (var otherGanIndex = 0; otherGanIndex < ganCount; otherGanIndex++) {
        if (ganIndex === otherGanIndex) {
          continue;
        }
        var relation = TIAN_GAN_RELATIONS[ganList[ganIndex] + ganList[otherGanIndex]];
        if (relation) {
          relationSet[relation] = true;
        }
      }
    }
    for (var starName in relationSet) {
      matchedList.push(starName);
    }
    html += '<td colspan="20" class="left small">' + (matchedList.length < 1 ? '天干无冲合' : matchedList.join(' ')) + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>地支：</td>';
    var zhiCounts = {};
    zhiCounts[eightChar.getYearZhi()] = zhiCounts[eightChar.getYearZhi()] ? zhiCounts[eightChar.getYearZhi()]+1 : 1;
    zhiCounts[eightChar.getMonthZhi()] = zhiCounts[eightChar.getMonthZhi()] ? zhiCounts[eightChar.getMonthZhi()]+1 : 1;
    zhiCounts[eightChar.getDayZhi()] = zhiCounts[eightChar.getDayZhi()] ? zhiCounts[eightChar.getDayZhi()]+1 : 1;
    zhiCounts[eightChar.getTimeZhi()] = zhiCounts[eightChar.getTimeZhi()] ? zhiCounts[eightChar.getTimeZhi()]+1 : 1;
    if(currentCycle){
      if(currentCycle.daYunZhi){
        zhiCounts[currentCycle.daYunZhi] = zhiCounts[currentCycle.daYunZhi] ? zhiCounts[currentCycle.daYunZhi]+1 : 1;
      }
      if(currentCycle.liuNianZhi){
        zhiCounts[currentCycle.liuNianZhi] = zhiCounts[currentCycle.liuNianZhi] ? zhiCounts[currentCycle.liuNianZhi]+1 : 1;
      }
      if(currentCycle.liuYueZhi){
        zhiCounts[currentCycle.liuYueZhi] = zhiCounts[currentCycle.liuYueZhi] ? zhiCounts[currentCycle.liuYueZhi]+1 : 1;
      }
      if(currentCycle.liuRiZhi){
        zhiCounts[currentCycle.liuRiZhi] = zhiCounts[currentCycle.liuRiZhi] ? zhiCounts[currentCycle.liuRiZhi]+1 : 1;
      }
      if(currentCycle.liuShiZhi){
        zhiCounts[currentCycle.liuShiZhi] = zhiCounts[currentCycle.liuShiZhi] ? zhiCounts[currentCycle.liuShiZhi]+1 : 1;
      }	  
    }

    // 统计四柱与运岁地支的 三会/三合/半合/六合/刑冲害破
    var matchedList = [];
    var relationSet = {};
    for (var zhiA in zhiCounts) {
      for (var zhiB in zhiCounts) {
        for (var zhiC in zhiCounts) {
          if (zhiA == zhiB || zhiB == zhiC || zhiA == zhiC) {
            continue;
          }
          var relation = DI_ZHI_RELATIONS[zhiA + zhiB];
          if (relation) {
            relationSet[relation] = true;
          }
          relation = DI_ZHI_RELATIONS[zhiA + zhiB + zhiC];
          if (relation) {
            relationSet[relation] = true;
          }
        }
      }
    }
    // 同一地支出现多次(如两辰)也要成对检查
    for (var zhiKey in zhiCounts) {
      var repeatCount = zhiCounts[zhiKey];
      var repeatedZhiList = [];
      for (var repeatIndex = 0; repeatIndex < repeatCount; repeatIndex++) {
        repeatedZhiList.push(zhiKey);
      }
      var relation = DI_ZHI_RELATIONS[repeatedZhiList.join('')];
      if (relation) {
        relationSet[relation] = true;
      }
    }
    // 每 4 条换一行, 避免单元格过宽
    var matchedCount = 0;
    for (var starName in relationSet) {
      matchedList.push(starName);
      matchedCount++;
      if (matchedCount % 4 == 0) {
        matchedList.push('<br>');
      }
    }
    html += '<td colspan="20" class="left small">' + (matchedList.join(' ')) + '</td>';
    html += '<tr>';
    html += '<td>太岁：</td>';
    var zhiList = [];
    zhiList.push(eightChar.getYearZhi());
    if(currentCycle){
      if(currentCycle.liuNianGanZhi){
        zhiList.push(currentCycle.liuNianGanZhi.substr(1));
      }
    }

    // 年支与流年支: 值/刑/冲/害/破太岁
    var matchedList = [];
    var relationSet = {};
    var taiSuiCount = zhiList.length;
    for (var taiSuiIndex = 0; taiSuiIndex < taiSuiCount; taiSuiIndex++) {
      for (var otherTaiSuiIndex = 0; otherTaiSuiIndex < taiSuiCount; otherTaiSuiIndex++) {
        if (taiSuiIndex === otherTaiSuiIndex) {
          continue;
        }
        var relation = TAI_SUI_RELATIONS[zhiList[taiSuiIndex] + zhiList[otherTaiSuiIndex]];
        if (relation) {
          relationSet[relation] = true;
        }
      }
    }
    for (var starName in relationSet) {
      matchedList.push(starName);
    }
    html += '<td colspan="20" class="left small">' + (matchedList.length < 1 ? '未犯太岁' : matchedList.join(' ')) + '</td>';
    html += '</tr>';
    html += '<tr>';
    html += '<td>婚配：</td>';
    // 按年支查婚配宜忌
    var marriageText = '';
    for (var yearZhiKey in MARRIAGE_MATCH_BY_YEAR_ZHI) {
      if (yearZhiKey.indexOf(birthYearZhi) > -1) {
        marriageText = MARRIAGE_MATCH_BY_YEAR_ZHI[yearZhiKey];
        break;
      }
    }
    html += '<td colspan="20" class="left small">' + marriageText + '</td>';
    html += '</tr>';
    // 2 end>
    
    if(GENDER_CODE.UNKNOWN !== genderCode){

      html += '<tr>';
      html += '<td>三垣：</td>';
      html += '<td colspan="20" class="left small">' + '胎元 ' + eightChar.getTaiYuan() + '(' + eightChar.getTaiYuanNaYin() + ')' + '；命宫 '+ eightChar.getMingGong() + '(' + eightChar.getMingGongNaYin() + ')' + '；身宫 '+ eightChar.getShenGong() + '(' + eightChar.getShenGongNaYin() + ')' + '</td>';
      html += '</tr>';

      html += '<tr>';
      html += '<td>起运：</td>';
      html += '<td colspan="20" class="left small">'+yunStartSolar.getYear()+'年'+yunStartSolar.getMonth()+'月'+yunStartSolar.getDay()+'日</td>';
      html += '</tr>';
      
      html += '<tr>';
      html += '<td>周岁：</td>';
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        html += '<td'+(index>=daYunCount-2?' class="hide"':'')+'>' + daYunItem.getStartAge() + '</td>';
      }
      html += '</tr>';
      html += '<tr>';
      html += '<td>换运：</td>';
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        html += '<td'+(index>=daYunCount-2?' class="hide"':'')+'>' + daYunItem.getStartYear() + '</td>';
      }
      html += '</tr>';
      html += '<tr>';
      html += '<td>十神：</td>';
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        var shiShenText = LunarUtil.SHI_SHEN_GAN[eightChar.getDayGan() + daYunItem.getGanZhi().substr(0,1)];
        html += '<td class="small'+(index>=daYunCount-2?' hide':'')+'">' + (shiShenText ? shiShenText:'') + '</td>';
      }
      html += '</tr>';
      html += '<tr>';
      html += '<td>大运：</td>';
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        var daYunGanZhiText = daYunItem.getGanZhi();
        if(!daYunGanZhiText){
          html += '<td class="red">童限</td>';
        }else{
          html += '<td class="bold'+(daYunItem.getStartYear()<=nowYear&&nowYear<=daYunItem.getEndYear()?' red':'')+(index>=daYunCount-2?' hide':'')+'">' + daYunGanZhiText + '</td>';
        }
      }
      html += '</tr>';
      html += '<tr>';
      html += '<td valign="top">流年：</td>';
      for(var index=0;index<daYunCount;index++){
        var daYunItem = daYunList[index];
        var liuNianList = daYunItem.getLiuNian();
        html += '<td valign="top"'+(index>=daYunCount-2?' class="hide"':'')+'>';
        for(var liuNianIndex=0,liuNianCount=liuNianList.length;liuNianIndex<liuNianCount;liuNianIndex++){
          var liuNianItem = liuNianList[liuNianIndex];
          html += '<div'+(liuNianItem.getYear()==nowYear?' class="red"':'')+'>'+liuNianItem.getGanZhi() + '</div>';
        }
        html += '</td>';
      }
      html += '</tr>';



    }
    
    html += '</tbody></table>';
    resultPanel.innerHTML = html;
    styleChartCells();
    try{
      resultPanel.scrollIntoView({behavior:'smooth', block:'nearest'});
    }catch(error){}
  };
  
  // ===== 输入解析与分发 =====
  // 按阴历生日排盘
  var renderChartFromLunar = function(year,month,day,hour,minute,genderCode){
    var lunarDate = Lunar.fromYmdHms(year,month,day,hour,minute,0);
    var solarDate = lunarDate.getSolar();
    renderChart(lunarDate, solarDate, genderCode);
  };
  
  // 按阳历生日排盘
  var renderChartFromSolar = function(year,month,day,hour,minute,genderCode){
    var solarDate = Solar.fromYmdHms(year,month,day,hour,minute,0);
    var lunarDate = solarDate.getLunar();
    renderChart(lunarDate, solarDate, genderCode);
  };
  
  // 解析输入串并排盘: 出生信息(年月日时分) + 性别后缀(+/-); 阴历时月份前加空格表示闰月
  var renderChartFromInput = function(rawInput){
    resultPanel.innerHTML = '';
    rawInput = trimText(rawInput);
    var isLunar = documentRef.getElementById('lunar').checked;
    if(isLunar){
      var year = parseInt(rawInput.substr(0,4));
      rawInput = rawInput.substr(4);
      var isLeapMonth = false;
      if(rawInput.indexOf(' ') == 0){
        isLeapMonth = true;
      }
      rawInput = trimText(rawInput);
      var month = parseInt(rawInput.substr(0,2),10);
      if(isLeapMonth){
        if(LunarUtil.getLeapMonth(year)==month){
          month = -month;
        }
      }
      
      rawInput = trimText(rawInput.substr(2));
      var day = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var hour = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var minute = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var genderCode = GENDER_CODE.UNKNOWN;
      if(GENDER_SIGN.MALE === rawInput){
        genderCode = GENDER_CODE.MALE;
      }else if(GENDER_SIGN.FEMALE === rawInput){
        genderCode = GENDER_CODE.FEMALE;
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
      renderChartFromLunar(year, month, day, hour, minute, genderCode);
    }else{
      var year = parseInt(rawInput.substr(0,4));
      rawInput = trimText(rawInput.substr(4));
      var month = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var day = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var hour = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var minute = parseInt(rawInput.substr(0,2),10);
      rawInput = trimText(rawInput.substr(2));
      var genderCode = GENDER_CODE.UNKNOWN;
      if(GENDER_SIGN.MALE === rawInput){
        genderCode = GENDER_CODE.MALE;
      }else if(GENDER_SIGN.FEMALE === rawInput){
        genderCode = GENDER_CODE.FEMALE;
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
      renderChartFromSolar(year, month, day, hour, minute, genderCode);
    }
  };
  
})(document);
