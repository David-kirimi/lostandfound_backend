
const express = require('express');
const router = express.Router();

const Device = require('../models/devices');
const { protect, authorize } = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User'); // Import User model
const {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getVerifiedTechnicians,
  updateTechnicianDetails
} = require('../controllers/adminTechnicianController');
const {
  getAllRepairs,
  verifyPayment,
  cancelPayment,
  getEscrowStats
} = require('../controllers/adminController');


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

// Temporary route to promote a user to admin
// GET /api/admin/promote?email=user@example.com&secret=admin-setup-secret-123
router.get('/promote', async (req, res) => {
  const { email, secret } = req.query;

  if (secret !== 'admin-setup-secret-123') {
    return res.status(401).json({ success: false, message: 'Invalid secret' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: `${email} has been promoted to admin`,
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Technician verification routes
router.get('/technicians/pending', protect, admin, getPendingApplications);
router.get('/technicians/verified', protect, admin, getVerifiedTechnicians);
router.put('/technicians/:id/approve', protect, admin, approveApplication);
router.put('/technicians/:id/reject', protect, admin, rejectApplication);
router.put('/technicians/:id', protect, admin, updateTechnicianDetails);

// Repair and Payment Management
router.get('/repairs', protect, admin, getAllRepairs);
router.put('/repairs/:id/verify-payment', protect, admin, verifyPayment);
router.put('/repairs/:id/cancel-payment', protect, admin, cancelPayment);
router.get('/escrow-stats', protect, admin, getEscrowStats);

module.exports = router;
