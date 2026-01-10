const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const email = 'muriiradavie@gmail.com';
        const password = '@SLIEM2040';

        let user = await User.findOne({ email });

        if (user) {
            console.log(`User ${email} found. Updating to Admin...`);
            user.role = 'admin';
            user.password = password; // Pre-save hook will hash this
            await user.save();
            console.log('User updated successfully.');
        } else {
            console.log(`User ${email} not found. Creating new Admin content...`);
            user = await User.create({
                name: 'Muriira Davie',
                email,
                password,
                role: 'admin'
            });
            console.log('Admin user created successfully.');
        }

        console.log('Credentials:');
        console.log(`Email: ${email}`);
        console.log('Password: [HIDDEN]');

        process.exit();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
