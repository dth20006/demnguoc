import {
  DEFAULT_GOAL,
  DEFAULT_SCHEDULE,
  FIREBASE_DAYS_URL,
  FIREBASE_GOAL_URL,
  FIREBASE_SCHEDULE_URL
} from './config.js';
import {
  docIdToDateDisplay,
  parseFirestoreNumber,
  parseFirestoreString,
  safeJsonParse
} from './utils.js';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Firebase request failed: ${response.status}`);
  }
  return response.json();
}

export async function loadScheduleFromCloud() {
  const data = await requestJson(FIREBASE_SCHEDULE_URL);
  const scheduleStr = parseFirestoreString(data?.fields?.scheduleData, JSON.stringify(DEFAULT_SCHEDULE));
  const schedule = safeJsonParse(scheduleStr, DEFAULT_SCHEDULE);
  return Array.isArray(schedule) && schedule.length ? schedule : DEFAULT_SCHEDULE;
}

export async function saveScheduleToCloud(schedule) {
  return requestJson(FIREBASE_SCHEDULE_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        scheduleData: { stringValue: JSON.stringify(schedule || []) },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    })
  });
}

export async function loadDaysFromCloud() {
  const data = await requestJson(FIREBASE_DAYS_URL);
  return data.documents || [];
}

export async function backupDayToCloud({ todayDocId, todayFullStr, todayIncome, checks, todayExpenses }) {
  return requestJson(`${FIREBASE_DAYS_URL}/${todayDocId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        dateDisplay: { stringValue: todayFullStr },
        income: { integerValue: String(todayIncome || 0) },
        checks: { stringValue: JSON.stringify(checks || {}) },
        expenses: { stringValue: JSON.stringify(todayExpenses || []) },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    })
  });
}

export async function loadGoalFromCloud() {
  const data = await requestJson(FIREBASE_GOAL_URL);
  return {
    goalName: parseFirestoreString(data?.fields?.goalName, DEFAULT_GOAL.goalName),
    goalAmount: parseFirestoreNumber(data?.fields?.goalAmount, DEFAULT_GOAL.goalAmount),
    goalNote: parseFirestoreString(data?.fields?.goalNote, DEFAULT_GOAL.goalNote),
    updatedAt: parseFirestoreString(data?.fields?.updatedAt, '')
  };
}

export async function saveGoalToCloud(goal) {
  return requestJson(FIREBASE_GOAL_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        goalName: { stringValue: goal.goalName || DEFAULT_GOAL.goalName },
        goalAmount: { integerValue: String(Math.max(0, Math.round(Number(goal.goalAmount) || 0))) },
        goalNote: { stringValue: goal.goalNote || '' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    })
  });
}

export function mapDayDocsToLocalState(dayDocs, schedule, todayDocId, todayFullStr) {
  const moneyArr = schedule.map(() => 0);
  let checksToday = {};
  let allExpenses = [];

  dayDocs.forEach((doc) => {
    const fields = doc.fields || {};
    const docName = doc.name || '';
    const docId = docName.split('/').pop();
    const dateDisplay = parseFirestoreString(fields.dateDisplay, docIdToDateDisplay(docId));
    const shortDate = dateDisplay.slice(0, 5);
    const scheduleIndex = schedule.findIndex((day) => day[0] === shortDate);
    const income = parseFirestoreNumber(fields.income);

    if (scheduleIndex !== -1) {
      moneyArr[scheduleIndex] = income;
    }

    const expenses = safeJsonParse(parseFirestoreString(fields.expenses, '[]'), []);
    if (Array.isArray(expenses)) allExpenses = allExpenses.concat(expenses);

    if (docId === todayDocId || dateDisplay === todayFullStr) {
      checksToday = safeJsonParse(parseFirestoreString(fields.checks, '{}'), {});
    }
  });

  return { moneyArr, checksToday, allExpenses };
}
