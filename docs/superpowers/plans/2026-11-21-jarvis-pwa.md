# JARVIS PWA (дневник дня) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать PWA «ДЖАРВИС» — дневник дня для телефона дочери (Android): напоминания по слотам, заполнение таблицы (дело / удовольствие / важность / настроение дня), локальная история и выгрузка, в стиле «голографический синий».

**Architecture:** Чистый HTML/CSS/JS без фреймворка и сборки. Логика вынесена в тестируемые ESM-модули `lib/*`, хранилище — IndexedDB на устройстве. Напоминания — Web Push через serverless-функции Vercel (`api/*`) с cron-планировщиком; подписки хранятся в Vercel KV, VAPID-ключи — в env-переменных.

**Tech Stack:** Vanilla JS (ESM), IndexedDB, Service Worker + Web Push (VAPID), Node serverless (Vercel) с `web-push` и `@vercel/kv`, тесты — Node built-in `node --test` (+ `fake-indexeddb`).

**Spec:** `docs/superpowers/specs/2026-11-21-jarvis-design.md`

## Global Constraints

- Без фреймворков и сборки: чистый HTML/CSS/JS (ESM, `package.json` с `"type": "module"`).
- Данные дневника — только в IndexedDB на устройстве; на сервер уходят лишь push-подписка и смещение часового пояса.
- UI на русском.
- Стиль «голографический синий»: тёмный, синий градиент, светящееся ядро, минимализм.
- Цель — Android Chrome, обязателен HTTPS.
- LLM в v1 нет: `parseAnswer(text)` — локальный pass-through (шов под будущий `/api/llm`).
- Оценки удовольствие/важность/настроение — целые 0–10 (или пусто).
- Напоминание = push через Web Push; ответ — только тапом по уведомлению (открывается приложение), без кнопок в шторке.

## File Structure

```
JARVIS/
  package.json               # type: module; scripts.test = "node --test test/"
  .gitignore                 # node_modules, .vercel, .env, .superpowers/
  vercel.json                # crons → /api/notify
  index.html                 # SPA: сегодня, листание дней, диалог ответа, история, выгрузка
  styles.css                 # тема «голографический синий»
  app.js                     # вход в браузер: отрисовка, подписка на push, флоу ответа
  sw.js                      # service worker: кэш, push, notificationclick
  manifest.webmanifest       # PWA-манифест
  icons/icon.svg
  icons/icon-192.png
  icons/icon-512.png
  lib/slots.js               # SLOTS + clampRating()
  lib/dates.js               # dayKey(), todayKey(), addDays(), keyToDate(), localDayKeyFromUtc()
  lib/schedule.js            # REMINDERS + dueReminders()
  lib/export.js              # serializeHistory(records, format)
  lib/jarvis.js              # parseAnswer(text) — локальный шов
  lib/storage.js             # обёртка IndexedDB: getDay/putDay/getAllDays
  api/subscribe.js           # POST /api/subscribe — сохранить подписку+offset в KV
  api/notify.js              # GET /api/notify (cron) — вычислить due и отправить push
  test/slots.test.js
  test/dates.test.js
  test/schedule.test.js
  test/export.test.js
  test/storage.test.js
  test/jarvis.test.js
```

## Review Focus

1. Слот 23–6.00, спрошенный утром, должен писаться в день начала сна (вчерашнюю дату), а не в текущую. → тест в Task 2.
2. Листание дней через границу месяца/года не должно давать битые даты (31.12 + 1 = 01.01). → тест в Task 1.
3. Выгрузка при пустых/частичных днях (слоты не заполнены) даёт корректный JSON/CSV без `NaN`/краша. → тест в Task 3.
4. Оценка вне 0–10 (11, -1, 3.7) не должна попасть в хранилище — валидация/кламп. → тест в Task 1 (`clampRating`).
5. Один и тот же слот не должен считаться due дважды за один проход cron (окно due ограничено). → тест в Task 2.

---

### Task 1: Основа — слоты и даты

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `lib/slots.js`
- Create: `lib/dates.js`
- Create: `test/slots.test.js`
- Create: `test/dates.test.js`

**Interfaces:**
- Produces:
  - `SLOTS: [{id, start, end}]` (14 слотов, id: `'6-7'…'22-23'`, `'23-6'`; `start`/`end` — строки `'HH:MM'`).
  - `clampRating(n) -> number|null` (целое 0–10; `null`/`undefined`/NaN → `null`; дробное → округлить; <0 → 0, >10 → 10).
  - `dayKey(date: Date) -> 'YYYY-MM-DD'` (по локальному времени).
  - `todayKey() -> 'YYYY-MM-DD'`.
  - `addDays(key: string, n: number) -> 'YYYY-MM-DD'`.
  - `keyToDate(key: string) -> Date` (локальная полночь).
  - `localDayKeyFromUtc(nowUtcMs: number, offsetMinutes: number) -> 'YYYY-MM-DD'`.

- [ ] **Step 1: Написать падающие тесты**

`package.json`:
```json
{ "name": "jarvis-pwa", "type": "module", "scripts": { "test": "node --test test/" } }
```
`.gitignore`:
```
node_modules/
.vercel/
.env
.superpowers/
```

`test/slots.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, clampRating } from '../lib/slots.js';

test('14 слотов, первый 6-7, последний 23-6', () => {
  assert.equal(SLOTS.length, 14);
  assert.equal(SLOTS[0].id, '6-7');
  assert.equal(SLOTS[13].id, '23-6');
  assert.equal(SLOTS[13].end, '06:00');
});

test('clampRating: границы и кламп', () => {
  assert.equal(clampRating(5), 5);
  assert.equal(clampRating(0), 0);
  assert.equal(clampRating(10), 10);
  assert.equal(clampRating(11), 10);
  assert.equal(clampRating(-1), 0);
  assert.equal(clampRating(3.7), 4);
  assert.equal(clampRating(null), null);
  assert.equal(clampRating(undefined), null);
});
```

`test/dates.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, addDays, localDayKeyFromUtc } from '../lib/dates.js';

test('dayKey формат YYYY-MM-DD', () => {
  assert.equal(dayKey(new Date(2026, 10, 21)), '2026-11-21'); // месяцы 0-based
});

test('addDays через границу года', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('localDayKeyFromUtc с учётом смещения', () => {
  // 2026-11-21T02:00Z + offset 180 мин (UTC+3) = 21.11 05:00 местного
  const nowUtc = Date.UTC(2026, 10, 21, 2, 0);
  assert.equal(localDayKeyFromUtc(nowUtc, 180), '2026-11-21');
  // 2026-11-20T22:00Z + 180 = 21.11 01:00 местного
  assert.equal(localDayKeyFromUtc(Date.UTC(2026, 10, 20, 22, 0), 180), '2026-11-21');
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/slots.js'` (модулей нет).

- [ ] **Step 3: Реализовать `SLOTS`, `clampRating` в `lib/slots.js` и функции дат в `lib/dates.js`**

`SLOTS` — ровно 14 слотов из спеки (время как в Global Constraints). `clampRating` — по контракту выше. Даты — чистая арифметика на `Date` (без библиотек), `dayKey` через локальные `getFullYear/getMonth/getDate` с паддингом до 2 знаков.

- [ ] **Step 4: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS (все тесты зелёные).

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore lib/slots.js lib/dates.js test/slots.test.js test/dates.test.js
git commit -m "feat: slots and date helpers with tests"
```

---

### Task 2: Расписание напоминаний

**Files:**
- Create: `lib/schedule.js`
- Create: `test/schedule.test.js`

**Interfaces:**
- Consumes: `SLOTS` (Task 1), `addDays`/`localDayKeyFromUtc` (Task 1).
- Produces:
  - `REMINDERS: [{slotId, time, dayOffset}]` — сетка (см. ниже).
  - `REMINDER_WINDOW_MINUTES = 5`.
  - `dueReminders(nowUtcMs: number, offsetMinutes: number) -> [{slotId: string, targetDayKey: string}]`.

`REMINDERS` (значения из спеки: +5 мин после конца слота; 23–6 утром; настроение вечером):
```js
[
  { slotId: '6-7',   time: '07:05', dayOffset: 0 },
  { slotId: '7-8',   time: '08:05', dayOffset: 0 },
  { slotId: '8-9',   time: '09:05', dayOffset: 0 },
  { slotId: '9-11',  time: '11:05', dayOffset: 0 },
  { slotId: '11-13', time: '13:05', dayOffset: 0 },
  { slotId: '13-15', time: '15:05', dayOffset: 0 },
  { slotId: '15-17', time: '17:05', dayOffset: 0 },
  { slotId: '17-18', time: '18:05', dayOffset: 0 },
  { slotId: '18-19', time: '19:05', dayOffset: 0 },
  { slotId: '19-20', time: '20:05', dayOffset: 0 },
  { slotId: '20-21', time: '21:05', dayOffset: 0 },
  { slotId: '21-22', time: '22:05', dayOffset: 0 },
  { slotId: '22-23', time: '23:00', dayOffset: 0 },
  { slotId: '23-6',  time: '07:00', dayOffset: -1 },
  { slotId: 'mood',  time: '21:30', dayOffset: 0 },
]
```

- [ ] **Step 1: Написать падающие тесты**

`test/schedule.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { REMINDERS, REMINDER_WINDOW_MINUTES, dueReminders } from '../lib/schedule.js';

test('15 напоминаний: 14 слотов + mood', () => {
  assert.equal(REMINDERS.length, 15);
  assert.equal(REMINDERS.filter(r => r.slotId === 'mood').length, 1);
});

test('dueReminders: слот 6-7 due ровно в 07:05 местного', () => {
  const nowUtc = Date.UTC(2026, 10, 21, 4, 5); // 07:05 при offset +180
  const due = dueReminders(nowUtc, 180);
  assert.deepEqual(due, [{ slotId: '6-7', targetDayKey: '2026-11-21' }]);
});

test('dueReminders: 23-6 утром пишется во вчерашний день', () => {
  const nowUtc = Date.UTC(2026, 10, 21, 4, 0); // 07:00 при offset +180
  const due = dueReminders(nowUtc, 180);
  assert.deepEqual(due, [{ slotId: '23-6', targetDayKey: '2026-11-20' }]);
});

test('dueReminders: окно 5 минут — до окна пусто, после окна пусто', () => {
  const before = Date.UTC(2026, 10, 21, 4, 4); // 07:04
  const after  = Date.UTC(2026, 10, 21, 4, 10); // 07:10
  assert.deepEqual(dueReminders(before, 180), []);
  assert.deepEqual(dueReminders(after, 180), []);
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../lib/schedule.js'`.

- [ ] **Step 3: Реализовать `REMINDERS`, `REMINDER_WINDOW_MINUTES`, `dueReminders` в `lib/schedule.js`**

Алгоритм `dueReminders` (единственная неочевидная логика — в теле):
```js
export function dueReminders(nowUtcMs, offsetMinutes) {
  const localNowMs = nowUtcMs + offsetMinutes * 60000;
  const localDate = new Date(localNowMs);
  const hhmm = `${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
  const out = [];
  for (const r of REMINDERS) {
    const target = addDays(dayKey(localDate), r.dayOffset);
    if (withinWindow(hhmm, r.time, REMINDER_WINDOW_MINUTES)) {
      out.push({ slotId: r.slotId, targetDayKey: target });
    }
  }
  return out;
}
```
`withinWindow(now, t, winMin)` — истина, если `t <= now < t + winMin` (сравнение «минуты с полуночи» как целые). `dayKey` импортировать из `lib/dates.js`.

- [ ] **Step 4: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule.js test/schedule.test.js
git commit -m "feat: reminder schedule and due computation"
```

---

### Task 3: Выгрузка истории (JSON/CSV)

**Files:**
- Create: `lib/export.js`
- Create: `test/export.test.js`

**Interfaces:**
- Consumes: форма записи `{date, mood, slots: [{slotId, activity, pleasure, importance}]}`.
- Produces:
  - `serializeHistory(records, format = 'json') -> string` (`'json'` → компактный JSON; `'csv'` → CSV с заголовком, `;`-разделитель, UTF-8 BOM).

- [ ] **Step 1: Написать падающие тесты**

`test/export.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeHistory } from '../lib/export.js';

const records = [
  { date: '2026-11-20', mood: 7, slots: [
    { slotId: '6-7', activity: 'Сон', pleasure: 7, importance: 8 },
    { slotId: '7-8', activity: null, pleasure: null, importance: null },
  ] },
];

test('JSON: корректный объект с пустыми значениями', () => {
  const parsed = JSON.parse(serializeHistory(records, 'json'));
  assert.equal(parsed[0].date, '2026-11-20');
  assert.equal(parsed[0].slots[1].activity, null);
});

test('CSV: заголовок и строка с пустым слотом', () => {
  const csv = serializeHistory(records, 'csv');
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('date;slotId;activity;pleasure;importance;mood'));
  assert.ok(csv.includes('2026-11-20;7-8;;;')); // пустые поля → пустые значения
});

test('JSON/CSV не ломаются на пустом массиве', () => {
  assert.equal(serializeHistory([], 'json'), '[]');
  assert.ok(serializeHistory([], 'csv').includes('date;slotId'));
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `node --test test/`
Expected: FAIL — нет `lib/export.js`.

- [ ] **Step 3: Реализовать `serializeHistory` в `lib/export.js`**

JSON — `JSON.stringify(records)`. CSV — разложить `records` в строки «один слот = одна строка» (mood в каждой строке дня), экранировать `;` и кавычки, пустые значения — пустые поля; первым символом — BOM `﻿`.

- [ ] **Step 4: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/export.js test/export.test.js
git commit -m "feat: history export to JSON and CSV"
```

---

### Task 4: Хранилище (IndexedDB)

**Files:**
- Create: `lib/storage.js`
- Create: `test/storage.test.js`
- Modify: `package.json` (добавить devDependency `fake-indexeddb`)

**Interfaces:**
- Consumes: форма дня `{date, mood, slots}`.
- Produces:
  - `openDB() -> Promise<IDBDatabase>` (БД `jarvis`, objectStore `days`, keyPath `date`).
  - `getDay(dateKey) -> Promise<day|null>`.
  - `putDay(day) -> Promise<void>` (перезапись по `date`).
  - `getAllDays() -> Promise<day[]>` (отсортировано по `date`).

- [ ] **Step 1: Написать падающие тесты**

`test/storage.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { getDay, putDay, getAllDays } from '../lib/storage.js';

test('putDay сохраняет, getDay читает, повторная запись перезаписывает', async () => {
  await putDay({ date: '2026-11-21', mood: 6, slots: [] });
  await putDay({ date: '2026-11-21', mood: 7, slots: [] });
  const day = await getDay('2026-11-21');
  assert.equal(day.mood, 7);
});

test('getAllDays возвращает отсортированные дни', async () => {
  await putDay({ date: '2026-11-20', mood: null, slots: [] });
  await putDay({ date: '2026-11-21', mood: null, slots: [] });
  const days = await getAllDays();
  assert.deepEqual(days.map(d => d.date), ['2026-11-20', '2026-11-21']);
});

test('getDay для отсутствующего дня возвращает null', async () => {
  assert.equal(await getDay('1999-01-01'), null);
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `npm install --save-dev fake-indexeddb` затем `node --test test/`
Expected: FAIL — нет `lib/storage.js`.

- [ ] **Step 3: Реализовать `openDB`/`getDay`/`putDay`/`getAllDays` в `lib/storage.js`**

Открывать БД один раз (ленивый синглтон-промис), `onupgradeneeded` создаёт `days` с `keyPath: 'date'`. Операции — через `IDBRequest`, обёрнутые в `Promise`.

- [ ] **Step 4: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.js test/storage.test.js package.json package-lock.json
git commit -m "feat: IndexedDB storage layer"
```

---

### Task 5: Приложение — интерфейс и флоу ответа

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `lib/jarvis.js`
- Create: `test/jarvis.test.js`

**Interfaces:**
- Consumes: `SLOTS`/`clampRating` (Task 1), `dayKey`/`todayKey`/`addDays` (Task 1), `getDay`/`putDay`/`getAllDays` (Task 4), `serializeHistory` (Task 3).
- Produces:
  - `parseAnswer(text: string) -> {activity: string}` — v1: `text.trim()` как `activity`; это шов под будущий LLM.
  - `buildDayViewModel(day) -> [{slotId, start, end, activity, pleasure, importance}]` — слоты в порядке `SLOTS`, с данными из `day.slots` (по `slotId`).

- [ ] **Step 1: Написать падающий тест для чистых функций**

`test/jarvis.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer } from '../lib/jarvis.js';
import { buildDayViewModel } from '../app.js';

test('parseAnswer v1: локальный pass-through с trim', () => {
  assert.deepEqual(parseAnswer('  Спала до 7  '), { activity: 'Спала до 7' });
});

test('buildDayViewModel: слоты в порядке SLOTS, данные по slotId', () => {
  const vm = buildDayViewModel({ date: '2026-11-21', mood: 7, slots: [
    { slotId: '7-8', activity: 'Завтрак', pleasure: 6, importance: 6 },
  ] });
  assert.equal(vm.length, 14);
  assert.equal(vm[0].slotId, '6-7');
  assert.equal(vm[0].activity, null);
  assert.equal(vm[1].activity, 'Завтрак');
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `node --test test/`
Expected: FAIL — нет `lib/jarvis.js`/`app.js`.

- [ ] **Step 3: Реализовать `parseAnswer` (lib/jarvis.js) и `buildDayViewModel` (app.js)**

`buildDayViewModel` — `SLOTS.map(s => ({...s, ...(day.slots.find(x => x.slotId === s.id) ?? {activity:null, pleasure:null, importance:null})}))`.

- [ ] **Step 4: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 5: Собрать `index.html` + `styles.css` + `app.js`**

Стиль «голографический синий»: тёмный синий градиент, светящееся ядро, чипы, листание дней. Экраны: «Сегодня» (шапка JARVIS + ядро + переключатель Пн–Вс + таблица «Время|Дело|Уд|Важ» + «Настроение дня»), «Ответ на слот» (чипы + свободный текст + две шкалы 0–10 + «Сохранить»), «История» (листание + кнопка «Выгрузить историю»). Все правки — через `putDay`, любое поле любого дня редактируемо.

- [ ] **Step 6: Открыть локально и проверить глазами**

Run: локальный статический сервер (напр. `npx serve .`) и открыть `http://localhost:3000`.
Expected: таблица сегодняшнего дня рендерится; слот можно заполнить и значение сохраняется после перезагрузки; листание дней работает.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css app.js lib/jarvis.js test/jarvis.test.js
git commit -m "feat: holographic UI and answer flow"
```

---

### Task 6: PWA — манифест и service worker

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `icons/icon.svg`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Modify: `index.html` (подключить манифест + регистрацию SW)

**Interfaces:**
- Consumes: `index.html` (Task 5).
- Produces: SW с обработкой `push` (показ уведомления с `data.slotId`) и `notificationclick` (фокус/открытие приложения + пометка целевого слота).

- [ ] **Step 1: Создать `manifest.webmanifest`**

`name: "JARVIS"`, `short_name: "JARVIS"`, `display: "standalone"`, `theme_color`/`background_color` в тёмно-синем, иконки `icon-192.png` и `icon-512.png`.

- [ ] **Step 2: Создать иконки**

`icons/icon.svg` — светящееся ядро на тёмном фоне; `icon-192.png`/`icon-512.png` — рендеры этого SVG в 192 и 512 px (любым способом: `sharp`/`rsvg`/экспорт из редактора).

- [ ] **Step 3: Реализовать `sw.js`**

`install` — кэш `index.html`, `styles.css`, `app.js`, `lib/*`. `push` — `showNotification` с текстом по `slotId` (напр. «Что делала с 6 до 7?»; для `mood` — «Оцени настроение дня 0–10»). `notificationclick` — открыть приложение на целевом слоте/дате.

- [ ] **Step 4: Подключить в `index.html` и проверить**

Run: открыть по `http://localhost:3000`, DevTools → Application → Manifest/SW.
Expected: манифест валиден, SW зарегистрирован, приложение устанавливается («Добавить на главный экран»).

- [ ] **Step 5: Commit**

```bash
git add manifest.webmanifest sw.js icons index.html
git commit -m "feat: PWA manifest and service worker"
```

---

### Task 7: Бэкенд — подписка и отправка уведомлений

**Files:**
- Create: `api/subscribe.js`
- Create: `api/notify.js`
- Create: `vercel.json`
- Create: `test/notify.test.js`
- Modify: `package.json` (dependencies: `web-push`, `@vercel/kv`)

**Interfaces:**
- Consumes: `dueReminders` (Task 2), `localDayKeyFromUtc` (Task 1).
- Produces:
  - `POST /api/subscribe` — body `{subscription, offsetMinutes}`; кладёт в KV ключ `push:subscriptions` (массив). Возвращает `{ok: true}`.
  - `GET /api/notify` — читает подписки из KV, для каждой вычисляет `dueReminders`, шлёт push. Возвращает `{sent: [{slotId, targetDayKey}], skipped: n}`.
  - `buildPushPayload(due, offsetMinutes) -> {title, body, data}` — чистая функция для теста.

- [ ] **Step 1: Написать падающий тест**

`test/notify.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushPayload } from '../api/notify.js';

test('buildPushPayload: текст по слоту и mood', () => {
  const slot = buildPushPayload([{ slotId: '6-7', targetDayKey: '2026-11-21' }], 180);
  assert.equal(slot.title, 'JARVIS');
  assert.ok(slot.body.includes('6 до 7'));
  assert.equal(slot.data.slotId, '6-7');
  const mood = buildPushPayload([{ slotId: 'mood', targetDayKey: '2026-11-21' }], 180);
  assert.ok(mood.body.includes('настроение'));
});
```

- [ ] **Step 2: Запустить тесты, убедиться в FAIL**

Run: `node --test test/`
Expected: FAIL — нет `api/notify.js`.

- [ ] **Step 3: Реализовать `buildPushPayload` + `api/notify.js`**

`buildPushPayload` — текст по `slotId` (для `mood` особый), `data: {slotId, targetDayKey}`. В `api/notify.js` (Vercel handler `export default async function handler(req, res)`): подписки из KV → `dueReminders` по `offsetMinutes` каждой → `webpush.sendNotification(sub, JSON.stringify(payload))` с VAPID из env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

- [ ] **Step 4: Реализовать `api/subscribe.js`**

`POST`: валидировать body, добавить `{subscription, offsetMinutes}` в массив по ключу `push:subscriptions` (KV), вернуть `{ok: true}`.

- [ ] **Step 5: Добавить `vercel.json`**

```json
{ "crons": [{ "path": "/api/notify", "schedule": "*/5 * * * *" }] }
```

- [ ] **Step 6: Запустить тесты, убедиться в PASS**

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/subscribe.js api/notify.js vercel.json test/notify.test.js package.json
git commit -m "feat: push subscribe/notify serverless functions"
```

---

### Task 8: Деплой и сквозная проверка

**Files:**
- Create: `README.md` (шаги установки на телефон и настройки)
- Modify: `.gitignore` (убедиться, что `.env` и `.vercel` игнорируются)

**Interfaces:**
- Consumes: всё приложение (Tasks 1–7).

- [ ] **Step 1: Сгенерировать VAPID-ключи и задать env в Vercel**

Run: `npx web-push generate-vapid-keys`
Задать в Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto). `VAPID_PUBLIC_KEY` также подставить в `app.js` для `pushManager.subscribe`.

- [ ] **Step 2: Задеплоить в Vercel**

Run: `vercel deploy --prod` (связать с аккаунтом Vercel пользователя).
Expected: продакшн-URL с HTTPS.

- [ ] **Step 3: Проверить `/api/subscribe` и cron**

Run: `curl -X POST https://<app>/api/subscribe -H 'content-type: application/json' -d '{"subscription":{"endpoint":"test"},"offsetMinutes":180}'`; затем вручную дернуть `curl https://<app>/api/notify`.
Expected: `/api/subscribe` возвращает `{ok:true}`; `/api/notify` возвращает JSON с `sent`/`skipped`.

- [ ] **Step 4: Сквозная проверка на телефоне**

На Android-телефоне дочери: открыть URL → «Добавить на главный экран» → разрешить уведомления → дождаться очередного слота.
Expected: push-уведомление приходит, тап открывает экран ответа, ответ сохраняется в таблицу, «Выгрузить историю» скачивает файл.

- [ ] **Step 5: Commit README**

```bash
git add README.md .gitignore
git commit -m "docs: setup and install instructions"
```

---

## Self-Review

- **Spec coverage:** слоты/оценки → Task 1,4,5; напоминания по кусочкам → Task 2,7,8; локальная приватность → Task 4 (IndexedDB), Global Constraints; голографический стиль → Task 5; PWA/Android → Task 6; история + выгрузка → Task 3,4,5; шов LLM → Task 5 (`parseAnswer`); Vercel → Task 8. Пропусков нет.
- **Step scan:** каждая строка задаёт ровно одно действие с проверяемым результатом; тела функций приведены только для `dueReminders` (неочевидная дата-логика).
- **Type consistency:** `dayKey`/`addDays`/`localDayKeyFromUtc` определены в Task 1 и используются в Task 2; `getDay`/`putDay`/`getAllDays` (Task 4) используются в Task 5; `dueReminders` (Task 2) используется в Task 7; `serializeHistory` (Task 3) — в Task 5. Имена совпадают.
- **Review Focus:** пункты 1,5 → Task 2; 2 → Task 1; 3 → Task 3; 4 → Task 1 (`clampRating`).
- **Proportion:** план ≈ объём спеки; тела кода заменены сигнатурами и ассертами, кроме одного алгоритма.
