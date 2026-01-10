const express = require('express');
const router = express.Router();
const {
  reportDevice,
  checkDeviceStatus,
  getDevices,
  updateDevice,
  getMyDevices,
  getDeviceStats,
  contactOwner, // <--- Added
  deleteDevice // <--- Consolidated import
} = require('../controllers/deviceController');
const { protect } = require('../middleware/auth');

// 1. Static Routes (Must come first)
router.get('/stats', protect, getDeviceStats);
router.get('/my', protect, getMyDevices);

// 2. Collection Routes
router.route('/')
  .get(getDevices)
  .post(protect, reportDevice);

// 3. Dynamic Routes (Must come last)
router.route('/:imei')
  .get(checkDeviceStatus)
  .put(protect, updateDevice);


// Add the delete route
// Add the delete route
router.delete('/:id', protect, deleteDevice);

// Secure Contact Route
router.post('/:id/contact', contactOwner);

module.exports = router;
