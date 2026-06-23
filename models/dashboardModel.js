const groupModel = require('./groupModel');
const participantModel = require('./participantModel');
const scoreModel = require('./scoreModel');
const voteModel = require('./voteModel');

async function getDashboardStats() {
  const groups = await groupModel.findAll();
  const totalParticipants = await participantModel.countAll();
  const totalVotes = await voteModel.countAll();

  return {
    totalGroups: groups.length,
    totalParticipants,
    totalVotes
  };
}

async function getLeaderboard(totalVotes) {
  const groups = await groupModel.findAllWithVoteCountsUnsorted();
  const leaderboard = [];

  for (const group of groups) {
    const judge = await scoreModel.getAveragesByGroupId(group.id);
    const avgInno = judge.avg_inno ? parseFloat(judge.avg_inno) : 0;
    const avgDes = judge.avg_des ? parseFloat(judge.avg_des) : 0;
    const avgExec = judge.avg_exec ? parseFloat(judge.avg_exec) : 0;
    const judge_avg_raw = (avgInno + avgDes + avgExec).toFixed(1);
    const member_count = await participantModel.countByGroupId(group.id);
    const rawJudge = parseFloat(judge_avg_raw);
    const publicScore = totalVotes > 0 ? (group.vote_count / totalVotes) * 40 : 0;
    const judgeScore = (rawJudge / 30) * 60;

    leaderboard.push({
      id: group.id,
      name: group.name,
      logo_path: group.logo_path,
      vote_count: group.vote_count,
      judge_avg_raw,
      score_count: judge.score_count || 0,
      member_count,
      raw_votes: group.vote_count,
      raw_judge: rawJudge,
      public_pct: totalVotes > 0 ? ((group.vote_count / totalVotes) * 100).toFixed(1) : '0.0',
      judge_pct: ((rawJudge / 30) * 100).toFixed(1),
      combined_score: (publicScore + judgeScore).toFixed(1)
    });
  }

  return leaderboard.sort((a, b) => b.combined_score - a.combined_score || b.vote_count - a.vote_count);
}

module.exports = {
  getDashboardStats,
  getLeaderboard
};
