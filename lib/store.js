// Storage layer. Uses Google Sheets when the Google env vars are set,
// otherwise a local JSON file (local development only).
import fs from 'fs';
import path from 'path';
import { DEFAULT_QUESTIONS, DEFAULT_ROLE } from './defaults';

export const ANSWER_HEADER = ['timestamp', 'session_id', 'name', 'email', 'challenge_id', 'answer_json', 'seconds', 'tab_switches', 'paste_attempts', 'copy_attempts', 'role_id'];
const TABS = {
  Answers: ANSWER_HEADER,
  Questions: ['id', 'order', 'enabled', 'question_json', 'role_id'],
  Reviews: ['session_id', 'review_json', 'updated'],
  Roles: ['id', 'slug', 'status', 'role_json'],
};

// Vercel may add a prefix to the variable name (e.g. STORAGE_DATABASE_URL), so accept any of these.
function findDbUrl() {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const k = Object.keys(env).find((x) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(x) && /^postgres/.test(env[x] || ''));
  return k ? env[k] : '';
}
const DB_URL = findDbUrl();
const useNeon = !!DB_URL;
const useSheets = !useNeon && !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.SHEET_ID);
export const storageMode = useNeon ? 'database' : useSheets ? 'sheets' : 'local';
export const NO_STORAGE = 'No storage is connected. In Vercel, open this project, go to Storage, create a Neon database and connect it to the project, then redeploy.';
function assertStorage() { if (storageMode === 'local' && process.env.VERCEL) throw new Error(NO_STORAGE); }

/* ---------------- Neon Postgres ---------------- */
let sqlFn = null, tableReady = false;
async function sql() {
  if (!sqlFn) { const { neon } = await import('@neondatabase/serverless'); sqlFn = neon(DB_URL); }
  if (!tableReady) {
    await sqlFn`CREATE TABLE IF NOT EXISTS hive_rows (id BIGSERIAL PRIMARY KEY, tab TEXT NOT NULL, row JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
    await sqlFn`CREATE INDEX IF NOT EXISTS hive_rows_tab ON hive_rows (tab, id)`;
    tableReady = true;
  }
  return sqlFn;
}
async function neonRead(tab) { const q = await sql(); const r = await q`SELECT row FROM hive_rows WHERE tab = ${tab} ORDER BY id`; return r.map((x) => x.row); }
async function neonAppend(tab, row) { const q = await sql(); await q`INSERT INTO hive_rows (tab, row) VALUES (${tab}, ${JSON.stringify(row)}::jsonb)`; }
async function neonReplace(tab, rows) {
  const q = await sql();
  const queries = [q`DELETE FROM hive_rows WHERE tab = ${tab}`];
  for (const r of rows) queries.push(q`INSERT INTO hive_rows (tab, row) VALUES (${tab}, ${JSON.stringify(r)}::jsonb)`);
  await q.transaction(queries);
}

/* ---------------- Google Sheets ---------------- */
let jwt = null;
async function token() {
  if (!jwt) {
    const { JWT } = await import('google-auth-library');
    jwt = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  }
  return (await jwt.getAccessToken()).token;
}
async function gs(p, opts = {}, attempt = 0) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}${p}`, {
    ...opts, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, cache: 'no-store',
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) { await new Promise((r) => setTimeout(r, 800 * (attempt + 1) + Math.random() * 400)); return gs(p, opts, attempt + 1); }
  if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
let tabsReady = false;
async function ensureTabs() {
  if (tabsReady) return;
  const meta = await gs('?fields=sheets.properties.title');
  const have = new Set(meta.sheets.map((s) => s.properties.title));
  const missing = Object.keys(TABS).filter((t) => !have.has(t));
  if (missing.length) {
    await gs(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }) });
    for (const t of missing) await gs(`/values/${t}!A1?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [TABS[t]] }) });
  }
  // make sure the header row has every column (older sheets may be missing role_id)
  for (const t of Object.keys(TABS)) if (have.has(t)) await gs(`/values/${t}!A1?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [TABS[t]] }) });
  tabsReady = true;
}
async function readTab(tab) {
  await ensureTabs();
  const r = await gs(`/values/${tab}!A:K?majorDimension=ROWS`);
  return (r.values || []).slice(1);
}
async function appendRow(tab, row) {
  await ensureTabs();
  await gs(`/values/${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values: [row] }) });
}
async function replaceTab(tab, rows) {
  await ensureTabs();
  await gs(`/values/${tab}!A2:K:clear`, { method: 'POST', body: '{}' });
  if (rows.length) await gs(`/values/${tab}!A2?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: rows }) });
}
async function updateRow(tab, rowNumber, row) {
  await gs(`/values/${tab}!A${rowNumber}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [row] }) });
}

/* ---------------- Local file (dev) ---------------- */
const FILE = path.join(process.cwd(), '.data', 'db.json');
function loadLocal() {
  let db;
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { db = {}; }
  for (const t of Object.keys(TABS)) db[t] = db[t] || [];
  return db;
}
function saveLocal(db) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 1)); }
const read = async (tab) => { assertStorage(); if (useNeon) return neonRead(tab); return useSheets ? readTab(tab) : loadLocal()[tab]; };
const replace = async (tab, rows) => { assertStorage(); if (useNeon) return neonReplace(tab, rows); if (useSheets) return replaceTab(tab, rows); const db = loadLocal(); db[tab] = rows; saveLocal(db); };
const append = async (tab, row) => { assertStorage(); if (useNeon) return neonAppend(tab, row); if (useSheets) return appendRow(tab, row); const db = loadLocal(); db[tab].push(row); saveLocal(db); };

function clean(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop formula injection
  return s.slice(0, 45000);
}

/* ---------------- Roles ---------------- */
let rolesCache = { at: 0, roles: null };
export async function getRoles(fresh = false) {
  if (!fresh && rolesCache.roles && Date.now() - rolesCache.at < 30000) return rolesCache.roles;
  const rows = await read('Roles');
  let roles = [];
  for (const r of rows) { try { roles.push(JSON.parse(r[3])); } catch (e) { /* skip */ } }
  if (!roles.length) { roles = [DEFAULT_ROLE]; await saveRoles(roles); }
  rolesCache = { at: Date.now(), roles };
  return roles;
}
export async function saveRoles(roles) {
  await replace('Roles', roles.map((r) => [r.id, r.slug, r.status, JSON.stringify(r)]));
  rolesCache = { at: Date.now(), roles };
}
export async function upsertRole(role) {
  const roles = await getRoles(true);
  const i = roles.findIndex((r) => r.id === role.id);
  if (roles.some((r) => r.slug === role.slug && r.id !== role.id)) throw new Error('That link name is already used by another role.');
  if (i > -1) roles[i] = role; else roles.push(role);
  await saveRoles(roles);
  return role;
}
export function roleIsOpen(role) {
  if (!role || role.status !== 'open') return false;
  if (role.closesAt && new Date(role.closesAt + 'T23:59:59') < new Date()) return false;
  return true;
}

/* ---------------- Questions ---------------- */
async function allQuestionRows() {
  const rows = await read('Questions');
  return rows.map((r) => ({ id: r[0], order: Number(r[1]) || 0, enabled: String(r[2]) === 'true', json: r[3], role: r[4] || DEFAULT_ROLE.id }));
}
export async function getQuestions(roleId) {
  const rows = (await allQuestionRows()).filter((r) => r.role === roleId);
  if (!rows.length && roleId === DEFAULT_ROLE.id) {
    const existing = await allQuestionRows();
    if (!existing.some((r) => r.role === DEFAULT_ROLE.id)) { await saveQuestions(roleId, DEFAULT_QUESTIONS); return DEFAULT_QUESTIONS; }
  }
  const qs = [];
  for (const r of rows) { try { const q = JSON.parse(r.json); q.enabled = r.enabled; q.order = r.order; qs.push(q); } catch (e) { /* skip */ } }
  return qs.sort((a, b) => a.order - b.order);
}
export async function saveQuestions(roleId, qs) {
  const others = (await allQuestionRows()).filter((r) => r.role !== roleId).map((r) => [r.id, r.order, r.enabled ? 'true' : 'false', r.json, r.role]);
  const mine = qs.map((q, i) => [q.id, i + 1, q.enabled ? 'true' : 'false', JSON.stringify({ ...q, order: i + 1 }), roleId]);
  await replace('Questions', [...others, ...mine]);
}

/* ---------------- Answers ---------------- */
export async function addAnswer(p) {
  await append('Answers', [
    new Date().toISOString(), clean(p.session_id), clean(p.name), clean(p.email), clean(p.challenge_id),
    JSON.stringify(p.answer || {}).slice(0, 45000), Number(p.seconds) || 0, Number(p.tab_switches) || 0,
    Number(p.paste_attempts) || 0, Number(p.copy_attempts) || 0, clean(p.role_id),
  ]);
}
export async function getAnswers(roleId) {
  const rows = await read('Answers');
  const out = rows.map((r) => Object.fromEntries(ANSWER_HEADER.map((h, i) => [h, r[i] ?? ''])));
  out.forEach((r) => { if (!r.role_id) r.role_id = DEFAULT_ROLE.id; });
  return roleId ? out.filter((r) => r.role_id === roleId) : out;
}

/* ---------------- Reviews ---------------- */
export async function getReviews() {
  const out = {};
  for (const r of await read('Reviews')) { try { out[r[0]] = JSON.parse(r[1] || '{}'); } catch (e) { /* skip */ } }
  return out;
}
export async function saveReview(sid, review) {
  const row = [clean(sid), JSON.stringify(review).slice(0, 45000), new Date().toISOString()];
  if (useNeon) { const q = await sql(); await q.transaction([q`DELETE FROM hive_rows WHERE tab = 'Reviews' AND row->>0 = ${String(sid)}`, q`INSERT INTO hive_rows (tab, row) VALUES ('Reviews', ${JSON.stringify(row)}::jsonb)`]); return; }
  const rows = await read('Reviews');
  const idx = rows.findIndex((r) => r[0] === sid);
  if (useSheets) { if (idx > -1) return updateRow('Reviews', idx + 2, row); return appendRow('Reviews', row); }
  const db = loadLocal(); if (idx > -1) db.Reviews[idx] = row; else db.Reviews.push(row); saveLocal(db);
}
