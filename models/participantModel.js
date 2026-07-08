const db = require('../config/db');

async function findAllWithGroupNames() {
  return db.query(`
    SELECT p.*, g.name as group_name
    FROM participants p
    LEFT JOIN \`groups\` g ON p.group_id = g.id
    ORDER BY p.name ASC
  `);
}

async function findAllAttendance() {
  return db.query(`
    SELECT name, student_id
    FROM participants
    ORDER BY name ASC
  `);
}

async function findById(id) {
  const participants = await db.query('SELECT * FROM participants WHERE id = ?', [id]);
  return participants[0];
}

async function findByStudentId(studentId) {
  const participants = await db.query('SELECT * FROM participants WHERE student_id = ?', [studentId]);
  return participants[0];
}

async function findByGroupId(groupId) {
  return db.query('SELECT name, student_id, avatar_path FROM participants WHERE group_id = ?', [groupId]);
}

async function findAllGroupedByGroupId() {
  const rows = await db.query(`
    SELECT group_id, name, student_id, avatar_path
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
      student_id: participant.student_id,
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

async function create({ name, studentId, avatarPath, groupId }) {
  return db.query(
    'INSERT INTO participants (name, student_id, avatar_path, group_id) VALUES (?, ?, ?, ?)',
    [name, studentId, avatarPath, groupId]
  );
}

async function update(id, { name, studentId, avatarPath, groupId }) {
  return db.query(
    'UPDATE participants SET name = ?, student_id = ?, avatar_path = ?, group_id = ? WHERE id = ?',
    [name, studentId, avatarPath, groupId, id]
  );
}

async function findAssignableForGroup(groupId = null) {
  const params = [];
  let where = 'WHERE group_id IS NULL';

  if (groupId) {
    where = 'WHERE group_id IS NULL OR group_id = ?';
    params.push(groupId);
  }

  return db.query(`
    SELECT id, name, student_id, avatar_path, group_id
    FROM participants
    ${where}
    ORDER BY name ASC
  `, params);
}

async function findUnavailableForGroup(participantIds = [], groupId = null) {
  const ids = participantIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const params = [...ids];
  let where = `id IN (${placeholders}) AND group_id IS NOT NULL`;

  if (groupId) {
    where += ' AND group_id <> ?';
    params.push(groupId);
  }

  return db.query(`
    SELECT id, name, student_id, group_id
    FROM participants
    WHERE ${where}
    ORDER BY name ASC
  `, params);
}

async function syncGroupAssignments(groupId, participantIds = []) {
  const ids = participantIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);

  await db.query('UPDATE participants SET group_id = NULL WHERE group_id = ?', [groupId]);

  if (ids.length === 0) {
    return;
  }

  const placeholders = ids.map(() => '?').join(', ');
  await db.query(
    `UPDATE participants SET group_id = ? WHERE id IN (${placeholders})`,
    [groupId, ...ids]
  );
}

async function remove(id) {
  return db.query('DELETE FROM participants WHERE id = ?', [id]);
}

module.exports = {
  findAllWithGroupNames,
  findAllAttendance,
  findById,
  findByStudentId,
  findByGroupId,
  findAllGroupedByGroupId,
  countByGroupId,
  countAll,
  create,
  update,
  findAssignableForGroup,
  findUnavailableForGroup,
  syncGroupAssignments,
  remove
};
