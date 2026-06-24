const bcrypt = require('bcryptjs');
const adminModel = require('../models/adminModel');
const { redirectWithFlash, renderWithAlerts } = require('../utils/flash');

function showLogin(req, res) {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }

  renderWithAlerts(req, res, 'login', { activePage: 'login' });
}

async function login(req, res) {
  const { username, password } = req.body;

  try {
    const admin = await adminModel.findByLogin(username);

    if (admin && await bcrypt.compare(password, admin.password_hash)) {
      req.session.isAdmin = true;
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      req.session.role = admin.role || 'normal';

      return req.session.save(() => {
        res.redirect('/admin/dashboard');
      });
    }

    redirectWithFlash(req, res, '/login', 'error', 'Invalid username/email or password credentials.');
  } catch (error) {
    console.error(error);
    redirectWithFlash(req, res, '/login', 'error', 'Internal server authentication error.');
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
}

module.exports = {
  showLogin,
  login,
  logout
};
