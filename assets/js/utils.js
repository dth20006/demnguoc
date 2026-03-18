import { BADGE_LIBRARY, DEFAULT_ACHIEVEMENTS, DEFAULT_HISTORY_ENTRY, DEFAULT_SYSTEM_SETTINGS, EXPENSE_CATEGORY_OPTIONS, TASK_CATEGORY_OPTIONS } from './config.js';

export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function parseFirestoreString(fieldObj, fallback = '') {
  if (!fieldObj) return fallback;
  if (fieldObj.stringValue !== undefined) return fieldObj.stringValue;
  return fallback;
}

export function parseFirestoreNumber(fieldObj, fallback = 0) {
  if (!fieldObj) return fallback;
  if (fieldObj.integerValue !== undefined) return Number(fieldObj.integerValue) || fallback;
  if (fieldObj.doubleValue !== undefined) return Number(fieldObj.doubleValue) || fallback;
  if (fieldObj.stringValue !== undefined) return Number(fieldObj.stringValue) || fallback;
  return fallback;
}

export function formatMoney(amount) {
  return `${Math.round(Number(amount) || 0).toLocaleString('vi-VN')}đ`;
}

export function formatDateKey(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatFullDate(dateObj) {
  return `${formatDateKey(dateObj)}/${dateObj.getFullYear()}`;
}

export function formatDocId(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

export function docIdToDateDisplay(docId) {
  const [year, month, day] = String(docId).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

export function getDateFromDocId(docId) {
  const [year, month, day] = String(docId).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function toDateInputValue(dateObj = new Date()) {
  return formatDocId(dateObj);
}

export function normalizeDateInput(value) {
  if (!value) return formatDocId(new Date());
  if (value.includes('/')) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  }
  return value;
}

export function parseTaskDuration(taskStr) {
  const regex = /(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/;
  const match = String(taskStr).match(regex);
  if (!match) return 0;
  const start = Number(match[1]) + Number(match[2] || 0) / 60;
  const end = Number(match[3]) + Number(match[4] || 0) / 60;
  return Math.max(end - start, 0);
}

export function parseTaskStartTime(taskStr) {
  const match = String(taskStr).match(/^(\d{1,2})(?::(\d{2}))?\s*-/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2] || 0),
    totalMinutes: Number(match[1]) * 60 + Number(match[2] || 0)
  };
}

export function parseTaskEndTime(taskStr) {
  const match = String(taskStr).match(/-\s*(\d{1,2})(?::(\d{2}))?/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2] || 0),
    totalMinutes: Number(match[1]) * 60 + Number(match[2] || 0)
  };
}

export function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function inferTaskCategory(taskText = '') {
  const text = String(taskText).toLowerCase();
  if (text.includes('ship')) return 'kiếm tiền';
  if (text.includes('meet') || text.includes('học')) return 'học tập';
  if (text.includes('ngủ')) return 'nghỉ ngơi';
  if (text.includes('ăn')) return 'sinh hoạt';
  return 'cá nhân';
}

export function inferTaskPriority(taskText = '') {
  const text = String(taskText).toLowerCase();
  if (text.includes('deadline') || text.includes('thi') || text.includes('urgent')) return 'cao';
  if (text.includes('ship') || text.includes('meet')) return 'vừa';
  return 'thấp';
}

export function normalizeTask(rawTask) {
  if (typeof rawTask === 'object' && rawTask !== null) {
    return {
      text: rawTask.text || rawTask.title || '',
      category: rawTask.category || inferTaskCategory(rawTask.text || rawTask.title || ''),
      priority: rawTask.priority || inferTaskPriority(rawTask.text || rawTask.title || ''),
      deadline: rawTask.deadline || '',
      duration: parseTaskDuration(rawTask.text || rawTask.title || ''),
      startTime: parseTaskStartTime(rawTask.text || rawTask.title || ''),
      endTime: parseTaskEndTime(rawTask.text || rawTask.title || '')
    };
  }

  const text = String(rawTask || '').trim();
  return {
    text,
    category: inferTaskCategory(text),
    priority: inferTaskPriority(text),
    deadline: '',
    duration: parseTaskDuration(text),
    startTime: parseTaskStartTime(text),
    endTime: parseTaskEndTime(text)
  };
}

export function isPaidTask(task) {
  return normalizeTask(task).category === 'kiếm tiền';
}

export function isStudyTask(task) {
  return normalizeTask(task).category === 'học tập';
}

export function isNonWorkingTask(task) {
  const category = normalizeTask(task).category;
  return category === 'nghỉ ngơi' || category === 'sinh hoạt';
}

export function calculateStreak(historyMap = {}) {
  const entries = Object.entries(historyMap)
    .map(([dateId, entry]) => ({ dateId, ...DEFAULT_HISTORY_ENTRY, ...entry }))
    .sort((a, b) => getDateFromDocId(a.dateId) - getDateFromDocId(b.dateId));

  let current = 0;
  let best = 0;
  let previousDate = null;

  entries.forEach((entry) => {
    const active = Number(entry.completedTasks) > 0 || Number(entry.income) > 0;
    if (!active) {
      current = 0;
      previousDate = getDateFromDocId(entry.dateId);
      return;
    }

    const currentDate = getDateFromDocId(entry.dateId);
    if (!previousDate) {
      current = 1;
    } else {
      const diff = Math.round((currentDate - previousDate) / (1000 * 60 * 60 * 24));
      current = diff === 1 ? current + 1 : 1;
    }
    previousDate = currentDate;
    best = Math.max(best, current);
  });

  return { currentStreak: current, bestStreak: Math.max(best, DEFAULT_ACHIEVEMENTS.bestStreak || 0) };
}

export function calculateEta(currentAmount, targetAmount, averagePerDay) {
  const remaining = Math.max(Number(targetAmount || 0) - Number(currentAmount || 0), 0);
  if (remaining <= 0) return { label: 'Đã đạt', dailyNeeded: 0, daysNeeded: 0 };
  if (averagePerDay <= 0) return { label: 'Chưa đủ dữ liệu', dailyNeeded: remaining, daysNeeded: null };
  const daysNeeded = Math.ceil(remaining / averagePerDay);
  return {
    label: `${daysNeeded} ngày nữa`,
    dailyNeeded: Math.ceil(remaining / Math.max(daysNeeded, 1)),
    daysNeeded
  };
}

export function downloadTextFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows = []) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}

export function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

export function summarizeExpenseCategories(expenses = []) {
  return expenses.reduce((acc, item) => {
    const category = item.category && EXPENSE_CATEGORY_OPTIONS.includes(item.category) ? item.category : 'khác';
    acc[category] = (acc[category] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
}

export function getTrendLabel(currentValue, previousValue) {
  if (currentValue > previousValue) return 'Tăng';
  if (currentValue < previousValue) return 'Giảm';
  return 'Ổn định';
}

export function determineCatRank({ streak = 0, totalBalance = 0, completionRate = 0 }) {
  if (totalBalance >= 10000000 || completionRate >= 90) return 'Mèo đại gia';
  if (streak >= 14 || completionRate >= 75) return 'Mèo chiến thần';
  if (streak >= 7 || totalBalance >= 1000000) return 'Mèo chăm chỉ';
  return 'Mèo thường';
}

export function computeCatLevel({ streak = 0, totalBalance = 0, completedTasks = 0 }) {
  return Math.max(1, Math.floor(streak + totalBalance / 1000000 + completedTasks / 10) + 1);
}

export function getUnlockedBadges({ historyMap = {}, totalBalance = 0, longGoalAmount = 0 }) {
  const unlocked = new Set();
  const entries = Object.values(historyMap).map((entry) => ({ ...DEFAULT_HISTORY_ENTRY, ...entry }));
  const hasTask = entries.some((entry) => Number(entry.completedTasks) > 0);
  if (hasTask) unlocked.add('first_task');

  let incomeStreak = 0;
  let spendSmartStreak = 0;
  entries.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
  entries.forEach((entry) => {
    incomeStreak = Number(entry.income) > 0 ? incomeStreak + 1 : 0;
    if (incomeStreak >= 3) unlocked.add('income_3_days');
    spendSmartStreak = Number(entry.expenses) <= Number(DEFAULT_SYSTEM_SETTINGS.expenseWarningThreshold) ? spendSmartStreak + 1 : 0;
    if (spendSmartStreak >= 7) unlocked.add('smart_spender');
    if (Number(entry.completionRate) >= 100) unlocked.add('perfect_day');
  });

  const streak = calculateStreak(historyMap);
  if (streak.bestStreak >= 7) unlocked.add('streak_7');
  if (totalBalance >= 1000000) unlocked.add('first_million');
  if (longGoalAmount > 0 && totalBalance >= longGoalAmount / 2) unlocked.add('goal_half');

  return BADGE_LIBRARY.filter((badge) => unlocked.has(badge.id));
}
