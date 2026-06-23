const db = require('../config/db');

async function hasVoted(voterIp) {
  const rows = await db.query('SELECT id FROM live_votes WHERE voter_ip = ?', [voterIp]);
  return rows.length > 0;
}

async function countAll() {
  const rows = await db.query('SELECT COUNT(*) as count FROM live_votes');
  return rows[0].count;
}

async function create({ groupId, voterIp }) {
  return db.query('INSERT INTO live_votes (group_id, voter_ip) VALUES (?, ?)', [groupId, voterIp]);
}

async function resetAll() {
  return db.query('DELETE FROM live_votes');
}

module.exports = {
  hasVoted,
  countAll,
  create,
  resetAll
};
