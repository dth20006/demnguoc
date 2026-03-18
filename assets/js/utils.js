export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

export function parseFirestoreString(fieldObj, fallback = "") {
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
  return `${Math.round(Number(amount) || 0).toLocaleString("vi-VN")}đ`;
}

export function formatDateKey(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function formatFullDate(dateObj) {
  return `${formatDateKey(dateObj)}/${dateObj.getFullYear()}`;
}

export function formatDocId(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
}

export function docIdToDateDisplay(docId) {
  const parts = String(docId).split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateShort(dateObj) {
  return `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
}

export function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function parseTaskDuration(taskStr) {
  const regex = /(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/;
  const match = String(taskStr).match(regex);
  if (!match) return 0;

  const h1 = parseInt(match[1] || 0, 10);
  const m1 = parseInt(match[2] || 0, 10);
  const h2 = parseInt(match[3] || 0, 10);
  const m2 = parseInt(match[4] || 0, 10);

  return (h2 + m2 / 60) - (h1 + m1 / 60);
}

export function parseTaskStartTime(taskStr) {
  const match = String(taskStr).match(/^(\d{1,2})(?::(\d{2}))?\s*-/);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] || "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return {
    hour,
    minute,
    hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

export function isNonWorkingTask(taskStr) {
  const text = String(taskStr).toLowerCase();
  return text.includes("ngủ") || text.includes("ăn");
}

export function isPaidTask(taskStr) {
  return String(taskStr).toLowerCase().includes("ship");
}

export function sanitizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}
