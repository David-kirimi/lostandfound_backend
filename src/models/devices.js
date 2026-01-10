const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({

  brand: {
    type: String,
    required: [true, 'Please add the device brand']
  },
  model: {
    type: String,
    required: [true, 'Please add the device model']
  },
  serialNumber: {
    type: String,
    required: [true, 'Please add the unique serial number (IMEI)'],
    unique: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Please add a contact email for the owner']
  },
  location: String,
  description: String,
  imageBase64: String,
  status: {
    type: String,
    enum: ['lost', 'recovered'],
    default: 'lost'
  },
  // NEW: Links this device report to a specific User for secure ownership tracking
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // References the 'User' model
    required: true // Ensures only a logged-in user can report
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Options for virtual fields (not currently used, but good practice)
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Device', DeviceSchema);