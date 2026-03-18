import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from './config.js';

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildTelegramBlock(title, status, rows = [], footer = '') {
  const line = '◈════════════════════◈';
  const bodyRows = rows.map(([label, value]) => `<b>${label}:</b> <code>${escapeHtml(value)}</code>`).join('\n');

  return `<b>${line}</b>\n<b>${escapeHtml(title)} [${escapeHtml(status)}]</b>\n<b>${line}</b>\n\n${bodyRows}\n\n${footer}`;
}

export function sendTelegram(message) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    })
  }).catch(() => null);
}
