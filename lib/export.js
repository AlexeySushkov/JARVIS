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

// --- Настоящий .docx (wordprocessingml), без зависимостей ---

function xmlEscape(value) {
  return escapeHtml(value);
}

function runXml(text, bold, sizeHalfPoints) {
  const lines = String(text ?? '').split('\n');
  const inner = [];
  lines.forEach((line, i) => {
    if (i > 0) inner.push('<w:br/>');
    inner.push(`<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`);
  });
  const rPr = `${bold ? '<w:b/>' : ''}${sizeHalfPoints ? `<w:sz w:val="${sizeHalfPoints}"/><w:szCs w:val="${sizeHalfPoints}"/>` : ''}`;
  return `<w:r><w:rPr>${rPr}</w:rPr>${inner.join('')}</w:r>`;
}

function paraXml(runContent) {
  return `<w:p>${runContent}</w:p>`;
}

function textPara(text, bold, sizeHalfPoints) {
  return paraXml(runXml(text, bold, sizeHalfPoints));
}

// Ширина столбцов в twips (1/20 пункта). Сумма = 9638 = ширина контента A4
// (11906 - 2×1134 поля). «Дело» — широкий, остальные — узкие.
const COL_WIDTHS = [1200, 4838, 1800, 1800];

function cellXml(text, bold, width) {
  const inner = (text === '' || text === null || text === undefined) ? '<w:p/>' : textPara(text, bold);
  const tcPr = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>`;
  return `<w:tc>${tcPr}${inner}</w:tc>`;
}

const TBL_BORDERS = '<w:tblBorders>'
  + '<w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>'
  + '<w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>'
  + '<w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>'
  + '</w:tblBorders>';

// Внутренние отступы ячеек (twips): текст не прилипает к рамке.
const CELL_MAR = '<w:tblCellMar>'
  + '<w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>'
  + '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/>'
  + '</w:tblCellMar>';

function rowXml(cells) {
  return `<w:tr>${cells.map((c, i) => cellXml(c.text, c.bold, COL_WIDTHS[i])).join('')}</w:tr>`;
}

function tableXml(rows) {
  const grid = COL_WIDTHS.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const total = COL_WIDTHS.reduce((a, b) => a + b, 0);
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${TBL_BORDERS}${CELL_MAR}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.map(rowXml).join('')}</w:tbl>`;
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
    parts.push(textPara(`${dayTitle(day.date)} ${dayDate(day.date)}`, true, 28));
    parts.push(tableXml(dayRows(day)));
    const mood = day.mood !== null && day.mood !== undefined ? `Настроение дня — ${day.mood}` : 'Настроение дня ______';
    parts.push(textPara(mood));
  });
  parts.push('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>');
  parts.push('</w:body></w:document>');
  return buildDocx(parts.join(''));
}
