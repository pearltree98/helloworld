import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { withRisk } from './domain/risk.js';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS visitors (
  id          TEXT PRIMARY KEY,
  nickname    TEXT NOT NULL DEFAULT '익명',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cases (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  situation     TEXT NOT NULL,   -- 무슨 일이 있었나 (또는 있을 뻔했나)
  hazard        TEXT NOT NULL,   -- 위해 요인: 해의 원천
  exposure      TEXT NOT NULL,   -- 노출 상태: 어떤 상태가 나를 그 원천 앞에 두었나
  avoidance     TEXT NOT NULL,   -- 회피 행동: 내가 할 수 있는 것
  risky_habit   TEXT,            -- 위험을 높이는 흔한 행위
  severity      INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  likelihood    INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  outcome       TEXT NOT NULL DEFAULT 'near_miss',
  location_text TEXT,
  source_url    TEXT,
  author_id     TEXT REFERENCES visitors(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);

-- "교훈을 받았습니다": 한 사람이 한 사례에 한 번
CREATE TABLE IF NOT EXISTS lessons (
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  visitor_id  TEXT NOT NULL REFERENCES visitors(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (case_id, visitor_id)
);

-- 티켓: 벽에 붙여 두고 누군가 한 명이 가져가는, 물리적 식권과 같은 1회성 선물
CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  giver_id    TEXT NOT NULL REFERENCES visitors(id),
  message     TEXT NOT NULL,
  pledge_krw  INTEGER NOT NULL DEFAULT 0,
  taker_id    TEXT REFERENCES visitors(id),
  taken_at    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tickets_wall ON tickets(taker_id, created_at DESC);
`;

const CASE_SELECT = `
  SELECT c.*,
         v.nickname AS author_name,
         (SELECT COUNT(*) FROM lessons l WHERE l.case_id = c.id) AS lesson_count,
         (SELECT COUNT(*) FROM tickets t WHERE t.case_id = c.id AND t.taker_id IS NULL) AS tickets_on_wall,
         (SELECT COUNT(*) FROM tickets t WHERE t.case_id = c.id AND t.taker_id IS NOT NULL) AS tickets_taken
  FROM cases c
  LEFT JOIN visitors v ON v.id = c.author_id
`;

const TICKET_SELECT = `
  SELECT t.*,
         g.nickname AS giver_name,
         k.nickname AS taker_name,
         c.title    AS case_title,
         c.category AS case_category
  FROM tickets t
  JOIN visitors g ON g.id = t.giver_id
  LEFT JOIN visitors k ON k.id = t.taker_id
  JOIN cases c ON c.id = t.case_id
`;

const SORTS = {
  recent: 'c.created_at DESC, c.id DESC',
  risk: '(c.severity * c.likelihood) DESC, c.created_at DESC',
  lessons: 'lesson_count DESC, c.created_at DESC',
};

export function openDb(path = process.env.DB_PATH ?? 'data/miribom.db') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return new Repo(db);
}

export class Repo {
  constructor(db) {
    this.db = db;
  }

  close() {
    this.db.close();
  }

  // ---- visitors -------------------------------------------------------
  ensureVisitor(id, nickname) {
    this.db
      .prepare(
        `INSERT INTO visitors (id, nickname) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname`,
      )
      .run(id, nickname);
    return this.getVisitor(id);
  }

  getVisitor(id) {
    return this.db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) ?? null;
  }

  // ---- cases ----------------------------------------------------------
  listCases({ category, sort = 'recent', q, limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (category) {
      where.push('c.category = ?');
      params.push(category);
    }
    if (q) {
      where.push('(c.title LIKE ? OR c.situation LIKE ? OR c.hazard LIKE ? OR c.avoidance LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    const sql = `${CASE_SELECT}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${SORTS[sort] ?? SORTS.recent}
      LIMIT ? OFFSET ?`;
    return this.db.prepare(sql).all(...params, limit, offset).map(withRisk);
  }

  getCase(id) {
    return withRisk(this.db.prepare(`${CASE_SELECT} WHERE c.id = ?`).get(id) ?? null);
  }

  insertCase(data, authorId) {
    const { lastInsertRowid } = this.db
      .prepare(
        `INSERT INTO cases
           (title, category, situation, hazard, exposure, avoidance, risky_habit,
            severity, likelihood, outcome, location_text, source_url, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.title, data.category, data.situation, data.hazard, data.exposure, data.avoidance,
        data.risky_habit ?? null, data.severity, data.likelihood, data.outcome ?? 'near_miss',
        data.location_text ?? null, data.source_url ?? null, authorId,
      );
    return this.getCase(Number(lastInsertRowid));
  }

  // ---- lessons --------------------------------------------------------
  hasLesson(caseId, visitorId) {
    return !!this.db.prepare('SELECT 1 FROM lessons WHERE case_id = ? AND visitor_id = ?').get(caseId, visitorId);
  }

  addLesson(caseId, visitorId) {
    this.db.prepare('INSERT OR IGNORE INTO lessons (case_id, visitor_id) VALUES (?, ?)').run(caseId, visitorId);
    return this.lessonCount(caseId);
  }

  lessonCount(caseId) {
    return this.db.prepare('SELECT COUNT(*) AS n FROM lessons WHERE case_id = ?').get(caseId).n;
  }

  // ---- tickets --------------------------------------------------------
  listTickets({ caseId, onWall, limit = 100 } = {}) {
    const where = [];
    const params = [];
    if (caseId) {
      where.push('t.case_id = ?');
      params.push(caseId);
    }
    if (onWall === true) where.push('t.taker_id IS NULL');
    if (onWall === false) where.push('t.taker_id IS NOT NULL');
    const sql = `${TICKET_SELECT}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.created_at DESC, t.id DESC LIMIT ?`;
    return this.db.prepare(sql).all(...params, limit);
  }

  getTicket(id) {
    return this.db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(id) ?? null;
  }

  insertTicket(caseId, giverId, { message, pledge_krw }) {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO tickets (case_id, giver_id, message, pledge_krw) VALUES (?, ?, ?, ?)')
      .run(caseId, giverId, message, pledge_krw);
    return this.getTicket(Number(lastInsertRowid));
  }

  hasTakenTicketForCase(caseId, takerId) {
    return !!this.db.prepare('SELECT 1 FROM tickets WHERE case_id = ? AND taker_id = ?').get(caseId, takerId);
  }

  /** 벽에서 티켓을 떼어 가져간다. 동시에 그 사례의 교훈도 받은 것으로 기록한다. */
  takeTicket(ticketId, takerId) {
    const run = this.db.prepare(
      `UPDATE tickets SET taker_id = ?, taken_at = datetime('now')
       WHERE id = ? AND taker_id IS NULL`,
    );
    const ticket = this.getTicket(ticketId);
    if (!ticket) return { error: 'not_found' };
    if (ticket.taker_id) return { error: 'already_taken' };
    if (ticket.giver_id === takerId) return { error: 'own_ticket' };
    if (this.hasTakenTicketForCase(ticket.case_id, takerId)) return { error: 'one_per_case' };

    this.db.exec('BEGIN');
    try {
      const { changes } = run.run(takerId, ticketId);
      if (!changes) throw new Error('race');
      this.addLesson(ticket.case_id, takerId);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      return { error: e.message === 'race' ? 'already_taken' : 'failed' };
    }
    return { ticket: this.getTicket(ticketId) };
  }

  // ---- stats ----------------------------------------------------------
  stats() {
    const one = (sql) => this.db.prepare(sql).get();
    return {
      cases: one('SELECT COUNT(*) AS n FROM cases').n,
      lessons: one('SELECT COUNT(*) AS n FROM lessons').n,
      tickets_on_wall: one('SELECT COUNT(*) AS n FROM tickets WHERE taker_id IS NULL').n,
      tickets_taken: one('SELECT COUNT(*) AS n FROM tickets WHERE taker_id IS NOT NULL').n,
      pledged_krw: one('SELECT COALESCE(SUM(pledge_krw), 0) AS n FROM tickets').n,
      contributors: one('SELECT COUNT(DISTINCT author_id) AS n FROM cases').n,
      by_category: this.db
        .prepare('SELECT category, COUNT(*) AS n FROM cases GROUP BY category ORDER BY n DESC')
        .all(),
    };
  }
}
