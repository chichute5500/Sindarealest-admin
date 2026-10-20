export function sanitizeUrl(value) {
  try {
    const url = new URL(String(value));
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return String(value ?? '').replace(/([?&][^=&#\s]+)=([^&#\s]*)/g, '$1=[REDACTED]');
  }
}

export function sanitizeText(value) {
  return String(value ?? '').replace(/https?:\/\/[^\s"'<>]+/g, (url) => sanitizeUrl(url));
}
