window.zenCalendarConfig = {
  /**
   * 开发模式
   * 取消注册 Service Worker
   */
  devMode: true,

  /**
   * 主题样式列表
   * 对应目录 /themes/{id}/layout.css
   */
  themes: [
    {id: 'default', name: '小方块'},
    {id: 'table', name: '格子'},
  ],

  // 节日
  festival: {
    '3-15': '消费者权益日',
  },

  // 休息日配置 (休)
  holiday: {
    // 按月设置，每年都会重复
    // '1-1': '',
    // '5-1': '',
    // '10-1': '',
    // '10-2': '',
    // '10-3': '',

    // 按具体日期设置
    '2025-1-1': '',
    '2025-1-28': '',
    '2025-1-29': '',
    '2025-1-30': '',
    '2025-1-31': '',
    '2025-2-1': '',
    '2025-2-2': '',
    '2025-2-3': '',
    '2025-2-4': '',
    '2025-4-4': '',
    '2025-4-5': '',
    '2025-4-6': '',
    '2025-5-1': '',
    '2025-5-2': '',
    '2025-5-3': '',
    '2025-5-4': '',
    '2025-5-5': '',
    '2025-5-31': '',
    '2025-6-1': '',
    '2025-6-2': '',
    '2025-10-1': '',
    '2025-10-2': '',
    '2025-10-3': '',
    '2025-10-4': '',
    '2025-10-5': '',
    '2025-10-6': '',
    '2025-10-7': '',
    '2025-10-8': '',
  },

  // 工作日配置 (班)
  workday: {
    '2025-1-26': '',
    '2025-2-8': '',
    '2025-4-27': '',
    '2025-9-28': '',
    '2025-10-11': '',
  },
};