(function(window, undefined) {
  const notyf = new Notyf({
    dismissible: true,
    duration: 0,
    position: {
      x: 'center',
      y: 'top',
    },
    ripple: false,
  });

  const zenCalendar = {
    devMode: false,
    prefix: 'zencalendar_',

    dom: {},
    reg: {
      isYear: /^\d{4}$/,
      isTime: /^\d{1,2}(\:\d{1,2}){1,2}$/
    },
    settings: {
      curYear: new Date().getFullYear(),
      startYear: 1900,        // 开始日期
      endYear: 2100,          // 结束日期
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
    },

    themeMaps: {},          // 主题样式列表
    printMaps: {},          // 打印模式列表

    festival: {},
    holiday: {},
    workday: {},
  };

  // 判断是否是整数
  zenCalendar.isInteger = function(value) {
    return typeof value === 'number' && !isNaN(value) && /^\d+$/.test(value);
  };

  // 获取当年每月的天数
  zenCalendar.getMonthDays = function(year) {
    const leapYearDay = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 1 : 0;
    return [31, 28 + leapYearDay, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  };

  // 获取周数 (ISO_8601 标准)
  // https://zh.wikipedia.org/wiki/ISO_8601
  zenCalendar.getWeekNum = function(dateObj) {
    const self = this;
    const curTime = dateObj.getTime();
    const yearFirstDate = new Date(dateObj.getFullYear(), 0, 1, 0, 0, 0, 0);
    let weekFirstTime = yearFirstDate.getTime();
    let weekDay = yearFirstDate.getDay();
    let weekNum = 0;

    if (weekDay === 0) {
      weekDay = 7;
    };

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
    if (typeof name !== 'string' || !name.length) {
      return;
    };
    
    localStorage.setItem(this.prefix + name, JSON.stringify(data));
  };

  // 读取本地存储（localStorage）
  zenCalendar.getLocalStorage = function(name) {
    if (typeof name !== 'string' || !name.length) {
      return null;
    };

    const data = localStorage.getItem(this.prefix + name);

    try {
      return JSON.parse(data);
    } catch(e) {
      return null;
    };
  };

  zenCalendar.init = function() {
    const self = this;

    self.dom.themeStyle = document.createElement('style');
    document.head.insertAdjacentElement('beforeend', self.dom.themeStyle);

    self.dom.body = document.body;
    self.dom.desk = document.createElement('div');
    self.dom.desk.classList.add('desk');
    self.dom.tool = document.createElement('div');
    self.dom.tool.classList.add('tool');
    self.dom.pane = document.createElement('div');
    self.dom.pane.classList.add('calendar');

    self.mergeConfig();
    self.getOptions();

    if (self.devMode === true) {
      if ('serviceWorker' in navigator) {
         navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let x of registrations) {
            x.unregister().catch((error) => {
              console.error(`Registration failed with ${error}`);
            });
          };
        });
      };

    } else {
      self.buildPwa();
    };

    self.getCacheTheme();
    self.buildStage();
    self.ready();
  };

  // 合并页面配置项
  zenCalendar.mergeConfig = function() {
    const self = this;
    const config = window.zenCalendarConfig;

    if (!config || typeof config !== 'object') {
      return;
    };

    if (typeof config.devMode === 'boolean') {
      self.devMode = config.devMode;
    };

    if (Array.isArray(config.themes) && config.themes.length) {
      for (let x of config.themes) {
        self.themeMaps[x.id] = x.name;
      };
      self.settings.theme = config.themes[0].id;
    };

    for (let x of ['festival', 'holiday', 'workday']) {
      if (typeof config[x] === 'object') {
        self[x] = {...config[x]};
      };
    };
  };

  // 构建 PWA 配置
  zenCalendar.buildPwa = function() {
    const ua = navigator.userAgent.toLowerCase();
    const manifest = document.createElement('link');

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
      // .then((registration) => {
      //   console.log(registration);
      // }).catch((error) => {
      //   console.log(error);
      // });
    };
  };

  zenCalendar.ready = function() {
    const self = this;

    self.dom.body.addEventListener('change', (e) => {
      const el = e.target;
      const nodeName = el.nodeName.toLowerCase();

      if (nodeName === 'input') {
        const name = el.name;

        switch (name) {
          case 'hideFillDay':
          case 'hideYearWeek':
          case 'lockRow':
            self.settings[name] = el.checked;
            self.setOptions();
            break;
        };

        if (['lockRow'].indexOf(name) >= 0) {
          self.gotoYear();
        };

      } else if (nodeName === 'select') {
        const name = el.name;
        const value = el.value;

        switch (name) {
          case 'theme':
          case 'printSize':
            self.settings[name] = value;
            self.setOptions();
            break;

          case 'wday':
          case 'curYear':
            self.settings[name] = parseInt(value, 10);
            self.setOptions();
            self.gotoYear();
            break;
        };
      };
    });

    self.dom.body.addEventListener('click', (e) => {
      const el = e.target;
      const nodeName = el.nodeName.toLowerCase();

      if (nodeName === 'a') {
        event.preventDefault();
        const rel = el.rel;

        switch (rel) {
          case 'toggle_tool':
            self.dom.tool.classList.toggle('show');
            break;

          case 'back_today':
            self.gotoToday();
            break;

          case 'prev_year':
          case 'next_year':
            const sub = el.parentNode.querySelector('select');
            let value = self.settings.curYear;

            if (sub.name === 'curYear') {
              if (rel === 'prev_year') {
                value -= 1;
              } else {
                value += 1;
              };

              if (value >= self.settings.startYear && value <= self.settings.endYear) {
                sub.value = value;
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
    self.checkViewNow();
  };

  // 获取配置参数
  zenCalendar.getOptions = function() {
    const self = this;

    Object.assign(self.settings, self.getLocalStorage('options'));
    self.formatOptions();
  };

  // 保存配置参数
  zenCalendar.setOptions = function() {
    const self = this;

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
      const size = self.settings.printSize.toLowerCase();

      if (!self.dom.body.classList.contains(size)) {
        self.dom.body.classList.remove(...['print', ...Object.keys(self.printMaps)]);
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

  // 转换配置参数
  zenCalendar.formatOptions = function() {
    const self = this;

    // 星期的起始位置
    self.settings.wday %= 7;
    self.settings.saturday = 6 - self.settings.wday;
    self.settings.sunday = (7 - self.settings.wday) % 7;
  };

  // 获取缓存主题
  zenCalendar.getCacheTheme = function() {
    const self = this;
    const cacheStyle = self.getLocalStorage('theme');

    if (!cacheStyle || typeof cacheStyle !== 'object' || typeof cacheStyle.timestamp !== 'number') {
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
    const self = this;
    const url = './themes/' + self.settings.theme + '/layout.css?v=' + new Date().getTime();

    fetch(url).then((response) => {
      if (!response.ok) {
        self.settings.theme = self.dom.themeStyle.dataset.id;
        self.setOptions();

        notyf.error(response.statusText);
        return;
      };

      // console.log('success', response);
      return response.text();

    }).then((data) => {
      const cacheStyle = {
        text: data,
        printMode: [],
        timestamp: new Date().getTime(),
      };

      // 解析声明注释
      const noteReg = data.match(/^\/\*(\s|.)*?\*\//);
      const noteRule = {};

      if (Array.isArray(noteReg) && noteReg.length) {
        const list = noteReg[0].match(/^\s+\*\s+\@.+$/gm);

        for (let x of list) {
          const row = x.match(/^\s+\*\s+\@([^\s]+)\s+(.+)$/);

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
      self.checkViewNow();

    }).catch((error) => {
      console.error('error', error);
      notyf.error(String(error));
    });
  };

  // 跳转到今天
  zenCalendar.gotoToday = function() {
    const self = this;
    const now = new Date();
    const year = now.getFullYear();
    const toolSelects = self.dom.desk.querySelectorAll('select');
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

  // 跳转到年份
  zenCalendar.gotoYear = function() {
    const self = this;
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

  zenCalendar.checkViewNow = function() {
    const self = this;
    const year = new Date().getFullYear();

    if (self.hasViewNow) {
      return;
    };

    if (self.dom.themeStyle.dataset.id && self.settings.curYear === year) {
      setTimeout(() => {
        self.hasViewNow = true;
        self.gotoToday();
      }, 200);
    };
  };

  zenCalendar.buildStage = function() {
    const self = this;
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
    const self = this;
    let html = `<div class="box">
      <section class="is_switch">
        <input type="checkbox" name="hideFillDay" id="tool_hideFillDay"${self.settings.hideFillDay ? ' checked' : ''}>
        <label for="tool_hideFillDay">隐藏前后月份的日期</label>
      </section>
      <section class="is_switch">
        <input type="checkbox" name="hideYearWeek" id="tool_hideYearWeek"${self.settings.hideYearWeek ? ' checked' : ''}>
        <label for="tool_hideYearWeek">隐藏周数</label>
      </section>
      <section class="is_switch">
        <input type="checkbox" name="lockRow" id="tool_lockRow"${self.settings.lockRow ? ' checked' : ''}>
        <label for="tool_lockRow">固定行数</label>
      </section>
      <section class="is_namevalue">
        <label for="tools_wday">星期开始于</label>
        <select name="wday" id="tools_wday">`;

    for (let i = 0; i < 7; i++) {
      html += `<option value="${i}"${self.settings.wday === i ? ' selected' : ''}>${self.language.startWeekName[parseInt(i, 10)]}</option>`;
    };

    html += `</select>
      </section>
      <section class="is_namevalue in_mode">
        <label for="tool_printSize">打印模式</label>
        <select name="printSize" id="tool_printSize"></select>
      </section>
      <section class="is_namevalue in_theme">
        <label for="tool_theme">主题</label>
        <select name="theme" id="tool_theme">`;

    for (let x in self.themeMaps) {
      html += `<option value="${x}"${self.settings.theme === x ? ' selected' : ''}>${self.themeMaps[x]}</option>`;
    };

    html += `</select>
      </section>`;

    if (navigator.onLine) {
      html += `<div class="gitbtn">
        <iframe src="https://ghbtns.com/github-btn.html?user=ciaoca&repo=ZenCalendar&type=star&count=true" frameborder="0" scrolling="0" height="20" title="GitHub"></iframe>
      </div>`;
    };

    html += `</div>
    <a class="toggle" href="javascript://" rel="toggle_tool"></a>`;

    self.dom.tool.innerHTML = html;
  };

  // 处理打印模式
  zenCalendar.parsePrintModes = function(list) {
    const self = this;
    self.printMaps = {};

    if (Array.isArray(list) && list.length) {
      for (let x of list) {
        self.printMaps[x.toLowerCase()] = x.slice(-1).toLowerCase() === 'h' ? x.slice(0, -1) + ' ' + self.language.horizontal : x;
      };
    };
  };

  zenCalendar.buildPrintModes = function() {
    const self = this;
    const list = self.dom.tool.querySelectorAll('select');
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

    for (let x in self.printMaps) {
      html += `<option value="${x}"${self.settings.printSize.toLowerCase() === x ? ' selected' : ''}>${self.printMaps[x]}</option>`;
    };

    el.innerHTML = html;
  };

  // 构建日期列表
  zenCalendar.buildDays = function(year, month) {
    const self = this;

    if (!self.isInteger(year) || !self.isInteger(month)) {
      return;
    };

    const jsMonth = month - 1;
    const monthDays = self.getMonthDays(year);
    const sameMonthDate = new Date(year, jsMonth, 1);
    const nowDate = new Date();
    const nowText = [nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate()].join('-');

    // 获取当月第一天
    let monthFirstDay = sameMonthDate.getDay() - self.settings.wday;
    if (monthFirstDay < 0) {
      monthFirstDay += 7;
    };

    // 自适应或固定行数
    const monthDayMax = self.settings.lockRow ? 42 : Math.ceil((monthDays[jsMonth] + monthFirstDay) / 7) * 7;

    const weekList = [];
    const dayList = [];

    // 星期
    for(let i = 0; i < 7; i++) {
      const item = {
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

    for (let i = 0; i < monthDayMax; i++) {
      const item = {
        classVal: [],
        num: '',
        name: '',
      };

      let todayYear = year;
      let todayMonth = month;
      let todayNum = i - monthFirstDay + 1;
      
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

      const todayDate = new Date(todayYear, todayMonth - 1, todayNum);
      const todayText = [todayYear, todayMonth, todayNum].join('-');

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

  // 获取日期名称
  zenCalendar.getCnName = function(year, month, day) {
    const self = this;
    const cnDate = calendar.solar2lunar(year, month, day);
    const dayKeys = [
      [year, month, day].join('-'),
      [month, day].join('-'),
      ['L', cnDate.lDay].join('-'),
      ['L', cnDate.lMonth, cnDate.lDay].join('-'),
    ];
    let text = '';

    for (let x of dayKeys) {
      if (self.festival.hasOwnProperty(x) && typeof self.festival[x] === 'string' && self.festival[x].length) {
        text = self.festival[x];
        break;
      };
    };

    if (!text.length) {
      // 农历节日、阳历节日、农历节气
      for (let x of ['lunarFestival', 'festival', 'Term']) {
        if (cnDate.hasOwnProperty(x) && typeof cnDate[x] === 'string' && cnDate[x].length) {
          text = cnDate[x];
          break;
        };
      };
    };

    if (!text.length) {
      // 初一显示月份名
      if (typeof cnDate.IMonthCn === 'string' && typeof cnDate.IDayCn === 'string') {
        text = cnDate.IDayCn === '初一' ? cnDate.IMonthCn : cnDate.IDayCn;
      };
    };

    return text;
  };

  zenCalendar.getDaysHtml = function(opts) {
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

  document.addEventListener('DOMContentLoaded', () => {
    zenCalendar.init();
  });
})(window);
