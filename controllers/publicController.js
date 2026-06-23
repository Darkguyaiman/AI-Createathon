const groupModel = require('../models/groupModel');
const participantModel = require('../models/participantModel');
const postModel = require('../models/postModel');
const settingModel = require('../models/settingModel');
const voteModel = require('../models/voteModel');
const { redirectWithFlash, renderWithAlerts } = require('../utils/flash');

function getVisitorIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

async function showHome(req, res) {
  try {
    const posts = await postModel.findAllWithAuthors();
    renderWithAlerts(req, res, 'index', { activePage: 'home', posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Database connection error');
  }
}

async function showVoting(req, res) {
  try {
    const visitorIp = getVisitorIp(req);
    const votingActive = await settingModel.isVotingActive();
    const hasVoted = await voteModel.hasVoted(visitorIp);
    const totalVotes = await voteModel.countAll();
    const groups = await groupModel.findAllWithVoteCounts();

    for (const group of groups) {
      group.members = await participantModel.findByGroupId(group.id);
    }

    renderWithAlerts(req, res, 'voting', {
      activePage: 'voting',
      groups,
      votingActive,
      hasVoted,
      totalVotes
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading voting system');
  }
}

function showTeam(req, res) {
  renderWithAlerts(req, res, 'team', { activePage: 'team' });
}

async function castVote(req, res) {
  try {
    const visitorIp = getVisitorIp(req);
    const { groupId } = req.body;

    if (!groupId) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Invalid group selected.');
    }

    const votingActive = await settingModel.isVotingActive();
    if (!votingActive) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Public voting is currently closed.');
    }

    await voteModel.create({ groupId, voterIp: visitorIp });
    redirectWithFlash(req, res, '/voting', 'success', 'Thank you! Your vote has been cast successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/voting', 'error', 'You have already voted! Each device is limited to one vote.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/voting', 'error', 'An error occurred while processing your vote.');
    }
  }
}

module.exports = {
  showHome,
  showVoting,
  showTeam,
  castVote
};
