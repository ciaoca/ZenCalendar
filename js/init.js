(function(window, undefined) {
  const notyf = new Notyf({
    ripple: false,
    position: {
      x: 'center',
      y: 'top',
    },
    dismissible: true,
    duration: 0
  });

  const zenCalendar = {
    dom: {},
    reg: {
      isYear: /^\d{4}$/,
      isTime: /^\d{1,2}(\:\d{1,2}){1,2}$/
    },
    config: {
      prefix: 'zencalendar_',
      themes: {},
      modes: {},
    },
    settings: {
      startYear: 1900,        // 开始日期
      endYear: 2100,          // 结束日期
      curYear: new Date().getFullYear(),
      wday: 0,                // 星期开始于周几
      lockRow: false,         // 固定日期的行数
      hideFillDay: false,     // 隐藏前后月份的天数
      hideYearWeek: true,     // 隐藏周数
      theme: 'default',       // 主题
      printSize: '',          // 浏览模式
    },
    language: {
      startWeekName: ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
      horizontal: '横向',
    }
  };

  // 判断是否是整数
  zenCalendar.isInteger = function(value) {
    return typeof value === 'number' && !isNaN(value) && /^\d+$/.test(value);
  };

  // 获取当年每月的天数
  zenCalendar.getMonthDays = function(year) {
    let leapYearDay = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 1 : 0;
    return [31, 28 + leapYearDay, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  };

  // 获取周数
  zenCalendar.getWeekNum = function(dateObj) {
    let self = this;
    let curTime = dateObj.getTime();
    let yearFirstDate = new Date(dateObj.getFullYear(), 0, 1, 0, 0, 0, 0);
    let weekFirstTime = yearFirstDate.getTime();
    let weekDay = yearFirstDate.getDay();
    let weekNum = 0;

    if (weekDay === 0) {
      weekDay = 7;
    };

    let weekOffset = weekDay > 4 ? -1 : 0;

    if (weekDay > 4) {
      weekFirstTime += (8 - weekDay) * 86400000;
    } else {
      weekFirstTime += (1 - weekDay) * 86400000;
    };

    if (curTime < weekFirstTime) {
      weekNum = self.getWeekNum(new Date(dateObj.getFullYear() - 1, 11, 31));
    } else {
      weekNum = Math.floor((curTime - weekFirstTime) / 86400000) + 1;
      weekNum = Math.ceil(weekNum / 7);
    };

    return weekNum;
  };

  // 保存本地存储（localStorage）
  zenCalendar.setLocalStorage = function(name, data) {
    if (!name || !name.length) {
      return;
    };

    name = this.config.prefix + name;
    
    localStorage.setItem(name, JSON.stringify(data));
  };

  // 读取本地存储（localStorage）
  zenCalendar.getLocalStorage = function(name) {
    if (!name || !name.length) {
      return null;
    };

    name = this.config.prefix + name;

    if (!localStorage.getItem(name)) {
      return null;
    };

    try {
      return JSON.parse(localStorage.getItem(name));
    } catch(e) {
      return null;
    };
  };

  zenCalendar.init = function() {
    let self = this;

    self.buildPwa();

    self.dom.themeStyle = document.createElement('style');
    document.head.insertAdjacentElement('beforeend', self.dom.themeStyle);

    self.dom.body = document.body;
    self.dom.desk = document.createElement('div');
    self.dom.desk.classList.add('desk');
    self.dom.tool = document.createElement('div');
    self.dom.tool.classList.add('tool');
    self.dom.pane = document.createElement('div');
    self.dom.pane.classList.add('calendar');

    if (Array.isArray(window.pageData.themes) && window.pageData.themes.length) {
      for (let x of window.pageData.themes) {
        self.config.themes[x.id] = x.name;
      };
      self.settings.theme = window.pageData.themes[0].id;
    };

    self.getOptions();

    // if (location.hostname !== 'localhost') {
      self.getCacheTheme();
    // };

    self.buildStage();
    self.ready();
  };

  // 配置参数
  zenCalendar.buildPwa = function() {
    let ua = navigator.userAgent.toLowerCase();
    let manifest = document.createElement('link');

    manifest.rel = 'manifest';

    if (/\s(iphone|ipad|ipod|ios)\s/i.test(ua)) {
      manifest.href = './manifest-ios.json';
    }else if (/\smac os x\s/i.test(ua)) {
      manifest.href = './manifest-mac.json';
    } else {
      manifest.href = './manifest.json';
    };

    document.head.insertAdjacentElement('beforeend', manifest);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./serviceworker.js', {
        scope: './'
      });
      // .then(function(registration) {
      //   console.log(registration);
      // }).catch(function(error) {
      //   console.log(error);
      // });
    };
  };

  // 配置参数
  zenCalendar.ready = function() {
    let self = this;

    self.dom.body.addEventListener('change', function(e) {
      let _this = e.target;
      let nodeName = _this.nodeName.toLowerCase();

      if (nodeName === 'input') {
        let _name = _this.name;

        switch (_name) {
          case 'hideFillDay':
          case 'hideYearWeek':
          case 'lockRow':
            self.settings[_name] = _this.checked;
            self.setOptions();
            break;
        };

        if (['lockRow'].indexOf(_name) >= 0) {
          self.gotoYear();
        };

      } else if (nodeName === 'select') {
        let _name = _this.name;
        let _value = _this.value;

        switch (_name) {
          case 'theme':
          case 'printSize':
            self.settings[_name] = _value;
            self.setOptions();
            break;

          case 'wday':
          case 'curYear':
            self.settings[_name] = parseInt(_value, 10);
            self.setOptions();
            self.gotoYear();
            break;
        };
      };
    });

    self.dom.body.addEventListener('click', function(e) {
      let _this = e.target;
      let nodeName = _this.nodeName.toLowerCase();

      if (nodeName === 'a') {
        event.preventDefault();
        let _rel = _this.rel;
        let _rev = _this.rev;

        switch (_rel) {
          case 'toggle_tool':
            self.dom.tool.classList.toggle('show');
            break;

          case 'back_today':
            self.gotoToday();
            break;

          case 'prev_year':
          case 'next_year':
            let el = _this.parentNode.querySelector('select');
            let value = self.settings.curYear;

            if (el.name === 'curYear') {
              if (_rel === 'prev_year') {
                value -= 1;
              } else {
                value += 1;
              };

              if (value >= self.settings.startYear && value <= self.settings.endYear) {
                el.value = value;
                self.settings.curYear = value;

                self.setOptions();
                self.gotoYear();
              };
            };
            break;
        };
      };
    });

    self.setOptions();
    self.gotoYear();

    let now = new Date();

    if (self.settings.curYear === now.getFullYear()) {
      setTimeout(() => {
        self.gotoToday();
      }, 200);
    };
  };

  // 获取配置参数
  zenCalendar.getOptions = function() {
    let self = this;

    Object.assign(self.settings, self.getLocalStorage('options'));
    self.formatOptions();
  };

  // 保存配置参数
  zenCalendar.setOptions = function() {
    let self = this;

    if (self.settings.hideFillDay) {
      self.dom.pane.classList.add('hide_fillday');
    } else {
      self.dom.pane.classList.remove('hide_fillday');
    };

    if (self.settings.hideYearWeek) {
      self.dom.pane.classList.add('hide_yearweek');
    } else {
      self.dom.pane.classList.remove('hide_yearweek');
    };

    if (self.settings.printSize.length) {
      let size = self.settings.printSize.toLowerCase();

      if (!self.dom.body.classList.contains(size)) {
        self.dom.body.classList.remove(...['print', ...Object.keys(self.config.modes)]);
        self.dom.body.classList.add('print', size);
      };

    } else {
      self.dom.body.removeAttribute('class');
    };

    if (self.dom.themeStyle.dataset.id !== self.settings.theme) {
      self.toggleTheme();
    };

    self.setLocalStorage('options', self.settings);
    self.formatOptions();
  };

  // 转换配置
  zenCalendar.formatOptions = function() {
    let self = this;

    // 星期的起始位置
    self.settings.wday %= 7;
    self.settings.saturday = 6 - self.settings.wday;
    self.settings.sunday = (7 - self.settings.wday) % 7;
  };

  // 获取缓存样式
  zenCalendar.getCacheTheme = function() {
    let self = this;
    let cacheStyle = self.getLocalStorage('theme');
    let nowTime = new Date().getTime();

    if (!cacheStyle || typeof cacheStyle !== 'object' || typeof cacheStyle.timestamp !== 'number') {
      return;
    };

    if (nowTime - cacheStyle.timestamp > 86400000) {
      return;
    };

    if (typeof cacheStyle.text === 'string' && cacheStyle.text.length) {
      self.dom.themeStyle.dataset.id = self.settings.theme;
      self.dom.themeStyle.innerHTML = cacheStyle.text;
    };

    self.parsePrintModes(cacheStyle.printMode);
  };

  // 更换主题
  zenCalendar.toggleTheme = function() {
    let self = this;
    let url = './themes/' + self.settings.theme + '/layout.css?v=' + new Date().getTime();

    fetch(url).then((response) => {
      if (!response.ok) {
        self.settings.theme = self.dom.themeStyle.dataset.id;
        self.setOptions();

        notyf.error(response.statusText);
        return;
      };

      return response.text();
      // console.log('success', response);

    }).then((data) => {
      let cacheStyle = {
        text: data,
        printMode: [],
        timestamp: new Date().getTime(),
      };

      // 解析声明注释
      let noteReg = data.match(/^\/\*(\s|.)*?\*\//);
      let noteRule = {};

      if (Array.isArray(noteReg) && noteReg.length) {
        let list = noteReg[0].match(/^\s+\*\s+\@.+$/gm);

        for (let x of list) {
          let row = x.match(/^\s+\*\s+\@([^\s]+)\s+(.+)$/);

          if (Array.isArray(row) && row.length >= 2) {
            if (['printMode'].indexOf(row[1]) >= 0) {
              noteRule[row[1]] = row[2].split(',');
            } else {
              noteRule[row[1]] = row[2];
            };
          };
        };
      };

      if (noteRule.hasOwnProperty('printMode')) {
        cacheStyle.printMode = noteRule.printMode;
        self.parsePrintModes(noteRule.printMode);
        self.buildPrintModes();
      };

      // 压缩 CSS
      cacheStyle.text = cacheStyle.text.replace(/\/\*[^/]+\*\//g, '');
      cacheStyle.text = cacheStyle.text.replace(/\n+/g, '');
      cacheStyle.text = cacheStyle.text.replace(/\s+/g, ' ');
      cacheStyle.text = cacheStyle.text.replace(/([{}:;])\s+/g, '$1');
      cacheStyle.text = cacheStyle.text.replace(/\s+([{}:;])/g, '$1');

      self.dom.themeStyle.dataset.id = self.settings.theme;
      self.dom.themeStyle.innerHTML = cacheStyle.text;
      self.setLocalStorage('theme', cacheStyle);

    }).catch((error) => {
      notyf.error(String(error));
      console.error('error', error);
    });
  };

  // 跳转到今天
  zenCalendar.gotoToday = function() {
    let self = this;
    let now = new Date();
    let year = now.getFullYear();
    let toolSelects = self.dom.desk.querySelectorAll('select');
    let curYear;

    for (let x of toolSelects) {
      if (x.name === 'curYear') {
        curYear = parseInt(x.value, 10);
        yearSelect = x;
        break;
      };
    };

    if (curYear !== year) {
      yearSelect.value = year;
      self.settings.curYear = year;
      self.gotoYear();
      self.setOptions();
    };

    self.dom.pane.querySelectorAll('section')[now.getMonth()].scrollIntoView({
      behavior: 'smooth'
    });
    // document.documentElement.scrollTop = document.documentElement.scrollTop + document.getElementById(key).getBoundingClientRect().top - self.dom.tool.height();
  };

  // 跳转到日期
  zenCalendar.gotoYear = function() {
    let self = this;
    let html = '';

    if (!self.isInteger(self.settings.curYear)) {
      self.settings.curYear = new Date().getFullYear();
    };

    if (self.settings.curYear < self.settings.startYear) {
      self.settings.curYear = self.settings.startYear;
    } else if (self.settings.curYear > self.settings.endYear) {
      self.settings.curYear = self.settings.endYear;
    };

    for (let i = 1; i <= 12; i++) {
      html += self.buildDays(self.settings.curYear, i);
    };

    self.dom.pane.innerHTML = html;

    // self.dom.pane.scrollIntoView({
    //   behavior: 'smooth'
    // });
    // document.documentElement.scrollTop = 0;
  };

  zenCalendar.buildStage = function() {
    let self = this;
    let html = `<div class="box">
      <section class="in_year">
        <a class="prev" href="javascript://" rel="prev_year"></a>
        <a class="next" href="javascript://" rel="next_year"></a>
        <select name="curYear">`;

    for (let i = self.settings.startYear; i <= self.settings.endYear; i++) {
      html += `<option value="${i}"${self.settings.curYear === i ? ' selected' : ''}>${i}</option>`;
    };

    html += `</select>
      </section>
      <section>
        <a class="btn" href="javascript://" rel="back_today">返回今日</a>
      </section>
      <section class="in_toggle">
        <a class="btn" href="javascript://" rel="toggle_tool"></a>
      </section>
    </div>`;

    self.dom.desk.innerHTML = html;

    self.dom.body.insertAdjacentElement('afterbegin', self.dom.tool);
    self.dom.body.insertAdjacentElement('afterbegin', self.dom.desk);
    self.dom.body.insertAdjacentElement('afterbegin', self.dom.pane);

    self.buildTool();
    self.buildPrintModes();
  };

  zenCalendar.buildTool = function() {
    let self = this;
    let opts = Object.assign({}, self.config, self.settings);
    let html = `<div class="box">
      <section class="is_switch">
        <input type="checkbox" name="hideFillDay" id="tool_hideFillDay"${opts.hideFillDay ? ' checked' : ''}>
        <label for="tool_hideFillDay">隐藏前后月份的日期</label>
      </section>
      <section class="is_switch">
        <input type="checkbox" name="hideYearWeek" id="tool_hideYearWeek"${opts.hideYearWeek ? ' checked' : ''}>
        <label for="tool_hideYearWeek">隐藏周数</label>
      </section>
      <section class="is_switch">
        <input type="checkbox" name="lockRow" id="tool_lockRow"${opts.lockRow ? ' checked' : ''}>
        <label for="tool_lockRow">固定行数</label>
      </section>
      <section class="is_namevalue">
        <label>星期开始于</label>
        <select name="wday">`;

    for (let i = 0; i < 7; i++) {
      html += `<option value="${i}"${opts.wday === i ? ' selected' : ''}>${self.language.startWeekName[parseInt(i, 10)]}</option>`;
    };

    html += `</select>
      </section>
      <section class="is_namevalue in_mode">
        <label>打印模式</label>
        <select name="printSize"></select>
      </section>
      <section class="is_namevalue in_theme">
        <label>主题</label>
        <select name="theme">`;

    for (let x in opts.themes) {
      html += `<option value="${x}"${opts.theme === x ? ' selected' : ''}>${opts.themes[x]}</option>`;
    };

    html += `</select>
      </section>
    </div>
    <a class="toggle" href="javascript://" rel="toggle_tool"></a>`;

    self.dom.tool.innerHTML = html;
  };

  // 处理打印模式
  zenCalendar.parsePrintModes = function(list) {
    let self = this;
    self.config.modes = {};

    if (Array.isArray(list) && list.length) {
      for (let x of list) {
        self.config.modes[x.toLowerCase()] = x.slice(-1).toLowerCase() === 'h' ? x.slice(0, -1) + ' ' + self.language.horizontal : x;
      };
    };
  };

  zenCalendar.buildPrintModes = function() {
    let self = this;
    let list = self.dom.tool.querySelectorAll('select');
    let el;

    for (let x of list) {
      if (x.name === 'printSize') {
        el = x;
        break;
      };
    };

    if (!el) {
      return;
    };

    let html = `<option value="">浏览</option>`;

    for (let x in self.config.modes) {
      html += `<option value="${x}"${self.settings.printSize.toLowerCase() === x ? ' selected' : ''}>${self.config.modes[x]}</option>`;
    };

    el.innerHTML = html;
  };

  zenCalendar.buildDays = function(year, month) {
    let self = this;

    if (!self.isInteger(year) || !self.isInteger(month)) {return};

    let jsMonth = month - 1;
    let monthDays = self.getMonthDays(year);
    let sameMonthDate = new Date(year, jsMonth, 1);
    let nowDate = new Date();
    let nowText = [nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate()].join('-');

    // 获取当月第一天
    let monthFirstDay = sameMonthDate.getDay() - self.settings.wday;
    if (monthFirstDay < 0) {
      monthFirstDay += 7;
    };

    // 自适应或固定行数
    let monthDayMax = self.settings.lockRow ? 42 : Math.ceil((monthDays[jsMonth] + monthFirstDay) / 7) * 7;

    let weekList = [];
    let dayList = [];

    // 星期
    for(let i = 0; i < 7; i++) {
      let item = {
        classVal: [],
        num: (i + self.settings.wday) % 7
      };

      // 高亮周末
      if (i === self.settings.saturday) {
        item.classVal.push('sat');
      } else if(i === self.settings.sunday) {
        item.classVal.push('sun');
      };

      weekList.push(item);
    };

    let todayDate;
    let todayYear;
    let todayMonth;
    let todayNum;
    let todayText;
    let todayName;

    for (let i = 0; i < monthDayMax; i++) {
      let item = {
        classVal: [],
        num: '',
        name: '',
      };

      todayYear = year;
      todayMonth = month;
      todayNum = i - monthFirstDay + 1;
      
      // 填充前后月份的日期
      if (todayNum <= 0) {
        item.classVal.push('other');

        if (todayMonth <= 1) {
          todayYear--;
          todayMonth = 12;
          todayNum = monthDays[11] + todayNum;
        } else {
          todayMonth--;
          todayNum = monthDays[jsMonth - 1] + todayNum;
        };

      } else if (todayNum > monthDays[jsMonth]) {
        item.classVal.push('other');

        if (todayMonth >= 12) {
          todayYear++;
          todayMonth = 1;
          todayNum = todayNum - monthDays[0];
        } else {
          todayMonth++;
          todayNum -= monthDays[jsMonth];
        };
      };

      todayDate = new Date(todayYear, todayMonth - 1, todayNum);
      todayText = [todayYear, todayMonth, todayNum].join('-');

      // 高亮今天
      if (todayText === nowText) {
        item.classVal.push('now');
      };

      // 高亮周末
      if (i % 7 === self.settings.saturday) {
        item.classVal.push('sat');
      } else if (i % 7 === self.settings.sunday) {
        item.classVal.push('sun');
      };

      // 判断节假日
      if (typeof self.holiday[[todayMonth, todayNum].join('-')] === 'string') {
        item.classVal.push('holiday');
        item.name = self.holiday[[todayMonth, todayNum].join('-')];
      } else if (typeof self.holiday[[todayYear, todayMonth, todayNum].join('-')] === 'string') {
        item.classVal.push('holiday');
        item.name = self.holiday[[todayYear, todayMonth, todayNum].join('-')];
      };

      // 判断是工作日
      if (typeof self.workday[[todayMonth, todayNum].join('-')] === 'string') {
        item.classVal.push('workday');
        item.name = self.workday[[todayMonth, todayNum].join('-')];
      } else if (typeof self.workday[[todayYear, todayMonth, todayNum].join('-')] === 'string') {
        item.classVal.push('workday');
        item.name = self.workday[[todayYear, todayMonth, todayNum].join('-')];
      };

      // 农历
      if (!item.name.length) {
        item.name = self.getCnName(todayYear, todayMonth, todayNum);
      };

      // 周数
      if (i % 7 === 0) {
        item.week = self.getWeekNum(todayDate);
      };

      item.num = todayNum;
      dayList.push(item);
    };

    return self.getDaysHtml({
      year: year,
      month: month,
      weekList: weekList,
      dayList: dayList
    });
  };

  // 构建日期列表
  zenCalendar.getDaysHtml = function(opts) {
    let self = this;
    let html = `<section>
      <div class="hd">
        <span class="year">${opts.year}</span>
        <span class="month">${opts.month}</span>
      </div>
      <div class="bd">
        <ol class="weeks">`;

    for (let x in opts.weekList) {
      html += `<li class="week_${opts.weekList[x].num}${(Array.isArray(opts.weekList[x].classVal) && opts.weekList[x].classVal.length) ? ' ' + opts.weekList[x].classVal.join(' ') : ''}"></li>`;
    };

    html += `</ol>
        <ol class="days">`;

    for (let x in opts.dayList) {
      html += `<li${(Array.isArray(opts.dayList[x].classVal) && opts.dayList[x].classVal.length) ? ' class="' + opts.dayList[x].classVal.join(' ') + '"' : ''}>
        <div class="item">`;

      if (opts.dayList[x].week) {
        html += `<span class="week">${opts.dayList[x].week}</span>`;
      };

      html += `<span class="num">${opts.dayList[x].num}</span>
          <span class="name">${opts.dayList[x].name}</span>
        </div>
      </li>`;
    };

    html += `</ol>
      </div>
    </section>`;

    return html;
  };

  // 构建日期列表
  zenCalendar.getCnName = function(year, month, day) {
    let self = this;
    let cnDate = calendar.solar2lunar(year, month, day);
    let mDay = [month, day].join('-');
    let text;

    // 自定义节日
    if (!cnDate.festival && self.festival.hasOwnProperty(mDay)) {
      cnDate.festival = self.festival[mDay];
    };

    // 农历节日
    if (cnDate.lunarFestival) {
      text = cnDate.lunarFestival;

    // 阳历节日
    } else if (cnDate.festival) {
      text = cnDate.festival;

    // 阳历节气
    } else if (cnDate.Term) {
      text = cnDate.Term;

    // 初一显示月份名
    } else if (cnDate.IDayCn === '初一') {
      text = cnDate.IMonthCn;

    } else {
      text = cnDate.IDayCn;
    };

    return text;
  };

  // 节日
  zenCalendar.festival = {
    '3-15': '消费者权益日'
  };

  // 休息日配置 (休)
  zenCalendar.holiday = {
    // 按月设置，每年都会重复
    // '1-1': '',
    // '5-1': '',
    // '10-1': '',
    // '10-2': '',
    // '10-3': '',

    // 按具体日期设置
    '2022-1-1': '',
    '2022-1-2': '',
    '2022-1-3': '',
    '2022-1-31': '',
    '2022-2-1': '',
    '2022-2-2': '',
    '2022-2-3': '',
    '2022-2-4': '',
    '2022-2-5': '',
    '2022-2-6': '',
    '2022-4-3': '',
    '2022-4-4': '',
    '2022-4-5': '',
    '2022-4-30': '',
    '2022-5-1': '',
    '2022-5-2': '',
    '2022-5-3': '',
    '2022-5-4': '',
    '2022-6-3': '',
    '2022-6-4': '',
    '2022-6-5': '',
    '2022-9-10': '',
    '2022-9-11': '',
    '2022-9-12': '',
    '2022-10-1': '',
    '2022-10-2': '',
    '2022-10-3': '',
    '2022-10-4': '',
    '2022-10-5': '',
    '2022-10-6': '',
    '2022-10-7': '',
  };

  // 工作日配置 (班)
  zenCalendar.workday = {
    '2022-1-29': '',
    '2022-1-30': '',
    '2022-4-2': '',
    '2022-4-24': '',
    '2022-5-7': '',
    '2022-10-8': '',
    '2022-10-9': '',
  };

  document.addEventListener('DOMContentLoaded', function() {
    zenCalendar.init();
  });
})(window);
