// Strict admin login: email + password, signed session cookie that expires after 12 hours.
// The password is never stored in plain text. Set ADMIN_EMAIL and ADMIN_PASSWORD in Vercel to
// change the login; otherwise the built-in hash below is used.
export const COOKIE = 'hive_admin';
const BUILTIN = '07cb5e5b50ae11383ae5a0729f7e2a77178ca44ec579c2f2471fa5300c588d1d';
const SESSION_HOURS = 12;

async function sha(s) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export const credHash = (email, pw) => sha('onehive-admin-v1|' + String(email || '').trim().toLowerCase() + '|' + String(pw || ''));
async function expectedCred() {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) return credHash(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  return BUILTIN;
}
const secret = () => process.env.SESSION_SECRET || 'onehive-hive-session-v1';

export async function checkLogin(email, pw) { return safeEqual(await credHash(email, pw), await expectedCred()); }
export async function makeToken() {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  return exp + '.' + (await sha(exp + '|' + secret() + '|' + (await expectedCred())));
}
export const SESSION_SECONDS = SESSION_HOURS * 3600;
export async function isAdmin(req) {
  const c = req.cookies.get(COOKIE);
  if (!c || !c.value) return false;
  const [exp, sig] = c.value.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await sha(exp + '|' + secret() + '|' + (await expectedCred())));
}
