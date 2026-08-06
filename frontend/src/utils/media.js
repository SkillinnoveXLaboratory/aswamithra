const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3099/api/v1';

export function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return 'http://localhost:3099';
  }
}

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return `${getApiOrigin()}${url}`;
  return `${getApiOrigin()}/${url}`;
}
