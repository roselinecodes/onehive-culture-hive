// Simple password login. The cookie holds a hash of the password + secret.
export const COOKIE = 'hive_admin';

export async function expectedToken() {
  const pw = process.env.ADMIN_PASSWORD || 'onehive-local';
  const secret = process.env.SESSION_SECRET || 'local-dev-secret';
  const data = new TextEncoder().encode(pw + '|' + secret);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAdmin(req) {
  const c = req.cookies.get(COOKIE);
  return !!c && c.value === (await expectedToken());
}
