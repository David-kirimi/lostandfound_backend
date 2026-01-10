const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter
    // We use Gmail Gmail App Password settings as default, but can be configured via .env
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // 2. Define email options
    const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html // Optional HTML version
    };

    // 3. Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
