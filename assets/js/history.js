import { loadHistoryFromCloud } from './firebase.js';
import { getHistory, setHistory } from './storage.js';
import { docIdToDateDisplay, getDateFromDocId, toDateInputValue } from './utils.js';

const els = {
  range: document.getElementById('historyRangeFilter'),
  date: document.getElementById('historyDateFilter'),
  search: document.getElementById('historySearchFilter'),
  timeline: document.getElementById('historyTimeline')
};

const state = { history: getHistory() };

function filterEntries() {
  const search = els.search.value.trim().toLowerCase();
  const selectedDate = els.date.value || toDateInputValue(new Date());
  const base = new Date(selectedDate);
  return Object.entries(state.history)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .filter(([dateId, entry]) => {
      const current = getDateFromDocId(dateId);
      const diff = Math.floor((base - current) / 86400000);
      if (els.range.value === 'day' && dateId !== selectedDate) return false;
      if (els.range.value === 'week' && (diff < 0 || diff > 6)) return false;
      if (els.range.value === 'month' && (current.getMonth() !== base.getMonth() || current.getFullYear() !== base.getFullYear())) return false;
      if (search && !`${entry.note} ${entry.personalMood} ${entry.catMood}`.toLowerCase().includes(search)) return false;
      return true;
    });
}

function render() {
  const entries = filterEntries();
  els.timeline.innerHTML = entries.map(([dateId, entry]) => `<article class="glass-card timeline-item"><div class="time-col"><span>${docIdToDateDisplay(dateId)}</span><strong>${entry.completionRate || 0}%</strong></div><div class="content-col"><h3>${entry.completedTasks || 0}/${entry.totalTasks || 0} task hoàn thành</h3><div class="meta-grid"><div><span>Thu nhập</span><strong>${Number(entry.income || 0).toLocaleString('vi-VN')}đ</strong></div><div><span>Chi tiêu</span><strong>${Number(entry.expenses || 0).toLocaleString('vi-VN')}đ</strong></div><div><span>Mood mèo</span><strong>${entry.catMood || '--'}</strong></div><div><span>Mood cá nhân</span><strong>${entry.personalMood || '--'}</strong></div><div><span>Năng lượng</span><strong>${entry.energyLevel || 0}/10</strong></div><div><span>Đánh giá ngày</span><strong>${entry.dayRating || 0}/10</strong></div></div><p>${entry.note || 'Không có note.'}</p></div></article>`).join('') || '<div class="glass-card timeline-item">Không có dữ liệu lịch sử phù hợp bộ lọc.</div>';
}

async function init() {
  els.date.value = toDateInputValue(new Date());
  try {
    const cloudHistory = await loadHistoryFromCloud();
    if (Object.keys(cloudHistory).length) {
      state.history = { ...state.history, ...cloudHistory };
      setHistory(state.history);
    }
  } catch {}
  els.range.onchange = render;
  els.date.onchange = render;
  els.search.oninput = render;
  render();
}

init();
