const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values to duplicate (for existing users)
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'technician'],
    default: 'user'
  },
  technicianDetails: {
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: false },
    tier: {
      type: String,
      enum: ['Free', 'Premium'],
      default: 'Free'
    },
    totalRepairs: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    experience: { type: Number, default: 0 },
    specialties: [String],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        index: '2dsphere'
      }
    }
  },
  technicianVerification: {
    status: {
      type: String,
      enum: ['Not Applied', 'Pending', 'Approved', 'Rejected'],
      default: 'Not Applied'
    },
    idType: {
      type: String,
      enum: ['Passport', 'National ID', 'Drivers License']
    },
    idNumber: String, // Encrypted in production
    legalName: String,
    dateOfBirth: Date,
    idDocument: String, // Base64 PDF
    profilePhoto: String, // Base64
    shopName: String,
    shopAddress: String,
    shopCoordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [lng, lat]
    },
    registrationDocument: String, // Base64
    taxDocument: String, // Base64
    additionalDocuments: [String], // Array of Base64
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  }
});

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    // Skip hashing if password hasn't changed
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
