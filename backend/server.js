// server.js
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const jwt        = require('jsonwebtoken');
const Database   = require('better-sqlite3');
const StellarSdk = require('@stellar/stellar-sdk');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ─── DB Setup ─────────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'playerguild.db'));
db.pragma('journal_mode = WAL');

// Migrate: add new columns if they don't exist
['contact_number', 'facebook_url'].forEach(col => {
  try { db.prepare(`ALTER TABLE users ADD COLUMN ${col} TEXT`).run(); } catch {}
});
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    wallet_address TEXT PRIMARY KEY,
    username       TEXT UNIQUE,
    avatar_url     TEXT,
    bio            TEXT,
    discord_handle TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS quest_meta (
    quest_id       INTEGER PRIMARY KEY,   -- mirrors on-chain quest id
    giver_address  TEXT    NOT NULL,
    title          TEXT    NOT NULL,
    description    TEXT    NOT NULL,
    game           TEXT    NOT NULL,
    tags           TEXT    NOT NULL DEFAULT '[]',  -- JSON array
    reward_amount  TEXT    NOT NULL,
    reward_token   TEXT    NOT NULL DEFAULT 'XLM',
    difficulty     TEXT,
    est_hours      REAL,
    image_url      TEXT,
    tx_hash        TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id       INTEGER NOT NULL,
    reviewer       TEXT    NOT NULL,
    reviewee       TEXT    NOT NULL,
    role           TEXT    NOT NULL CHECK(role IN ('giver','hunter')),
    rating         INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(quest_id, reviewer)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id       INTEGER NOT NULL,
    sender         TEXT    NOT NULL,
    body           TEXT    NOT NULL,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT    NOT NULL,
    type           TEXT    NOT NULL,
    title          TEXT    NOT NULL,
    body           TEXT    NOT NULL,
    quest_id       INTEGER,
    read           INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS activity (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT    NOT NULL,
    quest_id       INTEGER,
    action         TEXT    NOT NULL,
    tx_hash        TEXT,
    meta           TEXT    NOT NULL DEFAULT '{}',
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json());

// Rate limiter (simple in-memory, swap for redis-rate-limit in prod)
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key  = req.ip;
    const now  = Date.now();
    const data = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > data.reset) { data.count = 0; data.reset = now + windowMs; }
    data.count++;
    hits.set(key, data);
    if (data.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
app.use(rateLimit(
  parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  parseInt(process.env.RATE_LIMIT_WINDOW_MS)  || 900_000
));

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

app.get('/api/health', (_req, res) => {
  try {
    new StellarSdk.Horizon.Server(process.env.RPC_URL || 'https://soroban-testnet.stellar.org');
    res.json({ status: 'ok', network: process.env.STELLAR_NETWORK || 'TESTNET' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
// POST /api/auth/challenge  → get a message to sign
app.post('/api/auth/challenge', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });
  const challenge = `PlayerGuild login: ${wallet} @ ${Date.now()}`;
  res.json({ challenge });
});

// POST /api/auth/verify  → verify signed challenge, return JWT
app.post('/api/auth/verify', (req, res) => {
  const { wallet, challenge, signature } = req.body;
  if (!wallet || !challenge || !signature)
    return res.status(400).json({ error: 'wallet, challenge and signature required' });

  // For testnet/hackathon: trust the wallet claim if challenge was recent
  // In production: verify the Ed25519 signature against the Stellar keypair
  const ts = parseInt(challenge.split('@ ')[1]);
  if (Date.now() - ts > 5 * 60 * 1000)
    return res.status(400).json({ error: 'Challenge expired' });

  // Upsert user row so every wallet that logs in has a profile
  db.prepare(`
    INSERT OR IGNORE INTO users (wallet_address) VALUES (?)
  `).run(wallet);

  const token = jwt.sign({ wallet }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ─── USERS ────────────────────────────────────────────────────────────────────
// GET /api/users/:wallet
app.get('/api/users/:wallet', (req, res) => {
  // Auto-create a bare user row if one doesn't exist yet.
  // This handles wallets that connected but whose auth/verify signing was skipped or failed.
  db.prepare(`INSERT OR IGNORE INTO users (wallet_address) VALUES (?)`).run(req.params.wallet);
  const user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(req.params.wallet);

  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN action='posted'    THEN 1 END) AS quests_posted,
      COUNT(CASE WHEN action='claimed'   THEN 1 END) AS quests_claimed,
      COUNT(CASE WHEN action='completed' THEN 1 END) AS quests_completed
    FROM activity WHERE wallet_address = ?
  `).get(req.params.wallet);

  const rating = db.prepare(`
    SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
    FROM reviews WHERE reviewee = ?
  `).get(req.params.wallet);

  res.json({ ...user, ...stats, ...rating });
});

// PATCH /api/users/me  → update own profile
app.patch('/api/users/me', auth, (req, res) => {
  const { username, avatar_url, bio, discord_handle, contact_number, facebook_url } = req.body;
  try {
    db.prepare(`
      UPDATE users SET username=?, avatar_url=?, bio=?, discord_handle=?, contact_number=?, facebook_url=?
      WHERE wallet_address=?
    `).run(username, avatar_url, bio, discord_handle, contact_number, facebook_url, req.user.wallet);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username taken' });
    throw e;
  }
});

// ─── QUEST METADATA ───────────────────────────────────────────────────────────
// POST /api/quests  → save metadata after posting on-chain
app.post('/api/quests', optionalAuth, (req, res) => {
  const {
    quest_id, title, description, game, tags = [],
    reward_amount, reward_token = 'XLM',
    difficulty, est_hours, image_url, tx_hash, giver_address, giverKey,
  } = req.body;
  const giverAddress = req.user?.wallet || giver_address || giverKey;

  if (!quest_id || !title || !description || !game || !reward_amount || !giverAddress)
    return res.status(400).json({ error: 'Missing required fields' });

  db.prepare(`INSERT OR IGNORE INTO users (wallet_address) VALUES (?)`).run(giverAddress);

  db.prepare(`
    INSERT OR REPLACE INTO quest_meta
      (quest_id, giver_address, title, description, game, tags,
       reward_amount, reward_token, difficulty, est_hours, image_url, tx_hash)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    quest_id, giverAddress, title, description, game,
    JSON.stringify(tags), reward_amount, reward_token,
    difficulty || null, est_hours || null, image_url || null, tx_hash || null
  );

  // Log activity
  db.prepare(`INSERT INTO activity (wallet_address, quest_id, action, tx_hash) VALUES (?,?,?,?)`)
    .run(giverAddress, quest_id, 'posted', tx_hash || null);

  res.status(201).json({ ok: true, quest_id });
});

// GET /api/quests  → list with search/filter
app.get('/api/quests', (req, res) => {
  const { game, tag, token, min_reward, max_reward, sort = 'newest', limit = 20, offset = 0 } = req.query;

  let where  = [];
  let params = [];

  if (game)       { where.push("game = ?");                   params.push(game); }
  if (token)      { where.push("reward_token = ?");           params.push(token); }
  if (min_reward) { where.push("CAST(reward_amount AS REAL) >= ?"); params.push(parseFloat(min_reward)); }
  if (max_reward) { where.push("CAST(reward_amount AS REAL) <= ?"); params.push(parseFloat(max_reward)); }
  if (tag)        { where.push("tags LIKE ?");                params.push(`%"${tag}"%`); }

  const orderMap = { newest: 'created_at DESC', reward: 'CAST(reward_amount AS REAL) DESC' };
  const order    = orderMap[sort] || 'created_at DESC';
  const clause   = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT * FROM quest_meta ${clause} ORDER BY ${order} LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(`SELECT COUNT(*) AS n FROM quest_meta ${clause}`).get(...params).n;

  res.json({ quests: rows.map(r => ({ ...r, tags: JSON.parse(r.tags) })), total });
});

// GET /api/quests/:id
app.get('/api/quests/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM quest_meta WHERE quest_id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Quest not found' });
  res.json({ ...row, tags: JSON.parse(row.tags) });
});

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
// POST /api/quests/:id/reviews
app.post('/api/quests/:id/reviews', auth, (req, res) => {
  const { reviewee, role, rating, comment } = req.body;
  if (!reviewee || !role || !rating)
    return res.status(400).json({ error: 'reviewee, role and rating required' });

  try {
    db.prepare(`
      INSERT INTO reviews (quest_id, reviewer, reviewee, role, rating, comment)
      VALUES (?,?,?,?,?,?)
    `).run(req.params.id, req.user.wallet, reviewee, role, rating, comment || null);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already reviewed' });
    throw e;
  }
});

// GET /api/users/:wallet/reviews
app.get('/api/users/:wallet/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, q.title AS quest_title
    FROM reviews r
    LEFT JOIN quest_meta q ON q.quest_id = r.quest_id
    WHERE r.reviewee = ?
    ORDER BY r.created_at DESC
  `).all(req.params.wallet);
  res.json({ reviews });
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────
// POST /api/quests/:id/messages
app.post('/api/quests/:id/messages', auth, (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });

  const msgId = db.prepare(`
    INSERT INTO messages (quest_id, sender, body) VALUES (?,?,?)
  `).run(req.params.id, req.user.wallet, body.trim()).lastInsertRowid;

  // Notify the other party
  const quest = db.prepare('SELECT * FROM quest_meta WHERE quest_id = ?').get(req.params.id);
  if (quest) {
    const recipient = req.user.wallet === quest.giver_address ? null : quest.giver_address;
    if (recipient) {
      db.prepare(`
        INSERT INTO notifications (wallet_address, type, title, body, quest_id)
        VALUES (?,?,?,?,?)
      `).run(recipient, 'message', 'New message', `New message on quest: ${quest.title}`, req.params.id);
    }
  }

  res.status(201).json({ ok: true, id: msgId });
});

// GET /api/quests/:id/messages
app.get('/api/quests/:id/messages', auth, (req, res) => {
  const msgs = db.prepare(`
    SELECT m.*, u.username FROM messages m
    LEFT JOIN users u ON u.wallet_address = m.sender
    WHERE m.quest_id = ? ORDER BY m.created_at ASC
  `).all(req.params.id);
  res.json({ messages: msgs });
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
// GET /api/notifications
app.get('/api/notifications', auth, (req, res) => {
  const notes = db.prepare(`
    SELECT * FROM notifications WHERE wallet_address = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.user.wallet);
  const unread = notes.filter(n => !n.read).length;
  res.json({ notifications: notes, unread });
});

// PATCH /api/notifications/read  → mark all as read
app.patch('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE wallet_address=?').run(req.user.wallet);
  res.json({ ok: true });
});

// POST /api/notify  → internal helper to push notifications (call from your event indexer)
app.post('/api/notify', (req, res) => {
  const { secret, wallet_address, type, title, body, quest_id } = req.body;
  if (secret !== process.env.INTERNAL_SECRET)
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare(`
    INSERT INTO notifications (wallet_address, type, title, body, quest_id)
    VALUES (?,?,?,?,?)
  `).run(wallet_address, type, title, body, quest_id || null);
  res.json({ ok: true });
});

// POST /api/users/:wallet/rate  → rate a user directly (employer<->hunter)
app.post('/api/users/:wallet/rate', auth, (req, res) => {
  const { rating, comment, role, quest_id } = req.body;
  if (!rating || !role) return res.status(400).json({ error: 'rating and role required' });
  if (req.user.wallet === req.params.wallet) return res.status(400).json({ error: 'Cannot rate yourself' });
  try {
    db.prepare(`
      INSERT INTO reviews (quest_id, reviewer, reviewee, role, rating, comment)
      VALUES (?,?,?,?,?,?)
    `).run(quest_id || 0, req.user.wallet, req.params.wallet, role, rating, comment || null);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already reviewed this user for this quest' });
    throw e;
  }
});

// ─── ACTIVITY FEED ───────────────────────────────────────────────────────────
// GET /api/activity?wallet=...
app.get('/api/activity', (req, res) => {
  const { wallet, limit = 20 } = req.query;
  const rows = wallet
    ? db.prepare(`
        SELECT a.*, q.title AS quest_title FROM activity a
        LEFT JOIN quest_meta q ON q.quest_id = a.quest_id
        WHERE a.wallet_address = ? ORDER BY a.created_at DESC LIMIT ?
      `).all(wallet, parseInt(limit))
    : db.prepare(`
        SELECT a.*, q.title AS quest_title FROM activity a
        LEFT JOIN quest_meta q ON q.quest_id = a.quest_id
        ORDER BY a.created_at DESC LIMIT ?
      `).all(parseInt(limit));
  res.json({ activity: rows });
});

// POST /api/activity  → log an on-chain event (called by your event indexer)
app.post('/api/activity', (req, res) => {
  const { secret, wallet_address, quest_id, action, tx_hash, meta } = req.body;
  if (secret !== process.env.INTERNAL_SECRET)
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare(`
    INSERT INTO activity (wallet_address, quest_id, action, tx_hash, meta)
    VALUES (?,?,?,?,?)
  `).run(wallet_address, quest_id || null, action, tx_hash || null, JSON.stringify(meta || {}));
  res.json({ ok: true });
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
app.get('/api/leaderboard', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      u.wallet_address,
      u.username,
      COUNT(CASE WHEN a.action='completed' THEN 1 END) AS quests_completed,
      ROUND(AVG(r.rating), 1)                          AS avg_rating,
      COUNT(r.id)                                      AS review_count
    FROM users u
    LEFT JOIN activity a ON a.wallet_address = u.wallet_address
    LEFT JOIN reviews  r ON r.reviewee       = u.wallet_address AND r.role = 'hunter'
    GROUP BY u.wallet_address
    ORDER BY quests_completed DESC, avg_rating DESC
    LIMIT 20
  `).all();
  res.json({ leaderboard: rows });
});

app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, { maxHeaderSize: 32768 }, () => console.log(`PlayerGuild backend on port ${PORT}`));
