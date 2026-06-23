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

module.exports = {
  findByLogin,
  findById,
  updatePassword
};
