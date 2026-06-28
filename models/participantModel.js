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

async function findAllGroupedByGroupId() {
  const rows = await db.query(`
    SELECT group_id, name, avatar_path
    FROM participants
    WHERE group_id IS NOT NULL
    ORDER BY name ASC
  `);

  return rows.reduce((groups, participant) => {
    const groupId = participant.group_id;
    if (!groups[groupId]) {
      groups[groupId] = [];
    }
    groups[groupId].push({
      name: participant.name,
      avatar_path: participant.avatar_path
    });
    return groups;
  }, {});
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
  findAllGroupedByGroupId,
  countByGroupId,
  countAll,
  create,
  update,
  remove
};
