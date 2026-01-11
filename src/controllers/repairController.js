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

        const repair = await Repair.create({
            ...req.body,
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

// @desc    Accept repair job
// @route   PUT /api/v1/repairs/:id/accept
// @access  Private (Technician)
exports.acceptJob = async (req, res) => {
    try {
        let repair = await Repair.findById(req.params.id);

        if (!repair) {
            return res.status(404).json({ success: false, error: 'Repair not found' });
        }

        // Check if already accepted
        if (repair.technician) {
            return res.status(400).json({ success: false, error: 'Job already accepted' });
        }

        // Calculate a placeholder transportation cost if 'Shipping'
        const transportationCost = repair.shippingMethod === 'Shipping' ? 500 : 0;

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

// @desc    Rate technician
// @route   PUT /api/v1/repairs/:id/rate
// @access  Private (User)
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
        const User = require('../models/User');
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

// @desc    Find available technicians (Internal matching logic)
exports.matchTechnicians = async (repairId) => {
    const Repair = require('../models/Repair');
    const User = require('../models/User');

    const repair = await Repair.findById(repairId);
    if (!repair) return;

    // Filter available technicians, prioritize Premium tier and Rating
    const technicians = await User.find({
        role: 'technician',
        'technicianDetails.isAvailable': true
    }).sort({
        'technicianDetails.tier': -1, // Premium first (if alphabetized Z-A or similar logic, but we'll use manual sort if needed)
        'technicianDetails.rating': -1
    });

    // In a production app, we would use GeoJSON for location matching:
    // const technicians = await User.find({
    //   role: 'technician',
    //   'technicianDetails.location': {
    //      $near: { $geometry: { type: "Point", coordinates: repair.location.coordinates }, $maxDistance: 10000 }
    //   }
    // });

    return technicians;
};
