const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, verifyResetOtp, resetPassword } = require('../controllers/authController');

// Routes for /api/auth
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyotp', verifyResetOtp);
router.put('/resetpassword', resetPassword);

module.exports = router;