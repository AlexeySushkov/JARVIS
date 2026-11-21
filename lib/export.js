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
