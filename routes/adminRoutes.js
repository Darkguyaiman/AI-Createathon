const express = require('express');
const adminController = require('../controllers/adminController');
const upload = require('../config/upload');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/dashboard', adminController.showDashboard);
router.get('/registration', adminController.showRegistration);
router.post('/groups', upload.single('logo'), adminController.createGroup);
router.post('/groups/delete', adminController.deleteGroup);
router.post('/participants', upload.single('avatar'), adminController.createParticipant);
router.post('/participants/delete', adminController.deleteParticipant);

router.get('/posts', adminController.showPosts);
router.post('/posts', upload.single('image'), adminController.createPost);
router.post('/posts/delete', adminController.deletePost);

router.get('/scoring', adminController.showScoring);
router.post('/scores', adminController.saveScore);
router.post('/scores/delete', adminController.deleteScore);

router.get('/settings', adminController.showSettings);
router.post('/settings/toggle-voting', adminController.toggleVoting);
router.post('/settings/reset-votes', adminController.resetVotes);
router.post('/settings/change-password', adminController.changePassword);

module.exports = router;
