const Alert = require('../models/Alert');
const Device = require('../models/devices');

// @desc    Create a new location alert
// @route   POST /api/alerts
// @access  Public
exports.createAlert = async (req, res) => {
    try {
        const { imei, location } = req.body;

        if (!imei || !location || !location.latitude || !location.longitude) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Optional: Verify if device exists and is actually lost
        const device = await Device.findOne({ serialNumber: imei });

        // We record the alert regardless, but you could add logic to only save if device is LOST

        const alert = await Alert.create({
            imei,
            location,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        console.log(`[ALERT] Location received for IMEI ${imei}`);

        res.status(201).json({
            success: true,
            data: alert
        });

    } catch (err) {
        console.error('Create Alert Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
