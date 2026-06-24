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
  renderWithAlerts(req, res, 'admin/group-form', { activePage: 'registration', group: null });
}

async function showEditGroup(req, res) {
  try {
    const group = await groupModel.findById(req.params.id);

    if (!group) {
      return redirectWithFlash(req, res, '/admin/registration', 'error', 'Team not found.');
    }

    renderWithAlerts(req, res, 'admin/group-form', { activePage: 'registration', group });
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error loading team edit form.');
  }
}

async function showNewParticipant(req, res) {
  try {
    const groups = await groupModel.findAll();
    renderWithAlerts(req, res, 'admin/participant-form', { activePage: 'registration', groups, participant: null });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading participant form');
  }
}

async function showEditParticipant(req, res) {
  try {
    const [groups, participant] = await Promise.all([
      groupModel.findAll(),
      participantModel.findById(req.params.id)
    ]);

    if (!participant) {
      return redirectWithFlash(req, res, '/admin/registration', 'error', 'Participant not found.');
    }

    renderWithAlerts(req, res, 'admin/participant-form', { activePage: 'registration', groups, participant });
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error loading participant edit form.');
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

async function updateGroup(req, res) {
  const { name, description } = req.body;
  const groupId = req.params.id;

  if (!name) {
    return redirectWithFlash(req, res, `/admin/groups/${encodeURIComponent(groupId)}/edit`, 'error', 'Team name is required.');
  }

  try {
    const existingGroup = await groupModel.findById(groupId);

    if (!existingGroup) {
      return redirectWithFlash(req, res, '/admin/registration', 'error', 'Team not found.');
    }

    const logoPath = req.file ? '/uploads/' + req.file.filename : existingGroup.logo_path;
    await groupModel.update(groupId, { name, description, logoPath });
    redirectWithFlash(req, res, '/admin/registration', 'success', `Team "${name}" updated successfully.`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, `/admin/groups/${encodeURIComponent(groupId)}/edit`, 'error', 'A team with this name already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, `/admin/groups/${encodeURIComponent(groupId)}/edit`, 'error', 'Error updating team.');
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

async function updateParticipant(req, res) {
  const { name, email, groupId } = req.body;
  const participantId = req.params.id;

  if (!name || !email) {
    return redirectWithFlash(req, res, `/admin/participants/${encodeURIComponent(participantId)}/edit`, 'error', 'Name and email are required.');
  }

  const assignedGroupId = groupId ? parseInt(groupId, 10) : null;

  try {
    const existingParticipant = await participantModel.findById(participantId);

    if (!existingParticipant) {
      return redirectWithFlash(req, res, '/admin/registration', 'error', 'Participant not found.');
    }

    const avatarPath = req.file ? '/uploads/' + req.file.filename : existingParticipant.avatar_path;
    await participantModel.update(participantId, { name, email, avatarPath, groupId: assignedGroupId });
    redirectWithFlash(req, res, '/admin/registration', 'success', `Participant "${name}" updated successfully.`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, `/admin/participants/${encodeURIComponent(participantId)}/edit`, 'error', 'A participant with this email address already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, `/admin/participants/${encodeURIComponent(participantId)}/edit`, 'error', 'Error updating participant.');
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
  renderWithAlerts(req, res, 'admin/post-form', { activePage: 'posts', post: null });
}

async function showEditPost(req, res) {
  try {
    const post = await postModel.findById(req.params.id);

    if (!post) {
      return redirectWithFlash(req, res, '/admin/posts', 'error', 'Post not found.');
    }

    renderWithAlerts(req, res, 'admin/post-form', { activePage: 'posts', post });
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/posts', 'error', 'Error loading post edit form.');
  }
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

async function updatePost(req, res) {
  const { title, content } = req.body;
  const postId = req.params.id;

  if (!title || !content) {
    return redirectWithFlash(req, res, `/admin/posts/${encodeURIComponent(postId)}/edit`, 'error', 'Headline and body content are required.');
  }

  try {
    const existingPost = await postModel.findById(postId);

    if (!existingPost) {
      return redirectWithFlash(req, res, '/admin/posts', 'error', 'Post not found.');
    }

    const imagePath = req.file ? '/uploads/' + req.file.filename : existingPost.image_path;
    await postModel.update(postId, { title, content, imagePath, adminId: req.session.adminId });
    redirectWithFlash(req, res, '/admin/posts', 'success', 'Live blog update edited successfully.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, `/admin/posts/${encodeURIComponent(postId)}/edit`, 'error', 'Error updating timeline post.');
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
    renderWithAlerts(req, res, 'admin/score-form', { activePage: 'scoring', groups, selectedGroupId, score: null });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading score form');
  }
}

async function showEditScore(req, res) {
  try {
    const [groups, score] = await Promise.all([
      groupModel.findAll(),
      scoreModel.findById(req.params.id)
    ]);

    if (!score) {
      return redirectWithFlash(req, res, '/admin/scoring', 'error', 'Score entry not found.');
    }

    renderWithAlerts(req, res, 'admin/score-form', {
      activePage: 'scoring',
      groups,
      selectedGroupId: score.group_id,
      score
    });
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/scoring', 'error', 'Error loading score edit form.');
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

async function updateScore(req, res) {
  const { group_id, judge_name, score_innovation, score_design, score_execution, feedback } = req.body;
  const scoreId = req.params.id;

  if (!group_id || !judge_name) {
    return redirectWithFlash(req, res, `/admin/scores/${encodeURIComponent(scoreId)}/edit`, 'error', 'Judge name and target team are required.');
  }

  const innovation = parseInt(score_innovation, 10);
  const design = parseInt(score_design, 10);
  const execution = parseInt(score_execution, 10);

  if (
    Number.isNaN(innovation) || Number.isNaN(design) || Number.isNaN(execution) ||
    innovation < 1 || innovation > 10 ||
    design < 1 || design > 10 ||
    execution < 1 || execution > 10
  ) {
    return redirectWithFlash(req, res, `/admin/scores/${encodeURIComponent(scoreId)}/edit`, 'error', 'Scoring metrics must range from 1 to 10.');
  }

  try {
    const existingScore = await scoreModel.findById(scoreId);

    if (!existingScore) {
      return redirectWithFlash(req, res, '/admin/scoring', 'error', 'Score entry not found.');
    }

    await scoreModel.update(scoreId, {
      groupId: group_id,
      judgeName: judge_name,
      innovation,
      design,
      execution,
      feedback
    });

    redirectWithFlash(req, res, '/admin/scoring', 'success', `Evaluation by "${judge_name}" updated successfully.`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, `/admin/scores/${encodeURIComponent(scoreId)}/edit`, 'error', 'That judge already has a score for this team.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, `/admin/scores/${encodeURIComponent(scoreId)}/edit`, 'error', 'Database error updating scores.');
    }
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

async function showAdmins(req, res) {
  try {
    const admins = await adminModel.findAll();
    renderWithAlerts(req, res, 'admin/admins', { activePage: 'admins', admins });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading administrators list');
  }
}

function showNewAdminForm(req, res) {
  renderWithAlerts(req, res, 'admin/admin-form', { activePage: 'admins' });
}

async function createAdmin(req, res) {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return redirectWithFlash(req, res, '/admin/settings/admins/new', 'error', 'All fields are required.');
  }

  try {
    await adminModel.create({ username, email, password, role });
    redirectWithFlash(req, res, '/admin/settings/admins', 'success', `Administrator "${username}" registered successfully!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/admin/settings/admins/new', 'error', 'An admin account with this username or email already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/admin/settings/admins/new', 'error', 'Error registering administrator.');
    }
  }
}

async function deleteAdmin(req, res) {
  const { adminId } = req.body;

  if (!adminId) {
    return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Admin ID is required.');
  }

  if (parseInt(adminId, 10) === req.session.adminId) {
    return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'You cannot delete your own admin account.');
  }

  try {
    const targetAdmin = await adminModel.findById(adminId);
    if (!targetAdmin) {
      return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Administrator not found.');
    }

    if (targetAdmin.role === 'super') {
      const superCount = await adminModel.countSuperAdmins();
      if (superCount <= 1) {
        return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Cannot delete the only remaining Super Admin account.');
      }
    }

    await adminModel.remove(adminId);
    redirectWithFlash(req, res, '/admin/settings/admins', 'success', `Administrator "${targetAdmin.username}" removed successfully.`);
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Error removing administrator.');
  }
}

async function showEditAdminForm(req, res) {
  try {
    const admin = await adminModel.findById(req.params.id);
    if (!admin) {
      return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Administrator not found.');
    }
    renderWithAlerts(req, res, 'admin/admin-form', { activePage: 'admins', admin });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading edit form.');
  }
}

async function updateAdmin(req, res) {
  const { username, email, password, role } = req.body;
  const adminId = req.params.id;

  if (!username || !email || !role) {
    return redirectWithFlash(req, res, `/admin/settings/admins/${encodeURIComponent(adminId)}/edit`, 'error', 'Username, email and role are required.');
  }

  try {
    const targetAdmin = await adminModel.findById(adminId);
    if (!targetAdmin) {
      return redirectWithFlash(req, res, '/admin/settings/admins', 'error', 'Administrator not found.');
    }

    // Guard against demoting the last super admin
    if (targetAdmin.role === 'super' && role !== 'super') {
      const superCount = await adminModel.countSuperAdmins();
      if (superCount <= 1) {
        return redirectWithFlash(req, res, `/admin/settings/admins/${encodeURIComponent(adminId)}/edit`, 'error', 'Cannot demote the only remaining Super Admin.');
      }
    }

    await adminModel.update(adminId, { username, email, password, role });

    // Sync session if updating current admin user profile
    if (parseInt(adminId, 10) === req.session.adminId) {
      req.session.username = username;
      req.session.role = role;
    }

    redirectWithFlash(req, res, '/admin/settings/admins', 'success', `Administrator "${username}" updated successfully.`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, `/admin/settings/admins/${encodeURIComponent(adminId)}/edit`, 'error', 'An admin account with this username or email already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, `/admin/settings/admins/${encodeURIComponent(adminId)}/edit`, 'error', 'Error updating administrator.');
    }
  }
}

module.exports = {
  showDashboard,
  showRegistration,
  showNewGroup,
  showEditGroup,
  createGroup,
  updateGroup,
  showNewParticipant,
  showEditParticipant,
  createParticipant,
  updateParticipant,
  deleteGroup,
  deleteParticipant,
  showPosts,
  showNewPost,
  showEditPost,
  createPost,
  updatePost,
  deletePost,
  showScoring,
  showNewScore,
  showEditScore,
  saveScore,
  updateScore,
  deleteScore,
  showSettings,
  showPasswordForm,
  toggleVoting,
  resetVotes,
  changePassword,
  showAdmins,
  showNewAdminForm,
  showEditAdminForm,
  createAdmin,
  updateAdmin,
  deleteAdmin
};
