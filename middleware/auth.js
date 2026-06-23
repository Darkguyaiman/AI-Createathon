function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  res.redirect('/login');
}

module.exports = {
  requireAdmin
};
