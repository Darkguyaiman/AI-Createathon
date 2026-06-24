const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function findByLogin(login) {
  const admins = await db.query('SELECT * FROM admins WHERE username = ? OR email = ?', [login, login]);
  return admins[0];
}

async function findById(id) {
  const admins = await db.query('SELECT * FROM admins WHERE id = ?', [id]);
  return admins[0];
}

async function updatePassword(id, password) {
  const hashedPass = await bcrypt.hash(password, 10);
  return db.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hashedPass, id]);
}

async function findAll() {
  return db.query('SELECT id, username, email, role, created_at FROM admins ORDER BY created_at DESC');
}

async function create({ username, email, password, role }) {
  const hashedPass = await bcrypt.hash(password, 10);
  return db.query(
    'INSERT INTO admins (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, email, hashedPass, role || 'normal']
  );
}

async function remove(id) {
  return db.query('DELETE FROM admins WHERE id = ?', [id]);
}

async function update(id, { username, email, password, role }) {
  if (password) {
    const hashedPass = await bcrypt.hash(password, 10);
    return db.query(
      'UPDATE admins SET username = ?, email = ?, password_hash = ?, role = ? WHERE id = ?',
      [username, email, hashedPass, role, id]
    );
  } else {
    return db.query(
      'UPDATE admins SET username = ?, email = ?, role = ? WHERE id = ?',
      [username, email, role, id]
    );
  }
}

async function countSuperAdmins() {
  const result = await db.query("SELECT COUNT(*) as count FROM admins WHERE role = 'super'");
  return result[0].count;
}

module.exports = {
  findByLogin,
  findById,
  updatePassword,
  findAll,
  create,
  remove,
  update,
  countSuperAdmins
};
