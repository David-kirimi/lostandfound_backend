const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 * This function uses the MONGO_URI from your config.env file.
 */
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;

        // Validation to ensure the URI is loaded from environment variables
        if (!uri || uri === 'undefined') {
            console.error('---------------------------------------------------------');
            console.error('CRITICAL ERROR: MONGO_URI is not defined!');
            console.error('Current working directory:', process.cwd());
            console.error('Please verify that src/config/config.env exists and');
            console.error('contains MONGO_URI=mongodb+srv://...');
            console.error('---------------------------------------------------------');
            process.exit(1);
        }

        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ MONGODB CONNECTION ERROR');
        
        // Specific handling for IP Whitelist error
        if (err.message.includes('whitelisted')) {
            console.error('⚠️  YOUR IP ADDRESS IS NOT WHITELISTED ON MONGODB ATLAS.');
            console.error('------------------------------------------------------------');
            console.error('1. Log in to MongoDB Atlas');
            console.error('2. Go to "Network Access" in the sidebar');
            console.error('3. Click "Add IP Address"');
            console.error('4. Select "Add Current IP Address" and Confirm');
            console.error('------------------------------------------------------------');
        } else {
            console.error(`Error details: ${err.message}`);
        }
        
        console.error('='.repeat(60) + '\n');
        process.exit(1);
    }
};

module.exports = connectDB;