// 超シンプルなデータ保存（個人利用MVP向け）。
// ローカル開発では data/db.json 1ファイル、本番（Vercel等）ではファイルシステムが
// 永続化されないため、Postgres（Neon）の1行に同じJSONをまるごと保存する。
// 顧客の氏名・メールなど個人情報を扱うため、公開URL方式（Blobの公開URLなど）は避け、
// 接続文字列で保護された非公開のDBにしている。
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let sql = null;
let schemaReady = null;
function getSql() {
  if (!sql) sql = neon(DB_URL);
  if (!schemaReady) {
    schemaReady = sql`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value JSONB NOT NULL)`;
  }
  return sql;
}

async function readDB() {
  if (DB_URL) {
    const sql = getSql();
    await schemaReady;
    const rows = await sql`SELECT value FROM kv WHERE key = 'main'`;
    if (rows.length === 0) {
      return { clients: [], sessions: [], rateTemplates: [] };
    }
    return { clients: [], sessions: [], rateTemplates: [], ...rows[0].value };
  }
  if (!fs.existsSync(DB_PATH)) {
    return { clients: [], sessions: [], rateTemplates: [] };
  }
  return { clients: [], sessions: [], rateTemplates: [], ...JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) };
}

async function writeDB(db) {
  if (DB_URL) {
    const sql = getSql();
    await schemaReady;
    await sql`
      INSERT INTO kv (key, value) VALUES ('main', ${JSON.stringify(db)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return;
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(items) {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.id)) + 1;
}

// よく使う単価をテンプレとして登録しておき、/start の入力を楽にする（登録・利用は任意）
export async function getRateTemplates() {
  return (await readDB()).rateTemplates;
}

export async function addRateTemplate({ name, unitMinutes, pricePerUnit }) {
  const db = await readDB();
  const template = { id: nextId(db.rateTemplates), name, unitMinutes, pricePerUnit };
  db.rateTemplates.push(template);
  await writeDB(db);
  return template;
}

export async function deleteRateTemplate(id) {
  const db = await readDB();
  db.rateTemplates = db.rateTemplates.filter((t) => t.id !== Number(id));
  await writeDB(db);
}

export async function getClients() {
  return (await readDB()).clients;
}

export async function getClient(id) {
  return (await readDB()).clients.find((c) => c.id === Number(id));
}

export async function getClientByToken(token) {
  return (await readDB()).clients.find((c) => c.inviteToken === token);
}

// 招待リンクだけ発行し、氏名・会社名・メール・カードは相手本人に入力してもらう
export async function createInviteClient() {
  const db = await readDB();
  const client = {
    id: nextId(db.clients),
    name: '',
    companyName: '',
    email: '',
    createdAt: new Date().toISOString(),
    status: 'pending',
    inviteToken: crypto.randomBytes(16).toString('hex'),
    stripeCustomerId: null,
    defaultPaymentMethodId: null,
    pendingRequest: null,
  };
  db.clients.push(client);
  await writeDB(db);
  return client;
}

// 弁護士側が候補日時（最大5個）と単価（自由設定）を指定して、日程調整からの単一リンクを発行する。
// 相談者のメールアドレスはこの時点では聞かず、招待リンク経由で本人に入力してもらう。
// 相手が候補から1つ選ぶまでは pendingRequest に保持し、選ばれた時点でセッション（予約）に変換する。
export async function createScheduleRequest({ title, rate, durationMinutes, candidates }) {
  const client = await createInviteClient();
  return updateClient(client.id, {
    pendingRequest: { title, rate, durationMinutes, candidates },
  });
}

export async function updateClient(id, patch) {
  const db = await readDB();
  const idx = db.clients.findIndex((c) => c.id === Number(id));
  if (idx === -1) throw new Error('client not found');
  db.clients[idx] = { ...db.clients[idx], ...patch };
  await writeDB(db);
  return db.clients[idx];
}

export async function getSessions() {
  return (await readDB()).sessions;
}

export async function getSession(id) {
  return (await readDB()).sessions.find((s) => s.id === Number(id));
}

export async function getSessionsByClient(clientId) {
  return (await readDB()).sessions.filter((s) => s.clientId === Number(clientId));
}

// 相談の「予約」を作る。予定日時にMeetリンク（カレンダー予定）が既に発行されている前提。
export async function createBooking({ clientId, title, rate, durationMinutes, scheduledAt, meetingCode, meetingUri, calendarEventId }) {
  const db = await readDB();
  const session = {
    id: nextId(db.sessions),
    clientId: Number(clientId),
    title,
    rate, // { unitMinutes, pricePerUnit, taxRate, freeMinutes }
    durationMinutes: durationMinutes || null, // 予約時に選んだ相談時間（表示用。実際の請求はbillableMinutesを使う）
    bookedAt: new Date().toISOString(), // 予約操作をした時刻（監査用）
    scheduledAt, // 相談の予定日時
    status: 'scheduled', // scheduled -> approved
    meetingCode: meetingCode || null, // あれば時刻推測なしで直接会議記録を紐付けられる
    meetingUri: meetingUri || null,
    calendarEventId: calendarEventId || null,
    conferenceRecordName: null,
    deductionMinutes: 0,
    billableMinutes: null,
    fee: null, // { blocks, subtotal, tax, total }（金額確認画面で確定、決済前のプレビューとしても使う）
    withholdingApplied: null, // 金額確認画面で弁護士が最終確認するまではnull
    withholdingAmount: null,
    approvedAt: null,
  };
  db.sessions.push(session);
  await writeDB(db);
  return session;
}

export async function updateSession(id, patch) {
  const db = await readDB();
  const idx = db.sessions.findIndex((s) => s.id === Number(id));
  if (idx === -1) throw new Error('session not found');
  db.sessions[idx] = { ...db.sessions[idx], ...patch };
  await writeDB(db);
  return db.sessions[idx];
}
