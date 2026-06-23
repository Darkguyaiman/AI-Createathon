const express = require('express');
const authController = require('../controllers/authController');
const publicController = require('../controllers/publicController');

const router = express.Router();

router.get('/', publicController.showHome);
router.get('/voting', publicController.showVoting);
router.get('/team', publicController.showTeam);
router.post('/vote', publicController.castVote);

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
