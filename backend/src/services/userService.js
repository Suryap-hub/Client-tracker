const bcrypt = require('bcryptjs');
const { getPool } = require('../db/pool');
const { DbError } = require('./clientService');

async function findByEmail(email) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return res.rows[0] || null;
}

async function verifyPassword(user, plainPassword) {
  return bcrypt.compare(plainPassword, user.password_hash);
}

/** Admin only: create a new employee login with their own monthly target. */
async function createUser({ name, email, password, role = 'employee', monthlyTarget = 10 }) {
  const pool = getPool();
  const hash = await bcrypt.hash(password, 10);
  try {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, monthly_target)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, monthly_target, created_at`,
      [name, email.toLowerCase(), hash, role, monthlyTarget]
    );
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') throw new DbError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    throw err;
  }
}

async function listUsers() {
  const pool = getPool();
  const res = await pool.query('SELECT id, name, email, role, monthly_target, created_at FROM users ORDER BY name');
  return res.rows;
}

async function updateTarget(userId, monthlyTarget) {
  const pool = getPool();
  const res = await pool.query(
    'UPDATE users SET monthly_target = $1 WHERE id = $2 RETURNING id, name, email, role, monthly_target',
    [monthlyTarget, userId]
  );
  if (res.rows.length === 0) throw new DbError('User not found.', 404, 'USER_NOT_FOUND');
  return res.rows[0];
}

/** Admin only: delete an employee login. Their clients are kept but become
 * unassigned (assigned_to set to NULL by the foreign key), never deleted. */
async function deleteUser(userId, requesterId) {
  const pool = getPool();
  if (Number(userId) === Number(requesterId)) {
    throw new DbError('You cannot delete your own account.', 400, 'CANNOT_DELETE_SELF');
  }
  const res = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id, name, email', [userId, 'employee']);
  if (res.rows.length === 0) {
    throw new DbError('Employee not found (or is not an employee account).', 404, 'USER_NOT_FOUND');
  }
  return res.rows[0];
}

module.exports = { findByEmail, verifyPassword, createUser, listUsers, updateTarget, deleteUser };