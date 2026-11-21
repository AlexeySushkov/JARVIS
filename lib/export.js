import { SLOTS } from './slots.js';
import { keyToDate } from './dates.js';

function escapeCsv(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(records) {
  const header = 'date;slotId;activity;pleasure;importance;mood';
  const lines = [header];
  for (const day of records) {
    for (const slot of day.slots) {
      lines.push([
        day.date,
        slot.slotId,
        slot.activity,
        slot.pleasure,
        slot.importance,
        day.mood,
      ].map(escapeCsv).join(';'));
    }
  }
  return '﻿' + lines.join('\n');
}

export function serializeHistory(records, format = 'json') {
  if (format === 'csv') return toCsv(records);
  return JSON.stringify(records);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hourLabel(hhmm) {
  return String(parseInt(hhmm.split(':')[0], 10));
}

function dayTitle(key) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(keyToDate(key));
}

export function serializeWeekDoc(records) {
  const lines = [];
  lines.push('<html><head><meta charset="utf-8"><title>JARVIS — неделя</title></head><body>');
  lines.push('<h1>Дневник — неделя</h1>');
  for (const day of records) {
    lines.push(`<h2>${escapeHtml(dayTitle(day.date))}</h2>`);
    lines.push('<table border="1" cellspacing="0" cellpadding="4">');
    lines.push('<tr><th>Время</th><th>Дело</th><th>Удовольствие</th><th>Важность</th></tr>');
    for (const s of SLOTS) {
      const filled = (day.slots || []).find((x) => x.slotId === s.id);
      const activity = filled ? filled.activity : null;
      const pleasure = filled && filled.pleasure !== null && filled.pleasure !== undefined ? filled.pleasure : '';
      const importance = filled && filled.importance !== null && filled.importance !== undefined ? filled.importance : '';
      lines.push(`<tr><td>${hourLabel(s.start)}–${hourLabel(s.end)}</td><td>${escapeHtml(activity || '')}</td><td>${pleasure}</td><td>${importance}</td></tr>`);
    }
    lines.push('</table>');
    if (day.mood !== null && day.mood !== undefined) {
      lines.push(`<p>Настроение дня: ${day.mood}</p>`);
    }
  }
  lines.push('</body></html>');
  return lines.join('\n');
}
