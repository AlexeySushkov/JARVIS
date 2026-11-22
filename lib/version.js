export function formatBuildDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatBuild(info) {
  const parts = [];
  if (info && info.commit) parts.push(info.commit);
  const date = info ? formatBuildDate(info.date) : '';
  if (date) parts.push(date);
  return parts.join(' · ');
}

export function formatVersion(appVersion, info) {
  const parts = [appVersion];
  if (info && info.commit) parts.push(info.commit);
  const date = info ? formatBuildDate(info.date) : '';
  if (date) parts.push(date);
  return parts.join(' · ');
}
