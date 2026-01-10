const mongoose = require('mongoose');

const RepairSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    technician: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    deviceType: {
        type: String,
        enum: ['Phone', 'Laptop'],
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    issue: {
        type: String,
        required: true
    },
    canPowerOn: {
        type: Boolean,
        default: false
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [lng, lat]
            index: '2dsphere'
        },
        address: String
    },
    estimatedPrice: {
        type: Number,
        required: true
    },
    estimatedTime: {
        type: String, // e.g., "2-4 hours"
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    commissionCut: {
        type: Number,
        default: 0.15 // 15% system fee
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Repair', RepairSchema);
