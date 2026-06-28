const db = require('../config/db');

async function findAll() {
  return db.query('SELECT * FROM `groups` ORDER BY name ASC');
}

async function findById(id) {
  const groups = await db.query('SELECT * FROM `groups` WHERE id = ?', [id]);
  return groups[0];
}

async function findAllWithVoteCounts() {
  return db.query(`
    SELECT g.*, COALESCE(v.vote_count, 0) as vote_count
    FROM \`groups\` g
    LEFT JOIN (
      SELECT group_id, COUNT(*) as vote_count
      FROM live_votes
      GROUP BY group_id
    ) v ON v.group_id = g.id
    ORDER BY vote_count DESC, g.name ASC
  `);
}

async function findAllWithVoteCountsUnsorted() {
  return db.query(`
    SELECT g.*, COALESCE(v.vote_count, 0) as vote_count
    FROM \`groups\` g
    LEFT JOIN (
      SELECT group_id, COUNT(*) as vote_count
      FROM live_votes
      GROUP BY group_id
    ) v ON v.group_id = g.id
  `);
}

async function create({ name, description, logoPath }) {
  return db.query(
    'INSERT INTO `groups` (name, description, logo_path) VALUES (?, ?, ?)',
    [name, description, logoPath]
  );
}

async function update(id, { name, description, logoPath }) {
  return db.query(
    'UPDATE `groups` SET name = ?, description = ?, logo_path = ? WHERE id = ?',
    [name, description, logoPath, id]
  );
}

async function remove(id) {
  return db.query('DELETE FROM `groups` WHERE id = ?', [id]);
}

module.exports = {
  findAll,
  findById,
  findAllWithVoteCounts,
  findAllWithVoteCountsUnsorted,
  create,
  update,
  remove
};
