const express = require('express');
const router = express.Router();
const {
    createRepair,
    getMyRepairs,
    getAvailableJobs,
    acceptJob
} = require('../controllers/repairController');

const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router
    .route('/')
    .post(createRepair);

router
    .route('/my')
    .get(getMyRepairs);

router
    .route('/available')
    .get(authorize('technician', 'admin'), getAvailableJobs);

router
    .route('/:id/accept')
    .put(authorize('technician', 'admin'), acceptJob);

module.exports = router;
