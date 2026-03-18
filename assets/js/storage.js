import { DEFAULT_GOAL, STORAGE_KEYS } from './config.js';
import { safeJsonParse } from './utils.js';

export function getChecksToday() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.checksToday) || "{}", {});
}

export function setChecksToday(value) {
  localStorage.setItem(STORAGE_KEYS.checksToday, JSON.stringify(value || {}));
}

export function getMoney() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.money) || "[]", []);
}

export function setMoney(value) {
  localStorage.setItem(STORAGE_KEYS.money, JSON.stringify(value || []));
}

export function getExpenses() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.expenses) || "[]", []);
}

export function setExpenses(value) {
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(value || []));
}

export function getGoalSettings() {
  return {
    ...DEFAULT_GOAL,
    ...safeJsonParse(localStorage.getItem(STORAGE_KEYS.goalSettings) || "{}", {})
  };
}

export function setGoalSettings(value) {
  localStorage.setItem(STORAGE_KEYS.goalSettings, JSON.stringify({ ...DEFAULT_GOAL, ...(value || {}) }));
}

export function getScheduleAlertedToday() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.scheduleAlertedToday) || "{}", {});
}

export function setScheduleAlertedToday(value) {
  localStorage.setItem(STORAGE_KEYS.scheduleAlertedToday, JSON.stringify(value || {}));
}
