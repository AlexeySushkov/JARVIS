const LABELS = {
  granted: 'разрешено',
  denied: 'запрещено',
  default: 'не запрошено',
  unsupported: 'не поддерживается',
};

export function permissionLabel(permission) {
  return LABELS[permission] || 'неизвестно';
}

export function formatSchedule(hourUtc, minuteUtc, offsetMinutes) {
  const total = ((hourUtc * 60 + minuteUtc + offsetMinutes) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
