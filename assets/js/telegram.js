import { TELEGRAM_DEFAULTS } from './config.js';
import { getSystemSettings } from './storage.js';

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildTelegramBlock(title, status, rows = [], footer = '') {
  const bodyRows = rows.map(([label, value]) => `<b>${escapeHtml(label)}:</b> <code>${escapeHtml(value)}</code>`).join('\n');
  return `<b>◈════════ Premium Pro ════════◈</b>\n<b>${escapeHtml(title)} [${escapeHtml(status)}]</b>\n<b>◈════════════════════════════◈</b>\n\n${bodyRows}${footer ? `\n\n${escapeHtml(footer)}` : ''}`;
}

function shouldSend(type) {
  const settings = getSystemSettings();
  if (!settings.telegramEnabled) return false;
  if (type === 'task') return settings.telegramTaskEnabled;
  if (type === 'income') return settings.telegramIncomeEnabled;
  if (type === 'expense') return settings.telegramExpenseEnabled;
  if (type === 'schedule') return settings.telegramScheduleEnabled;
  return true;
}

export async function sendTelegram(message, type = 'general') {
  const settings = getSystemSettings();
  if (!shouldSend(type)) return null;
  const token = settings.telegramBotToken || TELEGRAM_DEFAULTS.botToken;
  const chatId = settings.telegramChatId || TELEGRAM_DEFAULTS.chatId;
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  }).catch(() => null);
}
