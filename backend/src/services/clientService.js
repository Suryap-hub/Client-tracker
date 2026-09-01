const { getPool } = require('../db/pool');

class DbError extends Error {
  constructor(message, status = 500, code = 'DB_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function wrapPgError(err) {
  if (err.code === '23505') return new DbError('That record already exists.', 409, 'DUPLICATE');
  if (err.code === '23503') return new DbError('Referenced record does not exist.', 400, 'INVALID_REFERENCE');
  if (err.code === '23514') return new DbError('One of the values provided is not allowed (check status/priority).', 400, 'CHECK_VIOLATION');
  if (err.code === 'ECONNREFUSED') return new DbError('Could not connect to the database.', 503, 'DB_UNAVAILABLE');
  if (err.code === '28P01') return new DbError('Database authentication failed.', 500, 'DB_AUTH_FAILED');
  return new DbError('Unexpected database error.', 500, 'DB_ERROR');
}

function rowToClient(row) {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    company: row.company || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name || null,
    followUpDate: row.follow_up_date ? row.follow_up_date.toISOString().slice(0, 10) : '',
    targetCloseDate: row.target_close_date ? row.target_close_date.toISOString().slice(0, 10) : '',
    lastContacted: row.last_contacted ? row.last_contacted.toISOString().slice(0, 10) : '',
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_BASE = `
  SELECT c.*, u.name AS assigned_to_name
  FROM clients c
  LEFT JOIN users u ON u.id = c.assigned_to
`;

/** requester: { id, role }. Employees only ever see their own clients. */
async function getClients(requester, filters = {}) {
  const pool = getPool();
  const clauses = [];
  const params = [];

  if (requester.role !== 'admin') {
    params.push(requester.id);
    clauses.push(`c.assigned_to = $${params.length}`);
  } else if (filters.assignedTo) {
    params.push(filters.assignedTo);
    clauses.push(`c.assigned_to = $${params.length}`);
  }

  if (filters.status) { params.push(filters.status); clauses.push(`c.status = $${params.length}`); }
  if (filters.priority) { params.push(filters.priority); clauses.push(`c.priority = $${params.length}`); }
  if (filters.followUpDate) { params.push(filters.followUpDate); clauses.push(`c.follow_up_date = $${params.length}`); }
  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`);
    clauses.push(`(lower(c.client_name) LIKE $${params.length} OR lower(c.company) LIKE $${params.length} OR lower(c.email) LIKE $${params.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const res = await pool.query(`${SELECT_BASE} ${where} ORDER BY c.created_at DESC`, params);
    return res.rows.map(rowToClient);
  } catch (err) {
    throw wrapPgError(err);
  }
}

async function assertOwnership(pool, requester, clientId) {
  if (requester.role === 'admin') return;
  const res = await pool.query('SELECT assigned_to FROM clients WHERE client_id = $1', [clientId]);
  if (res.rows.length === 0) throw new DbError('Client not found.', 404, 'NOT_FOUND');
  if (res.rows[0].assigned_to !== requester.id) {
    throw new DbError('You do not have access to this client.', 403, 'FORBIDDEN');
  }
}

async function addClient(requester, data) {
  const pool = getPool();
  const assignedTo = requester.role === 'admin' && data.assignedTo ? data.assignedTo : requester.id;
  try {
    const idRes = await pool.query("SELECT nextval('client_id_seq') AS n");
    const clientId = `CL-${String(idRes.rows[0].n).padStart(3, '0')}`;

    const res = await pool.query(
      `INSERT INTO clients (client_id, client_name, company, email, phone, address, status, priority, assigned_to, follow_up_date, target_close_date, last_contacted, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        clientId, data.clientName, data.company || '', data.email || '', data.phone || '', data.address || '',
        data.status || 'Lead', data.priority || 'Medium', assignedTo,
        data.followUpDate || null, data.targetCloseDate || null, data.lastContacted || null, data.description || '',
      ]
    );
    return rowToClient(res.rows[0]);
  } catch (err) {
    if (err instanceof DbError) throw err;
    throw wrapPgError(err);
  }
}

async function updateClient(requester, clientId, data) {
  const pool = getPool();
  await assertOwnership(pool, requester, clientId);

  const fields = [];
  const params = [];
  const map = {
    clientName: 'client_name', company: 'company', email: 'email', phone: 'phone', address: 'address',
    status: 'status', priority: 'priority', followUpDate: 'follow_up_date', targetCloseDate: 'target_close_date',
    lastContacted: 'last_contacted', description: 'description',
  };
  const dateCols = ['follow_up_date', 'target_close_date', 'last_contacted'];
  Object.entries(map).forEach(([key, col]) => {
    if (data[key] !== undefined) {
      params.push(data[key] === '' && dateCols.includes(col) ? null : data[key]);
      fields.push(`${col} = $${params.length}`);
    }
  });
  if (requester.role === 'admin' && data.assignedTo !== undefined) {
    params.push(data.assignedTo);
    fields.push(`assigned_to = $${params.length}`);
  }
  if (fields.length === 0) throw new DbError('No fields to update.', 400, 'VALIDATION_ERROR');
  fields.push(`updated_at = now()`);

  params.push(clientId);
  try {
    const res = await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE client_id = $${params.length} RETURNING *`,
      params
    );
    if (res.rows.length === 0) throw new DbError('Client not found.', 404, 'NOT_FOUND');
    return rowToClient(res.rows[0]);
  } catch (err) {
    if (err instanceof DbError) throw err;
    throw wrapPgError(err);
  }
}

async function deleteClient(requester, clientId, { softDelete = false } = {}) {
  const pool = getPool();
  await assertOwnership(pool, requester, clientId);
  try {
    if (softDelete) {
      const res = await pool.query(
        `UPDATE clients SET status = 'Lost', updated_at = now() WHERE client_id = $1 RETURNING *`,
        [clientId]
      );
      if (res.rows.length === 0) throw new DbError('Client not found.', 404, 'NOT_FOUND');
      return rowToClient(res.rows[0]);
    }
    const res = await pool.query('DELETE FROM clients WHERE client_id = $1 RETURNING client_id', [clientId]);
    if (res.rows.length === 0) throw new DbError('Client not found.', 404, 'NOT_FOUND');
    return { clientId };
  } catch (err) {
    if (err instanceof DbError) throw err;
    throw wrapPgError(err);
  }
}

/** Personal stats for the logged-in user (or a specific user if admin asks) */
async function getPersonalStats(userId) {
  const pool = getPool();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [userRes, statsRes] = await Promise.all([
      pool.query('SELECT id, name, monthly_target FROM users WHERE id = $1', [userId]),
      pool.query(
        `SELECT
           count(*) FILTER (WHERE status = 'Closed') AS closed,
           count(*) FILTER (WHERE status NOT IN ('Closed','Lost')) AS active,
           count(*) FILTER (WHERE follow_up_date <= $2 AND status NOT IN ('Closed','Lost')) AS follow_ups_due
         FROM clients WHERE assigned_to = $1`,
        [userId, today]
      ),
    ]);
    if (userRes.rows.length === 0) throw new DbError('User not found.', 404, 'USER_NOT_FOUND');
    const user = userRes.rows[0];
    const s = statsRes.rows[0];
    return {
      name: user.name,
      target: user.monthly_target,
      closed: Number(s.closed),
      active: Number(s.active),
      followUpsDue: Number(s.follow_ups_due),
      percentToTarget: user.monthly_target > 0 ? Math.min(100, Math.round((Number(s.closed) / user.monthly_target) * 100)) : 0,
    };
  } catch (err) {
    if (err instanceof DbError) throw err;
    throw wrapPgError(err);
  }
}

/** Admin-only: every employee's target vs closed, for the team leaderboard */
async function getTeamStats() {
  const pool = getPool();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await pool.query(
      `SELECT
         u.id, u.name, u.monthly_target,
         count(c.*) FILTER (WHERE c.status = 'Closed') AS closed,
         count(c.*) FILTER (WHERE c.status NOT IN ('Closed','Lost')) AS active,
         count(c.*) FILTER (WHERE c.follow_up_date <= $1 AND c.status NOT IN ('Closed','Lost')) AS follow_ups_due
       FROM users u
       LEFT JOIN clients c ON c.assigned_to = u.id
       WHERE u.role = 'employee'
       GROUP BY u.id
       ORDER BY closed DESC, u.name ASC`,
      [today]
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      target: r.monthly_target,
      closed: Number(r.closed),
      active: Number(r.active),
      followUpsDue: Number(r.follow_ups_due),
      percentToTarget: r.monthly_target > 0 ? Math.min(100, Math.round((Number(r.closed) / r.monthly_target) * 100)) : 0,
    }));
  } catch (err) {
    throw wrapPgError(err);
  }
}

module.exports = { getClients, addClient, updateClient, deleteClient, getPersonalStats, getTeamStats, DbError };
