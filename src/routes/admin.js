const express = require('express');
const router = express.Router();

const Device = require('../models/devices');
const { protect } = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getVerifiedTechnicians,
  updateTechnicianDetails
} = require('../controllers/adminTechnicianController');

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

// Technician verification routes
router.get('/technicians/pending', protect, admin, getPendingApplications);
router.get('/technicians/verified', protect, admin, getVerifiedTechnicians);
router.put('/technicians/:id/approve', protect, admin, approveApplication);
router.put('/technicians/:id/reject', protect, admin, rejectApplication);
router.put('/technicians/:id', protect, admin, updateTechnicianDetails);

module.exports = router;
