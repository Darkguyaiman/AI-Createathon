const groupModel = require('../models/groupModel');
const participantModel = require('../models/participantModel');
const postModel = require('../models/postModel');
const settingModel = require('../models/settingModel');
const voteModel = require('../models/voteModel');
const dashboardModel = require('../models/dashboardModel');
const liveUpdates = require('../services/liveUpdates');
const { redirectWithFlash, renderWithAlerts } = require('../utils/flash');
const crypto = require('crypto');

const VOTER_COOKIE_NAME = 'ai_createathon_voter_id';
const VOTER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (!rawName) return cookies;

    cookies[rawName] = decodeURIComponent(rawValueParts.join('=') || '');
    return cookies;
  }, {});
}

function getVoterId(req, res) {
  const cookies = parseCookies(req);
  const existingVoterId = cookies[VOTER_COOKIE_NAME];

  if (existingVoterId) {
    return existingVoterId;
  }

  const voterId = crypto.randomUUID();
  res.setHeader('Set-Cookie', `${VOTER_COOKIE_NAME}=${encodeURIComponent(voterId)}; Max-Age=${VOTER_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; HttpOnly`);
  return voterId;
}

async function showHome(req, res) {
  try {
    const allPosts = await postModel.findRecentWithAuthors(4);
    const posts = allPosts.slice(0, 3);
    const hasMore = allPosts.length > 3;
    renderWithAlerts(req, res, 'index', { activePage: 'home', posts, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).send('Database connection error');
  }
}

async function showUpdates(req, res) {
  try {
    const posts = await postModel.findAllWithAuthors();
    renderWithAlerts(req, res, 'updates', { activePage: 'updates', posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Database connection error');
  }
}

async function showLeaderboard(req, res) {
  try {
    const votingActive = await settingModel.isVotingActive();
    if (!votingActive) {
      return redirectWithFlash(req, res, '/', 'error', 'Leaderboard is only accessible when public voting is active.');
    }

    const stats = await dashboardModel.getDashboardStats();
    const leaderboard = await dashboardModel.getLeaderboard(stats.totalVotes);

    renderWithAlerts(req, res, 'leaderboard', {
      activePage: 'leaderboard',
      leaderboard,
      totalVotes: stats.totalVotes
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading live leaderboard.');
  }
}

async function showVoting(req, res) {
  try {
    const voterId = getVoterId(req, res);
    const votingActive = await settingModel.isVotingActive();
    const hasVoted = await voteModel.hasVoted(voterId);
    const totalVotes = await voteModel.countAll();
    const [groups, participantsByGroupId] = await Promise.all([
      groupModel.findAllWithVoteCounts(),
      participantModel.findAllGroupedByGroupId()
    ]);
    groups.forEach(group => {
      group.members = participantsByGroupId[group.id] || [];
    });

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
    const voterId = getVoterId(req, res);
    const { groupId } = req.body;

    if (!groupId) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Invalid group selected.');
    }

    const votingActive = await settingModel.isVotingActive();
    if (!votingActive) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Public voting is currently closed.');
    }

    const group = await groupModel.findById(groupId);
    if (!group) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Selected team was not found.');
    }

    if (Number(group.voting_enabled) !== 1) {
      return redirectWithFlash(req, res, '/voting', 'error', `Voting for "${group.name}" is not open yet.`);
    }

    await voteModel.create({ groupId, voterIp: voterId });
    await liveUpdates.broadcastVotingUpdate();
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
  showUpdates,
  showLeaderboard,
  showVoting,
  showTeam,
  castVote
};
