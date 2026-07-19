import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'
import {
  closeDatabase,
  databaseProvider,
  hashPassword,
  query,
  verifyPassword,
  withTransaction,
} from './database.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(projectRoot, 'dist')
const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'

function executeQuery(text, parameters = [], executor = null) {
  return executor ? executor.query(text, parameters) : query(text, parameters)
}

async function queryOne(text, parameters = [], executor = null) {
  const result = await executeQuery(text, parameters, executor)
  return result.rows[0] || null
}

async function queryRows(text, parameters = [], executor = null) {
  const result = await executeQuery(text, parameters, executor)
  return result.rows
}

async function executeStatement(text, parameters = [], executor = null) {
  const result = await executeQuery(text, parameters, executor)
  return Number(result.rowCount || 0)
}

function normalizeId(value) {
  const numericValue = Number(value)
  return Number.isSafeInteger(numericValue) ? numericValue : value
}

function idsMatch(left, right) {
  return String(left) === String(right)
}

const statements = {
  findUser: `
  SELECT id, username, password_hash, password_salt, display_name,
         account_type, division_role, member_id, must_change_password
  FROM users
  WHERE LOWER(username) = LOWER($1) AND is_active = TRUE
  LIMIT 1
`,
  recordLogin: 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
  createSession: `
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3::timestamptz)
  `,
  findSession: `
  SELECT u.id, u.member_id, u.username, u.display_name, u.account_type,
         u.division_role, u.must_change_password
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = $1
    AND s.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = TRUE
  LIMIT 1
`,
  deleteSession: 'DELETE FROM sessions WHERE token_hash = $1',
  findPasswordUserById: `
  SELECT id, username, password_hash, password_salt
  FROM users
  WHERE id = $1 AND is_active = TRUE
  LIMIT 1
`,
  updateUserPassword: `
  UPDATE users
  SET password_hash = $1, password_salt = $2, must_change_password = FALSE,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
`,
  deleteOtherUserSessions: `
  DELETE FROM sessions
  WHERE user_id = $1 AND token_hash <> $2
`,
  deleteAllUserSessions: 'DELETE FROM sessions WHERE user_id = $1',
  findRecipientByMemberId: `
  SELECT id, member_id, display_name, division_role
  FROM users
  WHERE member_id = $1 AND account_type = 'member' AND is_active = TRUE
  LIMIT 1
`,
  listRecipientMessageStatuses: `
  SELECT recipient.member_id AS recipient_member_id,
         BOOL_OR(pm.status = 'draft') AS has_draft,
         BOOL_OR(pm.status = 'sent') AS has_sent
  FROM private_messages pm
  JOIN users recipient ON recipient.id = pm.recipient_user_id
  WHERE pm.sender_user_id = $1
    AND recipient.account_type = 'member'
    AND recipient.is_active = TRUE
  GROUP BY recipient.member_id
`,
  findDraft: `
  SELECT id, title, body, closing, status, updated_at
  FROM private_messages
  WHERE sender_user_id = $1 AND recipient_user_id = $2 AND status = 'draft'
  LIMIT 1
`,
  upsertDraft: `
  INSERT INTO private_messages (
    sender_user_id, recipient_user_id, title, body, closing, status, updated_at
  ) VALUES ($1, $2, $3, $4, $5, 'draft', CURRENT_TIMESTAMP)
  ON CONFLICT(sender_user_id, recipient_user_id) WHERE status = 'draft'
  DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    closing = EXCLUDED.closing,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, title, body, closing, status, updated_at
`,
  deleteDraft: `
  DELETE FROM private_messages
  WHERE sender_user_id = $1 AND recipient_user_id = $2 AND status = 'draft'
`,
  sendExistingDraft: `
  UPDATE private_messages
  SET title = $1, body = $2, closing = $3, status = 'sent',
      updated_at = CURRENT_TIMESTAMP, sent_at = CURRENT_TIMESTAMP
  WHERE sender_user_id = $4 AND recipient_user_id = $5 AND status = 'draft'
  RETURNING id, status, sent_at
`,
  insertSentMessage: `
  INSERT INTO private_messages (
    sender_user_id, recipient_user_id, title, body, closing, status,
    updated_at, sent_at
  ) VALUES ($1, $2, $3, $4, $5, 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  RETURNING id, status, sent_at
`,
  listInboxMessages: `
  SELECT pm.id, pm.sent_at, pm.unlock_at,
         sender.member_id AS sender_member_id,
         sender.display_name AS sender_name,
         sender.division_role AS sender_role
  FROM private_messages pm
  JOIN users sender ON sender.id = pm.sender_user_id
  WHERE pm.recipient_user_id = $1 AND pm.status = 'sent'
  ORDER BY pm.sent_at DESC, pm.id DESC
`,
  listOpenInboxMessages: `
  SELECT pm.id, pm.sent_at, pm.unlock_at,
         pm.read_at, sender.member_id AS sender_member_id,
         sender.display_name AS sender_name,
         sender.division_role AS sender_role
  FROM private_messages pm
  JOIN users sender ON sender.id = pm.sender_user_id
  WHERE pm.recipient_user_id = $1 AND pm.status = 'sent'
  ORDER BY pm.sent_at DESC, pm.id DESC
`,
  findOpenInboxMessage: `
  SELECT pm.id, pm.title, pm.body, pm.closing, pm.sent_at, pm.unlock_at,
         pm.read_at, sender.member_id AS sender_member_id,
         sender.display_name AS sender_name,
         sender.division_role AS sender_role
  FROM private_messages pm
  JOIN users sender ON sender.id = pm.sender_user_id
  WHERE pm.id = $1 AND pm.recipient_user_id = $2 AND pm.status = 'sent'
  LIMIT 1
`,
  markInboxMessageRead: `
  UPDATE private_messages
  SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
  WHERE id = $1 AND recipient_user_id = $2 AND status = 'sent'
  RETURNING id, read_at
`,
  adminMemberSummary: `
  SELECT COUNT(*) AS total_members,
         COUNT(*) FILTER (WHERE must_change_password = FALSE) AS secured_accounts,
         COUNT(*) FILTER (WHERE last_login_at IS NOT NULL) AS members_logged_in
  FROM users
  WHERE account_type = 'member' AND is_active = TRUE
`,
  adminActiveSessions: `
  SELECT COUNT(*) AS total
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.expires_at > CURRENT_TIMESTAMP AND u.is_active = TRUE
`,
  adminMessageSummary: `
  SELECT COUNT(*) FILTER (WHERE status = 'sent') AS sent_messages,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft_messages,
         COUNT(*) FILTER (WHERE status = 'sent' AND read_at IS NOT NULL) AS read_messages,
         COUNT(DISTINCT CASE WHEN status = 'sent' THEN CAST(sender_user_id AS TEXT) || ':' || CAST(recipient_user_id AS TEXT) END) AS completed_pairs,
         COUNT(DISTINCT CASE WHEN status = 'sent' THEN sender_user_id END) AS active_senders,
         COUNT(DISTINCT CASE WHEN status = 'sent' THEN recipient_user_id END) AS reached_recipients
  FROM private_messages
  WHERE ($1::timestamptz IS NULL OR COALESCE(sent_at, updated_at) >= $1::timestamptz)
`,
  adminRecentMessages: `
  SELECT pm.id, pm.sent_at, pm.read_at,
         sender.display_name AS sender_name,
         recipient.display_name AS recipient_name
  FROM private_messages pm
  JOIN users sender ON sender.id = pm.sender_user_id
  JOIN users recipient ON recipient.id = pm.recipient_user_id
  WHERE pm.status = 'sent' AND ($1::timestamptz IS NULL OR pm.sent_at >= $1::timestamptz)
  ORDER BY pm.sent_at DESC, pm.id DESC
  LIMIT 7
`,
  adminMemberMetrics: `
  SELECT u.member_id, u.username, u.display_name, u.division_role,
         u.must_change_password, u.last_login_at,
         (SELECT COUNT(*) FROM private_messages sent
          WHERE sent.sender_user_id = u.id AND sent.status = 'sent'
            AND ($1::timestamptz IS NULL OR sent.sent_at >= $1::timestamptz)) AS sent_count,
         (SELECT COUNT(*) FROM private_messages received
          WHERE received.recipient_user_id = u.id AND received.status = 'sent'
            AND ($1::timestamptz IS NULL OR received.sent_at >= $1::timestamptz)) AS received_count,
         (SELECT COUNT(*) FROM private_messages opened
          WHERE opened.recipient_user_id = u.id AND opened.status = 'sent'
            AND opened.read_at IS NOT NULL
            AND ($1::timestamptz IS NULL OR opened.sent_at >= $1::timestamptz)) AS read_count
  FROM users u
  WHERE u.account_type = 'member' AND u.is_active = TRUE
  ORDER BY u.member_id ASC
`,
  adminDivisionSummary: `
  SELECT division_role AS role, COUNT(*) AS total
  FROM users
  WHERE account_type = 'member' AND is_active = TRUE
  GROUP BY division_role
  ORDER BY total DESC, division_role ASC
`,
  adminDailyMessages: `
  SELECT TO_CHAR(sent_at, 'YYYY-MM-DD') AS day, COUNT(*) AS total
  FROM private_messages
  WHERE status = 'sent' AND sent_at >= CURRENT_TIMESTAMP - INTERVAL '6 days'
  GROUP BY TO_CHAR(sent_at, 'YYYY-MM-DD')
  ORDER BY day ASC
`,
  adminMessageResetImpact: `
  SELECT COUNT(*) AS total_messages,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft_messages,
         COUNT(*) FILTER (WHERE status = 'sent') AS sent_messages,
         COUNT(*) FILTER (WHERE status = 'sent' AND read_at IS NOT NULL) AS read_messages,
         COUNT(*) FILTER (WHERE status = 'sent' AND read_at IS NULL) AS unread_messages
  FROM private_messages
`,
  deleteAllPrivateMessages: 'DELETE FROM private_messages',
  findGlobalMessageAccess: `
  SELECT settings.setting_value, settings.updated_at,
         updater.display_name AS updated_by_name
  FROM app_settings settings
  LEFT JOIN users updater ON updater.id = settings.updated_by_user_id
  WHERE settings.setting_key = 'global_message_access'
  LIMIT 1
`,
  updateGlobalMessageAccess: `
  UPDATE app_settings
  SET setting_value = $1, updated_by_user_id = $2, updated_at = CURRENT_TIMESTAMP
  WHERE setting_key = 'global_message_access'
  RETURNING setting_value, updated_at
`,
  findGlobalMessageReleaseAt: `
  SELECT setting_value, updated_at
  FROM app_settings
  WHERE setting_key = 'global_message_release_at'
  LIMIT 1
`,
  updateGlobalMessageReleaseAt: `
  UPDATE app_settings
  SET setting_value = $1, updated_by_user_id = $2, updated_at = CURRENT_TIMESTAMP
  WHERE setting_key = 'global_message_release_at'
  RETURNING setting_value, updated_at
`,
  globalMessageAccessImpact: `
  SELECT COUNT(*) AS sent_messages,
         COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_messages,
         COUNT(DISTINCT recipient_user_id) AS recipients_with_messages
  FROM private_messages
  WHERE status = 'sent'
`,
  adminCompletionMembers: `
  SELECT u.member_id, u.display_name, u.division_role,
         (SELECT COUNT(DISTINCT sent.recipient_user_id) FROM private_messages sent
          WHERE sent.sender_user_id = u.id AND sent.status = 'sent'
            AND ($1::timestamptz IS NULL OR sent.sent_at >= $1::timestamptz)) AS completed_recipients,
         (SELECT COUNT(DISTINCT received.sender_user_id) FROM private_messages received
          WHERE received.recipient_user_id = u.id AND received.status = 'sent'
            AND ($1::timestamptz IS NULL OR received.sent_at >= $1::timestamptz)) AS received_from,
         (SELECT COUNT(*) FROM private_messages drafts
          WHERE drafts.sender_user_id = u.id AND drafts.status = 'draft'
            AND ($1::timestamptz IS NULL OR drafts.updated_at >= $1::timestamptz)) AS draft_count,
         (SELECT COUNT(DISTINCT opened.recipient_user_id) FROM private_messages opened
          WHERE opened.sender_user_id = u.id AND opened.status = 'sent' AND opened.read_at IS NOT NULL
            AND ($1::timestamptz IS NULL OR opened.sent_at >= $1::timestamptz)) AS opened_by_recipients
  FROM users u
  WHERE u.account_type = 'member' AND u.is_active = TRUE
  ORDER BY u.member_id ASC
`,
  adminCompletedPairs: `
  SELECT sender.member_id AS sender_member_id,
         recipient.member_id AS recipient_member_id,
         MAX(pm.sent_at) AS sent_at,
         BOOL_OR(pm.read_at IS NOT NULL) AS is_read
  FROM private_messages pm
  JOIN users sender ON sender.id = pm.sender_user_id
  JOIN users recipient ON recipient.id = pm.recipient_user_id
  WHERE pm.status = 'sent' AND ($1::timestamptz IS NULL OR pm.sent_at >= $1::timestamptz)
  GROUP BY sender.member_id, recipient.member_id
  ORDER BY sender.member_id, recipient.member_id
`,
  adminCompletionTimeline: `
  SELECT TO_CHAR(sent_at, 'YYYY-MM-DD') AS day,
         COUNT(*) AS messages,
         COUNT(DISTINCT CAST(sender_user_id AS TEXT) || ':' || CAST(recipient_user_id AS TEXT)) AS completed_pairs
  FROM private_messages
  WHERE status = 'sent' AND ($1::timestamptz IS NULL OR sent_at >= $1::timestamptz)
  GROUP BY TO_CHAR(sent_at, 'YYYY-MM-DD')
  ORDER BY day ASC
`,
  listManagedMembers: `
  SELECT u.id, u.member_id, u.username, u.display_name, u.division_role,
         u.must_change_password, u.is_active, u.created_at, u.last_login_at,
         (SELECT COUNT(*) FROM private_messages sent
          WHERE sent.sender_user_id = u.id AND sent.status = 'sent') AS sent_count,
         (SELECT COUNT(*) FROM private_messages drafts
          WHERE drafts.sender_user_id = u.id AND drafts.status = 'draft') AS draft_count,
         (SELECT COUNT(*) FROM private_messages received
          WHERE received.recipient_user_id = u.id AND received.status = 'sent') AS received_count,
         (SELECT COUNT(*) FROM sessions active_session
          WHERE active_session.user_id = u.id AND active_session.expires_at > CURRENT_TIMESTAMP) AS active_sessions
  FROM users u
  WHERE u.account_type = 'member'
  ORDER BY u.member_id ASC
`,
  findManagedMember: `
  SELECT id, member_id, username, display_name, division_role,
         must_change_password, is_active, created_at, last_login_at
  FROM users
  WHERE member_id = $1 AND account_type = 'member'
  LIMIT 1
`,
  resetManagedMemberPassword: `
  UPDATE users
  SET password_hash = $1, password_salt = $2, must_change_password = TRUE,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $3 AND account_type = 'member'
`,
  updateManagedMemberStatus: `
  UPDATE users
  SET is_active = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2 AND account_type = 'member'
`,
}
const defaultInboxReleaseAt = '2026-08-08T19:00:00+07:00'

async function inboxAccessState(executor) {
  const setting = await queryOne(statements.findGlobalMessageAccess, [], executor)
  const mode = ['locked', 'unlocked', 'scheduled'].includes(setting?.setting_value)
    ? setting.setting_value
    : 'locked'
  const releaseSetting = await queryOne(statements.findGlobalMessageReleaseAt, [], executor)
  const releaseAt = releaseSetting?.setting_value || defaultInboxReleaseAt
  const releaseTime = Date.parse(releaseAt)
  const scheduleReached = Number.isFinite(releaseTime) && Date.now() >= releaseTime
  const overrideUnlocked = process.env.INBOX_UNLOCK_OVERRIDE === '1'
  return {
    mode,
    releaseAt,
    unlocked: overrideUnlocked || mode === 'unlocked' || (mode === 'scheduled' && scheduleReached),
  }
}

async function inboxAccessUnlocked() {
  return (await inboxAccessState()).unlocked
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 16_384) throw new Error('PAYLOAD_TOO_LARGE')
  }
  return JSON.parse(body || '{}')
}

async function authenticate(request, response) {
  try {
    const { username, password, remember } = await readJson(request)
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return sendJson(response, 400, { ok: false, message: 'Username dan kata sandi wajib diisi.' })
    }

    const user = await queryOne(statements.findUser, [username.trim()])
    const valid = user && verifyPassword(password, user.password_salt, user.password_hash)
    if (!valid) {
      await new Promise((resolve) => setTimeout(resolve, 180))
      return sendJson(response, 401, { ok: false, message: 'Username atau kata sandi tidak sesuai.' })
    }

    const sessionToken = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex')
    const sessionDuration = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + sessionDuration).toISOString()
    await withTransaction(async (client) => {
      await client.query('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP')
      await executeStatement(statements.recordLogin, [user.id], client)
      await executeStatement(statements.createSession, [user.id, tokenHash, expiresAt], client)
    })
    const persistentCookie = remember ? '; Max-Age=2592000' : ''
    const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : ''

    return sendJson(response, 200, {
      ok: true,
      user: {
        id: normalizeId(user.id),
        memberId: user.member_id,
        username: user.username,
        name: user.display_name,
        accountType: user.account_type,
        role: user.division_role,
        mustChangePassword: Boolean(user.must_change_password),
      },
    }, {
      'Set-Cookie': `pulupulu_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/${persistentCookie}${secureCookie}`,
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Terjadi kesalahan pada server.' })
  }
}

function readSessionToken(request) {
  const cookies = request.headers.cookie?.split(';') || []
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name === 'pulupulu_session') return valueParts.join('=')
  }
  return ''
}

async function authenticatedUser(request) {
  const token = readSessionToken(request)
  if (!token) return null

  const tokenHash = createHash('sha256').update(token).digest('hex')
  return queryOne(statements.findSession, [tokenHash])
}

async function currentSession(request, response) {
  const user = await authenticatedUser(request)
  if (!user) return sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })

  return sendJson(response, 200, {
    ok: true,
    user: {
      id: normalizeId(user.id),
      memberId: user.member_id,
      username: user.username,
      name: user.display_name,
      accountType: user.account_type,
      role: user.division_role,
      mustChangePassword: Boolean(user.must_change_password),
    },
  })
}

async function requireAdmin(request, response) {
  const user = await authenticatedUser(request)
  if (!user) {
    sendJson(response, 401, { ok: false, message: 'Sesi admin sudah berakhir. Silakan masuk kembali.' })
    return null
  }
  if (user.account_type !== 'admin') {
    sendJson(response, 403, { ok: false, message: 'Halaman ini hanya dapat diakses oleh pengelola.' })
    return null
  }
  return user
}

function adminPeriodDetails(period) {
  if (period === '7d') return { period, days: 7 }
  if (period === '30d') return { period, days: 30 }
  return { period: 'all', days: 0 }
}

async function getAdminOverview(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return

  const url = new URL(request.url || '/', 'http://localhost')
  const periodDetails = adminPeriodDetails(url.searchParams.get('period'))
  const cutoff = periodDetails.days
    ? new Date(Date.now() - periodDetails.days * 24 * 60 * 60 * 1000).toISOString()
    : null
  const [
    memberSummary,
    messageSummary,
    activeSessionSummary,
    memberRows,
    recentRows,
    divisionRows,
    dailyRows,
  ] = await Promise.all([
    queryOne(statements.adminMemberSummary),
    queryOne(statements.adminMessageSummary, [cutoff]),
    queryOne(statements.adminActiveSessions),
    queryRows(statements.adminMemberMetrics, [cutoff]),
    queryRows(statements.adminRecentMessages, [cutoff]),
    queryRows(statements.adminDivisionSummary),
    queryRows(statements.adminDailyMessages),
  ])
  const activeSessions = Number(activeSessionSummary.total || 0)
  const totalMembers = Number(memberSummary.total_members || 0)
  const sentMessages = Number(messageSummary.sent_messages || 0)
  const completedPairs = Number(messageSummary.completed_pairs || 0)
  const readMessages = Number(messageSummary.read_messages || 0)
  const securedAccounts = Number(memberSummary.secured_accounts || 0)
  const messageCapacity = totalMembers * Math.max(totalMembers - 1, 0)

  const members = memberRows.map((member) => ({
    memberId: member.member_id,
    username: member.username,
    name: member.display_name,
    role: member.division_role,
    mustChangePassword: Boolean(member.must_change_password),
    lastLoginAt: member.last_login_at,
    sentCount: Number(member.sent_count || 0),
    receivedCount: Number(member.received_count || 0),
    readCount: Number(member.read_count || 0),
  }))

  const recentActivity = recentRows.map((message) => ({
    id: normalizeId(message.id),
    senderName: message.sender_name,
    recipientName: message.recipient_name,
    sentAt: message.sent_at,
    readAt: message.read_at,
    status: message.read_at ? 'read' : 'unread',
  }))

  return sendJson(response, 200, {
    ok: true,
    period: periodDetails.period,
    generatedAt: new Date().toISOString(),
    statistics: {
      totalMembers,
      sentMessages,
      draftMessages: Number(messageSummary.draft_messages || 0),
      readMessages,
      unreadMessages: Math.max(sentMessages - readMessages, 0),
      activeSenders: Number(messageSummary.active_senders || 0),
      reachedRecipients: Number(messageSummary.reached_recipients || 0),
      securedAccounts,
      initialPasswordAccounts: Math.max(totalMembers - securedAccounts, 0),
      membersLoggedIn: Number(memberSummary.members_logged_in || 0),
      activeSessions,
      messageCapacity,
      completedPairs,
      messageCompletion: messageCapacity ? Math.round((completedPairs / messageCapacity) * 100) : 0,
      readRate: sentMessages ? Math.round((readMessages / sentMessages) * 100) : 0,
      securityRate: totalMembers ? Math.round((securedAccounts / totalMembers) * 100) : 0,
    },
    recentActivity,
    members,
    divisions: divisionRows.map((division) => ({ role: division.role, total: Number(division.total) })),
    dailyMessages: dailyRows.map((day) => ({ day: day.day, total: Number(day.total) })),
    privacy: 'Dashboard hanya menampilkan metadata pesan. Isi pesan privat tidak pernah disertakan.',
  })
}

async function getMessageCompletionProgress(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return

  const url = new URL(request.url || '/', 'http://localhost')
  const periodDetails = adminPeriodDetails(url.searchParams.get('period'))
  const cutoff = periodDetails.days
    ? new Date(Date.now() - periodDetails.days * 24 * 60 * 60 * 1000).toISOString()
    : null
  const [memberSummary, summary, completionRows, pairRows, timelineRows, accessUnlocked] = await Promise.all([
    queryOne(statements.adminMemberSummary),
    queryOne(statements.adminMessageSummary, [cutoff]),
    queryRows(statements.adminCompletionMembers, [cutoff]),
    queryRows(statements.adminCompletedPairs, [cutoff]),
    queryRows(statements.adminCompletionTimeline, [cutoff]),
    inboxAccessUnlocked(),
  ])
  const totalMembers = Number(memberSummary.total_members || 0)
  const targetPerMember = Math.max(totalMembers - 1, 0)
  const targetPairs = totalMembers * targetPerMember
  const completedPairs = Number(summary.completed_pairs || 0)
  const members = completionRows.map((member) => {
    const completedRecipients = Number(member.completed_recipients || 0)
    return {
      memberId: member.member_id,
      name: member.display_name,
      role: member.division_role,
      completedRecipients,
      receivedFrom: Number(member.received_from || 0),
      draftCount: Number(member.draft_count || 0),
      openedByRecipients: Number(member.opened_by_recipients || 0),
      target: targetPerMember,
      progress: targetPerMember ? Math.round((completedRecipients / targetPerMember) * 100) : 0,
    }
  })
  const divisions = new Map()
  for (const member of members) {
    const division = divisions.get(member.role) || { role: member.role, members: 0, completedPairs: 0, targetPairs: 0 }
    division.members += 1
    division.completedPairs += member.completedRecipients
    division.targetPairs += targetPerMember
    divisions.set(member.role, division)
  }

  return sendJson(response, 200, {
    ok: true,
    period: periodDetails.period,
    generatedAt: new Date().toISOString(),
    accessUnlocked,
    statistics: {
      totalMembers,
      targetPerMember,
      targetPairs,
      completedPairs,
      remainingPairs: Math.max(targetPairs - completedPairs, 0),
      completionPercentage: targetPairs ? Math.round((completedPairs / targetPairs) * 100) : 0,
      totalMessages: Number(summary.sent_messages || 0),
      totalDrafts: Number(summary.draft_messages || 0),
      membersStarted: members.filter((member) => member.completedRecipients > 0).length,
      membersCompleted: members.filter((member) => member.completedRecipients >= targetPerMember && targetPerMember > 0).length,
      averagePerMember: totalMembers ? Number((completedPairs / totalMembers).toFixed(1)) : 0,
    },
    members,
    divisions: Array.from(divisions.values()).map((division) => ({
      ...division,
      progress: division.targetPairs ? Math.round((division.completedPairs / division.targetPairs) * 100) : 0,
    })).sort((left, right) => right.progress - left.progress || left.role.localeCompare(right.role)),
    pairs: pairRows.map((pair) => ({
      senderMemberId: pair.sender_member_id,
      recipientMemberId: pair.recipient_member_id,
      sentAt: pair.sent_at,
      isRead: Boolean(pair.is_read),
    })),
    timeline: timelineRows.map((item) => ({
      day: item.day,
      messages: Number(item.messages),
      completedPairs: Number(item.completed_pairs),
    })),
  })
}

function serializeManagedMember(member) {
  return {
    memberId: member.member_id,
    username: member.username,
    name: member.display_name,
    role: member.division_role,
    mustChangePassword: Boolean(member.must_change_password),
    isActive: Boolean(member.is_active),
    createdAt: member.created_at,
    lastLoginAt: member.last_login_at,
    sentCount: Number(member.sent_count || 0),
    draftCount: Number(member.draft_count || 0),
    receivedCount: Number(member.received_count || 0),
    activeSessions: Number(member.active_sessions || 0),
  }
}

async function getManagedMembers(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return
  const members = (await queryRows(statements.listManagedMembers)).map(serializeManagedMember)
  return sendJson(response, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      total: members.length,
      active: members.filter((member) => member.isActive).length,
      inactive: members.filter((member) => !member.isActive).length,
      initialPassword: members.filter((member) => member.mustChangePassword).length,
      activeSessions: members.reduce((total, member) => total + member.activeSessions, 0),
    },
    members,
  })
}

function temporaryPassword() {
  const words = ['Bahari', 'Karang', 'Nautika', 'Samudra', 'Pesisir', 'Senja']
  const random = randomBytes(4)
  const word = words[random[0] % words.length]
  const number = ((random[1] << 8 | random[2]) % 10_000).toString().padStart(4, '0')
  const symbols = ['!', '@', '#', '$']
  return `Pulu${word}${symbols[random[3] % symbols.length]}${number}`
}

async function resetMemberPassword(request, response, memberId) {
  const admin = await requireAdmin(request, response)
  if (!admin) return
  if (!Number.isInteger(memberId)) return sendJson(response, 400, { ok: false, message: 'Anggota tidak valid.' })
  try {
    const payload = await readJson(request)
    if (payload.confirmation !== 'RESET KATA SANDI') return sendJson(response, 422, { ok: false, message: 'Konfirmasi reset kata sandi tidak sesuai.' })
    const member = await queryOne(statements.findManagedMember, [memberId])
    if (!member) return sendJson(response, 404, { ok: false, message: 'Akun anggota tidak ditemukan.' })

    const password = temporaryPassword()
    const nextPassword = hashPassword(password)
    const revokedSessions = await withTransaction(async (client) => {
      await executeStatement(
        statements.resetManagedMemberPassword,
        [nextPassword.hash, nextPassword.salt, member.id],
        client,
      )
      return executeStatement(statements.deleteAllUserSessions, [member.id], client)
    })

    return sendJson(response, 200, {
      ok: true,
      message: `Kata sandi ${member.display_name} berhasil direset.`,
      temporaryPassword: password,
      revokedSessions,
      member: { memberId: member.member_id, mustChangePassword: true },
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Kata sandi anggota belum dapat direset.' })
  }
}

async function changeManagedMemberStatus(request, response, memberId) {
  const admin = await requireAdmin(request, response)
  if (!admin) return
  if (!Number.isInteger(memberId)) return sendJson(response, 400, { ok: false, message: 'Anggota tidak valid.' })

  try {
    const payload = await readJson(request)
    if (typeof payload.active !== 'boolean') return sendJson(response, 422, { ok: false, message: 'Status akun tidak valid.' })
    const expectedConfirmation = payload.active ? 'AKTIFKAN ANGGOTA' : 'NONAKTIFKAN ANGGOTA'
    if (payload.confirmation !== expectedConfirmation) return sendJson(response, 422, { ok: false, message: 'Konfirmasi perubahan status tidak sesuai.' })

    const member = await queryOne(statements.findManagedMember, [memberId])
    if (!member) return sendJson(response, 404, { ok: false, message: 'Akun anggota tidak ditemukan.' })
    let revokedSessions = 0
    if (Boolean(member.is_active) !== payload.active) {
      revokedSessions = await withTransaction(async (client) => {
        await executeStatement(statements.updateManagedMemberStatus, [payload.active, member.id], client)
        if (payload.active) return 0
        return executeStatement(statements.deleteAllUserSessions, [member.id], client)
      })
    }

    return sendJson(response, 200, {
      ok: true,
      message: payload.active ? `Akun ${member.display_name} berhasil diaktifkan.` : `Akun ${member.display_name} berhasil dinonaktifkan.`,
      revokedSessions,
      member: { memberId: member.member_id, isActive: payload.active },
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Status akun belum dapat diperbarui.' })
  }
}

async function resetAllPrivateMessages(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return

  try {
    const payload = await readJson(request)
    if (payload.confirmation !== 'HAPUS SEMUA PESAN') {
      return sendJson(response, 422, { ok: false, message: 'Konfirmasi penghapusan semua pesan tidak sesuai.' })
    }

    const deleted = await withTransaction(async (client) => {
      const impact = await queryOne(statements.adminMessageResetImpact, [], client)
      const total = await executeStatement(statements.deleteAllPrivateMessages, [], client)
      return {
        total,
        drafts: Number(impact.total_messages ? impact.draft_messages : 0),
        sent: Number(impact.total_messages ? impact.sent_messages : 0),
        read: Number(impact.total_messages ? impact.read_messages : 0),
        unread: Number(impact.total_messages ? impact.unread_messages : 0),
      }
    })

    return sendJson(response, 200, {
      ok: true,
      changed: deleted.total > 0,
      message: deleted.total > 0
        ? 'Semua pesan dan draf pengujian berhasil dihapus.'
        : 'Penyimpanan pesan sudah kosong.',
      deleted,
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Semua pesan belum dapat dihapus.' })
  }
}

async function serializeGlobalMessageAccess() {
  const [setting, impact, accessState, memberSummary] = await Promise.all([
    queryOne(statements.findGlobalMessageAccess),
    queryOne(statements.globalMessageAccessImpact),
    inboxAccessState(),
    queryOne(statements.adminMemberSummary),
  ])
  return {
    unlocked: accessState.unlocked,
    status: accessState.unlocked ? 'unlocked' : 'locked',
    mode: accessState.mode,
    scheduled: accessState.mode === 'scheduled',
    updatedAt: setting?.updated_at || null,
    updatedBy: setting?.updated_by_name || 'Database seeder',
    plannedReleaseAt: accessState.releaseAt,
    impact: {
      sentMessages: Number(impact.sent_messages || 0),
      unreadMessages: Number(impact.unread_messages || 0),
      recipientsWithMessages: Number(impact.recipients_with_messages || 0),
      totalMembers: Number(memberSummary.total_members || 0),
    },
  }
}

async function getGlobalMessageAccess(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return
  return sendJson(response, 200, { ok: true, access: await serializeGlobalMessageAccess() })
}

async function changeGlobalMessageAccess(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return

  try {
    const payload = await readJson(request)
    if (typeof payload.unlocked !== 'boolean') {
      return sendJson(response, 422, { ok: false, message: 'Status akses pesan tidak valid.' })
    }

    const expectedConfirmation = payload.unlocked ? 'BUKA SEMUA SURAT' : 'KUNCI SEMUA SURAT'
    if (payload.confirmation !== expectedConfirmation) {
      return sendJson(response, 422, { ok: false, message: 'Konfirmasi perubahan akses tidak sesuai.' })
    }

    const nextMode = payload.unlocked ? 'unlocked' : 'locked'
    const currentMode = (await queryOne(statements.findGlobalMessageAccess))?.setting_value || 'locked'
    if (currentMode !== nextMode) {
      await queryOne(statements.updateGlobalMessageAccess, [nextMode, admin.id])
    }

    return sendJson(response, 200, {
      ok: true,
      changed: currentMode !== nextMode,
      message: payload.unlocked ? 'Akses seluruh surat berhasil dibuka.' : 'Akses seluruh surat berhasil dikunci.',
      access: await serializeGlobalMessageAccess(),
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Status akses belum dapat diperbarui.' })
  }
}

async function scheduleGlobalMessageAccess(request, response) {
  const admin = await requireAdmin(request, response)
  if (!admin) return

  try {
    const payload = await readJson(request)
    if (typeof payload.releaseAt !== 'string' || !payload.releaseAt.trim()) {
      return sendJson(response, 422, { ok: false, message: 'Tanggal dan waktu pembukaan wajib diisi.' })
    }
    if (payload.confirmation !== 'JADWALKAN PEMBUKAAN') {
      return sendJson(response, 422, { ok: false, message: 'Konfirmasi jadwal pembukaan tidak sesuai.' })
    }

    const releaseTime = Date.parse(payload.releaseAt)
    if (!Number.isFinite(releaseTime)) {
      return sendJson(response, 422, { ok: false, message: 'Tanggal dan waktu pembukaan tidak valid.' })
    }
    if (releaseTime <= Date.now() + 60_000) {
      return sendJson(response, 422, { ok: false, message: 'Waktu pembukaan harus setidaknya satu menit dari sekarang.' })
    }

    const normalizedReleaseAt = new Date(releaseTime).toISOString()
    await withTransaction(async (client) => {
      await queryOne(statements.updateGlobalMessageReleaseAt, [normalizedReleaseAt, admin.id], client)
      await queryOne(statements.updateGlobalMessageAccess, ['scheduled', admin.id], client)
    })

    return sendJson(response, 200, {
      ok: true,
      changed: true,
      message: 'Jadwal pembukaan berhasil disimpan. Inbox akan terbuka otomatis pada waktunya.',
      access: await serializeGlobalMessageAccess(),
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Jadwal pembukaan belum dapat disimpan.' })
  }
}

function passwordValidationMessage(password, username) {
  if (password.length < 10) return 'Kata sandi baru minimal 10 karakter.'
  if (password.length > 128) return 'Kata sandi baru maksimal 128 karakter.'
  if (!/[a-z]/.test(password)) return 'Kata sandi baru perlu memuat huruf kecil.'
  if (!/[A-Z]/.test(password)) return 'Kata sandi baru perlu memuat huruf kapital.'
  if (!/\d/.test(password)) return 'Kata sandi baru perlu memuat angka.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Kata sandi baru perlu memuat simbol.'

  const usernameParts = username.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length >= 3)
  if (usernameParts.some((part) => password.toLowerCase().includes(part))) {
    return 'Kata sandi baru tidak boleh memuat bagian dari username.'
  }
  return ''
}

async function changePassword(request, response) {
  const sessionUser = await authenticatedUser(request)
  if (!sessionUser) return sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })

  try {
    const payload = await readJson(request)
    const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : ''
    const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : ''
    const confirmPassword = typeof payload.confirmPassword === 'string' ? payload.confirmPassword : ''

    if (!currentPassword || !newPassword || !confirmPassword) {
      return sendJson(response, 422, { ok: false, message: 'Semua kolom kata sandi wajib diisi.' })
    }
    if (newPassword !== confirmPassword) {
      return sendJson(response, 422, { ok: false, message: 'Konfirmasi kata sandi baru belum sama.' })
    }

    const validationMessage = passwordValidationMessage(newPassword, sessionUser.username)
    if (validationMessage) return sendJson(response, 422, { ok: false, message: validationMessage })

    const passwordUser = await queryOne(statements.findPasswordUserById, [sessionUser.id])
    if (!passwordUser || !verifyPassword(currentPassword, passwordUser.password_salt, passwordUser.password_hash)) {
      await new Promise((resolve) => setTimeout(resolve, 180))
      return sendJson(response, 422, { ok: false, message: 'Kata sandi saat ini tidak sesuai.' })
    }
    if (verifyPassword(newPassword, passwordUser.password_salt, passwordUser.password_hash)) {
      return sendJson(response, 422, { ok: false, message: 'Kata sandi baru harus berbeda dari kata sandi saat ini.' })
    }

    const nextPassword = hashPassword(newPassword)
    const tokenHash = createHash('sha256').update(readSessionToken(request)).digest('hex')
    const revokedSessions = await withTransaction(async (client) => {
      await executeStatement(
        statements.updateUserPassword,
        [nextPassword.hash, nextPassword.salt, sessionUser.id],
        client,
      )
      return executeStatement(statements.deleteOtherUserSessions, [sessionUser.id, tokenHash], client)
    })

    return sendJson(response, 200, {
      ok: true,
      message: 'Kata sandi berhasil diperbarui.',
      sessionsRevoked: revokedSessions,
      user: { mustChangePassword: false },
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format permintaan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Permintaan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Kata sandi belum dapat diperbarui.' })
  }
}

async function messageParticipants(request, response, recipientMemberId) {
  const sender = await authenticatedUser(request)
  if (!sender) {
    sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })
    return null
  }
  if (!sender.member_id) {
    sendJson(response, 403, { ok: false, message: 'Hanya akun anggota yang dapat menulis pesan pribadi.' })
    return null
  }
  if (!Number.isInteger(recipientMemberId)) {
    sendJson(response, 400, { ok: false, message: 'Penerima pesan tidak valid.' })
    return null
  }

  const recipient = await queryOne(statements.findRecipientByMemberId, [recipientMemberId])
  if (!recipient) {
    sendJson(response, 404, { ok: false, message: 'Anggota penerima tidak ditemukan.' })
    return null
  }
  if (idsMatch(recipient.id, sender.id)) {
    sendJson(response, 400, { ok: false, message: 'Kamu tidak dapat mengirim pesan kepada diri sendiri.' })
    return null
  }

  return { sender, recipient }
}

function messageFields(payload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const body = typeof payload.body === 'string' ? payload.body : ''
  const closing = typeof payload.closing === 'string' ? payload.closing.trim() : ''

  if (title.length > 60) return { error: 'Judul pesan maksimal 60 karakter.' }
  if (body.length > 1500) return { error: 'Isi pesan maksimal 1.500 karakter.' }
  if (closing.length > 80) return { error: 'Kalimat penutup maksimal 80 karakter.' }
  return { title, body, closing }
}

function serializeDraft(row, recipientMemberId) {
  if (!row) return null
  return {
    id: normalizeId(row.id),
    recipientMemberId,
    title: row.title,
    body: row.body,
    closing: row.closing,
    status: row.status,
    updatedAt: row.updated_at,
  }
}

async function getMessageRecipientStatuses(request, response) {
  const sender = await authenticatedUser(request)
  if (!sender) return sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })
  if (!sender.member_id) return sendJson(response, 403, { ok: false, message: 'Daftar penerima hanya tersedia untuk akun anggota.' })

  const rows = await queryRows(statements.listRecipientMessageStatuses, [sender.id])
  const recipients = rows.map((row) => ({
    memberId: row.recipient_member_id,
    status: row.has_draft ? 'draft' : row.has_sent ? 'sent' : 'available',
  }))
  return sendJson(response, 200, { ok: true, recipients })
}

async function getMessageDraft(request, response) {
  const url = new URL(request.url || '/', 'http://localhost')
  const recipientMemberId = Number(url.searchParams.get('recipientMemberId'))
  const participants = await messageParticipants(request, response, recipientMemberId)
  if (!participants) return

  const draft = await queryOne(
    statements.findDraft,
    [participants.sender.id, participants.recipient.id],
  )
  return sendJson(response, 200, { ok: true, draft: serializeDraft(draft, recipientMemberId) })
}

async function saveMessageDraft(request, response) {
  try {
    const payload = await readJson(request)
    const recipientMemberId = Number(payload.recipientMemberId)
    const participants = await messageParticipants(request, response, recipientMemberId)
    if (!participants) return

    const fields = messageFields(payload)
    if (fields.error) return sendJson(response, 422, { ok: false, message: fields.error })

    if (!fields.title && !fields.body.trim() && !fields.closing) {
      await executeStatement(
        statements.deleteDraft,
        [participants.sender.id, participants.recipient.id],
      )
      return sendJson(response, 200, { ok: true, draft: null, deleted: true })
    }

    const draft = await queryOne(
      statements.upsertDraft,
      [
        participants.sender.id,
        participants.recipient.id,
        fields.title,
        fields.body,
        fields.closing,
      ],
    )
    return sendJson(response, 200, { ok: true, draft: serializeDraft(draft, recipientMemberId) })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format draf tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Draf terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Draf belum dapat disimpan.' })
  }
}

async function sendPrivateMessage(request, response) {
  try {
    const payload = await readJson(request)
    const recipientMemberId = Number(payload.recipientMemberId)
    const participants = await messageParticipants(request, response, recipientMemberId)
    if (!participants) return

    const fields = messageFields(payload)
    if (fields.error) return sendJson(response, 422, { ok: false, message: fields.error })
    const trimmedBody = fields.body.trim()
    if (trimmedBody.length < 20) {
      return sendJson(response, 422, { ok: false, message: 'Isi pesan minimal 20 karakter agar kenanganmu tersampaikan dengan utuh.' })
    }

    const message = await withTransaction(async (client) => {
      const existingDraft = await queryOne(
        statements.sendExistingDraft,
        [
          fields.title,
          trimmedBody,
          fields.closing,
          participants.sender.id,
          participants.recipient.id,
        ],
        client,
      )
      if (existingDraft) return existingDraft

      return queryOne(
        statements.insertSentMessage,
        [
          participants.sender.id,
          participants.recipient.id,
          fields.title,
          trimmedBody,
          fields.closing,
        ],
        client,
      )
    })

    return sendJson(response, 201, {
      ok: true,
      message: {
        id: normalizeId(message.id),
        status: message.status,
        recipientMemberId,
        sentAt: message.sent_at,
      },
    })
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { ok: false, message: 'Format pesan tidak valid.' })
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') return sendJson(response, 413, { ok: false, message: 'Pesan terlalu besar.' })
    console.error(error)
    return sendJson(response, 500, { ok: false, message: 'Pesan belum dapat dikirim.' })
  }
}

async function getPrivateInbox(request, response) {
  const recipient = await authenticatedUser(request)
  if (!recipient) return sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })
  if (!recipient.member_id) return sendJson(response, 403, { ok: false, message: 'Inbox privat hanya tersedia untuk akun anggota.' })

  const [accessState, inboxRows] = await Promise.all([
    inboxAccessState(),
    queryRows(statements.listInboxMessages, [recipient.id]),
  ])
  const messages = inboxRows.map((message) => ({
    id: normalizeId(message.id),
    sentAt: message.sent_at,
    unlockAt: accessState.releaseAt,
    locked: !accessState.unlocked,
    sender: {
      memberId: message.sender_member_id,
      name: message.sender_name,
      role: message.sender_role,
    },
  }))

  return sendJson(response, 200, {
    ok: true,
    releaseAt: accessState.releaseAt,
    accessUnlocked: accessState.unlocked,
    messages,
  })
}

async function requireOpenInbox(request, response) {
  const recipient = await authenticatedUser(request)
  if (!recipient) {
    sendJson(response, 401, { ok: false, message: 'Sesi sudah berakhir. Silakan masuk kembali.' })
    return null
  }
  if (!recipient.member_id) {
    sendJson(response, 403, { ok: false, message: 'Inbox privat hanya tersedia untuk akun anggota.' })
    return null
  }
  const accessState = await inboxAccessState()
  if (!accessState.unlocked) {
    sendJson(response, 423, { ok: false, message: 'Surat masih tersegel sampai waktu pembukaan yang ditentukan.', releaseAt: accessState.releaseAt })
    return null
  }
  return { recipient, accessState }
}

async function getOpenPrivateInbox(request, response) {
  const context = await requireOpenInbox(request, response)
  if (!context) return
  const { recipient, accessState } = context
  const releaseAt = accessState.releaseAt

  const inboxRows = await queryRows(statements.listOpenInboxMessages, [recipient.id])
  const messages = inboxRows.map((message) => ({
    id: normalizeId(message.id),
    sentAt: message.sent_at,
    unlockAt: releaseAt,
    readAt: message.read_at,
    isRead: Boolean(message.read_at),
    sender: {
      memberId: message.sender_member_id,
      name: message.sender_name,
      role: message.sender_role,
    },
  }))

  return sendJson(response, 200, { ok: true, releaseAt, messages })
}

function serializeOpenMessage(message, releaseAt) {
  return {
    id: normalizeId(message.id),
    title: message.title,
    body: message.body,
    closing: message.closing,
    sentAt: message.sent_at,
    unlockAt: releaseAt,
    readAt: message.read_at,
    isRead: Boolean(message.read_at),
    sender: {
      memberId: message.sender_member_id,
      name: message.sender_name,
      role: message.sender_role,
    },
  }
}

async function getOpenPrivateMessage(request, response, messageId) {
  const context = await requireOpenInbox(request, response)
  if (!context) return
  const { recipient, accessState } = context
  if (!Number.isInteger(messageId)) return sendJson(response, 400, { ok: false, message: 'Surat tidak valid.' })

  const message = await queryOne(statements.findOpenInboxMessage, [messageId, recipient.id])
  if (!message) return sendJson(response, 404, { ok: false, message: 'Surat tidak ditemukan di inbox-mu.' })
  return sendJson(response, 200, {
    ok: true,
    message: {
      id: normalizeId(message.id),
      sentAt: message.sent_at,
      unlockAt: accessState.releaseAt,
      readAt: message.read_at,
      isRead: Boolean(message.read_at),
      sender: {
        memberId: message.sender_member_id,
        name: message.sender_name,
        role: message.sender_role,
      },
    },
  })
}

async function openPrivateMessage(request, response, messageId) {
  const context = await requireOpenInbox(request, response)
  if (!context) return
  const { recipient, accessState } = context
  if (!Number.isInteger(messageId)) return sendJson(response, 400, { ok: false, message: 'Surat tidak valid.' })

  const message = await withTransaction(async (client) => {
    const found = await queryOne(statements.findOpenInboxMessage, [messageId, recipient.id], client)
    if (!found) return null
    const read = await queryOne(statements.markInboxMessageRead, [messageId, recipient.id], client)
    return { ...found, read_at: read.read_at }
  })
  if (!message) return sendJson(response, 404, { ok: false, message: 'Surat tidak ditemukan di inbox-mu.' })
  return sendJson(response, 200, {
    ok: true,
    message: serializeOpenMessage(message, accessState.releaseAt),
  })
}

async function logout(request, response) {
  const token = readSessionToken(request)
  if (token) {
    await executeStatement(
      statements.deleteSession,
      [createHash('sha256').update(token).digest('hex')],
    )
  }
  return sendJson(response, 200, { ok: true }, {
    'Set-Cookie': 'pulupulu_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
  })
}

function serveStatic(request, response) {
  if (!existsSync(join(distRoot, 'index.html'))) {
    return sendJson(response, 503, {
      ok: false,
      message: 'Build frontend belum tersedia. Jalankan npm run build terlebih dahulu.',
    })
  }

  const url = new URL(request.url || '/', 'http://localhost')
  const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(distRoot, requestedPath)

  if (!filePath.startsWith(distRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distRoot, 'index.html')
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  createReadStream(filePath).pipe(response)
}

export async function handleRequest(request, response) {
  try {
    const requestUrl = new URL(request.url || '/', 'http://localhost')
    const { pathname } = requestUrl

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      return await authenticate(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/auth/session') {
      return await currentSession(request, response)
    }
    if (request.method === 'POST' && pathname === '/api/auth/logout') {
      return await logout(request, response)
    }
    if (request.method === 'PATCH' && pathname === '/api/account/password') {
      return await changePassword(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/admin/overview') {
      return await getAdminOverview(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/admin/message-access') {
      return await getGlobalMessageAccess(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/admin/message-progress') {
      return await getMessageCompletionProgress(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/admin/members') {
      return await getManagedMembers(request, response)
    }
    if (request.method === 'POST' && pathname === '/api/admin/messages/reset') {
      return await resetAllPrivateMessages(request, response)
    }

    const resetMemberPasswordMatch = pathname.match(/^\/api\/admin\/members\/(\d+)\/reset-password$/)
    if (request.method === 'POST' && resetMemberPasswordMatch) {
      return await resetMemberPassword(request, response, Number(resetMemberPasswordMatch[1]))
    }

    const memberStatusMatch = pathname.match(/^\/api\/admin\/members\/(\d+)\/status$/)
    if (request.method === 'PATCH' && memberStatusMatch) {
      return await changeManagedMemberStatus(request, response, Number(memberStatusMatch[1]))
    }
    if (request.method === 'PATCH' && pathname === '/api/admin/message-access/schedule') {
      return await scheduleGlobalMessageAccess(request, response)
    }
    if (request.method === 'PATCH' && pathname === '/api/admin/message-access') {
      return await changeGlobalMessageAccess(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/messages/recipients') {
      return await getMessageRecipientStatuses(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/messages/draft') {
      return await getMessageDraft(request, response)
    }
    if (request.method === 'PUT' && pathname === '/api/messages/draft') {
      return await saveMessageDraft(request, response)
    }
    if (request.method === 'POST' && pathname === '/api/messages/send') {
      return await sendPrivateMessage(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/messages/inbox') {
      return await getPrivateInbox(request, response)
    }
    if (request.method === 'GET' && pathname === '/api/messages/open-inbox') {
      return await getOpenPrivateInbox(request, response)
    }
    const openMessageMatch = pathname.match(/^\/api\/messages\/(\d+)$/)
    if (request.method === 'GET' && openMessageMatch) {
      return await getOpenPrivateMessage(request, response, Number(openMessageMatch[1]))
    }

    const revealMessageMatch = pathname.match(/^\/api\/messages\/(\d+)\/open$/)
    if (request.method === 'POST' && revealMessageMatch) {
      return await openPrivateMessage(request, response, Number(revealMessageMatch[1]))
    }
    if (request.method === 'GET' && pathname === '/api/health') {
      await queryOne('SELECT 1 AS ok')
      return sendJson(response, 200, { ok: true, database: databaseProvider })
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return sendJson(response, 404, { ok: false, message: 'Endpoint API tidak ditemukan.' })
    }
    if (request.method === 'GET' || request.method === 'HEAD') return serveStatic(request, response)
    return sendJson(response, 405, { ok: false, message: 'Metode tidak diizinkan.' })
  } catch (error) {
    console.error(error)
    if (!response.headersSent) {
      return sendJson(response, 500, { ok: false, message: 'Terjadi kesalahan pada server.' })
    }
    if (!response.writableEnded) response.end()
  }
}

const modulePath = fileURLToPath(import.meta.url)
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(modulePath)

if (isDirectExecution) {
  const server = createServer(handleRequest)

  server.listen(port, host, () => {
    console.log(`Pulupulu server ready at http://${host}:${port}`)
  })

  const shutdown = () => {
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
