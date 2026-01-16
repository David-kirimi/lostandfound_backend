const Repair = require('../models/Repair');
const User = require('../models/User');

// @desc    Get all repairs
// @route   GET /api/admin/repairs
// @access  Private/Admin
exports.getAllRepairs = async (req, res) => {
    try {
        const repairs = await Repair.find()
            .populate('user', 'name email')
            .populate('technician', 'name email technicianDetails')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: repairs.length,
            data: repairs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Verify payment for a repair
// @route   PUT /api/admin/repairs/:id/verify-payment
// @access  Private/Admin
exports.verifyPayment = async (req, res) => {
    try {
        const repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        repair.paymentStatus = 'Paid';
        await repair.save();

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cancel payment/Reset to Pending
// @route   PUT /api/admin/repairs/:id/cancel-payment
// @access  Private/Admin
exports.cancelPayment = async (req, res) => {
    try {
        const repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        repair.paymentStatus = 'Pending';
        repair.paymentTxMessage = ''; // Clear message if cancelled
        await repair.save();

        res.status(200).json({
            success: true,
            message: 'Payment cancelled/reset to pending',
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get escrow account statistics
// @route   GET /api/admin/escrow-stats
// @access  Private/Admin
exports.getEscrowStats = async (req, res) => {
    try {
        const paidRepairs = await Repair.find({ paymentStatus: 'Paid', disbursementStatus: 'Held' });
        const pendingVerificationRepairs = await Repair.find({ paymentStatus: 'Verification Pending' });

        const totalEscrow = paidRepairs.reduce((sum, r) => sum + (r.estimatedPrice || 0), 0);
        const pendingAmount = pendingVerificationRepairs.reduce((sum, r) => sum + (r.estimatedPrice || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                totalEscrow,
                pendingAmount,
                totalHeldCount: paidRepairs.length,
                pendingVerificationCount: pendingVerificationRepairs.length
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
