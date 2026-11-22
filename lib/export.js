import { SLOTS } from './slots.js';
import { keyToDate } from './dates.js';
import { buildDocx } from './docx.js';

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

function dayDate(key) {
  const d = keyToDate(key);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const CELL = 'border:1px solid #000;padding:4px;vertical-align:top;';
const TEXT_CELL = CELL + 'white-space:pre-line;';
const HEAD = CELL + 'font-weight:bold;';

export function serializeWeekDoc(days) {
  const out = [];
  out.push('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Дневник — неделя</title></head><body style="font-family:Arial,sans-serif;font-size:11pt">');

  days.forEach((day, index) => {
    if (index > 0) out.push('<div style="page-break-before:always"></div>');

    out.push(`<h2 style="font-size:14pt;margin:0 0 10px">${escapeHtml(dayTitle(day.date))} ${dayDate(day.date)}</h2>`);
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
      out.push(`<tr><td style="${CELL}">${timeLabel(slot)}</td><td style="${TEXT_CELL}">${escapeHtml(activity || '')}</td><td style="${CELL}">${pleasure}</td><td style="${CELL}">${importance}</td></tr>`);
    }

    out.push(`<tr><td style="${CELL}">&nbsp;</td><td style="${CELL}"></td><td style="${CELL}"></td><td style="${CELL}"></td></tr>`);
    out.push('</table>');

    const mood = day.mood !== null && day.mood !== undefined ? `Настроение дня — ${day.mood}` : 'Настроение дня ______';
    out.push(`<p style="margin:10px 0 0">${mood}</p>`);
  });

  out.push('</body></html>');
  return out.join('\n');
}

// --- Настоящий .docx (wordprocessingml), без зависимостей ---

function xmlEscape(value) {
  return escapeHtml(value);
}

function runXml(text, bold) {
  const lines = String(text ?? '').split('\n');
  const inner = [];
  lines.forEach((line, i) => {
    if (i > 0) inner.push('<w:br/>');
    inner.push(`<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`);
  });
  return `<w:r><w:rPr>${bold ? '<w:b/>' : ''}</w:rPr>${inner.join('')}</w:r>`;
}

function paraXml(runContent) {
  return `<w:p>${runContent}</w:p>`;
}

function textPara(text, bold) {
  return paraXml(runXml(text, bold));
}

function cellXml(text, bold) {
  const inner = (text === '' || text === null || text === undefined) ? '<w:p/>' : textPara(text, bold);
  return `<w:tc>${inner}</w:tc>`;
}

const TBL_BORDERS = '<w:tblBorders>'
  + '<w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>'
  + '<w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>'
  + '<w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>'
  + '</w:tblBorders>';

function rowXml(cells) {
  return `<w:tr>${cells.map((c) => cellXml(c.text, c.bold)).join('')}</w:tr>`;
}

function tableXml(rows) {
  return `<w:tbl><w:tblPr>${TBL_BORDERS}</w:tblPr>${rows.map(rowXml).join('')}</w:tbl>`;
}

function dayRows(day) {
  const rows = [[
    { text: 'Время', bold: true },
    { text: 'Дело', bold: true },
    { text: 'удовольствие (0-10)', bold: true },
    { text: 'Важность (0-10)', bold: true },
  ]];
  for (const slot of SLOTS) {
    const filled = (day.slots || []).find((x) => x.slotId === slot.id);
    const activity = filled ? filled.activity : '';
    const pleasure = filled && filled.pleasure !== null && filled.pleasure !== undefined ? String(filled.pleasure) : '';
    const importance = filled && filled.importance !== null && filled.importance !== undefined ? String(filled.importance) : '';
    rows.push([
      { text: timeLabel(slot) },
      { text: activity },
      { text: pleasure },
      { text: importance },
    ]);
  }
  rows.push([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
  return rows;
}

export function serializeWeekDocx(days) {
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  parts.push('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>');
  days.forEach((day, index) => {
    if (index > 0) parts.push(paraXml('<w:r><w:br w:type="page"/></w:r>'));
    parts.push(textPara(`${dayTitle(day.date)} ${dayDate(day.date)}`, true));
    parts.push(tableXml(dayRows(day)));
    const mood = day.mood !== null && day.mood !== undefined ? `Настроение дня — ${day.mood}` : 'Настроение дня ______';
    parts.push(textPara(mood));
  });
  parts.push('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>');
  parts.push('</w:body></w:document>');
  return buildDocx(parts.join(''));
}
