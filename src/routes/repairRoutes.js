const express = require('express');
const router = express.Router();
const {
    createRepair,
    getMyRepairs,
    getAvailableJobs,
    acceptJob,
    rateTechnician,
    getMyJobs // Added getMyJobs
} = require('../controllers/repairController');
const { estimatePrice } = require('../controllers/priceController');

const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router
    .route('/')
    .post(createRepair);

router
    .route('/my')
    .get(getMyRepairs);

// Added my-jobs route
router
    .route('/my-jobs')
    .get(getMyJobs);

router
    .route('/estimate-price')
    .get(estimatePrice);

router
    .route('/available')
    .get(authorize('technician', 'admin'), getAvailableJobs);

router
    .route('/:id/accept')
    .put(authorize('technician', 'admin'), acceptJob);

module.exports = router;
