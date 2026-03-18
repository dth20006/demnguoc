import { DEFAULT_GOAL, DEFAULT_SCHEDULE, STORAGE_KEYS } from './config.js';
import { backupDayToCloud, loadDaysFromCloud, loadGoalFromCloud, loadScheduleFromCloud, mapDayDocsToLocalState } from './firebase.js';
import { getChecksToday, getExpenses, getGoalSettings, getMoney, setChecksToday, setExpenses, setGoalSettings, setMoney } from './storage.js';
import { buildTelegramBlock, sendTelegram } from './telegram.js';
import { formatDateShort, formatDocId, formatFullDate, formatMoney, getDaysInMonth, isNonWorkingTask, isPaidTask, parseTaskDuration, parseTaskStartTime } from './utils.js';

const state = {
  schedule: DEFAULT_SCHEDULE,
  goal: getGoalSettings(),
  incomePredictionData: null,
  currentMood: {
    key: 'idle',
    label: 'Đang phân tích...',
    desc: 'Mèo đang quan sát bạn rất chăm chú nè.'
  },
  currentAddIndex: null
};

const now = new Date();
const currentYear = now.getFullYear();
const todayStr = formatDateShort(now);
const todayFullStr = formatFullDate(now);
const todayDocId = formatDocId(now);

const els = {
  grid: document.getElementById('grid'),
  expenseReason: document.getElementById('expenseReason'),
  expenseAmount: document.getElementById('expenseAmount'),
  expenseLog: document.getElementById('expenseLog'),
  incomeLog: document.getElementById('incomeLog'),
  totalAccumulated: document.getElementById('totalAccumulated'),
  goalName: document.getElementById('goalName'),
  goalAmount: document.getElementById('goalAmount'),
  goalCurrent: document.getElementById('goalCurrent'),
  goalRemaining: document.getElementById('goalRemaining'),
  goalPercent: document.getElementById('goalPercent'),
  goalNote: document.getElementById('goalNote'),
  goalStatus: document.getElementById('goalStatus'),
  goalFill: document.getElementById('goalFill'),
  predictAvgDaily: document.getElementById('predictAvgDaily'),
  predictGoalDate: document.getElementById('predictGoalDate'),
  predictStatus: document.getElementById('predictStatus'),
  predictMessage: document.getElementById('predictMessage'),
  moodDescription: document.getElementById('moodDescription'),
  moodPill: document.getElementById('moodPill'),
  popupMoneyInput: document.getElementById('popupMoneyInput'),
  modalOverlay: document.getElementById('modalOverlay'),
  moneyModal: document.getElementById('moneyModal'),
  catWorked: document.getElementById('catWorked'),
  catEarned: document.getElementById('catEarned'),
  catRemaining: document.getElementById('catRemaining'),
  catExtra: document.getElementById('catExtra'),
  catTotal: document.getElementById('catTotal'),
  catMoodMini: document.getElementById('catMoodMini')
};

function launchConfetti(isMoney = false) {
  if (typeof confetti !== 'function') return;
  confetti({
    particleCount: isMoney ? 150 : 80,
    spread: isMoney ? 100 : 60,
    origin: { y: isMoney ? 0.6 : 0.8 },
    colors: isMoney ? ['#ffd700', '#ff85b3', '#a6e3a1'] : ['#ff85b3', '#89dceb', '#cba6f7']
  });
}

function cleanOldExpenses(expensesArray) {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  let isChanged = false;

  const filtered = expensesArray.filter((expense) => {
    if (!expense.date) return false;

    let [day, month, year] = expense.date.split('/');
    if (!year) year = String(currentYear);
    const expenseDate = new Date(Number(year), Number(month) - 1, Number(day));
    const diffDays = Math.floor((currentDate - expenseDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      isChanged = true;
      return false;
    }
    return true;
  });

  return { filtered, isChanged };
}

function getNormalizedMoney() {
  return state.schedule.map((_, index) => Number(getMoney()[index]) || 0);
}

function toggleTaskStyle(checkbox) {
  checkbox.parentElement.classList.toggle('completed', checkbox.checked);
}

function renderSchedule() {
  els.grid.innerHTML = '';
  const todayIndex = state.schedule.findIndex((day) => day[0] === todayStr);

  if (todayIndex === -1) {
    els.grid.innerHTML = "<div class='empty-state'>Đang offline rùi bé ơi 🌸</div>";
    return;
  }

  const day = state.schedule[todayIndex];
  const checks = getChecksToday();
  const money = getNormalizedMoney();
  const card = document.createElement('div');
  card.className = 'day';

  const tasksHtml = day.slice(1).map((task, taskIndex) => {
    const dataIndex = `${todayIndex}-${taskIndex + 1}`;
    const checked = Boolean(checks[dataIndex]);
    return `
      <label class="task-item ${checked ? 'completed' : ''}">
        <input type="checkbox" data-index="${dataIndex}" ${checked ? 'checked' : ''}>
        <span>${task}</span>
      </label>
    `;
  }).join('');

  card.innerHTML = `
    <b>📅 Hôm nay: ${day[0]}/${currentYear}</b>
    ${tasksHtml}
    <div class="money-action">
      <span class="money-emoji">💰</span>
      <input class="moneyInput" type="number" data-index="${todayIndex}" placeholder="Nhập lúa thu được..." value="${money[todayIndex] || ''}">
      <button class="btn-add" type="button" data-quick-add="${todayIndex}">+</button>
    </div>
  `;

  els.grid.appendChild(card);

  card.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      toggleTaskStyle(checkbox);
      saveAllData();
      notifyTask(checkbox);
      renderDerivedUI();
    });
  });

  const moneyInput = card.querySelector('.moneyInput[data-index]');
  moneyInput.addEventListener('change', () => {
    saveAllData();
    notifyMoney(moneyInput);
    renderDerivedUI();
  });

  card.querySelector('[data-quick-add]').addEventListener('click', () => openModal(todayIndex));
}

function renderExpenses() {
  const expenses = getExpenses();
  if (!expenses.length) {
    els.expenseLog.innerHTML = "<div class='empty-state'>Chưa xài đồng nào, giỏi quóa! 🎀</div>";
    return;
  }

  els.expenseLog.innerHTML = expenses.map((expense, index) => `
    <div class="expense-item">
      <div class="reason-box">
        <div class="reason">${expense.reason}</div>
        <div class="time">${expense.time} • ${expense.date}</div>
      </div>
      <div class="expense-actions">
        <div class="amount">-${Number(expense.amount || 0).toLocaleString('vi-VN')}đ</div>
        <button class="btn-del-exp" type="button" data-expense-index="${index}" title="Xóa khoản này">❌</button>
      </div>
    </div>
  `).join('');

  els.expenseLog.querySelectorAll('[data-expense-index]').forEach((button) => {
    button.addEventListener('click', () => deleteExpense(Number(button.dataset.expenseIndex)));
  });
}

function calculateTotals() {
  const money = getNormalizedMoney();
  const totalIncome = money.reduce((sum, amount) => sum + amount, 0);
  const expenses = getExpenses();
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  return {
    totalIncome,
    totalExpenses,
    finalTotal: Math.max(totalIncome - totalExpenses, 0)
  };
}

function renderIncomeTable() {
  const money = getNormalizedMoney();
  const rows = state.schedule
    .map((day, index) => ({ day, amount: money[index] }))
    .filter((item) => item.amount > 0);

  els.incomeLog.innerHTML = rows.length
    ? rows.map(({ day, amount }) => `<div class="stat-row"><span class="stat-label">${day[0]}/${currentYear}</span><span class="stat-value">+${Number(amount).toLocaleString('vi-VN')}đ</span></div>`).join('')
    : "<div class='empty-state'>Heo đất đang đói... 🐷</div>";

  const totals = calculateTotals();
  els.totalAccumulated.textContent = formatMoney(totals.finalTotal);
  updateGoalCard(totals.finalTotal);
  updateIncomePredictor(totals);
}

function updateGoalCard(currentAmount) {
  const goal = { ...DEFAULT_GOAL, ...state.goal };
  const goalAmount = Math.max(Number(goal.goalAmount) || DEFAULT_GOAL.goalAmount, 1);
  const remaining = Math.max(goalAmount - currentAmount, 0);
  const percent = Math.min((currentAmount / goalAmount) * 100, 100);
  const roundedPercent = Math.floor(percent);

  let status = 'Đang cố gắng';
  if (percent >= 100) status = 'Đã đạt';
  else if (percent < 35) status = 'Cần tăng tốc';

  els.goalName.textContent = goal.goalName || DEFAULT_GOAL.goalName;
  els.goalAmount.textContent = formatMoney(goalAmount);
  els.goalCurrent.textContent = formatMoney(currentAmount);
  els.goalRemaining.textContent = formatMoney(remaining);
  els.goalPercent.textContent = `${roundedPercent}%`;
  els.goalNote.textContent = goal.goalNote || 'Không có ghi chú thêm.';
  els.goalStatus.textContent = status;
  els.goalFill.style.width = `${percent}%`;
}

function updateIncomePredictor({ totalIncome, totalExpenses, finalTotal }) {
  const nowDate = new Date();
  const today = nowDate.getDate();
  const daysInMonth = getDaysInMonth(currentYear, nowDate.getMonth());
  const daysRemaining = Math.max(daysInMonth - today, 0);
  const avgDaily = totalIncome > 0 ? totalIncome / today : 0;
  const goalAmount = Math.max(Number(state.goal.goalAmount) || DEFAULT_GOAL.goalAmount, 1);

  let predictedGoalDate = '--/--';
  let statusText = 'Chưa đủ dữ liệu';
  let messageText = 'Với tốc độ này, bé cứ tiếp tục đều đều nha. Mèo đang chờ thêm dữ liệu để dự báo chuẩn hơn.';

  if (finalTotal >= goalAmount) {
    predictedGoalDate = formatDateShort(nowDate);
    statusText = 'Đã đạt mục tiêu';
    messageText = `Bé giỏi quá! Mục tiêu ${formatMoney(goalAmount)} đã hoàn thành rồi đó.`;
  } else if (avgDaily > 0) {
    const amountNeeded = goalAmount - finalTotal;
    const daysNeeded = Math.ceil(amountNeeded / avgDaily);
    const estimatedDate = new Date(currentYear, nowDate.getMonth(), today + daysNeeded);
    predictedGoalDate = formatDateShort(estimatedDate);

    if (estimatedDate.getMonth() === nowDate.getMonth()) {
      statusText = 'Kịp mục tiêu tháng này';
      messageText = `Với tốc độ này, bé sẽ đạt mục tiêu vào khoảng ngày ${predictedGoalDate}.`; 
    } else {
      const predictedMonthEndTotal = Math.round(finalTotal + avgDaily * daysRemaining);
      statusText = 'Cần tăng tốc nhẹ';
      messageText = `Nếu giữ nhịp hiện tại, cuối tháng bé sẽ có khoảng ${formatMoney(predictedMonthEndTotal)}.`;
    }
  }

  els.predictAvgDaily.textContent = formatMoney(avgDaily);
  els.predictGoalDate.textContent = predictedGoalDate;
  els.predictStatus.textContent = statusText;
  els.predictMessage.textContent = `${messageText} Thu nhập: ${formatMoney(totalIncome)} • Chi tiêu: ${formatMoney(totalExpenses)}.`;

  state.incomePredictionData = { avgDaily, predictedGoalDate, statusText, messageText, finalTotal };
  updateCatMood();
}

function updateCatPredictor() {
  const todayIndex = state.schedule.findIndex((day) => day[0] === todayStr);
  if (todayIndex === -1) return;

  let workedHours = 0;
  let paidWorkedHours = 0;
  let paidRemainingHours = 0;

  state.schedule[todayIndex].slice(1).forEach((task, taskOffset) => {
    if (isNonWorkingTask(task)) return;
    const duration = parseTaskDuration(task);
    const checkbox = document.querySelector(`input[data-index="${todayIndex}-${taskOffset + 1}"]`);
    const checked = checkbox?.checked;

    if (checked) {
      workedHours += duration;
      if (isPaidTask(task)) paidWorkedHours += duration;
    } else if (isPaidTask(task)) {
      paidRemainingHours += duration;
    }
  });

  const money = getNormalizedMoney();
  const actualEarned = Number(money[todayIndex]) || 0;
  const extraPredicted = paidWorkedHours > 0 && actualEarned > 0
    ? Math.round((actualEarned / paidWorkedHours) * paidRemainingHours)
    : 0;

  els.catWorked.textContent = `${Math.round(workedHours * 10) / 10}h`;
  els.catEarned.textContent = formatMoney(actualEarned);
  els.catRemaining.textContent = `${Math.round(paidRemainingHours * 10) / 10}`;
  els.catExtra.textContent = `${extraPredicted.toLocaleString('vi-VN')}`;
  els.catTotal.textContent = `${(actualEarned + extraPredicted).toLocaleString('vi-VN')}`;
}

function getCompletedTaskCount() {
  return document.querySelectorAll('.task-item input[type="checkbox"]:checked').length;
}

function getTotalTaskCount() {
  return document.querySelectorAll('.task-item input[type="checkbox"]').length;
}

function updateCatMood() {
  const hour = new Date().getHours();
  const totalTasks = getTotalTaskCount();
  const doneTasks = getCompletedTaskCount();
  const completionRate = totalTasks ? doneTasks / totalTasks : 0;
  const finalTotal = state.incomePredictionData?.finalTotal || 0;
  const avgDaily = state.incomePredictionData?.avgDaily || 0;

  let mood = { key: 'normal', label: '😼 Bình tĩnh', desc: 'Mèo đang theo dõi nhịp làm việc của bạn nè.' };
  if (hour >= 23) mood = { key: 'sleepy', label: '😴 Buồn ngủ', desc: 'Đã khuya rồi đó, mèo muốn bạn nghỉ ngơi sớm để giữ sức khỏe nha.' };
  else if (totalTasks > 0 && doneTasks === 0 && hour >= 16) mood = { key: 'strict', label: '😼 Nghiêm khắc', desc: 'Hôm nay còn đang trống nhiều việc lắm đó. Vào guồng lại thôi nào.' };
  else if (completionRate >= 0.7 || finalTotal >= 300000 || avgDaily >= 250000) mood = { key: 'happy', label: '🥳 Hớn hở', desc: 'Bạn đang làm cực ổn luôn á. Mèo thấy hôm nay có mùi chiến thắng rồi đó.' };
  else if (completionRate <= 0.2 && hour >= 14) mood = { key: 'strict', label: '😼 Nghiêm khắc', desc: 'Nhiều task hôm nay vẫn chưa xong đâu nha. Mèo đang nhắc bạn tập trung đó.' };

  state.currentMood = mood;
  els.moodPill.textContent = mood.label;
  els.moodDescription.textContent = mood.desc;
  els.catMoodMini.textContent = `Mood: ${mood.label}`;
}

function getAlertedScheduleMap() {
  const raw = localStorage.getItem(STORAGE_KEYS.scheduleAlertedToday);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed.date === todayFullStr ? parsed.items || {} : {};
  } catch {
    return {};
  }
}

function setAlertedScheduleMap(items) {
  localStorage.setItem(STORAGE_KEYS.scheduleAlertedToday, JSON.stringify({ date: todayFullStr, items }));
}

function checkScheduleAlerts() {
  const nowDate = new Date();
  const currentHour = nowDate.getHours();
  const currentMinute = nowDate.getMinutes();
  const todayIndex = state.schedule.findIndex((day) => day[0] === todayStr);
  if (todayIndex === -1) return;

  const alertedMap = getAlertedScheduleMap();
  state.schedule[todayIndex].slice(1).forEach((task, taskOffset) => {
    const startInfo = parseTaskStartTime(task);
    if (!startInfo) return;
    const alertKey = `${todayStr}-${taskOffset + 1}-${startInfo.hhmm}`;
    if (alertedMap[alertKey]) return;

    if (startInfo.hour === currentHour && startInfo.minute === currentMinute) {
      launchConfetti(false);
      sendTelegram(buildTelegramBlock('⏰ SCHEDULE ALERT', 'LIVE', [
        ['🕒 Giờ bắt đầu', startInfo.hhmm],
        ['📌 Công việc', task],
        ['📅 Ngày', todayFullStr],
        ['🎯 Dự báo', state.incomePredictionData?.statusText || 'Đang cập nhật'],
        ['🐱 Tâm trạng Mèo', state.currentMood.label],
        ['🐱 Mèo nhắc', 'Tới giờ làm việc, vào guồng ngay thôi!']
      ], '#Schedule #Reminder #WarriorAI'));
      alertedMap[alertKey] = true;
      setAlertedScheduleMap(alertedMap);
    }
  });
}

function notifyTask(checkbox) {
  if (!checkbox.checked) return;
  launchConfetti(false);
  sendTelegram(buildTelegramBlock('🚀 MISSION COMPLETED', 'DONE', [
    ['📌 Công việc', checkbox.nextElementSibling.textContent],
    ['🕒 Thời gian', new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })],
    ['✨ Status', 'Đã hoàn thành xuất sắc!']
  ], '#WarriorAI #Productivity'));
}

function notifyMoney(input) {
  if (Number(input.value) <= 0) return;
  sendTelegram(buildTelegramBlock('💖 LÚA VỀ', 'SUCCESS', [
    ['💰 Thu nhập', `+${Number(input.value).toLocaleString('vi-VN')} VND`],
    ['📅 Ngày', todayFullStr]
  ], '#Income #WarriorAI'));
}

async function backupCloud() {
  try {
    const todayIndex = state.schedule.findIndex((day) => day[0] === todayStr);
    const money = getNormalizedMoney();
    const todayIncome = todayIndex !== -1 ? Number(money[todayIndex]) || 0 : 0;
    const checks = getChecksToday();
    const expenses = getExpenses().filter((expense) => expense.date === todayFullStr);
    await backupDayToCloud({ todayDocId, todayFullStr, todayIncome, checks, todayExpenses: expenses });
  } catch (error) {
    console.log('Backup cloud lỗi:', error);
  }
}

function saveAllData() {
  const checks = {};
  document.querySelectorAll('input[type="checkbox"][data-index]').forEach((checkbox) => {
    checks[checkbox.dataset.index] = checkbox.checked;
  });

  const money = [...getMoney()];
  document.querySelectorAll('.moneyInput[data-index]').forEach((input) => {
    money[input.dataset.index] = input.value;
  });

  setChecksToday(checks);
  setMoney(money);
  backupCloud();
}

function renderDerivedUI() {
  renderIncomeTable();
  renderExpenses();
  updateCatPredictor();
}

function addExpense(customReason = null, customAmount = null) {
  const reason = String(customReason ?? els.expenseReason.value).trim();
  const amount = Number(customAmount ?? els.expenseAmount.value);
  if (!reason || amount <= 0) return false;

  const expenses = getExpenses();
  expenses.unshift({
    date: todayFullStr,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    reason,
    amount
  });

  const cleaned = cleanOldExpenses(expenses);
  setExpenses(cleaned.filtered);
  if (customReason === null) els.expenseReason.value = '';
  if (customAmount === null) els.expenseAmount.value = '';

  sendTelegram(buildTelegramBlock('⚠️ TRANSACTION ALERT', 'EXPENSE', [
    ['🛍️ Nội dung', reason],
    ['💸 Số tiền', `-${amount.toLocaleString('vi-VN')} VND`],
    ['🕒 Lúc', new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })],
    ['📅 Ngày', todayFullStr]
  ], '#Expense #MoneyFlow'));

  saveAllData();
  renderDerivedUI();
  return true;
}

function deleteExpense(index) {
  if (!window.confirm('Bé có chắc muốn xóa khoản chi này không? 🥺')) return;
  const expenses = getExpenses();
  expenses.splice(index, 1);
  setExpenses(expenses);
  saveAllData();
  renderDerivedUI();
}

function openModal(index) {
  state.currentAddIndex = index;
  els.modalOverlay.style.display = 'flex';
  setTimeout(() => {
    els.moneyModal.classList.add('active');
    els.popupMoneyInput.focus();
  }, 10);
}

function closeModal() {
  els.moneyModal.classList.remove('active');
  setTimeout(() => {
    els.modalOverlay.style.display = 'none';
    els.popupMoneyInput.value = '';
  }, 250);
}

function confirmQuickAdd() {
  const addValue = Number(els.popupMoneyInput.value);
  if (addValue <= 0) {
    alert('Nhập số tiền vô bé ơi!');
    return;
  }

  const input = document.querySelector(`.moneyInput[data-index="${state.currentAddIndex}"]`);
  const newValue = (Number(input.value) || 0) + addValue;
  input.value = newValue;
  saveAllData();
  renderDerivedUI();
  sendTelegram(buildTelegramBlock('💳 CASH INFLOW', 'SUCCESS', [
    ['💰 Số tiền mới', `+${addValue.toLocaleString('vi-VN')}đ`],
    ['📊 Tổng ngày', `${newValue.toLocaleString('vi-VN')}đ`],
    ['📅 Ngày', todayFullStr]
  ], '#WarriorCapital #Income'));
  closeModal();
  launchConfetti(true);
}

function initParallaxGlass() {
  const updateTilt = (xRatio, yRatio) => {
    document.documentElement.style.setProperty('--tiltX', `${(0.5 - yRatio) * 5}deg`);
    document.documentElement.style.setProperty('--tiltY', `${(xRatio - 0.5) * 6}deg`);
  };

  window.addEventListener('mousemove', (event) => updateTilt(event.clientX / window.innerWidth, event.clientY / window.innerHeight));
  window.addEventListener('deviceorientation', (event) => {
    const gamma = Math.max(-20, Math.min(20, event.gamma || 0));
    const beta = Math.max(-20, Math.min(20, event.beta || 0));
    updateTilt((gamma + 20) / 40, (beta + 20) / 40);
  });
}

async function hydrateFromCloud() {
  try {
    state.schedule = await loadScheduleFromCloud();
  } catch (error) {
    console.log('Load schedule lỗi, dùng local/default.', error);
    state.schedule = DEFAULT_SCHEDULE;
  }

  try {
    const goal = await loadGoalFromCloud();
    state.goal = { ...DEFAULT_GOAL, ...goal };
    setGoalSettings(state.goal);
  } catch (error) {
    state.goal = getGoalSettings();
  }

  renderSchedule();

  try {
    const dayDocs = await loadDaysFromCloud();
    const mapped = mapDayDocsToLocalState(dayDocs, state.schedule, todayDocId, todayFullStr);
    const cleaned = cleanOldExpenses(mapped.allExpenses);
    setChecksToday(mapped.checksToday);
    setMoney(mapped.moneyArr);
    setExpenses(cleaned.filtered);
    if (cleaned.isChanged) backupCloud();
  } catch (error) {
    console.log('Load days lỗi, fallback local.', error);
    setExpenses(cleanOldExpenses(getExpenses()).filtered);
  }

  renderSchedule();
  renderDerivedUI();
}

function bindEvents() {
  document.getElementById('addExpenseBtn').addEventListener('click', () => addExpense());
  document.getElementById('openAdminBtn').addEventListener('click', () => {
    window.location.href = 'admin.html';
  });
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('confirmQuickAddBtn').addEventListener('click', confirmQuickAdd);
  els.popupMoneyInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') confirmQuickAdd();
  });
  els.modalOverlay.addEventListener('click', (event) => {
    if (event.target === els.modalOverlay) closeModal();
  });
}

async function init() {
  bindEvents();
  renderSchedule();
  renderDerivedUI();
  await hydrateFromCloud();
  initParallaxGlass();
  checkScheduleAlerts();
  updateCatMood();
  setInterval(checkScheduleAlerts, 15000);
  setInterval(updateCatMood, 30000);
}

window.deleteExpense = deleteExpense;
window.closeModal = closeModal;
window.confirmQuickAdd = confirmQuickAdd;

init();
