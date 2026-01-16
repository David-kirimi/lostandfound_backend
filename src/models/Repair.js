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
        enum: ['Finding Technician', 'Matched', 'On Transit', 'Getting Repaired', 'Ready for Delivery', 'Completed', 'Cancelled'],
        default: 'Finding Technician'
    },
    shippingMethod: {
        type: String,
        enum: ['Carry-in', 'Shipping'],
        default: 'Carry-in'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Verification Pending', 'Paid'],
        default: 'Pending'
    },
    paymentTxMessage: String, // User's pasted M-Pesa message
    disbursementStatus: {
        type: String,
        enum: ['Held', 'Disbursed'],
        default: 'Held'
    },
    technicianRating: {
        type: Number,
        min: 1,
        max: 5
    },
    customerReview: String,
    transportationCost: {
        type: Number,
        default: 0
    },
    scheduledTime: Date,
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
