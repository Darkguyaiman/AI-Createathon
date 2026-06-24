const settingModel = require('../models/settingModel');

async function attachSessionLocals(req, res, next) {
  res.locals.session = req.session;
  try {
    res.locals.votingActive = await settingModel.isVotingActive();
  } catch (error) {
    console.error('Error attaching votingActive to views:', error);
    res.locals.votingActive = false;
  }
  next();
}

module.exports = {
  attachSessionLocals
};
