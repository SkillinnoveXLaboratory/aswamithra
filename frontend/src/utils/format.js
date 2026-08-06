export function money(value) {
  const number = Number(value || 0);
  return `Rs. ${number.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function todayLabel(value) {
  if (!value) return 'Today';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function roleHome(role) {
  if (role === 'admin') return '/admin/home';
  if (role === 'farmer') return '/farmer/home';
  if (role === 'b2b') return '/b2b/home';
  return '/customer/home';
}

export function statusTone(status = '') {
  const normalized = status.toLowerCase();
  if (['active', 'approved', 'paid', 'delivered', 'accepted', 'settled'].includes(normalized)) return 'good';
  if (['pending', 'placed', 'open', 'pending_kyc'].includes(normalized)) return 'warn';
  if (['rejected', 'cancelled', 'suspended'].includes(normalized)) return 'bad';
  return 'soft';
}
