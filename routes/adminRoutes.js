const express = require('express');
const adminController = require('../controllers/adminController');
const upload = require('../config/upload');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { redirectWithFlash } = require('../utils/flash');
const multer = require('multer');

const router = express.Router();

router.use(requireAdmin);

// Gracefully handle multer errors and redirect with friendly flash message
function handleUpload(fieldName) {
  const uploadMiddleware = upload.single(fieldName);
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        let errMsg = 'Failed to upload file.';
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            errMsg = 'File is too large. Maximum size allowed is 5MB.';
          } else {
            errMsg = `Upload error: ${err.message}`;
          }
        } else {
          errMsg = err.message;
        }
        const referer = req.headers.referer || '/admin/dashboard';
        return redirectWithFlash(req, res, referer, 'error', errMsg);
      }
      next();
    });
  };
}

router.get('/dashboard', adminController.showDashboard);
router.get('/registration', adminController.showRegistration);
router.get('/groups/new', adminController.showNewGroup);
router.get('/groups/:id/edit', adminController.showEditGroup);
router.post('/groups', handleUpload('logo'), adminController.createGroup);
router.post('/groups/:id/edit', handleUpload('logo'), adminController.updateGroup);
router.post('/groups/delete', adminController.deleteGroup);
router.get('/participants/new', adminController.showNewParticipant);
router.get('/participants/:id/edit', adminController.showEditParticipant);
router.post('/participants', handleUpload('avatar'), adminController.createParticipant);
router.post('/participants/:id/edit', handleUpload('avatar'), adminController.updateParticipant);
router.post('/participants/delete', adminController.deleteParticipant);

router.get('/posts', adminController.showPosts);
router.get('/posts/new', adminController.showNewPost);
router.get('/posts/:id/edit', adminController.showEditPost);
router.post('/posts', handleUpload('image'), adminController.createPost);
router.post('/posts/:id/edit', handleUpload('image'), adminController.updatePost);

router.post('/posts/delete', adminController.deletePost);

router.get('/scoring', adminController.showScoring);
router.get('/scores/new', adminController.showNewScore);
router.get('/scores/:id/edit', adminController.showEditScore);
router.post('/scores', adminController.saveScore);
router.post('/scores/:id/edit', adminController.updateScore);
router.post('/scores/delete', adminController.deleteScore);

router.get('/settings', adminController.showSettings);
router.get('/settings/password', adminController.showPasswordForm);
router.post('/settings/toggle-voting', adminController.toggleVoting);
router.post('/settings/reset-votes', requireSuperAdmin, adminController.resetVotes);
router.post('/settings/change-password', adminController.changePassword);

// Administrator Management (Super Admins only)
router.get('/settings/admins', requireSuperAdmin, adminController.showAdmins);
router.get('/settings/admins/new', requireSuperAdmin, adminController.showNewAdminForm);
router.get('/settings/admins/:id/edit', requireSuperAdmin, adminController.showEditAdminForm);
router.post('/settings/admins', requireSuperAdmin, adminController.createAdmin);
router.post('/settings/admins/:id/edit', requireSuperAdmin, adminController.updateAdmin);
router.post('/settings/admins/delete', requireSuperAdmin, adminController.deleteAdmin);

module.exports = router;
