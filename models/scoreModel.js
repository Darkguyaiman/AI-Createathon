const db = require('../config/db');

async function findAllWithGroupNames() {
  return db.query(`
    SELECT s.*, g.name as group_name
    FROM judge_scores s
    JOIN \`groups\` g ON s.group_id = g.id
    ORDER BY s.created_at DESC
  `);
}

async function findById(id) {
  const scores = await db.query('SELECT * FROM judge_scores WHERE id = ?', [id]);
  return scores[0];
}

async function getAveragesByGroupId(groupId) {
  const rows = await db.query(`
    SELECT
      AVG(score_innovation) as avg_inno,
      AVG(score_design) as avg_des,
      AVG(score_execution) as avg_exec,
      COUNT(id) as score_count
    FROM judge_scores
    WHERE group_id = ?
  `, [groupId]);

  return rows[0];
}

async function upsert({ groupId, judgeName, innovation, design, execution, feedback }) {
  return db.query(`
    INSERT INTO judge_scores (group_id, judge_name, score_innovation, score_design, score_execution, feedback)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      score_innovation = VALUES(score_innovation),
      score_design = VALUES(score_design),
      score_execution = VALUES(score_execution),
      feedback = VALUES(feedback)
  `, [groupId, judgeName, innovation, design, execution, feedback]);
}

async function update(id, { groupId, judgeName, innovation, design, execution, feedback }) {
  return db.query(`
    UPDATE judge_scores
    SET group_id = ?, judge_name = ?, score_innovation = ?, score_design = ?, score_execution = ?, feedback = ?
    WHERE id = ?
  `, [groupId, judgeName, innovation, design, execution, feedback, id]);
}

async function remove(id) {
  return db.query('DELETE FROM judge_scores WHERE id = ?', [id]);
}

module.exports = {
  findAllWithGroupNames,
  findById,
  getAveragesByGroupId,
  upsert,
  update,
  remove
};
