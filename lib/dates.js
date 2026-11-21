function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmt(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function dayKey(date) {
  return fmt(date.getFullYear(), date.getMonth(), date.getDate());
}

export function todayKey() {
  return dayKey(new Date());
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function localDayKeyFromUtc(nowUtcMs, offsetMinutes) {
  const shifted = new Date(nowUtcMs + offsetMinutes * 60000);
  return fmt(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}
