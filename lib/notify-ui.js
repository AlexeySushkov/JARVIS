const LABELS = {
  granted: 'разрешено',
  denied: 'запрещено',
  default: 'не запрошено',
  unsupported: 'не поддерживается',
};

export function permissionLabel(permission) {
  return LABELS[permission] || 'неизвестно';
}
