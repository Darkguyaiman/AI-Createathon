const express = require('express');
const adminController = require('../controllers/adminController');
const upload = require('../config/upload');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/dashboard', adminController.showDashboard);
router.get('/registration', adminController.showRegistration);
router.get('/groups/new', adminController.showNewGroup);
router.post('/groups', upload.single('logo'), adminController.createGroup);
router.post('/groups/delete', adminController.deleteGroup);
router.get('/participants/new', adminController.showNewParticipant);
router.post('/participants', upload.single('avatar'), adminController.createParticipant);
router.post('/participants/delete', adminController.deleteParticipant);

router.get('/posts', adminController.showPosts);
router.get('/posts/new', adminController.showNewPost);
router.post('/posts', upload.single('image'), adminController.createPost);
router.post('/posts/delete', adminController.deletePost);

router.get('/scoring', adminController.showScoring);
router.get('/scores/new', adminController.showNewScore);
router.post('/scores', adminController.saveScore);
router.post('/scores/delete', adminController.deleteScore);

router.get('/settings', adminController.showSettings);
router.get('/settings/password', adminController.showPasswordForm);
router.post('/settings/toggle-voting', adminController.toggleVoting);
router.post('/settings/reset-votes', adminController.resetVotes);
router.post('/settings/change-password', adminController.changePassword);

module.exports = router;
