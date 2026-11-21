import { clampRating } from './lib/slots.js';
import { dayKey, todayKey, addDays, keyToDate } from './lib/dates.js';
import { buildDayViewModel } from './lib/view.js';
import { getDay, putDay, getAllDays } from './lib/storage.js';
import { serializeHistory, serializeWeekDoc } from './lib/export.js';
import { parseAnswer } from './lib/jarvis.js';

// Публичный VAPID-ключ. Приватный ключ задаётся в env Vercel (VAPID_PRIVATE_KEY).
const VAPID_PUBLIC_KEY = 'BF16OyIGb6GAxO-jYHR07H1PBRJ9FFp6Fm5Joe1zFSLLG3TF3up3hwuhNs9To1DGheQ4pyGKzNKh6Q1nDXytxno';

const CHIPS = ['Сон', 'Еда', 'Сборы', 'Дорога', 'Школа', 'Домашка', 'Спорт', 'Прогулка', 'Хобби', 'Общение', 'Отдых', 'Игры/телефон', 'Другое'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const state = { date: todayKey(), slot: null, chip: null, pleasure: null, importance: null };

function hourLabel(hhmm) { return String(parseInt(hhmm.split(':')[0], 10)); }
function timeLabel(s) { return `${hourLabel(s.start)}–${hourLabel(s.end)}`; }

function mondayOf(key) {
  const d = keyToDate(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
}

function dayLabel(key) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(keyToDate(key));
}

function ratingButtons(container, value, onPick) {
  container.innerHTML = '';
  for (let i = 0; i <= 10; i++) {
    const b = document.createElement('button');
    b.textContent = i;
    b.type = 'button';
    if (value === i) b.classList.add('on');
    b.addEventListener('click', () => onPick(i));
    container.appendChild(b);
  }
}

async function saveSlot(dateKey, slotId, activity, pleasure, importance) {
  const day = (await getDay(dateKey)) || { date: dateKey, mood: null, slots: [] };
  const entry = { slotId, activity, pleasure: clampRating(pleasure), importance: clampRating(importance) };
  const slot = day.slots.find((s) => s.slotId === slotId);
  if (slot) Object.assign(slot, entry);
  else day.slots.push(entry);
  await putDay(day);
}

async function saveMood(dateKey, mood) {
  const day = (await getDay(dateKey)) || { date: dateKey, mood: null, slots: [] };
  day.mood = clampRating(mood);
  await putDay(day);
}

async function render() {
  document.getElementById('day-label').textContent = dayLabel(state.date);

  const daysEl = document.getElementById('days');
  daysEl.innerHTML = '';
  const monday = mondayOf(state.date);
  const today = todayKey();
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const b = document.createElement('button');
    b.textContent = WEEKDAYS[i];
    b.type = 'button';
    if (d === state.date) b.classList.add('on');
    if (d === today) b.classList.add('today');
    b.addEventListener('click', () => { state.date = d; render(); });
    daysEl.appendChild(b);
  }

  const day = await getDay(state.date);
  const vm = buildDayViewModel(day);
  const table = document.getElementById('table');
  table.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'trow head';
  head.innerHTML = '<span>Время</span><span>Дело</span><span class="num">Уд</span><span class="num">Важ</span>';
  table.appendChild(head);

  for (const row of vm) {
    const r = document.createElement('div');
    r.className = 'trow';
    const time = document.createElement('span');
    time.textContent = timeLabel(row);
    const act = document.createElement('span');
    act.className = 'act' + (row.activity ? '' : ' empty');
    act.textContent = row.activity || '—';
    const pl = document.createElement('span');
    pl.className = 'num' + (row.pleasure === null ? ' empty' : '');
    pl.textContent = row.pleasure === null ? '·' : row.pleasure;
    const im = document.createElement('span');
    im.className = 'num' + (row.importance === null ? ' empty' : '');
    im.textContent = row.importance === null ? '·' : row.importance;
    r.append(time, act, pl, im);
    r.addEventListener('click', () => openSlot(row));
    table.appendChild(r);
  }

  const moodEl = document.getElementById('mood');
  moodEl.innerHTML = '<div class="mood-label">Настроение дня</div>';
  const rating = document.createElement('div');
  rating.className = 'rating';
  ratingButtons(rating, day ? day.mood : null, async (v) => { await saveMood(state.date, v); render(); });
  moodEl.appendChild(rating);
}

function renderPleasure() {
  ratingButtons(document.getElementById('dlg-pleasure'), state.pleasure, (v) => {
    state.pleasure = v;
    renderPleasure();
  });
}

function renderImportance() {
  ratingButtons(document.getElementById('dlg-importance'), state.importance, (v) => {
    state.importance = v;
    renderImportance();
  });
}

function openSlot(row) {
  state.slot = row;
  state.chip = (row.activity && CHIPS.includes(row.activity)) ? row.activity : null;
  state.pleasure = row.pleasure;
  state.importance = row.importance;
  document.getElementById('dlg-title').textContent = `Что делала с ${hourLabel(row.start)} до ${hourLabel(row.end)}?`;
  document.getElementById('dlg-text').value = row.activity || '';
  buildChips();
  renderPleasure();
  renderImportance();
  document.getElementById('modal').hidden = false;
}

function buildChips() {
  const chipsEl = document.getElementById('dlg-chips');
  chipsEl.innerHTML = '';
  for (const c of CHIPS) {
    const b = document.createElement('button');
    b.textContent = c;
    b.type = 'button';
    if (state.chip === c) b.classList.add('on');
    b.addEventListener('click', () => {
      state.chip = c;
      document.getElementById('dlg-text').value = c;
      buildChips();
    });
    chipsEl.appendChild(b);
  }
}

function closeDlg() {
  document.getElementById('modal').hidden = true;
  state.slot = null;
}

async function saveDlg() {
  if (!state.slot) return;
  const { activity } = parseAnswer(document.getElementById('dlg-text').value);
  await saveSlot(state.date, state.slot.slotId, activity || null, state.pleasure, state.importance);
  closeDlg();
  render();
}

async function exportAs(format) {
  const days = await getAllDays();
  const content = serializeHistory(days, format);
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = format === 'csv' ? 'jarvis-history.csv' : 'jarvis-history.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportWeek() {
  const days = await getAllDays();
  const content = serializeWeekDoc(days.slice(-7));
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jarvis-week.doc';
  a.click();
  URL.revokeObjectURL(a.href);
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registerPush() {
  if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const offsetMinutes = -new Date().getTimezoneOffset();
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subscription: sub, offsetMinutes }),
  });
}

async function init() {
  const params = new URLSearchParams(location.search);
  const dateParam = params.get('date');
  const slotParam = params.get('slot');
  if (dateParam) state.date = dateParam;

  document.getElementById('prev').addEventListener('click', () => { state.date = addDays(state.date, -1); render(); });
  document.getElementById('next').addEventListener('click', () => { state.date = addDays(state.date, 1); render(); });
  document.getElementById('dlg-cancel').addEventListener('click', closeDlg);
  document.getElementById('dlg-save').addEventListener('click', saveDlg);
  document.getElementById('dlg-text').addEventListener('input', () => { state.chip = null; buildChips(); });
  document.getElementById('export-json').addEventListener('click', () => exportAs('json'));
  document.getElementById('export-csv').addEventListener('click', () => exportAs('csv'));
  document.getElementById('export-doc').addEventListener('click', exportWeek);

  await render();

  if (slotParam) {
    if (slotParam === 'mood') {
      document.getElementById('mood').scrollIntoView();
    } else {
      const vm = buildDayViewModel(await getDay(state.date));
      const row = vm.find((r) => r.slotId === slotParam);
      if (row) openSlot(row);
    }
  }

  registerPush();
}

init();
