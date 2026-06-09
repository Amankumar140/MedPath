const express = require('express');
const authController = require('./auth.controller');
const validate = require('../../middleware/validation.middleware');
const { loginSchema } = require('./auth.validation');
const { verifyFirebaseToken } = require('./auth.middleware');

const router = express.Router();

router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyFirebaseToken, authController.me);

module.exports = router;
