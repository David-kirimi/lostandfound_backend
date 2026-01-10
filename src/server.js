/**
 * Server Entry Point 
 * * This file is the primary entry point for the backend. 
 * It performs three main tasks:
 * 1. Loads environment variables from the .env file in the root.
 * 2. Imports the configured Express app logic.
 * 3. Starts the network listener on the designated port.
 */

const app = require('./app');
const dotenv = require('dotenv');

// 1. LOAD CONFIGURATION
// By default, dotenv.config() looks for a file named '.env' in the 
// current working directory (project root).
dotenv.config();

// 2. DEFINE PORT
// We prioritize the PORT defined in .env, falling back to 5001.
const PORT = process.env.PORT || 5002;

// 3. START SERVER
const server = app.listen(PORT, () => {
    console.log('-------------------------------------------------------');
    console.log(`🚀 IMEIGuard API is live!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📂 Root: ${process.cwd()}`);
    console.log(`✅ Ready to receive requests...`);
    console.log('-------------------------------------------------------');
});

/**
 * ERROR HANDLING: Port Conflicts
 * If the port is already in use (EADDRINUSE), we catch the error 
 * to provide a user-friendly instruction rather than a raw stack trace.
 */
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('\n' + '='.repeat(50));
        console.error(`CRITICAL ERROR: PORT ${PORT} IS ALREADY IN USE.`);
        console.error('Possible fixes:');
        console.error(`1. Kill the process: netstat -ano | findstr :${PORT}`);
        console.error(`2. Change PORT=${PORT + 1} in your .env file.`);
        console.error('='.repeat(50) + '\n');
        process.exit(1);
    } else {
        console.error('Server encountered an error:', err);
    }
});

/**
 * ERROR HANDLING: Unhandled Rejections
 * Catch any unhandled promise rejections (like database timeout)
 * and shut down the server gracefully.
 */
process.on('unhandledRejection', (err) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});