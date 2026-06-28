const db = require('../config/db');

async function getDashboardStats() {
  const rows = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM \`groups\`) as totalGroups,
      (SELECT COUNT(*) FROM participants) as totalParticipants,
      (SELECT COUNT(*) FROM live_votes) as totalVotes
  `);

  return {
    totalGroups: rows[0].totalGroups,
    totalParticipants: rows[0].totalParticipants,
    totalVotes: rows[0].totalVotes
  };
}

async function getLeaderboard(totalVotes) {
  const groups = await db.query(`
    SELECT
      g.id,
      g.name,
      g.logo_path,
      COALESCE(v.vote_count, 0) as vote_count,
      COALESCE(s.avg_inno, 0) as avg_inno,
      COALESCE(s.avg_des, 0) as avg_des,
      COALESCE(s.avg_exec, 0) as avg_exec,
      COALESCE(s.score_count, 0) as score_count,
      COALESCE(p.member_count, 0) as member_count
    FROM \`groups\` g
    LEFT JOIN (
      SELECT group_id, COUNT(*) as vote_count
      FROM live_votes
      GROUP BY group_id
    ) v ON v.group_id = g.id
    LEFT JOIN (
      SELECT
        group_id,
        AVG(score_innovation) as avg_inno,
        AVG(score_design) as avg_des,
        AVG(score_execution) as avg_exec,
        COUNT(*) as score_count
      FROM judge_scores
      GROUP BY group_id
    ) s ON s.group_id = g.id
    LEFT JOIN (
      SELECT group_id, COUNT(*) as member_count
      FROM participants
      WHERE group_id IS NOT NULL
      GROUP BY group_id
    ) p ON p.group_id = g.id
  `);

  const leaderboard = groups.map(group => {
    const avgInno = group.avg_inno ? parseFloat(group.avg_inno) : 0;
    const avgDes = group.avg_des ? parseFloat(group.avg_des) : 0;
    const avgExec = group.avg_exec ? parseFloat(group.avg_exec) : 0;
    const judge_avg_raw = (avgInno + avgDes + avgExec).toFixed(1);
    const rawJudge = parseFloat(judge_avg_raw);
    const publicScore = totalVotes > 0 ? (group.vote_count / totalVotes) * 40 : 0;
    const judgeScore = (rawJudge / 30) * 60;

    return {
      id: group.id,
      name: group.name,
      logo_path: group.logo_path,
      vote_count: Number(group.vote_count) || 0,
      judge_avg_raw,
      score_count: Number(group.score_count) || 0,
      member_count: Number(group.member_count) || 0,
      raw_votes: Number(group.vote_count) || 0,
      raw_judge: rawJudge,
      public_pct: totalVotes > 0 ? ((group.vote_count / totalVotes) * 100).toFixed(1) : '0.0',
      judge_pct: ((rawJudge / 30) * 100).toFixed(1),
      combined_score: (publicScore + judgeScore).toFixed(1)
    };
  });

  return leaderboard.sort((a, b) => b.combined_score - a.combined_score || b.vote_count - a.vote_count);
}

module.exports = {
  getDashboardStats,
  getLeaderboard
};
