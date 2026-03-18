export const FIREBASE_PROJECT_ID = 'deas-75de8';
export const FIREBASE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
export const FIREBASE_PATHS = {
  schedule: `${FIREBASE_BASE_URL}/warrior/root/schedule/main`,
  days: `${FIREBASE_BASE_URL}/warrior/root/days`,
  goals: `${FIREBASE_BASE_URL}/warrior/root/settings/goal/main`,
  system: `${FIREBASE_BASE_URL}/warrior/root/settings/system/main`,
  theme: `${FIREBASE_BASE_URL}/warrior/root/settings/theme/main`,
  history: `${FIREBASE_BASE_URL}/warrior/root/history`,
  achievements: `${FIREBASE_BASE_URL}/warrior/root/achievements/main`
};

export const TELEGRAM_DEFAULTS = {
  botToken: '8506964729:AAFvC-IkiijRn98BtvUuT5aHdOVjifYVMlo',
  chatId: '7114174347'
};

export const STORAGE_KEYS = {
  checksToday: 'checks_today',
  money: 'money',
  expenses: 'expenses',
  scheduleAlertedToday: 'schedule_alerted_today',
  goalSettings: 'goalSettings',
  systemSettings: 'systemSettings',
  history: 'history',
  achievements: 'achievements',
  schedule: 'scheduleData',
  lastSnapshotDate: 'last_snapshot_date'
};

export const TASK_CATEGORY_OPTIONS = ['kiếm tiền', 'học tập', 'sinh hoạt', 'nghỉ ngơi', 'cá nhân'];
export const EXPENSE_CATEGORY_OPTIONS = ['ăn uống', 'di chuyển', 'mua sắm', 'học tập', 'khác'];
export const TASK_FILTERS = ['all', 'pending', 'done', 'money', 'study'];
export const EXPENSE_FILTERS = ['today', '3days', 'all'];

export const DEFAULT_GOALS = {
  dailyGoalName: 'Daily target',
  dailyGoalAmount: 300000,
  dailyGoalNote: 'Hoàn thành dòng tiền tối thiểu trong ngày.',
  weeklyGoalName: 'Weekly boost',
  weeklyGoalAmount: 2000000,
  weeklyGoalNote: 'Giữ nhịp đều để không bị hụt cuối tuần.',
  monthlyGoalName: 'Monthly growth',
  monthlyGoalAmount: 8000000,
  monthlyGoalNote: 'Bám sát đà kiếm tiền và tiết chế chi tiêu.',
  longGoalName: 'Mục tiêu dài hạn',
  longGoalAmount: 20000000,
  longGoalNote: 'Quỹ lớn cho kế hoạch tương lai.',
  updatedAt: ''
};

export const DEFAULT_SYSTEM_SETTINGS = {
  wageRate: 80000,
  telegramEnabled: true,
  telegramTaskEnabled: true,
  telegramIncomeEnabled: true,
  telegramExpenseEnabled: true,
  telegramScheduleEnabled: true,
  expenseWarningThreshold: 200000,
  catWidgetEnabled: true,
  savingPercent: 40,
  spendingPercent: 25,
  emergencyPercent: 20,
  futurePercent: 15,
  themeAccent: '#ff85b3',
  telegramBotToken: TELEGRAM_DEFAULTS.botToken,
  telegramChatId: TELEGRAM_DEFAULTS.chatId,
  catMoodDefaultText: 'Mèo thích những ngày bạn vừa hoàn thành task vừa kiểm soát chi tiêu ổn áp.',
  aiSuggestionDefaultText: 'Nếu task kiếm tiền còn nhiều và năng lượng ổn, hãy tăng nhẹ ca ship trọng điểm.',
  taskCategoryColors: {
    'kiếm tiền': '#6ee7ff',
    'học tập': '#c4b5fd',
    'sinh hoạt': '#f9a8d4',
    'nghỉ ngơi': '#fde68a',
    'cá nhân': '#a7f3d0'
  },
  scheduleAlert10Enabled: true,
  scheduleAlert30Enabled: false,
  updatedAt: ''
};

export const DEFAULT_ACHIEVEMENTS = {
  unlockedBadges: [],
  currentStreak: 0,
  bestStreak: 0,
  catLevel: 1,
  catRank: 'Mèo thường',
  updatedAt: ''
};

export const DEFAULT_HISTORY_ENTRY = {
  dateDisplay: '',
  completedTasks: 0,
  totalTasks: 0,
  completionRate: 0,
  income: 0,
  expenses: 0,
  note: '',
  personalMood: '🙂 ổn',
  energyLevel: 7,
  dayRating: 8,
  catMood: 'Ổn định',
  updatedAt: ''
};

export const DEFAULT_SCHEDULE = [
  ['18/03', '00:00-06:00 Ngủ', '06:30-11:30 Ship', '11:30-12:00 Ăn trưa', '12:00-14:00 Học bài', '14:10-16:10 Meet', '16:30-22:00 Ship', '22:15-23:00 Cá nhân']
];

export const BADGE_LIBRARY = [
  { id: 'first_task', label: 'Task đầu tiên', description: 'Hoàn thành task đầu tiên.' },
  { id: 'income_3_days', label: '3 ngày có thu nhập', description: 'Liên tiếp 3 ngày có income.' },
  { id: 'streak_7', label: 'Streak 7 ngày', description: 'Giữ active day 7 ngày liên tiếp.' },
  { id: 'first_million', label: '1 triệu đầu tiên', description: 'Tổng tích lũy chạm 1.000.000đ.' },
  { id: 'goal_half', label: '50% mục tiêu', description: 'Chạm ít nhất 50% mục tiêu dài hạn.' },
  { id: 'perfect_day', label: 'Perfect day', description: 'Hoàn thành 100% task trong ngày.' },
  { id: 'smart_spender', label: '7 ngày không vượt ngưỡng', description: '7 ngày liên tiếp không vượt ngưỡng chi tiêu.' }
];
