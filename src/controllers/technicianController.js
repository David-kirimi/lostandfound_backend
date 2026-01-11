const User = require('../models/User');

// @desc    Apply as technician
// @route   POST /api/v1/technician/apply
// @access  Private
exports.applyAsTechnician = async (req, res) => {
    try {
        const {
            idType,
            idNumber,
            legalName,
            dateOfBirth,
            profilePhoto,
            shopName,
            shopAddress,
            shopLat,
            shopLng,
            registrationDocument,
            taxDocument,
            additionalDocuments
        } = req.body;

        // Validate required fields
        if (!idType || !idNumber || !legalName || !dateOfBirth || !profilePhoto || !shopName || !shopAddress) {
            return res.status(400).json({
                success: false,
                error: 'Please provide all required fields'
            });
        }

        const user = await User.findById(req.user.id);

        if (user.technicianVerification.status === 'Pending') {
            return res.status(400).json({
                success: false,
                error: 'Your application is already pending review'
            });
        }

        if (user.technicianVerification.status === 'Approved') {
            return res.status(400).json({
                success: false,
                error: 'You are already a verified technician'
            });
        }

        // Update verification details
        user.technicianVerification = {
            status: 'Pending',
            idType,
            idNumber,
            legalName,
            dateOfBirth: new Date(dateOfBirth),
            profilePhoto,
            shopName,
            shopAddress,
            shopCoordinates: shopLat && shopLng ? {
                type: 'Point',
                coordinates: [parseFloat(shopLng), parseFloat(shopLat)]
            } : undefined,
            registrationDocument,
            taxDocument,
            additionalDocuments: additionalDocuments || [],
            submittedAt: new Date(),
            rejectionReason: undefined // Clear previous rejection
        };

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully. You will be notified once reviewed.',
            data: user.technicianVerification
        });
    } catch (err) {
        console.error('Application error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get my technician application
// @route   GET /api/v1/technician/application
// @access  Private
exports.getMyApplication = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('technicianVerification');

        res.status(200).json({
            success: true,
            data: user.technicianVerification
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
