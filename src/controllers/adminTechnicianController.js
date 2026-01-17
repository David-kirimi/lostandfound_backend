const User = require('../models/User');

// @desc    Get pending technician applications
// @route   GET /api/v1/admin/technicians/pending
// @access  Private/Admin
exports.getPendingApplications = async (req, res) => {
    try {
        const pendingTechnicians = await User.find({
            'technicianVerification.status': 'Pending'
        }).select('name email technicianVerification createdAt');

        res.status(200).json({
            success: true,
            count: pendingTechnicians.length,
            data: pendingTechnicians
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Approve technician application
// @route   PUT /api/v1/admin/technicians/:id/approve
// @access  Private/Admin
exports.approveApplication = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.technicianVerification.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                error: 'Application is not pending'
            });
        }

        // Upgrade to technician role
        user.role = 'technician';
        user.technicianVerification.status = 'Approved';
        user.technicianVerification.reviewedAt = new Date();
        user.technicianVerification.reviewedBy = req.user.id;

        // Initialize technician details if not set
        if (!user.technicianDetails.location.coordinates || user.technicianDetails.location.coordinates.length === 0) {
            if (user.technicianVerification.shopCoordinates) {
                user.technicianDetails.location = user.technicianVerification.shopCoordinates;
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Technician approved successfully',
            data: user
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Reject technician application
// @route   PUT /api/v1/admin/technicians/:id/reject
// @access  Private/Admin
exports.rejectApplication = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a rejection reason'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.technicianVerification.status = 'Rejected';
        user.technicianVerification.reviewedAt = new Date();
        user.technicianVerification.reviewedBy = req.user.id;
        user.technicianVerification.rejectionReason = reason;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Application rejected',
            data: user.technicianVerification
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all verified technicians
// @route   GET /api/v1/admin/technicians/verified
// @access  Private/Admin
exports.getVerifiedTechnicians = async (req, res) => {
    try {
        const technicians = await User.find({
            role: 'technician',
            'technicianVerification.status': 'Approved'
        }).select('name email technicianDetails technicianVerification.status technicianVerification.legalName technicianVerification.shopName technicianVerification.shopAddress technicianVerification.submittedAt');

        res.status(200).json({
            success: true,
            count: technicians.length,
            data: technicians
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Update technician details
// @route   PUT /api/v1/admin/technicians/:id
// @access  Private/Admin
exports.updateTechnicianDetails = async (req, res) => {
    try {
        const { rating, tier, isAvailable } = req.body;
        const user = await User.findById(req.params.id);

        if (!user || user.role !== 'technician') {
            return res.status(404).json({ success: false, error: 'Technician not found' });
        }

        if (rating !== undefined) user.technicianDetails.rating = rating;
        if (tier !== undefined) user.technicianDetails.tier = tier;
        if (isAvailable !== undefined) user.technicianDetails.isAvailable = isAvailable;

        await user.save();

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
