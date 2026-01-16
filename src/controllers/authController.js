const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // We'll use this for login later

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // 2. Create and save the new user
    // The password will be automatically hashed by the User model's pre-save hook
    user = await User.create({
      name,
      email,
      password
    });

    // 3. Send token for auto-login
    sendTokenResponse(user, 201, res);

  } catch (err) {
    // Handle Mongoose validation errors (e.g., missing required fields)
    res.status(500).json({ success: false, error: err.message });
  }
};
// Function to generate the JWT token
const sendTokenResponse = (user, statusCode, res) => {
  // Create token (This token contains the user's ID)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  // Options for the cookie (optional, but good practice for security)
  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true // Makes the cookie inaccessible to JavaScript
  };

  // Send the response with the token in a cookie (and body for testing)
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};

// @desc    Log in user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email/username and password' });
    }

    // 2. Check for user (must select the password field we blocked earlier)
    // Allow login with email OR username
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 3. Check if password matches
    // compare() decrypts the stored hash and compares it to the plain text password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 4. Send token (successful login)
    sendTokenResponse(user, 200, res);

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, error: 'Server Error during login' });
  }
};

const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiration (10 minutes)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create email message
    const message = `
      <h1>Password Reset Request</h1>
      <p>Your password reset code is:</p>
      <h2 style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #3b82f6;">${otp}</h2>
      <p>This code expires in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP - IMEIGuard',
        html: message
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, error: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verifyotp
// @access  Public
exports.verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, data: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired Token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};