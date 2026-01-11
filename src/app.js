require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Route imports
const deviceRoutes = require('./routes/deviceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin');
const alertRoutes = require('./routes/alertRoutes');
const repairRoutes = require('./routes/repairRoutes');
const chatRoutes = require('./routes/chatRoutes');
const technicianRoutes = require('./routes/technicianRoutes');

// Create express app FIRST
const app = express();

/**
 * Express App Logic
 * ---------------------------------------------------------
 * This file defines middleware and routes.
 * It does NOT call app.listen()
 * ---------------------------------------------------------
 */

// --- DATABASE CONNECTION ---
connectDB();

// --- GLOBAL MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    }
    // Allow all Vercel deployment URLs (production and previews)
    else if (origin.includes('vercel.app')) {
      callback(null, true);
    }
    // Allow sliemtechshop.netlify.app for backward compatibility
    else if (origin.includes('sliemtechshop.netlify.app')) {
      callback(null, true);
    }
    else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to IMEIGuard API",
    status: "Healthy",
    port: process.env.PORT || 5001
  });
});

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/repairs', repairRoutes);

// --- 404 HANDLER ---
app.use((req, res) => {
  res.status(404).json({ error: "API Route Not Found" });
});

// Export app for server.js
module.exports = app;
