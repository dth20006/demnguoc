import { DEFAULT_ACHIEVEMENTS, DEFAULT_GOALS, DEFAULT_SYSTEM_SETTINGS, FIREBASE_PATHS } from './config.js';
import { docIdToDateDisplay, parseFirestoreNumber, parseFirestoreString, safeJsonParse } from './utils.js';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Firebase request failed: ${response.status}`);
  return response.json();
}

function wrapString(value = '') { return { stringValue: String(value) }; }
function wrapInt(value = 0) { return { integerValue: String(Math.round(Number(value) || 0)) }; }
function wrapBool(value = false) { return { booleanValue: Boolean(value) }; }

function parseSystemFields(fields = {}) {
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    wageRate: parseFirestoreNumber(fields.wageRate, DEFAULT_SYSTEM_SETTINGS.wageRate),
    telegramEnabled: fields.telegramEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.telegramEnabled,
    telegramTaskEnabled: fields.telegramTaskEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.telegramTaskEnabled,
    telegramIncomeEnabled: fields.telegramIncomeEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.telegramIncomeEnabled,
    telegramExpenseEnabled: fields.telegramExpenseEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.telegramExpenseEnabled,
    telegramScheduleEnabled: fields.telegramScheduleEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.telegramScheduleEnabled,
    expenseWarningThreshold: parseFirestoreNumber(fields.expenseWarningThreshold, DEFAULT_SYSTEM_SETTINGS.expenseWarningThreshold),
    catWidgetEnabled: fields.catWidgetEnabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.catWidgetEnabled,
    savingPercent: parseFirestoreNumber(fields.savingPercent, DEFAULT_SYSTEM_SETTINGS.savingPercent),
    spendingPercent: parseFirestoreNumber(fields.spendingPercent, DEFAULT_SYSTEM_SETTINGS.spendingPercent),
    emergencyPercent: parseFirestoreNumber(fields.emergencyPercent, DEFAULT_SYSTEM_SETTINGS.emergencyPercent),
    futurePercent: parseFirestoreNumber(fields.futurePercent, DEFAULT_SYSTEM_SETTINGS.futurePercent),
    themeAccent: parseFirestoreString(fields.themeAccent, DEFAULT_SYSTEM_SETTINGS.themeAccent),
    telegramBotToken: parseFirestoreString(fields.telegramBotToken, DEFAULT_SYSTEM_SETTINGS.telegramBotToken),
    telegramChatId: parseFirestoreString(fields.telegramChatId, DEFAULT_SYSTEM_SETTINGS.telegramChatId),
    catMoodDefaultText: parseFirestoreString(fields.catMoodDefaultText, DEFAULT_SYSTEM_SETTINGS.catMoodDefaultText),
    aiSuggestionDefaultText: parseFirestoreString(fields.aiSuggestionDefaultText, DEFAULT_SYSTEM_SETTINGS.aiSuggestionDefaultText),
    taskCategoryColors: safeJsonParse(parseFirestoreString(fields.taskCategoryColors, '{}'), DEFAULT_SYSTEM_SETTINGS.taskCategoryColors),
    scheduleAlert10Enabled: fields.scheduleAlert10Enabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.scheduleAlert10Enabled,
    scheduleAlert30Enabled: fields.scheduleAlert30Enabled?.booleanValue ?? DEFAULT_SYSTEM_SETTINGS.scheduleAlert30Enabled,
    updatedAt: parseFirestoreString(fields.updatedAt, '')
  };
}

export async function loadScheduleFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.schedule);
  return safeJsonParse(parseFirestoreString(data?.fields?.scheduleData, '[]'), []);
}

export async function saveScheduleToCloud(schedule) {
  return requestJson(FIREBASE_PATHS.schedule, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { scheduleData: wrapString(JSON.stringify(schedule || [])), updatedAt: wrapString(new Date().toISOString()) } })
  });
}

export async function loadDaysFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.days);
  return data.documents || [];
}

export async function loadGoalsFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.goals);
  const fields = data?.fields || {};
  return {
    ...DEFAULT_GOALS,
    dailyGoalName: parseFirestoreString(fields.dailyGoalName, DEFAULT_GOALS.dailyGoalName),
    dailyGoalAmount: parseFirestoreNumber(fields.dailyGoalAmount, DEFAULT_GOALS.dailyGoalAmount),
    dailyGoalNote: parseFirestoreString(fields.dailyGoalNote, DEFAULT_GOALS.dailyGoalNote),
    weeklyGoalName: parseFirestoreString(fields.weeklyGoalName, DEFAULT_GOALS.weeklyGoalName),
    weeklyGoalAmount: parseFirestoreNumber(fields.weeklyGoalAmount, DEFAULT_GOALS.weeklyGoalAmount),
    weeklyGoalNote: parseFirestoreString(fields.weeklyGoalNote, DEFAULT_GOALS.weeklyGoalNote),
    monthlyGoalName: parseFirestoreString(fields.monthlyGoalName, DEFAULT_GOALS.monthlyGoalName),
    monthlyGoalAmount: parseFirestoreNumber(fields.monthlyGoalAmount, DEFAULT_GOALS.monthlyGoalAmount),
    monthlyGoalNote: parseFirestoreString(fields.monthlyGoalNote, DEFAULT_GOALS.monthlyGoalNote),
    longGoalName: parseFirestoreString(fields.longGoalName, DEFAULT_GOALS.longGoalName),
    longGoalAmount: parseFirestoreNumber(fields.longGoalAmount, DEFAULT_GOALS.longGoalAmount),
    longGoalNote: parseFirestoreString(fields.longGoalNote, DEFAULT_GOALS.longGoalNote),
    updatedAt: parseFirestoreString(fields.updatedAt, '')
  };
}

export async function saveGoalsToCloud(goals) {
  return requestJson(FIREBASE_PATHS.goals, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        dailyGoalName: wrapString(goals.dailyGoalName), dailyGoalAmount: wrapInt(goals.dailyGoalAmount), dailyGoalNote: wrapString(goals.dailyGoalNote),
        weeklyGoalName: wrapString(goals.weeklyGoalName), weeklyGoalAmount: wrapInt(goals.weeklyGoalAmount), weeklyGoalNote: wrapString(goals.weeklyGoalNote),
        monthlyGoalName: wrapString(goals.monthlyGoalName), monthlyGoalAmount: wrapInt(goals.monthlyGoalAmount), monthlyGoalNote: wrapString(goals.monthlyGoalNote),
        longGoalName: wrapString(goals.longGoalName), longGoalAmount: wrapInt(goals.longGoalAmount), longGoalNote: wrapString(goals.longGoalNote),
        updatedAt: wrapString(new Date().toISOString())
      }
    })
  });
}

export async function loadSystemSettingsFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.system);
  return parseSystemFields(data?.fields || {});
}

export async function saveSystemSettingsToCloud(settings) {
  return requestJson(FIREBASE_PATHS.system, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        wageRate: wrapInt(settings.wageRate), telegramEnabled: wrapBool(settings.telegramEnabled), telegramTaskEnabled: wrapBool(settings.telegramTaskEnabled),
        telegramIncomeEnabled: wrapBool(settings.telegramIncomeEnabled), telegramExpenseEnabled: wrapBool(settings.telegramExpenseEnabled), telegramScheduleEnabled: wrapBool(settings.telegramScheduleEnabled),
        expenseWarningThreshold: wrapInt(settings.expenseWarningThreshold), catWidgetEnabled: wrapBool(settings.catWidgetEnabled), savingPercent: wrapInt(settings.savingPercent),
        spendingPercent: wrapInt(settings.spendingPercent), emergencyPercent: wrapInt(settings.emergencyPercent), futurePercent: wrapInt(settings.futurePercent),
        themeAccent: wrapString(settings.themeAccent), telegramBotToken: wrapString(settings.telegramBotToken), telegramChatId: wrapString(settings.telegramChatId),
        catMoodDefaultText: wrapString(settings.catMoodDefaultText), aiSuggestionDefaultText: wrapString(settings.aiSuggestionDefaultText),
        taskCategoryColors: wrapString(JSON.stringify(settings.taskCategoryColors || {})), scheduleAlert10Enabled: wrapBool(settings.scheduleAlert10Enabled),
        scheduleAlert30Enabled: wrapBool(settings.scheduleAlert30Enabled), updatedAt: wrapString(new Date().toISOString())
      }
    })
  });
}

export async function saveHistoryEntryToCloud(dateId, entry) {
  return requestJson(`${FIREBASE_PATHS.history}/${dateId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        dateDisplay: wrapString(entry.dateDisplay), completedTasks: wrapInt(entry.completedTasks), totalTasks: wrapInt(entry.totalTasks), completionRate: wrapInt(entry.completionRate),
        income: wrapInt(entry.income), expenses: wrapInt(entry.expenses), note: wrapString(entry.note), personalMood: wrapString(entry.personalMood),
        energyLevel: wrapInt(entry.energyLevel), dayRating: wrapInt(entry.dayRating), catMood: wrapString(entry.catMood), updatedAt: wrapString(new Date().toISOString())
      }
    })
  });
}

export async function loadHistoryFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.history);
  const documents = data.documents || [];
  return documents.reduce((acc, doc) => {
    const dateId = doc.name.split('/').pop();
    const fields = doc.fields || {};
    acc[dateId] = {
      dateDisplay: parseFirestoreString(fields.dateDisplay, docIdToDateDisplay(dateId)),
      completedTasks: parseFirestoreNumber(fields.completedTasks),
      totalTasks: parseFirestoreNumber(fields.totalTasks),
      completionRate: parseFirestoreNumber(fields.completionRate),
      income: parseFirestoreNumber(fields.income),
      expenses: parseFirestoreNumber(fields.expenses),
      note: parseFirestoreString(fields.note, ''),
      personalMood: parseFirestoreString(fields.personalMood, '🙂 ổn'),
      energyLevel: parseFirestoreNumber(fields.energyLevel, 7),
      dayRating: parseFirestoreNumber(fields.dayRating, 8),
      catMood: parseFirestoreString(fields.catMood, ''),
      updatedAt: parseFirestoreString(fields.updatedAt, '')
    };
    return acc;
  }, {});
}

export async function loadAchievementsFromCloud() {
  const data = await requestJson(FIREBASE_PATHS.achievements);
  const fields = data?.fields || {};
  return {
    ...DEFAULT_ACHIEVEMENTS,
    unlockedBadges: safeJsonParse(parseFirestoreString(fields.unlockedBadges, '[]'), []),
    currentStreak: parseFirestoreNumber(fields.currentStreak, DEFAULT_ACHIEVEMENTS.currentStreak),
    bestStreak: parseFirestoreNumber(fields.bestStreak, DEFAULT_ACHIEVEMENTS.bestStreak),
    catLevel: parseFirestoreNumber(fields.catLevel, DEFAULT_ACHIEVEMENTS.catLevel),
    catRank: parseFirestoreString(fields.catRank, DEFAULT_ACHIEVEMENTS.catRank),
    updatedAt: parseFirestoreString(fields.updatedAt, '')
  };
}

export async function saveAchievementsToCloud(achievements) {
  return requestJson(FIREBASE_PATHS.achievements, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        unlockedBadges: wrapString(JSON.stringify(achievements.unlockedBadges || [])), currentStreak: wrapInt(achievements.currentStreak), bestStreak: wrapInt(achievements.bestStreak),
        catLevel: wrapInt(achievements.catLevel), catRank: wrapString(achievements.catRank), updatedAt: wrapString(new Date().toISOString())
      }
    })
  });
}

export function mapDayDocsToLocalState(dayDocs = [], schedule = [], todayDocId = '', todayFullStr = '') {
  const moneyArr = schedule.map(() => 0);
  let checksToday = {};
  let allExpenses = [];

  dayDocs.forEach((doc) => {
    const fields = doc.fields || {};
    const docId = doc.name.split('/').pop();
    const dateDisplay = parseFirestoreString(fields.dateDisplay, docIdToDateDisplay(docId));
    const shortDate = dateDisplay.slice(0, 5);
    const index = schedule.findIndex((day) => day[0] === shortDate);
    if (index !== -1) moneyArr[index] = parseFirestoreNumber(fields.income);
    const expenses = safeJsonParse(parseFirestoreString(fields.expenses, '[]'), []);
    if (Array.isArray(expenses)) allExpenses = allExpenses.concat(expenses);
    if (docId === todayDocId || dateDisplay === todayFullStr) {
      checksToday = safeJsonParse(parseFirestoreString(fields.checks, '{}'), {});
    }
  });

  return { moneyArr, checksToday, allExpenses };
}
