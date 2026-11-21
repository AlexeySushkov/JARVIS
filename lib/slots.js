export const SLOTS = [
  { id: '6-7',    start: '06:00', end: '07:00' },
  { id: '7-8',    start: '07:00', end: '08:00' },
  { id: '8-9',    start: '08:00', end: '09:00' },
  { id: '9-11',   start: '09:00', end: '11:00' },
  { id: '11-13',  start: '11:00', end: '13:00' },
  { id: '13-15',  start: '13:00', end: '15:00' },
  { id: '15-17',  start: '15:00', end: '17:00' },
  { id: '17-18',  start: '17:00', end: '18:00' },
  { id: '18-19',  start: '18:00', end: '19:00' },
  { id: '19-20',  start: '19:00', end: '20:00' },
  { id: '20-21',  start: '20:00', end: '21:00' },
  { id: '21-22',  start: '21:00', end: '22:00' },
  { id: '22-23',  start: '22:00', end: '23:00' },
  { id: '23-6',   start: '23:00', end: '06:00' },
];

export function clampRating(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const num = Math.round(Number(n));
  if (Number.isNaN(num)) return null;
  return Math.min(10, Math.max(0, num));
}
