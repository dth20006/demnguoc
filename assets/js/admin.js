import { DEFAULT_GOAL } from './config.js';
import { loadGoalFromCloud, loadScheduleFromCloud, saveGoalToCloud, saveScheduleToCloud } from './firebase.js';
import { getGoalSettings, setGoalSettings } from './storage.js';
import { formatDateKey } from './utils.js';

const state = {
  finalSchedule: [],
  currentIndex: -1
};

const els = {
  tkbInput: document.getElementById('tkbInput'),
  status: document.getElementById('status'),
  listArea: document.getElementById('listArea'),
  dayGrid: document.getElementById('dayGrid'),
  editor: document.getElementById('editor'),
  editLabel: document.getElementById('editLabel'),
  editDate: document.getElementById('editDate'),
  editTasks: document.getElementById('editTasks'),
  btnSync: document.getElementById('btnSync'),
  goalName: document.getElementById('goalNameInput'),
  goalAmount: document.getElementById('goalAmountInput'),
  goalNote: document.getElementById('goalNoteInput'),
  goalStatus: document.getElementById('goalStatus')
};

function setStatus(message, type = 'success') {
  els.status.textContent = message;
  els.status.dataset.type = type;
}

function setGoalStatus(message, type = 'success') {
  els.goalStatus.textContent = message;
  els.goalStatus.dataset.type = type;
}

function buildStudyDaySchedule(date, classList) {
  const tasks = [date, '00:00-06:00 Ngủ', '06:00-09:00 Ship', '11:30-12:00 Ăn trưa', '12:00-13:30 Ship', ...classList, '16:30-20:00 Ship', '20:00-20:30 Ăn tối', '21:00-23:30 Ship'];
  return [tasks[0], ...tasks.slice(1).sort()];
}

function buildFreeDaySchedule(date) {
  return [date, '00:00-06:00 Ngủ', '06:00-11:30 Ship', '11:30-12:00 Ăn trưa', '12:00-20:00 Ship', '20:00-20:30 Ăn tối', '20:30-23:59 Ship'];
}

function renderGrid() {
  els.dayGrid.innerHTML = '';
  state.finalSchedule.forEach((day, index) => {
    const item = document.createElement('button');
    item.className = `day-item ${state.currentIndex === index ? 'active' : ''}`;
    item.type = 'button';
    item.textContent = day[0];
    item.addEventListener('click', () => openEdit(index));
    els.dayGrid.appendChild(item);
  });
}

function openEdit(index) {
  state.currentIndex = index;
  renderGrid();
  els.editor.style.display = 'block';
  els.editDate.value = state.finalSchedule[index][0];
  els.editTasks.value = state.finalSchedule[index].slice(1).join('\n');
  els.editLabel.textContent = `Ngày ${state.finalSchedule[index][0]}`;
}

function processTKB() {
  const rawText = els.tkbInput.value.trim();
  if (!rawText) {
    alert('Bé chưa dán gì cả!');
    return;
  }

  const lines = rawText.split('\n').filter((line) => line.trim());
  const classesByDate = {};
  let minDate = null;
  let maxDate = null;

  lines.forEach((line) => {
    const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) return;

    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = Number(dateMatch[3]);
    const dateObj = new Date(year, month, day);
    const dateStr = formatDateKey(dateObj);

    if (!minDate || dateObj < minDate) minDate = new Date(dateObj);
    if (!maxDate || dateObj > maxDate) maxDate = new Date(dateObj);

    if (line.includes('DAT103') || line.includes('VIE111') || line.includes('Giáo dục thể chất')) return;

    const subjectMatch = line.match(/[A-Z]{3,4}\d{3,4}/);
    const subject = subjectMatch ? subjectMatch[0] : 'Học tập';
    const isOnline = line.includes('Google Meet') || line.includes('Học Online') || line.includes('Meet');

    let timeStr = '14:10-16:10';
    if (!isOnline) {
      const timeMatch = line.match(/(\d{2}:\d{2}):\d{2}\s*-\s*(\d{2}:\d{2}):\d{2}/);
      if (timeMatch) timeStr = `${timeMatch[1]}-${timeMatch[2]}`;
    }

    if (!classesByDate[dateStr]) classesByDate[dateStr] = [];
    classesByDate[dateStr].push(`${timeStr} ${subject}`);
  });

  if (!minDate || !maxDate) {
    alert('Không đọc được ngày từ bảng lịch!');
    return;
  }

  state.finalSchedule = [];
  const cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const dateStr = formatDateKey(cursor);
    const classes = (classesByDate[dateStr] || []).sort();
    state.finalSchedule.push(classes.length ? buildStudyDaySchedule(dateStr, classes) : buildFreeDaySchedule(dateStr));
    cursor.setDate(cursor.getDate() + 1);
  }

  state.currentIndex = -1;
  renderGrid();
  els.listArea.style.display = 'block';
  els.btnSync.style.display = 'block';
  els.editor.style.display = 'none';
  setStatus(`✅ Đã tạo lịch cho ${state.finalSchedule.length} ngày!`);
}

function saveEdit() {
  if (state.currentIndex < 0) return;
  const date = els.editDate.value.trim();
  const tasks = els.editTasks.value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!date) {
    alert('Ngày không được để trống.');
    return;
  }
  state.finalSchedule[state.currentIndex] = [date, ...tasks];
  renderGrid();
  setStatus(`💾 Đã cập nhật ngày ${date}`);
}

function deleteDay() {
  if (state.currentIndex < 0) return;
  if (!window.confirm('Xóa ngày này?')) return;
  state.finalSchedule.splice(state.currentIndex, 1);
  state.currentIndex = -1;
  els.editor.style.display = 'none';
  renderGrid();
  setStatus('🗑️ Đã xóa ngày khỏi lịch hiện tại.');
}

async function loadScheduleFromCloudAction() {
  setStatus('⏳ Đang tải lịch từ Cloud...', 'info');
  try {
    state.finalSchedule = await loadScheduleFromCloud();
    state.currentIndex = -1;
    renderGrid();
    els.listArea.style.display = 'block';
    els.btnSync.style.display = 'block';
    els.editor.style.display = 'none';
    setStatus(`☁️ Đã tải ${state.finalSchedule.length} ngày từ Cloud.`);
  } catch (error) {
    console.error(error);
    setStatus('❌ Lỗi tải Cloud!', 'error');
    alert('Không tải được schedule từ Firebase.');
  }
}

async function syncToCloud() {
  if (!state.finalSchedule.length) {
    alert('Chưa có lịch để đồng bộ.');
    return;
  }
  setStatus('⏳ Đang gửi lên Cloud...', 'info');
  try {
    await saveScheduleToCloud(state.finalSchedule);
    setStatus('🚀 ĐỒNG BỘ THÀNH CÔNG!');
    alert('Đã cập nhật lịch mới lên cloud!');
  } catch (error) {
    console.error(error);
    setStatus('❌ Đồng bộ thất bại!', 'error');
    alert('Lỗi khi đồng bộ Firebase!');
  }
}

function loadGoalToForm(goal) {
  els.goalName.value = goal.goalName || DEFAULT_GOAL.goalName;
  els.goalAmount.value = goal.goalAmount || DEFAULT_GOAL.goalAmount;
  els.goalNote.value = goal.goalNote || DEFAULT_GOAL.goalNote;
}

async function saveGoal() {
  const goal = {
    goalName: els.goalName.value.trim() || DEFAULT_GOAL.goalName,
    goalAmount: Math.max(0, Number(els.goalAmount.value) || 0),
    goalNote: els.goalNote.value.trim()
  };

  try {
    await saveGoalToCloud(goal);
    setGoalSettings(goal);
    setGoalStatus('✅ Đã lưu mục tiêu lên cloud và local.');
  } catch (error) {
    console.error(error);
    setGoalSettings(goal);
    setGoalStatus('⚠️ Cloud lỗi, đã fallback lưu localStorage.', 'warning');
  }
}

async function loadGoalFromCloudAction() {
  setGoalStatus('⏳ Đang tải mục tiêu từ cloud...', 'info');
  try {
    const goal = await loadGoalFromCloud();
    loadGoalToForm(goal);
    setGoalSettings(goal);
    setGoalStatus('☁️ Đã tải mục tiêu từ cloud.');
  } catch (error) {
    console.error(error);
    const goal = getGoalSettings();
    loadGoalToForm(goal);
    setGoalStatus('⚠️ Không tải được cloud, đang dùng localStorage.', 'warning');
  }
}

function bindEvents() {
  document.getElementById('processTKBBtn').addEventListener('click', processTKB);
  document.getElementById('loadCloudBtn').addEventListener('click', loadScheduleFromCloudAction);
  document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
  document.getElementById('deleteDayBtn').addEventListener('click', deleteDay);
  document.getElementById('syncBtn').addEventListener('click', syncToCloud);
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
  document.getElementById('loadGoalBtn').addEventListener('click', loadGoalFromCloudAction);
}

async function init() {
  bindEvents();
  loadGoalToForm(getGoalSettings());
  await loadGoalFromCloudAction();
  await loadScheduleFromCloudAction();
}

init();
