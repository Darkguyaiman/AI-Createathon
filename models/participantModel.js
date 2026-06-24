const db = require('../config/db');

async function findAllWithGroupNames() {
  return db.query(`
    SELECT p.*, g.name as group_name
    FROM participants p
    LEFT JOIN \`groups\` g ON p.group_id = g.id
    ORDER BY p.name ASC
  `);
}

async function findById(id) {
  const participants = await db.query('SELECT * FROM participants WHERE id = ?', [id]);
  return participants[0];
}

async function findByGroupId(groupId) {
  return db.query('SELECT name, avatar_path FROM participants WHERE group_id = ?', [groupId]);
}

async function countByGroupId(groupId) {
  const rows = await db.query('SELECT COUNT(*) as count FROM participants WHERE group_id = ?', [groupId]);
  return rows[0].count;
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) as count FROM participants');
  return rows[0].count;
}

async function create({ name, email, avatarPath, groupId }) {
  return db.query(
    'INSERT INTO participants (name, email, avatar_path, group_id) VALUES (?, ?, ?, ?)',
    [name, email, avatarPath, groupId]
  );
}

async function update(id, { name, email, avatarPath, groupId }) {
  return db.query(
    'UPDATE participants SET name = ?, email = ?, avatar_path = ?, group_id = ? WHERE id = ?',
    [name, email, avatarPath, groupId, id]
  );
}

async function remove(id) {
  return db.query('DELETE FROM participants WHERE id = ?', [id]);
}

module.exports = {
  findAllWithGroupNames,
  findById,
  findByGroupId,
  countByGroupId,
  countAll,
  create,
  update,
  remove
};
