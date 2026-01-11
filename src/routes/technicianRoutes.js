const express = require('express');
const router = express.Router();
const { applyAsTechnician, getMyApplication } = require('../controllers/technicianController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/apply', applyAsTechnician);
router.get('/application', getMyApplication);

module.exports = router;
