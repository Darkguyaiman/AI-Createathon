function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  res.redirect('/login');
}

function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.isAdmin && req.session.role === 'super') {
    return next();
  }
  const { redirectWithFlash } = require('../utils/flash');
  redirectWithFlash(req, res, '/admin/dashboard', 'error', 'Access denied. Super Admin privileges required.');
}

module.exports = {
  requireAdmin,
  requireSuperAdmin
};
