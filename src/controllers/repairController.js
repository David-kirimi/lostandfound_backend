const Repair = require('../models/Repair');
const User = require('../models/User');

// @desc    Create a new repair request
// @route   POST /api/repairs
// @access  Private
exports.createRepair = async (req, res) => {
    try {
        // In a real Uber-like app, we'd have a pricing service here.
        // For now, we'll use a placeholder or trust the frontend calculation
        // with a sanity check.

        const repairData = { ...req.body };
        if (repairData.address && !repairData.location?.address) {
            repairData.location = repairData.location || { type: 'Point', coordinates: [] };
            repairData.location.address = repairData.address;
        }

        const repair = await Repair.create({
            ...repairData,
            user: req.user.id,
            status: 'Finding Technician'
        });

        res.status(201).json({
            success: true,
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all repairs for the logged-in user
// @route   GET /api/repairs/my
// @access  Private
exports.getMyRepairs = async (req, res) => {
    try {
        const repairs = await Repair.find({ user: req.user.id })
            .populate('technician', 'name email technicianDetails')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            data: repairs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all jobs assigned to the logged-in technician
// @route   GET /api/repairs/my-jobs  
// @access  Private (Technician)
exports.getMyJobs = async (req, res) => {
    try {
        const repairs = await Repair.find({ technician: req.user.id })
            .populate('user', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            data: repairs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get all available jobs for technicians
// @route   GET /api/repairs/available
// @access  Private (Technician)
exports.getAvailableJobs = async (req, res) => {
    try {
        const repairs = await Repair.find({
            status: 'Finding Technician',
            paymentStatus: 'Paid'
        })
            .populate('user', 'name email')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            data: repairs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Accept a repair job
// @route   PUT /api/repairs/:id/accept
// @access  Private (Technician)
exports.acceptJob = async (req, res) => {
    try {
        let repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        if (repair.status !== 'Finding Technician') {
            return res.status(400).json({ success: false, error: 'This repair has already been claimed' });
        }

        // Verify technician status
        if (req.user.technicianVerification?.status !== 'Approved') {
            return res.status(403).json({
                success: false,
                error: 'You must be a verified technician to accept jobs.'
            });
        }

        // Calculate transportation cost if shipping
        let transportationCost = 0;
        if (repair.shippingMethod === 'Shipping') {
            transportationCost = 500; // Placeholder
        }

        repair = await Repair.findByIdAndUpdate(req.params.id, {
            technician: req.user.id,
            status: 'Matched',
            transportationCost,
            scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // Default 2 hours from now
        }, { new: true });

        res.status(200).json({
            success: true,
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Rate a technician after job completion
// @route   PUT /api/repairs/:id/rate
// @access  Private
exports.rateTechnician = async (req, res) => {
    try {
        const { rating, review } = req.body;
        let repair = await Repair.findById(req.params.id);

        if (!repair || repair.user.toString() !== req.user.id) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        if (repair.status !== 'Completed') {
            return res.status(400).json({ success: false, error: 'Can only rate completed repairs' });
        }

        repair.technicianRating = rating;
        repair.customerReview = review;
        await repair.save();

        // Update technician average rating
        const technician = await User.findById(repair.technician);
        if (technician) {
            const totalRatings = technician.technicianDetails.rating * technician.technicianDetails.numReviews;
            technician.technicianDetails.numReviews += 1;
            technician.technicianDetails.rating = (totalRatings + rating) / technician.technicianDetails.numReviews;
            await technician.save();
        }

        res.status(200).json({
            success: true,
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Pay for a repair (Mock Payment)
// @route   PUT /api/repairs/:id/pay
// @access  Private
exports.payForRepair = async (req, res) => {
    try {
        let repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        if (repair.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        if (repair.paymentStatus === 'Paid') {
            return res.status(400).json({ success: false, error: 'Repair already paid for' });
        }

        const { transactionMessage } = req.body;

        if (transactionMessage) {
            // Manual Verification Flow
            repair.paymentStatus = 'Verification Pending';
            repair.paymentTxMessage = transactionMessage;
        } else {
            // Instant Mock Payment (keep for testing or if no msg provided)
            repair.paymentStatus = 'Paid';
        }

        repair.disbursementStatus = 'Held'; // Held until job completion
        await repair.save();

        res.status(200).json({
            success: true,
            data: repair,
            message: 'Payment successful'
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// Helper: Match technicians (priority-based)
const matchTechnicians = async (repair) => {
    const technicians = await User.find({
        role: 'technician',
        'technicianDetails.isAvailable': true
    }).sort({ 'technicianDetails.tier': -1, 'technicianDetails.rating': -1 });

    return technicians;
};
