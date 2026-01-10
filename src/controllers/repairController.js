const Repair = require('../models/Repair');
const User = require('../models/User');

// @desc    Create a new repair request
// @route   POST /api/repairs
// @access  Private
exports.createRepair = async (req, res) => {
    try {
        req.body.user = req.user.id;

        // In a real Uber-like app, we'd have a pricing service here.
        // For now, we'll use a placeholder or trust the frontend calculation
        // with a sanity check.

        const repair = await Repair.create(req.body);

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
        const repairs = await Repair.find({ user: req.user.id }).sort('-createdAt');

        res.status(200).json({
            success: true,
            data: repairs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Get available jobs for technicians based on location
// @route   GET /api/repairs/available
// @access  Private (Technician only)
exports.getAvailableJobs = async (req, res) => {
    try {
        // Basic logic: find pending jobs near the technician
        // (Actual geo-spatial query would go here)
        const jobs = await Repair.find({
            status: 'Pending',
            technician: { $exists: false }
        }).sort('-createdAt');

        res.status(200).json({
            success: true,
            data: jobs
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Accept a repair job
// @route   PUT /api/repairs/:id/accept
// @access  Private (Technician only)
exports.acceptJob = async (req, res) => {
    try {
        let repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        if (repair.technician) {
            return res.status(400).json({ success: false, error: 'Job already taken' });
        }

        repair = await Repair.findByIdAndUpdate(req.params.id, {
            technician: req.user.id,
            status: 'Accepted'
        }, { new: true });

        res.status(200).json({
            success: true,
            data: repair
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
