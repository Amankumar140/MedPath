const express = require('express');
const userController = require('./user.controller');
const { verifyFirebaseToken } = require('../auth/auth.middleware');
const validate = require('../../middleware/validation.middleware');
const { updateProfileSchema } = require('../auth/auth.validation');

const router = express.Router();

// Apply verifyFirebaseToken middleware to protect all user endpoints
router.use(verifyFirebaseToken);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate({ body: updateProfileSchema }), userController.updateProfile);
router.delete('/profile', userController.deactivateProfile);

module.exports = router;
