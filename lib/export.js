import { SLOTS } from './slots.js';
import { keyToDate } from './dates.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hourLabel(hhmm) {
  return String(parseInt(hhmm.split(':')[0], 10));
}

function timeLabel(slot) {
  const end = slot.end === '06:00' ? '6.00' : hourLabel(slot.end);
  return `${hourLabel(slot.start)}-${end}`;
}

function dayTitle(key) {
  const name = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(keyToDate(key));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const CELL = 'border:1px solid #000;padding:4px;vertical-align:top;';
const HEAD = CELL + 'font-weight:bold;';

export function serializeWeekDoc(days) {
  const out = [];
  out.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Дневник — неделя</title></head><body style="font-family:Arial,sans-serif;font-size:11pt">');

  days.forEach((day, index) => {
    if (index > 0) out.push('<div style="page-break-before:always"></div>');

    out.push(`<h2 style="font-size:14pt;margin:0 0 10px">${escapeHtml(dayTitle(day.date))}</h2>`);
    out.push('<table style="border-collapse:collapse;width:100%">');
    out.push('<tr>');
    out.push(`<td style="${HEAD}width:60px">Время</td>`);
    out.push(`<td style="${HEAD}">Дело</td>`);
    out.push(`<td style="${HEAD}width:120px">удовольствие (0-10)</td>`);
    out.push(`<td style="${HEAD}width:110px">Важность (0-10)</td>`);
    out.push('</tr>');

    for (const slot of SLOTS) {
      const filled = (day.slots || []).find((x) => x.slotId === slot.id);
      const activity = filled ? filled.activity : null;
      const pleasure = filled && filled.pleasure !== null && filled.pleasure !== undefined ? filled.pleasure : '';
      const importance = filled && filled.importance !== null && filled.importance !== undefined ? filled.importance : '';
      out.push(`<tr><td style="${CELL}">${timeLabel(slot)}</td><td style="${CELL}">${escapeHtml(activity || '')}</td><td style="${CELL}">${pleasure}</td><td style="${CELL}">${importance}</td></tr>`);
    }

    out.push(`<tr><td style="${CELL}">&nbsp;</td><td style="${CELL}"></td><td style="${CELL}"></td><td style="${CELL}"></td></tr>`);
    out.push('</table>');

    const mood = day.mood !== null && day.mood !== undefined ? `Настроение дня — ${day.mood}` : 'Настроение дня ______';
    out.push(`<p style="margin:10px 0 0">${mood}</p>`);
  });

  out.push('</body></html>');
  return out.join('\n');
}
