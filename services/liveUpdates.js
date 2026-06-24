const { Server } = require('socket.io');
const dashboardModel = require('../models/dashboardModel');
const groupModel = require('../models/groupModel');
const voteModel = require('../models/voteModel');

let io;

async function buildVotingSnapshot() {
  const totalVotes = await voteModel.countAll();
  const [groups, leaderboard] = await Promise.all([
    groupModel.findAllWithVoteCounts(),
    dashboardModel.getLeaderboard(totalVotes)
  ]);

  const maxVotes = Math.max(...groups.map(group => Number(group.vote_count) || 0), 1);

  return {
    totalVotes,
    groups: groups.map(group => {
      const voteCount = Number(group.vote_count) || 0;

      return {
        id: group.id,
        name: group.name,
        logo_path: group.logo_path,
        vote_count: voteCount,
        percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
        bar_width: voteCount > 0 ? Math.max(Math.round((voteCount / maxVotes) * 100), 5) : 0
      };
    }),
    leaderboard
  };
}

function init(server) {
  io = new Server(server, {
    cors: {
      origin: false
    }
  });

  io.on('connection', async socket => {
    socket.join('live-voting');

    try {
      socket.emit('voting:update', await buildVotingSnapshot());
    } catch (error) {
      console.error('Failed to send initial voting snapshot:', error);
    }
  });

  return io;
}

async function broadcastVotingUpdate() {
  if (!io) return;

  try {
    io.to('live-voting').emit('voting:update', await buildVotingSnapshot());
  } catch (error) {
    console.error('Failed to broadcast voting update:', error);
  }
}

module.exports = {
  init,
  broadcastVotingUpdate
};
