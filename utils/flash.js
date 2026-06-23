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

module.exports = {
  renderWithAlerts,
  redirectWithFlash
};
