const express = require('express');
const router = express.Router();
const { register,login } = require('../controllers/authController');

// The base path for these routes will be /api/auth
// Ensure both register and login are imported

// The base path for these routes is /api/auth

router.post('/register', register); 
router.post('/login', login); // <--- THIS LINE IS CRUCIAL

module.exports = router;
router.post('/register', register); 

module.exports = router;