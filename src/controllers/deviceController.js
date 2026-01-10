const Device = require('../models/devices');

// @desc    Report a new lost device
// @route   POST /api/devices
// @access  Private
exports.reportDevice = async (req, res) => {
  try {
    // Combine form data with information from the authenticated user
    // This fulfills the "contactEmail" requirement in your Schema automatically
    const deviceData = {
      ...req.body,
      user: req.user.id,           // Links the report to the User ID
      contactEmail: req.user.email // Pulls email from JWT/Session to satisfy validation
    };

    const device = await Device.create(deviceData);

    return res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error("Report Device Error:", error);

    // Handle duplicate Serial Number/IMEI
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'A device with this IMEI/Serial Number is already registered.'
      });
    }

    // Handle Mongoose Validation Errors (like missing fields)
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to report device'
    });
  }
};

// @desc    Get all devices reported by the logged-in user
// @route   GET /api/devices/my
// @access  Private
exports.getMyDevices = async (req, res) => {
  try {
    const devices = await Device.find({ user: req.user.id });

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error fetching your devices.'
    });
  }
};

// @desc    Update device status (e.g., found/recovered)
// @route   PUT /api/devices/:imei
// @access  Private
exports.updateDevice = async (req, res) => {
  try {
    // We now look for the unique MongoDB _id from the URL params
    const deviceId = req.params.id;
    const { status } = req.body;

    // Find by ID instead of serialNumber
    let device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device record not found.' });
    }

    // Security check: Verify ownership
    if (device.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this device.'
      });
    }

    // Update and save
    device.status = status;
    await device.save();

    return res.status(200).json({ success: true, data: device });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ success: false, error: 'Server error during update.' });
  }
};

// @desc    Check device status (Public Search)
// @route   GET /api/devices/:imei
// @access  Public
exports.checkDeviceStatus = async (req, res) => {
  try {
    const imei = req.params.imei;
    const device = await Device.findOne({ serialNumber: imei });

    if (!device) {
      return res.status(200).json({
        success: true,
        data: { status: 'CLEAN', message: 'No record found. Device is safe.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: device._id,
        brand: device.brand,
        model: device.model,
        serialNumber: device.serialNumber,
        contactEmail: device.contactEmail,
        status: device.status.toUpperCase(),
        description: device.description,
        imageBase64: device.imageBase64,
        createdAt: device.createdAt,
        message: `Device with IMEI ${imei} is reported as ${device.status}.`
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Status check failed.' });
  }
};

// @desc    Get all reported devices (Public List)
// @route   GET /api/devices
// @access  Public
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error fetching devices.' });
  }
};
// @desc    Get account stats for the logged-in user
// @route   GET /api/devices/stats
// @access  Private
exports.getDeviceStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Run counts in parallel for better performance
    const [totalReported, recovered] = await Promise.all([
      Device.countDocuments({ user: userId }),
      Device.countDocuments({ user: userId, status: 'recovered' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalReported,
        recovered,
        pending: totalReported - recovered
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, error: 'Not found' });

    // Security check
    if (device.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await device.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const sendEmail = require('../utils/sendEmail');

// @desc    Send a secure message to the device owner
// @route   POST /api/devices/:id/contact
// @access  Public
exports.contactOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { senderName, senderEmail, message } = req.body;

    if (!senderName || !senderEmail || !message) {
      return res.status(400).json({ success: false, error: 'Please provide all fields' });
    }

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const ownerEmail = device.contactEmail;

    // --- MOCK EMAIL SENDING LOGIC (RESTORED) ---
    console.log('===========================================================');
    console.log('📧 SECURE MESSAGE DISPATCHED (LOG ONLY)');
    console.log(`TO:       ${ownerEmail}`);
    console.log(`FROM:     ${senderName} (${senderEmail})`);
    console.log(`DEVICE:   ${device.brand} ${device.model} (IMEI: ${device.serialNumber})`);
    console.log(`MESSAGE:  "${message}"`);
    console.log('===========================================================');

    return res.status(200).json({
      success: true,
      message: 'Message sent (Logged to server console).'
    });

  } catch (error) {
    console.error("Contact Owner Error:", error);
    return res.status(500).json({ success: false, error: 'Failed to process request.' });
  }
};