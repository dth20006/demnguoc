export const FIREBASE_PROJECT_ID = "deas-75de8";
export const FIREBASE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
export const FIREBASE_SCHEDULE_URL = `${FIREBASE_BASE_URL}/warrior/root/schedule/main`;
export const FIREBASE_DAYS_URL = `${FIREBASE_BASE_URL}/warrior/root/days`;
export const FIREBASE_GOAL_URL = `${FIREBASE_BASE_URL}/warrior/root/settings/goal/main`;

export const TELEGRAM_BOT_TOKEN = "8506964729:AAFvC-IkiijRn98BtvUuT5aHdOVjifYVMlo";
export const TELEGRAM_CHAT_ID = "7114174347";

export const STORAGE_KEYS = {
  checksToday: "checks_today",
  money: "money",
  expenses: "expenses",
  scheduleAlertedToday: "schedule_alerted_today",
  goalSettings: "goalSettings"
};

export const DEFAULT_GOAL = {
  goalName: "Mua xe",
  goalAmount: 10000000,
  goalNote: "Hoàn thành trước cuối tháng"
};

export const DEFAULT_SCHEDULE = [
  ["14/03", "00-06h: Ngủ", "07-09h: Ship", "09:25-11:25: Ăn", "11:25-14:00: Ship", "14:10-16:10: Meet", "16:30-23:30: Ship"]
];

export const WAGE_RATE = 80000;
