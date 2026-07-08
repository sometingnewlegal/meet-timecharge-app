// Google Meet / Calendar API 連携（サーバー側のみで使用。'use server' なページ/アクションから呼ぶ）
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// calendar.events: 予約時にMeetリンク付きの予定を作成し、顧客に招待メールを送るため
// calendar.readonly: 候補日時選びの画面で自分のカレンダーの空き状況（freebusy）を読むため
// meetings.space.readonly: 会議記録・参加者・文字起こしを読み取るため
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];
const CRED_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function getAuth() {
  // 本番（Vercel等）はファイルシステムが永続化されないため、環境変数からJSONを読む。
  if (process.env.GOOGLE_CREDENTIALS_JSON && process.env.GOOGLE_TOKEN_JSON) {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const key = creds.installed || creds.web;
    const client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris?.[0]);
    client.setCredentials(JSON.parse(process.env.GOOGLE_TOKEN_JSON));
    return client;
  }
  if (fs.existsSync(TOKEN_PATH)) {
    const creds = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
    const key = creds.installed || creds.web;
    const client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris?.[0]);
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
    return client;
  }
  // 初回のみブラウザでの認証が必要（ローカル開発時のみ想定。Next.js配下からは呼ばないこと— Turbopackと相性が悪い）
  // 本番では絶対にこの分岐に来ないよう、上記の環境変数を必ず設定すること。
  const { authenticate } = await import('@google-cloud/local-auth');
  const client = await authenticate({ scopes: SCOPES, keyfilePath: CRED_PATH });
  if (client.credentials) fs.writeFileSync(TOKEN_PATH, JSON.stringify(client.credentials));
  return client;
}

function minutesBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso) - new Date(startIso);
  return Math.round((ms / 60000) * 10) / 10;
}

function participantName(p) {
  if (p.signedinUser) return p.signedinUser.displayName || p.signedinUser.user || '(署名済ユーザー)';
  if (p.anonymousUser) return `${p.anonymousUser.displayName || '匿名'}（匿名ゲスト）`;
  if (p.phoneUser) return `${p.phoneUser.displayName || '電話'}（電話参加）`;
  return '(不明)';
}

async function buildConferenceInfo(meet, rec) {
  const pRes = await meet.conferenceRecords.participants.list({ parent: rec.name });
  const participants = (pRes.data.participants || []).map((p) => ({
    name: participantName(p),
    earliestStartTime: p.earliestStartTime,
    latestEndTime: p.latestEndTime,
    inRoomMinutes: minutesBetween(p.earliestStartTime, p.latestEndTime),
  }));
  return {
    name: rec.name,
    startTime: rec.startTime,
    endTime: rec.endTime,
    durationMinutes: minutesBetween(rec.startTime, rec.endTime),
    participants,
  };
}

// 予約（カレンダー予定）を作成し、Meetリンクを発行する。
// attendeeEmail があれば、Googleが自動でカレンダー招待メール（Meetリンク入り）を相手に送る。
export async function createScheduledMeeting({ summary, startIso, endIso, attendeeEmail }) {
  const auth = await getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: attendeeEmail ? 'all' : 'none',
    requestBody: {
      summary,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
      conferenceData: {
        createRequest: { requestId: `req-${Date.now()}` },
      },
    },
  });

  const entryPoint = res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  const meetingUri = entryPoint?.uri || null;
  // Meetリンクの末尾10文字コード（例: https://meet.google.com/abc-defg-hij → abc-defg-hij）
  const meetingCode = meetingUri ? meetingUri.split('/').pop() : null;

  return {
    calendarEventId: res.data.id,
    meetingUri,
    meetingCode,
  };
}

// 弁護士本人のカレンダーの空き状況を取得する（候補日時選びの画面で既存の予定と重ならないようにするため）
export async function getBusyBlocks(timeMinIso, timeMaxIso) {
  const auth = await getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: { timeMin: timeMinIso, timeMax: timeMaxIso, items: [{ id: 'primary' }] },
  });
  return res.data.calendars?.primary?.busy || [];
}

// 特定のMeetコードに紐づく会議記録を取得する（時刻の推測が不要になる）
export async function getConferenceForMeetingCode(meetingCode) {
  const auth = await getAuth();
  const meet = google.meet({ version: 'v2', auth });

  const res = await meet.conferenceRecords.list({ filter: `space.meeting_code = "${meetingCode}"` });
  const records = res.data.conferenceRecords || [];
  if (records.length === 0) return null;

  // 同じコードが複数回使われた場合は最新のものを採用
  records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  return buildConferenceInfo(meet, records[0]);
}

// sinceIso 以降に開始した会議を、参加者の在室時間つきで返す（meetingCodeが無い旧セッション用のフォールバック）
export async function listRecentConferences(sinceIso) {
  const auth = await getAuth();
  const meet = google.meet({ version: 'v2', auth });

  const res = await meet.conferenceRecords.list({ filter: `start_time >= "${sinceIso}"` });
  const records = res.data.conferenceRecords || [];

  const result = [];
  for (const rec of records) {
    result.push(await buildConferenceInfo(meet, rec));
  }
  result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  return result;
}

// 文字起こしから「最初の発言開始」「最後の発言終了」の時刻を取得する。
// 文字起こしが有効化されていなかった回は null を返す（呼び出し側は手動控除にフォールバックする）。
export async function getTranscriptTiming(conferenceRecordName) {
  const auth = await getAuth();
  const meet = google.meet({ version: 'v2', auth });

  const tRes = await meet.conferenceRecords.transcripts.list({ parent: conferenceRecordName });
  const transcripts = tRes.data.transcripts || [];
  if (transcripts.length === 0) return null;

  let entries = [];
  let pageToken;
  do {
    const eRes = await meet.conferenceRecords.transcripts.entries.list({
      parent: transcripts[0].name,
      pageToken,
    });
    entries = entries.concat(eRes.data.transcriptEntries || []);
    pageToken = eRes.data.nextPageToken || undefined;
  } while (pageToken);

  if (entries.length === 0) return null;
  return {
    firstSpeechStart: entries[0].startTime,
    lastSpeechEnd: entries[entries.length - 1].endTime,
  };
}
