import { DEFAULT_GOALS, DEFAULT_SCHEDULE, DEFAULT_SYSTEM_SETTINGS, EXPENSE_FILTERS, TASK_FILTERS } from './config.js';
import { loadAchievementsFromCloud, loadDaysFromCloud, loadGoalsFromCloud, loadHistoryFromCloud, loadScheduleFromCloud, loadSystemSettingsFromCloud, mapDayDocsToLocalState, saveAchievementsToCloud, saveHistoryEntryToCloud } from './firebase.js';
import { getAchievements, getChecksToday, getExpenses, getGoalSettings, getHistory, getHistoryEntry, getMoney, getSchedule, getScheduleAlertedToday, getSystemSettings, setAchievements, setChecksToday, setExpenses, setGoalSettings, setHistory, setHistoryEntry, setMoney, setSchedule, setScheduleAlertedToday, setSystemSettings } from './storage.js';
import { buildTelegramBlock, sendTelegram } from './telegram.js';
import { calculateEta, calculateStreak, clamp, computeCatLevel, determineCatRank, docIdToDateDisplay, formatDocId, formatFullDate, formatMoney, formatPercent, getDateFromDocId, getTrendLabel, getUnlockedBadges, inferTaskCategory, isPaidTask, isStudyTask, normalizeTask, summarizeExpenseCategories, toDateInputValue } from './utils.js';

const now = new Date();
const todayDocId = formatDocId(now);
const todayShort = formatFullDate(now).slice(0, 5);
const state = {
  schedule: getSchedule(),
  goals: getGoalSettings(),
  system: getSystemSettings(),
  history: getHistory(),
  achievements: getAchievements(),
  taskFilter: 'all',
  expenseTimeFilter: 'today',
  charts: {},
  catMood: 'Đang phân tích',
  catMoodDescription: DEFAULT_SYSTEM_SETTINGS.catMoodDefaultText
};

const els = Object.fromEntries([
  'dashboardGrid','taskFilterGroup','scheduleSummary','scheduleList','todayIncomeInput','taskSearchInput','expenseReasonInput','expenseAmountInput','expenseCategoryInput','addExpenseBtn','expenseTimeFilterGroup','expenseCategoryFilter','expenseSortFilter','expenseSearchInput','expenseSummary','expenseList','incomeHistoryList','fundAllocationGrid','goalCards','dailyStatsGrid','financeAnalyticsGrid','insightList','achievementSummary','achievementList','catMoodTitle','catMoodDescription','catMoodPill','catLevel','catRank','streakQuick','personalMoodInput','energyLevelInput','energyLevelValue','dayRatingInput','dayNoteInput','saveDayJournalBtn','catWidget','floatingCatTitle','floatingCatDesc','floatingCatLevel','floatingCatRank','floatingRemainingTasks','floatingPotentialIncome','openQuickAddBtn','quickMoneyModal','quickMoneyInput','closeQuickMoneyModalBtn','modalCancelBtn','confirmQuickMoneyBtn','toastContainer','completePastTasksBtn','closeCatWidgetBtn'
].map((id) => [id, document.getElementById(id)]));

function toast(message, type = 'info') {
  const icons = { success: '✨', warning: '⚠️', info: '💫', error: '💥' };
  const titles = { success: 'Xong rùi nè', warning: 'Nhắc nhẹ', info: 'Tin mới', error: 'Có lỗi nhỏ' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<div class="toast-glow"></div><div class="toast-icon">${icons[type] || icons.info}</div><div class="toast-content"><strong>${titles[type] || titles.info}</strong><span>${message}</span></div><button class="toast-close" type="button">×</button>`;
  els.toastContainer.appendChild(div);
  const removeToast = () => div.remove();
  div.querySelector('.toast-close').onclick = removeToast;
  setTimeout(removeToast, 4200);
}

function getTodaySchedule() {
  return state.schedule.find((day) => day[0] === todayShort) || state.schedule[0] || DEFAULT_SCHEDULE[0];
}

function getTaskKey(taskIndex) { return `today-${taskIndex}`; }
function getChecks() { return getChecksToday(); }
function getMoneyArray() { return getMoney(); }
function setTodayIncome(value) {
  const money = getMoneyArray();
  const index = state.schedule.findIndex((day) => day[0] === todayShort);
  money[index === -1 ? 0 : index] = Math.max(0, Number(value) || 0);
  setMoney(money);
}
function getTodayIncome() {
  const index = state.schedule.findIndex((day) => day[0] === todayShort);
  return Number(getMoneyArray()[index === -1 ? 0 : index] || 0);
}
function getTodayExpenses() {
  return getExpenses().filter((item) => item.dateId === todayDocId).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function hydrateJournal() {
  const entry = getHistoryEntry(todayDocId);
  els.personalMoodInput.value = entry.personalMood || '🙂 ổn';
  els.energyLevelInput.value = entry.energyLevel || 7;
  els.energyLevelValue.textContent = `${els.energyLevelInput.value}/10`;
  els.dayRatingInput.value = entry.dayRating || 8;
  els.dayNoteInput.value = entry.note || '';
}

function buildTaskFilters() {
  const labels = { all: 'Tất cả', pending: 'Chưa làm', done: 'Đã làm', money: 'Tạo ra tiền', study: 'Học tập' };
  els.taskFilterGroup.innerHTML = TASK_FILTERS.map((filter) => `<button class="pill ${state.taskFilter === filter ? 'active' : ''}" data-filter="${filter}">${labels[filter]}</button>`).join('');
  els.taskFilterGroup.querySelectorAll('button').forEach((button) => button.onclick = () => { state.taskFilter = button.dataset.filter; renderSchedule(); });
}

function buildExpenseFilters() {
  const labels = { today: 'Hôm nay', '3days': '3 ngày gần nhất', all: 'Tất cả' };
  els.expenseTimeFilterGroup.innerHTML = EXPENSE_FILTERS.map((filter) => `<button class="pill ${state.expenseTimeFilter === filter ? 'active' : ''}" data-filter="${filter}">${labels[filter]}</button>`).join('');
  els.expenseTimeFilterGroup.querySelectorAll('button').forEach((button) => button.onclick = () => { state.expenseTimeFilter = button.dataset.filter; renderExpenses(); });
}

function getTodayTasks() {
  return getTodaySchedule().slice(1).map((task, index) => ({ ...normalizeTask(task), index }));
}

function filterTasks(tasks) {
  const checks = getChecks();
  const search = els.taskSearchInput.value.trim().toLowerCase();
  return tasks.filter((task) => {
    const checked = Boolean(checks[getTaskKey(task.index)]);
    if (state.taskFilter === 'pending' && checked) return false;
    if (state.taskFilter === 'done' && !checked) return false;
    if (state.taskFilter === 'money' && !isPaidTask(task)) return false;
    if (state.taskFilter === 'study' && !isStudyTask(task)) return false;
    if (search && !task.text.toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderSchedule() {
  const checks = getChecks();
  const tasks = getTodayTasks();
  const filtered = filterTasks(tasks);
  const total = tasks.length;
  const completed = tasks.filter((task) => checks[getTaskKey(task.index)]).length;
  const pending = total - completed;
  els.scheduleSummary.innerHTML = `<div class="summary-grid"><div><span>Tổng task</span><strong>${total}</strong></div><div><span>Hoàn thành</span><strong>${completed}</strong></div><div><span>Còn lại</span><strong>${pending}</strong></div><div><span>Income hôm nay</span><strong>${formatMoney(getTodayIncome())}</strong></div></div>`;
  els.todayIncomeInput.value = getTodayIncome() || '';

  els.scheduleList.innerHTML = filtered.map((task) => {
    const checked = Boolean(checks[getTaskKey(task.index)]);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const overdue = task.endTime && !checked && task.endTime.totalMinutes < nowMinutes;
    const upcoming = task.startTime && !checked && task.startTime.totalMinutes > nowMinutes && task.startTime.totalMinutes - nowMinutes <= 30;
    const color = state.system.taskCategoryColors?.[task.category] || '#89dceb';
    return `<label class="task-card ${checked ? 'done' : ''} ${overdue ? 'overdue' : ''}" style="--task-color:${color}">
      <input type="checkbox" data-task-index="${task.index}" ${checked ? 'checked' : ''}>
      <div class="task-main"><strong>${task.text}</strong><div class="task-meta"><span class="badge">${task.category}</span><span class="badge priority-${task.priority}">${task.priority}</span>${task.deadline ? `<span class="badge">${task.deadline}</span>` : ''}${upcoming ? '<span class="badge warn">Sắp tới hạn</span>' : ''}${overdue ? '<span class="badge danger">Quá hạn</span>' : ''}</div></div>
    </label>`;
  }).join('') || '<div class="empty-state">Không có task khớp bộ lọc.</div>';

  els.scheduleList.querySelectorAll('[data-task-index]').forEach((input) => {
    input.onchange = async () => {
      const fresh = getChecks();
      fresh[getTaskKey(Number(input.dataset.taskIndex))] = input.checked;
      setChecksToday(fresh);
      if (input.checked && typeof confetti === 'function') confetti({ particleCount: 90, spread: 70, colors: ['#ff85b3', '#89dceb', '#cba6f7'] });
      toast('✅ Đã lưu trạng thái task.', 'success');
      await sendTelegram(buildTelegramBlock('Task Update', input.checked ? 'DONE' : 'UNDO', [['Task', getTodayTasks()[Number(input.dataset.taskIndex)].text], ['Ngày', docIdToDateDisplay(todayDocId)]]), 'task');
      persistHistory();
      renderAll();
    };
  });
}

function renderExpenses() {
  const search = els.expenseSearchInput.value.trim().toLowerCase();
  const category = els.expenseCategoryFilter.value || 'all';
  const sort = els.expenseSortFilter.value || 'latest';
  const nowDate = new Date(todayDocId);
  let list = [...getExpenses()];
  if (state.expenseTimeFilter === 'today') list = list.filter((item) => item.dateId === todayDocId);
  if (state.expenseTimeFilter === '3days') list = list.filter((item) => Math.abs((getDateFromDocId(todayDocId) - getDateFromDocId(item.dateId)) / 86400000) <= 2);
  if (category !== 'all') list = list.filter((item) => item.category === category);
  if (search) list = list.filter((item) => `${item.reason} ${item.category}`.toLowerCase().includes(search));
  if (sort === 'highest') list.sort((a, b) => Number(b.amount) - Number(a.amount));
  else if (sort === 'lowest') list.sort((a, b) => Number(a.amount) - Number(b.amount));
  else list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const summary = summarizeExpenseCategories(list);
  const topCategory = Object.entries(summary).sort((a, b) => b[1] - a[1])[0];
  els.expenseSummary.innerHTML = `<div class="summary-grid"><div><span>Chi hôm nay</span><strong>${formatMoney(getTodayExpenses())}</strong></div><div><span>Top category</span><strong>${topCategory ? topCategory[0] : 'Chưa có'}</strong></div><div><span>Ngưỡng cảnh báo</span><strong>${formatMoney(state.system.expenseWarningThreshold)}</strong></div></div>`;
  els.expenseList.innerHTML = list.map((item, index) => `<div class="list-item"><div><strong>${item.reason}</strong><p>${item.category} • ${docIdToDateDisplay(item.dateId)}</p></div><div class="row-actions"><span class="amount negative">-${formatMoney(item.amount)}</span><button class="danger-text" data-expense-delete="${item.createdAt}">Xóa</button></div></div>`).join('') || '<div class="empty-state">Chưa có khoản chi phù hợp.</div>';
  els.expenseList.querySelectorAll('[data-expense-delete]').forEach((button) => {
    button.onclick = async () => {
      const next = getExpenses().filter((item) => item.createdAt !== button.dataset.expenseDelete);
      setExpenses(next);
      toast('🗑️ Đã xóa chi tiêu.', 'success');
      await sendTelegram(buildTelegramBlock('Expense Deleted', 'OK', [['Mốc', button.dataset.expenseDelete]]), 'expense');
      persistHistory();
      renderAll();
    };
  });
}

function totalIncome() { return getMoneyArray().reduce((sum, value) => sum + Number(value || 0), 0); }
function totalExpensesAll() { return getExpenses().reduce((sum, item) => sum + Number(item.amount || 0), 0); }
function totalBalance() { return Math.max(totalIncome() - totalExpensesAll(), 0); }

function renderSavingFund() {
  const incomes = state.schedule.map((day, index) => ({ date: day[0], amount: Number(getMoneyArray()[index] || 0) })).filter((item) => item.amount > 0);
  els.incomeHistoryList.innerHTML = incomes.map((item) => `<div class="list-item"><div><strong>${item.date}/${new Date().getFullYear()}</strong></div><span class="amount positive">+${formatMoney(item.amount)}</span></div>`).join('') || '<div class="empty-state">Chưa có thu nhập được ghi nhận.</div>';
  const balance = totalBalance();
  const funds = [
    ['Quỹ tiết kiệm', state.system.savingPercent],
    ['Quỹ tiêu vặt', state.system.spendingPercent],
    ['Quỹ dự phòng', state.system.emergencyPercent],
    ['Quỹ tương lai', state.system.futurePercent]
  ];
  els.fundAllocationGrid.innerHTML = funds.map(([label, percent]) => `<div class="fund-card"><span>${label}</span><strong>${percent}%</strong><small>${formatMoney(balance * percent / 100)}</small></div>`).join('');
}

function renderGoals() {
  const goalDefs = [
    ['Ngày', state.goals.dailyGoalName, state.goals.dailyGoalAmount, state.goals.dailyGoalNote, getTodayIncome()],
    ['Tuần', state.goals.weeklyGoalName, state.goals.weeklyGoalAmount, state.goals.weeklyGoalNote, totalIncome() / 4],
    ['Tháng', state.goals.monthlyGoalName, state.goals.monthlyGoalAmount, state.goals.monthlyGoalNote, totalIncome()],
    ['Dài hạn', state.goals.longGoalName, state.goals.longGoalAmount, state.goals.longGoalNote, totalBalance()]
  ];
  const avgIncomeDay = totalIncome() / Math.max(Object.keys(state.history).length || 1, 1);
  els.goalCards.innerHTML = goalDefs.map(([tier, name, target, note, current]) => {
    const percent = clamp((current / Math.max(target, 1)) * 100, 0, 100);
    const remaining = Math.max(target - current, 0);
    const eta = calculateEta(current, target, avgIncomeDay);
    const status = percent >= 100 ? 'Đã đạt' : percent >= 60 ? 'Đang cố gắng' : 'Cần tăng tốc';
    return `<div class="goal-card"><div class="row-between"><div><strong>${tier} • ${name}</strong><p>${note}</p></div><span class="status-pill">${status}</span></div><div class="goal-meta-grid"><div><span>Mục tiêu</span><strong>${formatMoney(target)}</strong></div><div><span>Hiện tại</span><strong>${formatMoney(current)}</strong></div><div><span>Còn thiếu</span><strong>${formatMoney(remaining)}</strong></div><div><span>Hoàn thành</span><strong>${formatPercent(percent)}</strong></div><div><span>ETA</span><strong>${eta.label}</strong></div><div><span>Cần/ngày</span><strong>${formatMoney(eta.dailyNeeded)}</strong></div></div><div class="progress"><i style="width:${percent}%"></i></div></div>`;
  }).join('');
}

function buildDashboard() {
  const checks = getChecks();
  const tasks = getTodayTasks();
  const done = tasks.filter((task) => checks[getTaskKey(task.index)]).length;
  const yesterdayId = formatDocId(new Date(Date.now() - 86400000));
  const yesterday = state.history[yesterdayId] || {};
  const balance = totalBalance();
  const metrics = [
    ['Thu nhập hôm nay', formatMoney(getTodayIncome())],
    ['Chi tiêu hôm nay', formatMoney(getTodayExpenses())],
    ['Tích lũy hiện tại', formatMoney(balance)],
    ['% mục tiêu dài hạn', formatPercent(balance / Math.max(state.goals.longGoalAmount, 1) * 100)],
    ['Task hoàn thành', `${done}/${tasks.length}`],
    ['Streak hiện tại', `${state.achievements.currentStreak} ngày`],
    ['Mood mèo', state.catMood],
    ['Task còn lại', `${Math.max(tasks.length - done, 0)}`],
    ['So với hôm qua', `${getTrendLabel(getTodayIncome(), yesterday.income || 0)} income`]
  ];
  els.dashboardGrid.innerHTML = metrics.map(([label, value]) => `<div class="metric-card glass-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderDailyStats() {
  const tasks = getTodayTasks();
  const checks = getChecks();
  const completed = tasks.filter((task) => checks[getTaskKey(task.index)]).length;
  const workedDone = tasks.filter((task) => checks[getTaskKey(task.index)]).reduce((sum, task) => sum + Number(task.duration || 0), 0);
  const workedRemain = tasks.filter((task) => !checks[getTaskKey(task.index)]).reduce((sum, task) => sum + Number(task.duration || 0), 0);
  const metrics = [
    ['Tổng task', tasks.length], ['Task đã hoàn thành', completed], ['% hoàn thành', formatPercent(completed / Math.max(tasks.length, 1) * 100)], ['Thu nhập hôm nay', formatMoney(getTodayIncome())], ['Chi tiêu hôm nay', formatMoney(getTodayExpenses())], ['Còn lại thực', formatMoney(Math.max(getTodayIncome() - getTodayExpenses(), 0))], ['Giờ làm đã xong', `${workedDone.toFixed(1)}h`], ['Giờ còn lại', `${workedRemain.toFixed(1)}h`]
  ];
  els.dailyStatsGrid.innerHTML = metrics.map(([label, value]) => `<div class="metric-card small"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderFinanceAnalytics() {
  const historyValues = Object.values(state.history);
  const avgIncome = historyValues.reduce((sum, item) => sum + Number(item.income || 0), 0) / Math.max(historyValues.length, 1);
  const avgExpense = historyValues.reduce((sum, item) => sum + Number(item.expenses || 0), 0) / Math.max(historyValues.length, 1);
  const maxIncomeDay = Object.entries(state.history).sort((a, b) => Number(b[1].income || 0) - Number(a[1].income || 0))[0];
  const maxExpenseDay = Object.entries(state.history).sort((a, b) => Number(b[1].expenses || 0) - Number(a[1].expenses || 0))[0];
  const keepRate = totalIncome() > 0 ? totalBalance() / totalIncome() * 100 : 0;
  const predictedMonthEnd = avgIncome * 30 - avgExpense * 30;
  const yesterdayId = formatDocId(new Date(Date.now() - 86400000));
  const trend = getTrendLabel(getTodayIncome(), state.history[yesterdayId]?.income || 0);
  const metrics = [
    ['TB thu nhập/ngày', formatMoney(avgIncome)], ['TB chi tiêu/ngày', formatMoney(avgExpense)], ['Ngày thu cao nhất', maxIncomeDay ? `${docIdToDateDisplay(maxIncomeDay[0])}` : '--'], ['Ngày chi cao nhất', maxExpenseDay ? `${docIdToDateDisplay(maxExpenseDay[0])}` : '--'], ['Tỷ lệ giữ tiền', formatPercent(keepRate)], ['Xu hướng', trend], ['Dự báo cuối tháng', formatMoney(predictedMonthEnd)]
  ];
  els.financeAnalyticsGrid.innerHTML = metrics.map(([label, value]) => `<div class="metric-card small"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function updateCatSystem() {
  const tasks = getTodayTasks();
  const checks = getChecks();
  const completed = tasks.filter((task) => checks[getTaskKey(task.index)]).length;
  const rate = completed / Math.max(tasks.length, 1) * 100;
  const rank = determineCatRank({ streak: state.achievements.currentStreak, totalBalance: totalBalance(), completionRate: rate });
  const level = computeCatLevel({ streak: state.achievements.currentStreak, totalBalance: totalBalance(), completedTasks: completed });
  const expenseWarning = getTodayExpenses() > state.system.expenseWarningThreshold;
  const mood = rate >= 80 ? 'Rất phấn khích' : expenseWarning ? 'Hơi lo ví tiền' : getTodayIncome() > getTodayExpenses() ? 'Ổn áp, đang vui' : 'Cần thúc nhẹ';
  const desc = expenseWarning ? 'Mèo thấy hôm nay chi hơi nhanh, nên giảm mua sắm bốc đồng.' : rate >= 80 ? 'Mèo cực kỳ tự hào vì bạn giữ nhịp task rất tốt.' : state.system.catMoodDefaultText;
  state.catMood = mood;
  state.catMoodDescription = desc;
  state.achievements = { ...state.achievements, catLevel: level, catRank: rank };
  setAchievements(state.achievements);
  els.catMoodTitle.textContent = `🐱 ${mood}`;
  els.catMoodDescription.textContent = desc;
  els.catMoodPill.textContent = mood;
  els.catLevel.textContent = level;
  els.catRank.textContent = rank;
  els.streakQuick.textContent = `${state.achievements.currentStreak} ngày`;
  els.floatingCatTitle.textContent = `🐾 ${mood}`;
  els.floatingCatDesc.textContent = desc;
  els.floatingCatLevel.textContent = level;
  els.floatingCatRank.textContent = rank;
  els.floatingRemainingTasks.textContent = `${Math.max(tasks.length - completed, 0)} task`;
  const potential = tasks.filter((task) => !checks[getTaskKey(task.index)] && isPaidTask(task)).reduce((sum, task) => sum + task.duration * state.system.wageRate, 0);
  els.floatingPotentialIncome.textContent = formatMoney(potential);
  els.catWidget.classList.toggle('hidden', !state.system.catWidgetEnabled);
}

function renderInsights() {
  const yesterdayId = formatDocId(new Date(Date.now() - 86400000));
  const yesterday = state.history[yesterdayId] || {};
  const betterThanYesterday = getTodayIncome() >= Number(yesterday.income || 0);
  const expenseOver = getTodayExpenses() > state.system.expenseWarningThreshold;
  const longGoalProgress = totalBalance() / Math.max(state.goals.longGoalAmount, 1) * 100;
  const insights = [
    betterThanYesterday ? 'Hôm nay đang kiếm tốt hơn hoặc ngang hôm qua.' : 'Hôm nay income đang thấp hơn hôm qua, cân nhắc thêm ca kiếm tiền trọng điểm.',
    expenseOver ? `Chi tiêu đã vượt ngưỡng ${formatMoney(state.system.expenseWarningThreshold)}, nên siết nhẹ.` : 'Chi tiêu vẫn nằm trong vùng an toàn.',
    longGoalProgress >= 50 ? 'Bạn đã qua nửa chặng mục tiêu dài hạn, giữ nhịp rất đẹp.' : 'Tiến độ mục tiêu dài hạn còn cần tăng tốc đều.',
    (Number(els.energyLevelInput.value) >= 7 && Math.max(getTodayTasks().length - Object.values(getChecks()).filter(Boolean).length, 0) > 0) ? 'Năng lượng còn ổn, có thể tăng thêm ca ship ngắn.' : 'Nếu thấy hụt năng lượng, nên nghỉ ngơi để tránh quá tải.',
    state.system.aiSuggestionDefaultText
  ];
  els.insightList.innerHTML = insights.map((text) => `<div class="insight-item">${text}</div>`).join('');
}

async function persistHistory() {
  const tasks = getTodayTasks();
  const checks = getChecks();
  const completed = tasks.filter((task) => checks[getTaskKey(task.index)]).length;
  const entry = {
    ...getHistoryEntry(todayDocId),
    dateDisplay: docIdToDateDisplay(todayDocId),
    completedTasks: completed,
    totalTasks: tasks.length,
    completionRate: Math.round(completed / Math.max(tasks.length, 1) * 100),
    income: getTodayIncome(),
    expenses: getTodayExpenses(),
    note: els.dayNoteInput.value.trim(),
    personalMood: els.personalMoodInput.value,
    energyLevel: Number(els.energyLevelInput.value),
    dayRating: Number(els.dayRatingInput.value),
    catMood: state.catMood,
    updatedAt: new Date().toISOString()
  };
  setHistoryEntry(todayDocId, entry);
  state.history = getHistory();
  const streak = calculateStreak(state.history);
  const badges = getUnlockedBadges({ historyMap: state.history, totalBalance: totalBalance(), longGoalAmount: state.goals.longGoalAmount });
  state.achievements = { ...state.achievements, ...streak, unlockedBadges: badges.map((badge) => badge.id), catLevel: state.achievements.catLevel, catRank: state.achievements.catRank };
  setAchievements(state.achievements);
  try { await saveHistoryEntryToCloud(todayDocId, entry); } catch {}
  try { await saveAchievementsToCloud(state.achievements); } catch {}
}

function renderAchievements() {
  const badges = getUnlockedBadges({ historyMap: state.history, totalBalance: totalBalance(), longGoalAmount: state.goals.longGoalAmount });
  els.achievementSummary.innerHTML = `<div class="summary-grid"><div><span>Current streak</span><strong>${state.achievements.currentStreak} ngày</strong></div><div><span>Best streak</span><strong>${state.achievements.bestStreak} ngày</strong></div><div><span>Badge mở khóa</span><strong>${badges.length}</strong></div></div>`;
  els.achievementList.innerHTML = badges.map((badge) => `<div class="badge-card"><strong>${badge.label}</strong><p>${badge.description}</p></div>`).join('') || '<div class="empty-state">Chưa mở khóa badge nào.</div>';
}

function renderCharts() {
  const historyEntries = Object.entries(state.history).sort((a, b) => a[0].localeCompare(b[0]));
  const last7 = historyEntries.slice(-7);
  const last30 = historyEntries.slice(-30);
  const labels7 = last7.map(([dateId]) => docIdToDateDisplay(dateId).slice(0, 5));
  const income7 = last7.map(([, entry]) => Number(entry.income || 0));
  const expense7 = last7.map(([, entry]) => Number(entry.expenses || 0));
  const balance30 = last30.reduce((acc, [, entry]) => { const prev = acc.length ? acc[acc.length - 1] : 0; acc.push(prev + Number(entry.income || 0) - Number(entry.expenses || 0)); return acc; }, []);
  const categorySummary = summarizeExpenseCategories(getExpenses());
  const completion = last7.map(([, entry]) => Number(entry.completionRate || 0));
  const configs = [
    ['incomeChart', 'bar', labels7, [{ label: 'Income', data: income7, backgroundColor: '#89dceb' }]],
    ['expenseChart', 'bar', labels7, [{ label: 'Expense', data: expense7, backgroundColor: '#ff85b3' }]],
    ['balanceChart', 'line', last30.map(([dateId]) => docIdToDateDisplay(dateId).slice(0, 5)), [{ label: 'Balance', data: balance30, borderColor: '#cba6f7', fill: false }]],
    ['categoryChart', 'doughnut', Object.keys(categorySummary), [{ label: 'Category', data: Object.values(categorySummary), backgroundColor: ['#89dceb','#ff85b3','#cba6f7','#fde68a','#a7f3d0'] }]],
    ['taskCompletionChart', 'line', labels7, [{ label: 'Completion %', data: completion, borderColor: '#a6e3a1', fill: false }]]
  ];
  configs.forEach(([id, type, labels, datasets]) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(canvas, { type, data: { labels, datasets }, options: { responsive: true, plugins: { legend: { labels: { color: '#eef1ff' } } }, scales: type === 'doughnut' ? {} : { x: { ticks: { color: '#eef1ff' } }, y: { ticks: { color: '#eef1ff' } } } } });
  });
}

async function syncCloud() {
  try {
    const [schedule, goals, system, history, achievements, dayDocs] = await Promise.all([loadScheduleFromCloud(), loadGoalsFromCloud(), loadSystemSettingsFromCloud(), loadHistoryFromCloud(), loadAchievementsFromCloud(), loadDaysFromCloud()]);
    if (schedule.length) { state.schedule = schedule; setSchedule(schedule); }
    state.goals = { ...DEFAULT_GOALS, ...goals }; setGoalSettings(state.goals);
    state.system = { ...DEFAULT_SYSTEM_SETTINGS, ...system }; setSystemSettings(state.system);
    state.history = { ...state.history, ...history }; setHistory(state.history);
    state.achievements = { ...state.achievements, ...achievements }; setAchievements(state.achievements);
    const mapped = mapDayDocsToLocalState(dayDocs, state.schedule, todayDocId, formatFullDate(now));
    if (mapped.moneyArr.length) setMoney(mapped.moneyArr);
    if (Object.keys(mapped.checksToday).length) setChecksToday(mapped.checksToday);
    if (mapped.allExpenses.length) setExpenses(mapped.allExpenses);
    toast('☁️ Đồng bộ cloud thành công.', 'success');
  } catch {
    toast('⚠️ Cloud lỗi, đang dùng localStorage.', 'warning');
  }
}

function checkScheduleAlerts() {
  const alerted = getScheduleAlertedToday();
  const todayKey = todayDocId;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  getTodayTasks().forEach(async (task, index) => {
    if (!task.startTime) return;
    const keyBase = `${todayKey}-${index}`;
    const diff = task.startTime.totalMinutes - nowMinutes;
    if ((diff === 0 || (state.system.scheduleAlert10Enabled && diff === 10) || (state.system.scheduleAlert30Enabled && diff === 30)) && !alerted[`${keyBase}-${diff}`]) {
      alerted[`${keyBase}-${diff}`] = true;
      setScheduleAlertedToday(alerted);
      toast(`⏰ ${diff > 0 ? `Còn ${diff} phút tới task` : 'Đến giờ task'}: ${task.text}`, 'info');
      await sendTelegram(buildTelegramBlock('Schedule Alert', diff > 0 ? `-${diff} phút` : 'Đúng giờ', [['Task', task.text], ['Ngày', docIdToDateDisplay(todayDocId)]]), 'schedule');
    }
  });
}

function completePastTasks() {
  const checks = getChecks();
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  let changed = 0;
  getTodayTasks().forEach((task) => {
    if (task.endTime && task.endTime.totalMinutes < currentMinutes && !checks[getTaskKey(task.index)]) {
      checks[getTaskKey(task.index)] = true;
      changed += 1;
    }
  });
  setChecksToday(checks);
  if (changed) toast(`✅ Đã auto complete ${changed} task đã qua giờ.`, 'success');
  persistHistory();
  renderAll();
}

function addExpense() {
  const reason = els.expenseReasonInput.value.trim();
  const amount = Number(els.expenseAmountInput.value || 0);
  if (!reason || amount <= 0) return toast('Nhập reason và số tiền hợp lệ nha.', 'warning');
  const item = { reason, amount, category: els.expenseCategoryInput.value, dateId: todayDocId, createdAt: new Date().toISOString() };
  setExpenses([item, ...getExpenses()]);
  els.expenseReasonInput.value = '';
  els.expenseAmountInput.value = '';
  toast('💸 Đã thêm chi tiêu.', 'success');
  if (getTodayExpenses() + amount > state.system.expenseWarningThreshold) toast('🚨 Hôm nay đã vượt ngưỡng chi tiêu.', 'warning');
  sendTelegram(buildTelegramBlock('Expense Added', 'OK', [['Lý do', reason], ['Số tiền', formatMoney(amount)], ['Category', item.category]]), 'expense');
  persistHistory();
  renderAll();
}

function saveJournal() { persistHistory(); toast('💾 Đã lưu nhật ký ngày.', 'success'); renderAll(); }

function renderAll() {
  buildTaskFilters();
  buildExpenseFilters();
  buildDashboard();
  renderSchedule();
  renderExpenses();
  renderSavingFund();
  renderGoals();
  renderDailyStats();
  renderFinanceAnalytics();
  updateCatSystem();
  renderInsights();
  renderAchievements();
  renderCharts();
}

function bindEvents() {
  els.todayIncomeInput.onchange = async () => { setTodayIncome(els.todayIncomeInput.value); toast('💰 Đã lưu thu nhập hôm nay.', 'success'); await sendTelegram(buildTelegramBlock('Income Updated', 'OK', [['Số tiền', formatMoney(els.todayIncomeInput.value)]]), 'income'); persistHistory(); renderAll(); };
  els.taskSearchInput.oninput = renderSchedule;
  els.expenseCategoryFilter.onchange = renderExpenses;
  els.expenseSortFilter.onchange = renderExpenses;
  els.expenseSearchInput.oninput = renderExpenses;
  els.addExpenseBtn.onclick = addExpense;
  els.energyLevelInput.oninput = () => { els.energyLevelValue.textContent = `${els.energyLevelInput.value}/10`; };
  els.saveDayJournalBtn.onclick = saveJournal;
  els.openQuickAddBtn.onclick = () => els.quickMoneyModal.classList.remove('hidden');
  els.closeQuickMoneyModalBtn.onclick = () => els.quickMoneyModal.classList.add('hidden');
  els.modalCancelBtn.onclick = () => els.quickMoneyModal.classList.add('hidden');
  els.confirmQuickMoneyBtn.onclick = () => { setTodayIncome(getTodayIncome() + Number(els.quickMoneyInput.value || 0)); els.quickMoneyInput.value = ''; els.quickMoneyModal.classList.add('hidden'); toast('🎉 Đã cộng tiền nhanh.', 'success'); renderAll(); persistHistory(); };
  els.completePastTasksBtn.onclick = completePastTasks;
  els.closeCatWidgetBtn.onclick = () => els.catWidget.classList.add('hidden');
}

async function init() {
  await syncCloud();
  hydrateJournal();
  bindEvents();
  await persistHistory();
  renderAll();
  checkScheduleAlerts();
  setInterval(checkScheduleAlerts, 60000);
}

init();
