const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/:repairId')
    .get(getMessages)
    .post(sendMessage);

module.exports = router;
