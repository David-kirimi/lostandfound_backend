const express = require('express');
const router = express.Router();
const { createAlert } = require('../controllers/alertController');

router.post('/', createAlert);

module.exports = router;
