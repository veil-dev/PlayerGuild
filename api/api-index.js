// api/index.js  — PlayerGuild backend as a Vercel serverless function
// Uses @vercel/postgres (Neon PostgreSQL) instead of better-sqlite3

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const jwt        = require('jsonwebtoken');
const { sql }    = require('@vercel/postgres');

const app        = express();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ─── Schema init (runs on cold start, safe to re-run) ────────────────────────
async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      username       TEXT UNIQUE,
      avatar_url     TEXT,
      bio            TEXT,
      discord_handle TEXT,
      contact_number TEXT,
      facebook_url   TEXT,
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS quest_meta (
      quest_id       INTEGER PRIMARY KEY,
      giver_address  TEXT    NOT NULL,
      title          TEXT    NOT NULL,
      description    TEXT    NOT NULL,
      game           TEXT    NOT NULL,
      tags           TEXT    NOT NULL DEFAULT '[]',
      reward_amount  TEXT    NOT NULL,
      reward_token   TEXT    NOT NULL DEFAULT 'XLM',
      difficulty     TEXT,
      est_hours      REAL,
      image_url      TEXT,
      tx_hash        TEXT,
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id             SERIAL PRIMARY KEY,
      quest_id       INTEGER NOT NULL,
      reviewer       TEXT    NOT NULL,
      reviewee       TEXT    NOT NULL,
      role           TEXT    NOT NULL CHECK(role IN ('giver','hunter')),
      rating         INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment        TEXT,
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT,
      UNIQUE(quest_id, reviewer)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id             SERIAL PRIMARY KEY,
      quest_id       INTEGER NOT NULL,
      sender         TEXT    NOT NULL,
      body           TEXT    NOT NULL,
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id             SERIAL PRIMARY KEY,
      wallet_address TEXT    NOT NULL,
      type           TEXT    NOT NULL,
      title          TEXT    NOT NULL,
      body           TEXT    NOT NULL,
      quest_id       INTEGER,
      read           INTEGER NOT NULL DEFAULT 0,
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activity (
      id             SERIAL PRIMARY KEY,
      wallet_address TEXT    NOT NULL,
      quest_id       INTEGER,
      action         TEXT    NOT NULL,
      tx_hash        TEXT,
      meta           TEXT    NOT NULL DEFAULT '{}',
      created_at     BIGINT NOT NULL DEFAULT EXTRACT(epoch FROM now())::BIGINT
    )
  `;
}

// Run schema init once per cold start
const dbReady = initDb().catch(e => console.error('DB init failed:', e));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// Ensure DB is ready before handling requests
app.use(async (_req, _res, next) => { await dbReady; next(); });

// JWT auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'PlayerGuild backend running' }));

app.get('/api/health', async (_req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', network: process.env.STELLAR_NETWORK || 'TESTNET' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/challenge', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });
  const challenge = `PlayerGuild login: ${wallet} @ ${Date.now()}`;
  res.json({ challenge });
});

app.post('/api/auth/verify', async (req, res) => {
  const { wallet, challenge, signature } = req.body;
  if (!wallet || !challenge || !signature)
    return res.status(400).json({ error: 'wallet, challenge and signature required' });

  const ts = parseInt(challenge.split('@ ')[1]);
  if (Date.now() - ts > 5 * 60 * 1000)
    return res.status(400).json({ error: 'Challenge expired' });

  await sql`INSERT INTO users (wallet_address) VALUES (${wallet}) ON CONFLICT DO NOTHING`;

  const token = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users/:wallet', async (req, res) => {
  const w = req.params.wallet;
  await sql`INSERT INTO users (wallet_address) VALUES (${w}) ON CONFLICT DO NOTHING`;

  const { rows: [user] } = await sql`SELECT * FROM users WHERE wallet_address = ${w}`;
  const { rows: [stats] } = await sql`
    SELECT
      COUNT(CASE WHEN action='posted'    THEN 1 END)::int AS quests_posted,
      COUNT(CASE WHEN action='claimed'   THEN 1 END)::int AS quests_claimed,
      COUNT(CASE WHEN action='completed' THEN 1 END)::int AS quests_completed
    FROM activity WHERE wallet_address = ${w}
  `;
  const { rows: [rating] } = await sql`
    SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS review_count
    FROM reviews WHERE reviewee = ${w}
  `;

  res.json({ ...user, ...stats, ...rating });
});

app.patch('/api/users/me', auth, async (req, res) => {
  const { username, avatar_url, bio, discord_handle, contact_number, facebook_url } = req.body;
  try {
    await sql`
      UPDATE users SET
        username       = ${username       || null},
        avatar_url     = ${avatar_url     || null},
        bio            = ${bio            || null},
        discord_handle = ${discord_handle || null},
        contact_number = ${contact_number || null},
        facebook_url   = ${facebook_url   || null}
      WHERE wallet_address = ${req.user.wallet}
    `;
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate'))
      return res.status(409).json({ error: 'Username taken' });
    throw e;
  }
});

// ─── QUESTS ───────────────────────────────────────────────────────────────────
app.post('/api/quests', optionalAuth, async (req, res) => {
  const {
    quest_id, title, description, game, tags = [],
    reward_amount, reward_token = 'XLM',
    difficulty, est_hours, image_url, tx_hash, giver_address, giverKey,
  } = req.body;
  const giverAddress = req.user?.wallet || giver_address || giverKey;

  if (!quest_id || !title || !description || !game || !reward_amount || !giverAddress)
    return res.status(400).json({ error: 'Missing required fields' });

  await sql`INSERT INTO users (wallet_address) VALUES (${giverAddress}) ON CONFLICT DO NOTHING`;

  await sql`
    INSERT INTO quest_meta
      (quest_id, giver_address, title, description, game, tags,
       reward_amount, reward_token, difficulty, est_hours, image_url, tx_hash)
    VALUES
      (${quest_id}, ${giverAddress}, ${title}, ${description}, ${game},
       ${JSON.stringify(tags)}, ${reward_amount}, ${reward_token},
       ${difficulty || null}, ${est_hours || null}, ${image_url || null}, ${tx_hash || null})
    ON CONFLICT (quest_id) DO UPDATE SET
      title=EXCLUDED.title, description=EXCLUDED.description,
      tags=EXCLUDED.tags, tx_hash=EXCLUDED.tx_hash
  `;

  await sql`
    INSERT INTO activity (wallet_address, quest_id, action, tx_hash)
    VALUES (${giverAddress}, ${quest_id}, 'posted', ${tx_hash || null})
  `;

  res.status(201).json({ ok: true, quest_id });
});

app.get('/api/quests', async (req, res) => {
  const { game, tag, token, min_reward, max_reward, sort = 'newest', limit = 20, offset = 0 } = req.query;

  // Build dynamic WHERE conditions (PostgreSQL parameterized)
  const conditions = [];
  const params     = [];

  if (game)       { params.push(game);               conditions.push(`game = $${params.length}`); }
  if (token)      { params.push(token);              conditions.push(`reward_token = $${params.length}`); }
  if (min_reward) { params.push(parseFloat(min_reward)); conditions.push(`CAST(reward_amount AS NUMERIC) >= $${params.length}`); }
  if (max_reward) { params.push(parseFloat(max_reward)); conditions.push(`CAST(reward_amount AS NUMERIC) <= $${params.length}`); }
  if (tag)        { params.push(`%"${tag}"%`);       conditions.push(`tags LIKE $${params.length}`); }

  const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const order  = sort === 'reward' ? 'CAST(reward_amount AS NUMERIC) DESC' : 'created_at DESC';

  params.push(parseInt(limit), parseInt(offset));
  const limitIdx  = params.length - 1;
  const offsetIdx = params.length;

  // Use sql.query for dynamic queries
  const { rows }  = await sql.query(
    `SELECT * FROM quest_meta ${where} ORDER BY ${order} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  const { rows: [{ n }] } = await sql.query(
    `SELECT COUNT(*) AS n FROM quest_meta ${where}`,
    params.slice(0, -2)
  );

  res.json({ quests: rows.map(r => ({ ...r, tags: JSON.parse(r.tags) })), total: parseInt(n) });
});

app.get('/api/quests/:id', async (req, res) => {
  const { rows: [row] } = await sql`SELECT * FROM quest_meta WHERE quest_id = ${req.params.id}`;
  if (!row) return res.status(404).json({ error: 'Quest not found' });
  res.json({ ...row, tags: JSON.parse(row.tags) });
});

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
app.post('/api/quests/:id/reviews', auth, async (req, res) => {
  const { reviewee, role, rating, comment } = req.body;
  if (!reviewee || !role || !rating)
    return res.status(400).json({ error: 'reviewee, role and rating required' });
  try {
    await sql`
      INSERT INTO reviews (quest_id, reviewer, reviewee, role, rating, comment)
      VALUES (${req.params.id}, ${req.user.wallet}, ${reviewee}, ${role}, ${rating}, ${comment || null})
    `;
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate'))
      return res.status(409).json({ error: 'Already reviewed' });
    throw e;
  }
});

app.get('/api/users/:wallet/reviews', async (req, res) => {
  const { rows } = await sql`
    SELECT r.*, q.title AS quest_title
    FROM reviews r
    LEFT JOIN quest_meta q ON q.quest_id = r.quest_id
    WHERE r.reviewee = ${req.params.wallet}
    ORDER BY r.created_at DESC
  `;
  res.json({ reviews: rows });
});

// ─── RATE USER DIRECTLY ───────────────────────────────────────────────────────
app.post('/api/users/:wallet/rate', auth, async (req, res) => {
  const { rating, comment, role, quest_id } = req.body;
  if (!rating || !role) return res.status(400).json({ error: 'rating and role required' });
  if (req.user.wallet === req.params.wallet) return res.status(400).json({ error: 'Cannot rate yourself' });
  try {
    await sql`
      INSERT INTO reviews (quest_id, reviewer, reviewee, role, rating, comment)
      VALUES (${quest_id || 0}, ${req.user.wallet}, ${req.params.wallet}, ${role}, ${rating}, ${comment || null})
    `;
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate'))
      return res.status(409).json({ error: 'Already reviewed this user for this quest' });
    throw e;
  }
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────
app.post('/api/quests/:id/messages', auth, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });

  const { rows: [{ id: msgId }] } = await sql`
    INSERT INTO messages (quest_id, sender, body) VALUES (${req.params.id}, ${req.user.wallet}, ${body.trim()})
    RETURNING id
  `;

  const { rows: [quest] } = await sql`SELECT * FROM quest_meta WHERE quest_id = ${req.params.id}`;
  if (quest && req.user.wallet !== quest.giver_address) {
    await sql`
      INSERT INTO notifications (wallet_address, type, title, body, quest_id)
      VALUES (${quest.giver_address}, 'message', 'New message', ${`New message on quest: ${quest.title}`}, ${req.params.id})
    `;
  }

  res.status(201).json({ ok: true, id: msgId });
});

app.get('/api/quests/:id/messages', auth, async (req, res) => {
  const { rows } = await sql`
    SELECT m.*, u.username FROM messages m
    LEFT JOIN users u ON u.wallet_address = m.sender
    WHERE m.quest_id = ${req.params.id} ORDER BY m.created_at ASC
  `;
  res.json({ messages: rows });
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  const { rows } = await sql`
    SELECT * FROM notifications WHERE wallet_address = ${req.user.wallet}
    ORDER BY created_at DESC LIMIT 50
  `;
  const unread = rows.filter(n => !n.read).length;
  res.json({ notifications: rows, unread });
});

app.patch('/api/notifications/read', auth, async (req, res) => {
  await sql`UPDATE notifications SET read=1 WHERE wallet_address=${req.user.wallet}`;
  res.json({ ok: true });
});

app.post('/api/notify', async (req, res) => {
  const { secret, wallet_address, type, title, body, quest_id } = req.body;
  if (secret !== process.env.INTERNAL_SECRET)
    return res.status(403).json({ error: 'Forbidden' });
  await sql`
    INSERT INTO notifications (wallet_address, type, title, body, quest_id)
    VALUES (${wallet_address}, ${type}, ${title}, ${body}, ${quest_id || null})
  `;
  res.json({ ok: true });
});

// ─── ACTIVITY ────────────────────────────────────────────────────────────────
app.get('/api/activity', async (req, res) => {
  const { wallet, limit = 20 } = req.query;
  const { rows } = wallet
    ? await sql`
        SELECT a.*, q.title AS quest_title FROM activity a
        LEFT JOIN quest_meta q ON q.quest_id = a.quest_id
        WHERE a.wallet_address = ${wallet} ORDER BY a.created_at DESC LIMIT ${parseInt(limit)}
      `
    : await sql`
        SELECT a.*, q.title AS quest_title FROM activity a
        LEFT JOIN quest_meta q ON q.quest_id = a.quest_id
        ORDER BY a.created_at DESC LIMIT ${parseInt(limit)}
      `;
  res.json({ activity: rows });
});

app.post('/api/activity', async (req, res) => {
  const { secret, wallet_address, quest_id, action, tx_hash, meta } = req.body;
  if (secret !== process.env.INTERNAL_SECRET)
    return res.status(403).json({ error: 'Forbidden' });
  await sql`
    INSERT INTO activity (wallet_address, quest_id, action, tx_hash, meta)
    VALUES (${wallet_address}, ${quest_id || null}, ${action}, ${tx_hash || null}, ${JSON.stringify(meta || {})})
  `;
  res.json({ ok: true });
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (_req, res) => {
  const { rows } = await sql`
    SELECT
      u.wallet_address,
      u.username,
      COUNT(CASE WHEN a.action='completed' THEN 1 END)::int AS quests_completed,
      ROUND(AVG(r.rating)::numeric, 1)                      AS avg_rating,
      COUNT(r.id)::int                                       AS review_count
    FROM users u
    LEFT JOIN activity a ON a.wallet_address = u.wallet_address
    LEFT JOIN reviews  r ON r.reviewee = u.wallet_address AND r.role = 'hunter'
    GROUP BY u.wallet_address, u.username
    ORDER BY quests_completed DESC, avg_rating DESC
    LIMIT 20
  `;
  res.json({ leaderboard: rows });
});

app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Export for Vercel ────────────────────────────────────────────────────────
module.exports = app;
