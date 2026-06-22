const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder and session folder exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate default SVGs if they don't exist
const defaultAvatarPath = path.join(uploadsDir, 'default-avatar.svg');
if (!fs.existsSync(defaultAvatarPath)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#8E8E93"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  fs.writeFileSync(defaultAvatarPath, svg);
}

const defaultGroupPath = path.join(uploadsDir, 'default-group.svg');
if (!fs.existsSync(defaultGroupPath)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4EA8DE"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`;
  fs.writeFileSync(defaultGroupPath, svg);
}

// Multer Storage Configuration for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Configure EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
  store: new FileStore({ path: path.join(__dirname, 'sessions'), logFn: () => {} }),
  secret: process.env.SESSION_SECRET || 'ai_createathon_super_secret_session_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Share session globals with EJS views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Admin Authentication check middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Helpers for error/success flash responses
function renderWithAlerts(req, res, view, data = {}) {
  const success_msg = req.session.success_msg;
  const error_msg = req.session.error_msg;
  delete req.session.success_msg;
  delete req.session.error_msg;
  res.render(view, { ...data, success_msg, error_msg });
}

function redirectWithFlash(req, res, path, type, msg) {
  req.session[type + '_msg'] = msg;
  req.session.save(() => {
    res.redirect(path);
  });
}

// ----------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------

// 1. Home / Landing Page
app.get('/', async (req, res) => {
  try {
    const posts = await db.query(`
      SELECT p.*, a.username as author 
      FROM posts p 
      LEFT JOIN admins a ON p.admin_id = a.id 
      ORDER BY p.created_at DESC
    `);
    renderWithAlerts(req, res, 'index', { activePage: 'home', posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Database connection error');
  }
});

// 2. Public Live Voting Page
app.get('/voting', async (req, res) => {
  try {
    const visitorIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Get voting active flag
    const settings = await db.query('SELECT value_name FROM settings WHERE key_name = ?', ['voting_active']);
    const votingActive = settings[0] ? settings[0].value_name === 'true' : false;

    // Check if current user IP has voted
    const hasVotedCheck = await db.query('SELECT id FROM live_votes WHERE voter_ip = ?', [visitorIp]);
    const hasVoted = hasVotedCheck.length > 0;

    // Get total votes count
    const voteCountCheck = await db.query('SELECT COUNT(*) as count FROM live_votes');
    const totalVotes = voteCountCheck[0] ? voteCountCheck[0].count : 0;

    // Get all groups and compute votes
    const groups = await db.query(`
      SELECT g.*, COUNT(v.id) as vote_count 
      FROM \`groups\` g 
      LEFT JOIN live_votes v ON g.id = v.group_id 
      GROUP BY g.id
      ORDER BY vote_count DESC, g.name ASC
    `);

    // Fetch members for each group
    for (const group of groups) {
      group.members = await db.query('SELECT name, avatar_path FROM participants WHERE group_id = ?', [group.id]);
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
});

// 3. Post Vote Route (Cast Vote)
app.post('/vote', async (req, res) => {
  try {
    const visitorIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { groupId } = req.body;

    if (!groupId) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Invalid group selected.');
    }

    // Check if voting is open
    const settings = await db.query('SELECT value_name FROM settings WHERE key_name = ?', ['voting_active']);
    const votingActive = settings[0] ? settings[0].value_name === 'true' : false;

    if (!votingActive) {
      return redirectWithFlash(req, res, '/voting', 'error', 'Public voting is currently closed.');
    }

    // Cast vote (duplicate IPs are blocked via SQL UNIQUE constraint)
    await db.query('INSERT INTO live_votes (group_id, voter_ip) VALUES (?, ?)', [groupId, visitorIp]);
    
    redirectWithFlash(req, res, '/voting', 'success', 'Thank you! Your vote has been cast successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/voting', 'error', 'You have already voted! Each device is limited to one vote.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/voting', 'error', 'An error occurred while processing your vote.');
    }
  }
});

// 4. Admin Login (Get)
app.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  renderWithAlerts(req, res, 'login', { activePage: 'login' });
});

// 5. Admin Login (Post)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = admins[0];

    if (admin && await bcrypt.compare(password, admin.password_hash)) {
      req.session.isAdmin = true;
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      
      req.session.save(() => {
        res.redirect('/admin/dashboard');
      });
    } else {
      redirectWithFlash(req, res, '/login', 'error', 'Invalid username or password credentials.');
    }
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/login', 'error', 'Internal server authentication error.');
  }
});

// 6. Admin Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});


// ----------------------------------------------------
// ADMIN CONTROLLER ROUTES
// ----------------------------------------------------

// 1. Dashboard Landing
app.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    // Stats
    const totalG = await db.query('SELECT COUNT(*) as count FROM `groups`');
    const totalP = await db.query('SELECT COUNT(*) as count FROM participants');
    const totalV = await db.query('SELECT COUNT(*) as count FROM live_votes');

    const stats = {
      totalGroups: totalG[0].count,
      totalParticipants: totalP[0].count,
      totalVotes: totalV[0].count
    };

    // Voting State
    const settings = await db.query('SELECT value_name FROM settings WHERE key_name = ?', ['voting_active']);
    const votingActive = settings[0] ? settings[0].value_name === 'true' : false;

    // Leaderboard generation (Combined Public & Judge weight scoring)
    const groups = await db.query(`
      SELECT g.*, COUNT(v.id) as vote_count 
      FROM \`groups\` g 
      LEFT JOIN live_votes v ON g.id = v.group_id 
      GROUP BY g.id
    `);

    // Fetch averages of judge scoring for each group
    const leaderboard = [];
    for (const group of groups) {
      const judges = await db.query(`
        SELECT 
          AVG(score_innovation) as avg_inno, 
          AVG(score_design) as avg_des, 
          AVG(score_execution) as avg_exec,
          COUNT(id) as score_count
        FROM judge_scores 
        WHERE group_id = ?
      `, [group.id]);

      const judge = judges[0];
      const avgInno = judge.avg_inno ? parseFloat(judge.avg_inno) : 0;
      const avgDes = judge.avg_des ? parseFloat(judge.avg_des) : 0;
      const avgExec = judge.avg_exec ? parseFloat(judge.avg_exec) : 0;
      
      const judge_avg_raw = (avgInno + avgDes + avgExec).toFixed(1);
      const score_count = judge.score_count || 0;

      // Member count
      const memCount = await db.query('SELECT COUNT(*) as count FROM participants WHERE group_id = ?', [group.id]);
      const member_count = memCount[0].count;

      leaderboard.push({
        id: group.id,
        name: group.name,
        logo_path: group.logo_path,
        vote_count: group.vote_count,
        judge_avg_raw,
        score_count,
        member_count,
        // Values for scoring formulas
        raw_votes: group.vote_count,
        raw_judge: parseFloat(judge_avg_raw)
      });
    }

    // Combined score weights: 40% public vote share percentage, 60% judge scores percentage (raw out of 30)
    // Formula: (Group votes / Total votes) * 40 + (Group judge avg score / 30) * 60
    leaderboard.forEach(item => {
      const public_pct = stats.totalVotes > 0 ? ((item.raw_votes / stats.totalVotes) * 100).toFixed(1) : '0.0';
      const judge_pct = ((item.raw_judge / 30) * 100).toFixed(1);

      const publicScore = stats.totalVotes > 0 ? (item.raw_votes / stats.totalVotes) * 40 : 0;
      const judgeScore = (item.raw_judge / 30) * 60;

      item.public_pct = public_pct;
      item.judge_pct = judge_pct;
      item.combined_score = (publicScore + judgeScore).toFixed(1);
    });

    // Sort leaderboard by combined score desc, then by public votes desc
    leaderboard.sort((a, b) => b.combined_score - a.combined_score || b.vote_count - a.vote_count);

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
});

// 2. Registration Page (Load Groups and Participants)
app.get('/admin/registration', requireAdmin, async (req, res) => {
  try {
    const groups = await db.query('SELECT * FROM `groups` ORDER BY name ASC');
    const participants = await db.query(`
      SELECT p.*, g.name as group_name 
      FROM participants p 
      LEFT JOIN \`groups\` g ON p.group_id = g.id 
      ORDER BY p.name ASC
    `);
    renderWithAlerts(req, res, 'admin/registration', { activePage: 'registration', groups, participants });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading registrations');
  }
});

// 3. Create Group / Team
app.post('/admin/groups', requireAdmin, upload.single('logo'), async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return redirectWithFlash(req, res, '/admin/registration', 'error', 'Team name is required.');
  }

  let logoPath = '/uploads/default-group.svg';
  if (req.file) {
    logoPath = '/uploads/' + req.file.filename;
  }

  try {
    await db.query('INSERT INTO `groups` (name, description, logo_path) VALUES (?, ?, ?)', [name, description, logoPath]);
    redirectWithFlash(req, res, '/admin/registration', 'success', `Team "${name}" created successfully!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/admin/registration', 'error', 'A team with this name already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/admin/registration', 'error', 'Error creating team.');
    }
  }
});

// 4. Create / Register Participant
app.post('/admin/participants', requireAdmin, upload.single('avatar'), async (req, res) => {
  const { name, email, groupId } = req.body;
  
  if (!name || !email) {
    return redirectWithFlash(req, res, '/admin/registration', 'error', 'Name and email are required.');
  }

  let avatarPath = '/uploads/default-avatar.svg';
  if (req.file) {
    avatarPath = '/uploads/' + req.file.filename;
  }

  const assignedGroupId = groupId ? parseInt(groupId) : null;

  try {
    await db.query('INSERT INTO participants (name, email, avatar_path, group_id) VALUES (?, ?, ?, ?)', 
      [name, email, avatarPath, assignedGroupId]);
    redirectWithFlash(req, res, '/admin/registration', 'success', `Participant "${name}" registered successfully!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirectWithFlash(req, res, '/admin/registration', 'error', 'A participant with this email address already exists.');
    } else {
      console.error(error);
      redirectWithFlash(req, res, '/admin/registration', 'error', 'Error registering participant.');
    }
  }
});

// 5. Delete Team/Group
app.post('/admin/groups/delete', requireAdmin, async (req, res) => {
  const { groupId } = req.body;
  try {
    await db.query('DELETE FROM `groups` WHERE id = ?', [groupId]);
    redirectWithFlash(req, res, '/admin/registration', 'success', 'Team deleted and member associations unlinked.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error deleting team.');
  }
});

// 6. Delete Participant
app.post('/admin/participants/delete', requireAdmin, async (req, res) => {
  const { participantId } = req.body;
  try {
    await db.query('DELETE FROM participants WHERE id = ?', [participantId]);
    redirectWithFlash(req, res, '/admin/registration', 'success', 'Participant registration deleted.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/registration', 'error', 'Error deleting participant.');
  }
});

// 7. Blogging Page Load
app.get('/admin/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await db.query(`
      SELECT p.*, a.username as author 
      FROM posts p 
      LEFT JOIN admins a ON p.admin_id = a.id 
      ORDER BY p.created_at DESC
    `);
    renderWithAlerts(req, res, 'admin/posts', { activePage: 'posts', posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading posts');
  }
});

// 8. Create Blog Update Post
app.post('/admin/posts', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    return redirectWithFlash(req, res, '/admin/posts', 'error', 'Headline and body content are required.');
  }

  let imgPath = null;
  if (req.file) {
    imgPath = '/uploads/' + req.file.filename;
  }

  try {
    await db.query('INSERT INTO posts (title, content, image_path, admin_id) VALUES (?, ?, ?, ?)',
      [title, content, imgPath, req.session.adminId]);
    redirectWithFlash(req, res, '/admin/posts', 'success', 'Live blog update published successfully!');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/posts', 'error', 'Error creating timeline post.');
  }
});

// 9. Delete Blog Update Post
app.post('/admin/posts/delete', requireAdmin, async (req, res) => {
  const { postId } = req.body;
  try {
    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    redirectWithFlash(req, res, '/admin/posts', 'success', 'Live update post removed from timeline feed.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/posts', 'error', 'Error deleting post.');
  }
});

// 10. Scoring Page Load
app.get('/admin/scoring', requireAdmin, async (req, res) => {
  try {
    const selectedGroupId = req.query.groupId || null;
    const groups = await db.query('SELECT * FROM `groups` ORDER BY name ASC');
    const scores = await db.query(`
      SELECT s.*, g.name as group_name 
      FROM judge_scores s 
      JOIN \`groups\` g ON s.group_id = g.id 
      ORDER BY s.created_at DESC
    `);
    renderWithAlerts(req, res, 'admin/scoring', { activePage: 'scoring', groups, scores, selectedGroupId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading judges evaluations');
  }
});

// 11. Record Judge Score
app.post('/admin/scores', requireAdmin, async (req, res) => {
  const { group_id, judge_name, score_innovation, score_design, score_execution, feedback } = req.body;

  if (!group_id || !judge_name) {
    return redirectWithFlash(req, res, '/admin/scoring', 'error', 'Judge name and target team are required.');
  }

  const innoVal = parseInt(score_innovation);
  const desVal = parseInt(score_design);
  const execVal = parseInt(score_execution);

  if (innoVal < 1 || innoVal > 10 || desVal < 1 || desVal > 10 || execVal < 1 || execVal > 10) {
    return redirectWithFlash(req, res, '/admin/scoring', 'error', 'Scoring metrics must range from 1 to 10.');
  }

  try {
    // Record scores, using ON DUPLICATE KEY UPDATE so that if a judge re-evaluates the same team, we overwrite it.
    await db.query(`
      INSERT INTO judge_scores (group_id, judge_name, score_innovation, score_design, score_execution, feedback) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        score_innovation = VALUES(score_innovation),
        score_design = VALUES(score_design),
        score_execution = VALUES(score_execution),
        feedback = VALUES(feedback)
    `, [group_id, judge_name, innoVal, desVal, execVal, feedback]);

    redirectWithFlash(req, res, '/admin/scoring', 'success', `Evaluation by "${judge_name}" recorded successfully.`);
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/scoring', 'error', 'Database error saving scores.');
  }
});

// 12. Delete Judge Score
app.post('/admin/scores/delete', requireAdmin, async (req, res) => {
  const { scoreId } = req.body;
  try {
    await db.query('DELETE FROM judge_scores WHERE id = ?', [scoreId]);
    redirectWithFlash(req, res, '/admin/scoring', 'success', 'Judges evaluation entry removed.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/scoring', 'error', 'Error deleting scores.');
  }
});

// 13. System Settings Load
app.get('/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT value_name FROM settings WHERE key_name = ?', ['voting_active']);
    const votingActive = settings[0] ? settings[0].value_name === 'true' : false;
    renderWithAlerts(req, res, 'admin/settings', { activePage: 'settings', votingActive });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading settings');
  }
});

// 14. Toggle Voting State
app.post('/admin/settings/toggle-voting', requireAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT value_name FROM settings WHERE key_name = ?', ['voting_active']);
    const currentValue = settings[0] ? settings[0].value_name : 'false';
    const newValue = currentValue === 'true' ? 'false' : 'true';

    await db.query('UPDATE settings SET value_name = ? WHERE key_name = ?', [newValue, 'voting_active']);
    
    const msg = newValue === 'true' ? 'Live public voting is now open!' : 'Live public voting has been paused.';
    redirectWithFlash(req, res, req.headers.referer || '/admin/settings', 'success', msg);
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings', 'error', 'Error toggling voting state.');
  }
});

// 15. Reset Public Votes
app.post('/admin/settings/reset-votes', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM live_votes');
    redirectWithFlash(req, res, '/admin/settings', 'success', 'All public Choice votes have been successfully reset.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings', 'error', 'Error resetting votes database.');
  }
});

// 16. Change Admin Password
app.post('/admin/settings/change-password', requireAdmin, async (req, res) => {
  const { old_password, new_password, confirm_new_password } = req.body;

  if (!old_password || !new_password || !confirm_new_password) {
    return redirectWithFlash(req, res, '/admin/settings', 'error', 'All password fields are required.');
  }

  if (new_password !== confirm_new_password) {
    return redirectWithFlash(req, res, '/admin/settings', 'error', 'New passwords do not match.');
  }

  if (new_password.length < 6) {
    return redirectWithFlash(req, res, '/admin/settings', 'error', 'New password must be at least 6 characters long.');
  }

  try {
    const admins = await db.query('SELECT * FROM admins WHERE id = ?', [req.session.adminId]);
    const admin = admins[0];

    if (admin && await bcrypt.compare(old_password, admin.password_hash)) {
      const hashedPass = await bcrypt.hash(new_password, 10);
      await db.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hashedPass, req.session.adminId]);
      redirectWithFlash(req, res, '/admin/settings', 'success', 'Admin password changed successfully!');
    } else {
      redirectWithFlash(req, res, '/admin/settings', 'error', 'Incorrect current password.');
    }
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/admin/settings', 'error', 'Database security update error.');
  }
});


// ----------------------------------------------------
// APP LAUNCH AND DATABASE CONNECTION
// ----------------------------------------------------
db.initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`AI Createathon website running locally at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database pool on startup:', err.message);
});
