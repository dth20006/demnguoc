import { DEFAULT_ACHIEVEMENTS, DEFAULT_GOALS, DEFAULT_HISTORY_ENTRY, DEFAULT_SCHEDULE, DEFAULT_SYSTEM_SETTINGS, STORAGE_KEYS } from './config.js';
import { formatDocId, safeJsonParse } from './utils.js';

function getItem(key, fallback) {
  return safeJsonParse(localStorage.getItem(key) || JSON.stringify(fallback), fallback);
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getChecksToday() { return getItem(STORAGE_KEYS.checksToday, {}); }
export function setChecksToday(value) { setItem(STORAGE_KEYS.checksToday, value || {}); }
export function getMoney() { return getItem(STORAGE_KEYS.money, []); }
export function setMoney(value) { setItem(STORAGE_KEYS.money, value || []); }
export function getExpenses() { return getItem(STORAGE_KEYS.expenses, []); }
export function setExpenses(value) { setItem(STORAGE_KEYS.expenses, value || []); }
export function getScheduleAlertedToday() { return getItem(STORAGE_KEYS.scheduleAlertedToday, {}); }
export function setScheduleAlertedToday(value) { setItem(STORAGE_KEYS.scheduleAlertedToday, value || {}); }
export function getGoalSettings() { return { ...DEFAULT_GOALS, ...getItem(STORAGE_KEYS.goalSettings, {}) }; }
export function setGoalSettings(value) { setItem(STORAGE_KEYS.goalSettings, { ...getGoalSettings(), ...(value || {}) }); }
export function getSystemSettings() { return { ...DEFAULT_SYSTEM_SETTINGS, ...getItem(STORAGE_KEYS.systemSettings, {}) }; }
export function setSystemSettings(value) { setItem(STORAGE_KEYS.systemSettings, { ...getSystemSettings(), ...(value || {}) }); }
export function getSchedule() { return getItem(STORAGE_KEYS.schedule, DEFAULT_SCHEDULE); }
export function setSchedule(value) { setItem(STORAGE_KEYS.schedule, value || DEFAULT_SCHEDULE); }
export function getHistory() { return getItem(STORAGE_KEYS.history, {}); }
export function setHistory(value) { setItem(STORAGE_KEYS.history, value || {}); }
export function getAchievements() { return { ...DEFAULT_ACHIEVEMENTS, ...getItem(STORAGE_KEYS.achievements, {}) }; }
export function setAchievements(value) { setItem(STORAGE_KEYS.achievements, { ...getAchievements(), ...(value || {}) }); }

export function getHistoryEntry(dateId = formatDocId(new Date())) {
  return { ...DEFAULT_HISTORY_ENTRY, ...(getHistory()[dateId] || {}), updatedAt: new Date().toISOString() };
}

export function setHistoryEntry(dateId, entry) {
  const history = getHistory();
  history[dateId] = { ...DEFAULT_HISTORY_ENTRY, ...(history[dateId] || {}), ...(entry || {}), updatedAt: new Date().toISOString() };
  setHistory(history);
}

export function getBackupData() {
  return {
    checksToday: getChecksToday(),
    money: getMoney(),
    expenses: getExpenses(),
    goalSettings: getGoalSettings(),
    systemSettings: getSystemSettings(),
    history: getHistory(),
    achievements: getAchievements(),
    schedule: getSchedule(),
    scheduleAlertedToday: getScheduleAlertedToday()
  };
}

export function restoreBackupData(data = {}) {
  if (data.checksToday) setChecksToday(data.checksToday);
  if (data.money) setMoney(data.money);
  if (data.expenses) setExpenses(data.expenses);
  if (data.goalSettings) setGoalSettings(data.goalSettings);
  if (data.systemSettings) setSystemSettings(data.systemSettings);
  if (data.history) setHistory(data.history);
  if (data.achievements) setAchievements(data.achievements);
  if (data.schedule) setSchedule(data.schedule);
  if (data.scheduleAlertedToday) setScheduleAlertedToday(data.scheduleAlertedToday);
}
