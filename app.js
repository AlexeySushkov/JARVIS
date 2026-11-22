import { clampRating } from './lib/slots.js';
import { dayKey, todayKey, addDays, keyToDate } from './lib/dates.js';
import { buildDayViewModel } from './lib/view.js';
import { getDay, putDay } from './lib/storage.js';
import { serializeWeekDoc } from './lib/export.js';
import { parseAnswer } from './lib/jarvis.js';
import { formatBuild } from './lib/version.js';
import { permissionLabel } from './lib/notify-ui.js';

const APP_VERSION = 'v1.2.0';

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

async function exportWeek() {
  const monday = mondayOf(todayKey());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const key = addDays(monday, i);
    days.push((await getDay(key)) || { date: key, mood: null, slots: [] });
  }
  const content = serializeWeekDoc(days);
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `Дневник_JARVIS_${monday}_${addDays(monday, 6)}.doc`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getExistingSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function ensureSubscription() {
  if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  let sub = await getExistingSubscription();
  if (!sub) {
    const reg = await navigator.serviceWorker.ready;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return sub;
}

async function registerPush() {
  try {
    const sub = await ensureSubscription();
    if (!sub) return;
    const offsetMinutes = -new Date().getTimezoneOffset();
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub, offsetMinutes }),
    });
  } catch (err) {
    console.warn('push setup failed', err);
  }
}

async function sendTestPush() {
  try {
    const sub = await getExistingSubscription();
    if (!sub) return 'Нет подписки — нажмите «Включить»';
    const res = await fetch('/api/test-notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub }),
    });
    if (res.status === 404) return 'Только на Vercel';
    if (!res.ok) return `Ошибка ${res.status}`;
    const data = await res.json();
    return data.sent ? 'Отправлено ✓' : 'Не доставлено';
  } catch (err) {
    console.warn('test notify failed', err);
    return 'Ошибка: ' + String(err && err.name ? err.name : 'unknown');
  }
}

function setNotifyHint(text) {
  document.getElementById('notify-hint').textContent = text;
}

async function refreshNotifyPanel() {
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  document.getElementById('notify-permission').textContent = permissionLabel(permission);

  let sub = null;
  try { sub = await getExistingSubscription(); } catch (err) { sub = null; }
  document.getElementById('notify-subscription').textContent = sub ? 'активна' : 'нет';

  const enable = document.getElementById('notify-enable');
  enable.hidden = !!(sub && permission === 'granted');
  if (permission === 'denied') {
    setNotifyHint('Уведомления запрещены в настройках сайта (Chrome → сайт → Уведомления).');
  } else if (!sub) {
    setNotifyHint('Нажмите «Включить», чтобы разрешить уведомления на этом устройстве.');
  } else {
    setNotifyHint('');
  }
}

async function openNotify() {
  document.getElementById('notify-modal').hidden = false;
  await refreshNotifyPanel();
}

async function enableNotify() {
  try {
    if (!('Notification' in window)) { setNotifyHint('Браузер не поддерживает уведомления.'); return; }
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') {
      setNotifyHint('Разрешение не выдано — уведомления включить нельзя.');
      return;
    }
    await registerPush();
    await refreshNotifyPanel();
    if (document.getElementById('notify-subscription').textContent === 'активна') {
      setNotifyHint('Уведомления включены ✓');
    }
  } catch (err) {
    console.warn('enable notify failed', err);
    setNotifyHint('Ошибка: ' + String(err && err.name ? err.name : 'unknown'));
  }
}

async function openAbout() {
  const about = document.getElementById('about');
  document.getElementById('about-version').textContent = APP_VERSION;
  document.getElementById('about-build').textContent = '…';
  document.getElementById('about-cache').textContent = '…';
  about.hidden = false;

  try {
    const res = await fetch('/api/version');
    if (res.ok) {
      const info = await res.json();
      document.getElementById('about-build').textContent = formatBuild(info) || 'нет данных';
    } else {
      document.getElementById('about-build').textContent = res.status === 404 ? 'локально' : `ошибка ${res.status}`;
    }
  } catch (err) {
    document.getElementById('about-build').textContent = 'нет данных';
  }

  try {
    const swText = await (await fetch('/sw.js')).text();
    const m = swText.match(/const CACHE = '([^']+)'/);
    document.getElementById('about-cache').textContent = m ? m[1] : '—';
  } catch (err) {
    document.getElementById('about-cache').textContent = '—';
  }
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
  document.getElementById('export-week').addEventListener('click', exportWeek);
  document.getElementById('notify-open').addEventListener('click', openNotify);
  document.getElementById('notify-enable').addEventListener('click', enableNotify);
  document.getElementById('notify-test').addEventListener('click', async () => {
    setNotifyHint('Отправка…');
    setNotifyHint(await sendTestPush());
  });
  document.getElementById('notify-close').addEventListener('click', () => { document.getElementById('notify-modal').hidden = true; });
  document.getElementById('notify-modal').addEventListener('click', (e) => {
    if (e.target.id === 'notify-modal') document.getElementById('notify-modal').hidden = true;
  });
  document.getElementById('orb').addEventListener('click', openAbout);
  document.getElementById('about-close').addEventListener('click', () => { document.getElementById('about').hidden = true; });
  document.getElementById('about').addEventListener('click', (e) => {
    if (e.target.id === 'about') document.getElementById('about').hidden = true;
  });

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
