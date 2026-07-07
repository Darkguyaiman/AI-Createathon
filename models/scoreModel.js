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
      AVG(score_creativity_innovation) as avg_creativity,
      AVG(score_effective_ai) as avg_ai,
      AVG(score_technical_quality) as avg_technical,
      AVG(score_presentation) as avg_presentation,
      AVG(score_practicality_impact) as avg_practicality,
      COUNT(id) as score_count
    FROM judge_scores
    WHERE group_id = ?
  `, [groupId]);

  return rows[0];
}

async function upsert({ groupId, judgeName, creativityInnovation, effectiveAi, technicalQuality, presentation, practicalityImpact, feedback }) {
  return db.query(`
    INSERT INTO judge_scores (
      group_id,
      judge_name,
      score_creativity_innovation,
      score_effective_ai,
      score_technical_quality,
      score_presentation,
      score_practicality_impact,
      feedback
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      score_creativity_innovation = VALUES(score_creativity_innovation),
      score_effective_ai = VALUES(score_effective_ai),
      score_technical_quality = VALUES(score_technical_quality),
      score_presentation = VALUES(score_presentation),
      score_practicality_impact = VALUES(score_practicality_impact),
      feedback = VALUES(feedback)
  `, [groupId, judgeName, creativityInnovation, effectiveAi, technicalQuality, presentation, practicalityImpact, feedback]);
}

async function update(id, { groupId, judgeName, creativityInnovation, effectiveAi, technicalQuality, presentation, practicalityImpact, feedback }) {
  return db.query(`
    UPDATE judge_scores
    SET
      group_id = ?,
      judge_name = ?,
      score_creativity_innovation = ?,
      score_effective_ai = ?,
      score_technical_quality = ?,
      score_presentation = ?,
      score_practicality_impact = ?,
      feedback = ?
    WHERE id = ?
  `, [groupId, judgeName, creativityInnovation, effectiveAi, technicalQuality, presentation, practicalityImpact, feedback, id]);
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
