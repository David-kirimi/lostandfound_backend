const express = require('express');
const router = express.Router();

const Device = require('../models/devices');
const { protect } = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET /api/admin/devices
router.get('/devices', protect, admin, async (req, res) => {
  try {
    const devices = await Device.find()
      .populate('user', 'email')
      .sort('-createdAt');

    res.json({
      success: true,
      data: devices
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
});

module.exports = router;
