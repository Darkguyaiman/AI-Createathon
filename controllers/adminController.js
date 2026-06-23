const bcrypt = require('bcryptjs');
const adminModel = require('../models/adminModel');
const dashboardModel = require('../models/dashboardModel');
const groupModel = require('../models/groupModel');
const participantModel = require('../models/participantModel');
const postModel = require('../models/postModel');
const scoreModel = require('../models/scoreModel');
const settingModel = require('../models/settingModel');
const voteModel = require('../models/voteModel');
const { redirectWithFlash, renderWithAlerts } = require('../utils/flash');

async function showDashboard(req, res) {
  try {
    const stats = await dashboardModel.getDashboardStats();
    const votingActive = await settingModel.isVotingActive();
    const leaderboard = await dashboardModel.getLeaderboard(stats.totalVotes);

    renderWithAlerts(req, res, 'admin/dashboard', {
      activePage: 'dashboard',
      stats,
      votingActive,
      leaderboard
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading admin dashboard metrics');
  }
}

async function showRegistration(req, res) {
  try {
    const groups = await groupModel.findAll();
    const participants = await participantModel.findAllWithGroupNames();
    renderWithAlerts(req, res, 'admin/registration', { activePage: 'registration', groups, participants });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading registrations');
  }
}

function showNewGroup(req, res) {
  renderWithAlerts(req, res, 'admin/group-form', { activePage: 'registration' });
}

async function showNewParticipant(req, res) {
  try {
    const groups = await groupModel.findAll();
    renderWithAlerts(req, res, 'admin/participant-form', { activePage: 'registration', groups });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading participant form');
  }
}

async function createGroup(req, res) {
  const { name, description } = req.body;

  if (!name) {
    return redirectWithFlash(req, res, '/admin/groups/new', 'error', 'Team name is required.');
  }

  const logoPath = req.file ? '/uploads/' + req.file.filename : '/uploads/default-group.svg';

  try {
    await groupModel.create({ name, description, logoPath });
    redirectWithFlash(req, res, '/admin/registration', 'success', `Team "${name}" created successfully!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/admin/groups/new', 'error', 'A team with this name already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/admin/groups/new', 'error', 'Error creating team.');
    }
  }
}

async function createParticipant(req, res) {
  const { name, email, groupId } = req.body;

  if (!name || !email) {
    return redirectWithFlash(req, res, '/admin/participants/new', 'error', 'Name and email are required.');
  }

  const avatarPath = req.file ? '/uploads/' + req.file.filename : '/uploads/default-avatar.svg';
  const assignedGroupId = groupId ? parseInt(groupId, 10) : null;

  try {
    await participantModel.create({ name, email, avatarPath, groupId: assignedGroupId });
    redirectWithFlash(req, res, '/admin/registration', 'success', `Participant "${name}" registered successfully!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/admin/participants/new', 'error', 'A participant with this email address already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/admin/participants/new', 'error', 'Error registering participant.');
    }
  }
}

async function deleteGroup(req, res) {
  try {
    await groupModel.remove(req.body.groupId);
    redirectWithFlash(req, res, '/admin/registration', 'success', 'Team deleted and member associations unlinked.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error deleting team.');
  }
}

async function deleteParticipant(req, res) {
  try {
    await participantModel.remove(req.body.participantId);
    redirectWithFlash(req, res, '/admin/registration', 'success', 'Participant registration deleted.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error deleting participant.');
  }
}

async function showPosts(req, res) {
  try {
    const posts = await postModel.findAllWithAuthors();
    renderWithAlerts(req, res, 'admin/posts', { activePage: 'posts', posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading posts');
  }
}

function showNewPost(req, res) {
  renderWithAlerts(req, res, 'admin/post-form', { activePage: 'posts' });
}

async function createPost(req, res) {
  const { title, content } = req.body;

  if (!title || !content) {
    return redirectWithFlash(req, res, '/admin/posts/new', 'error', 'Headline and body content are required.');
  }

  const imagePath = req.file ? '/uploads/' + req.file.filename : null;

  try {
    await postModel.create({ title, content, imagePath, adminId: req.session.adminId });
    redirectWithFlash(req, res, '/admin/posts', 'success', 'Live blog update published successfully!');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/posts/new', 'error', 'Error creating timeline post.');
  }
}

async function deletePost(req, res) {
  try {
    await postModel.remove(req.body.postId);
    redirectWithFlash(req, res, '/admin/posts', 'success', 'Live update post removed from timeline feed.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/posts', 'error', 'Error deleting post.');
  }
}

async function showScoring(req, res) {
  try {
    const selectedGroupId = req.query.groupId || null;
    const groups = await groupModel.findAll();
    const scores = await scoreModel.findAllWithGroupNames();
    renderWithAlerts(req, res, 'admin/scoring', { activePage: 'scoring', groups, scores, selectedGroupId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading judges evaluations');
  }
}

async function showNewScore(req, res) {
  try {
    const selectedGroupId = req.query.groupId || null;
    const groups = await groupModel.findAll();
    renderWithAlerts(req, res, 'admin/score-form', { activePage: 'scoring', groups, selectedGroupId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading score form');
  }
}

async function saveScore(req, res) {
  const { group_id, judge_name, score_innovation, score_design, score_execution, feedback } = req.body;

  if (!group_id || !judge_name) {
    return redirectWithFlash(req, res, '/admin/scores/new', 'error', 'Judge name and target team are required.');
  }

  const innovation = parseInt(score_innovation, 10);
  const design = parseInt(score_design, 10);
  const execution = parseInt(score_execution, 10);

  if (innovation < 1 || innovation > 10 || design < 1 || design > 10 || execution < 1 || execution > 10) {
    return redirectWithFlash(req, res, `/admin/scores/new?groupId=${encodeURIComponent(group_id)}`, 'error', 'Scoring metrics must range from 1 to 10.');
  }

  try {
    await scoreModel.upsert({
      groupId: group_id,
      judgeName: judge_name,
      innovation,
      design,
      execution,
      feedback
    });

    redirectWithFlash(req, res, '/admin/scoring', 'success', `Evaluation by "${judge_name}" recorded successfully.`);
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, `/admin/scores/new?groupId=${encodeURIComponent(group_id || '')}`, 'error', 'Database error saving scores.');
  }
}

async function deleteScore(req, res) {
  try {
    await scoreModel.remove(req.body.scoreId);
    redirectWithFlash(req, res, '/admin/scoring', 'success', 'Judges evaluation entry removed.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/scoring', 'error', 'Error deleting scores.');
  }
}

async function showSettings(req, res) {
  try {
    const votingActive = await settingModel.isVotingActive();
    renderWithAlerts(req, res, 'admin/settings', { activePage: 'settings', votingActive });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading settings');
  }
}

function showPasswordForm(req, res) {
  renderWithAlerts(req, res, 'admin/password-form', { activePage: 'settings' });
}

async function toggleVoting(req, res) {
  try {
    const votingActive = await settingModel.toggleVotingActive();
    const msg = votingActive ? 'Live public voting is now open!' : 'Live public voting has been paused.';
    redirectWithFlash(req, res, req.headers.referer || '/admin/settings', 'success', msg);
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings', 'error', 'Error toggling voting state.');
  }
}

async function resetVotes(req, res) {
  try {
    await voteModel.resetAll();
    redirectWithFlash(req, res, '/admin/settings', 'success', 'All public Choice votes have been successfully reset.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings', 'error', 'Error resetting votes database.');
  }
}

async function changePassword(req, res) {
  const { old_password, new_password, confirm_new_password } = req.body;

  if (!old_password || !new_password || !confirm_new_password) {
    return redirectWithFlash(req, res, '/admin/settings/password', 'error', 'All password fields are required.');
  }

  if (new_password !== confirm_new_password) {
    return redirectWithFlash(req, res, '/admin/settings/password', 'error', 'New passwords do not match.');
  }

  if (new_password.length < 6) {
    return redirectWithFlash(req, res, '/admin/settings/password', 'error', 'New password must be at least 6 characters long.');
  }

  try {
    const admin = await adminModel.findById(req.session.adminId);

    if (admin && await bcrypt.compare(old_password, admin.password_hash)) {
      await adminModel.updatePassword(req.session.adminId, new_password);
      redirectWithFlash(req, res, '/admin/settings', 'success', 'Admin password changed successfully!');
    } else {
      redirectWithFlash(req, res, '/admin/settings/password', 'error', 'Incorrect current password.');
    }
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings/password', 'error', 'Database security update error.');
  }
}

module.exports = {
  showDashboard,
  showRegistration,
  showNewGroup,
  createGroup,
  showNewParticipant,
  createParticipant,
  deleteGroup,
  deleteParticipant,
  showPosts,
  showNewPost,
  createPost,
  deletePost,
  showScoring,
  showNewScore,
  saveScore,
  deleteScore,
  showSettings,
  showPasswordForm,
  toggleVoting,
  resetVotes,
  changePassword
};
