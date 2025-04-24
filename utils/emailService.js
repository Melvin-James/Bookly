const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log('Sending email to:', email, 'with OTP:', otp);

    const mailOptions = {
      from: `"Bookly Support" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: 'Your Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007D8B;">Email Verification</h2>
          <p>Your OTP for account verification is:</p>
          <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 2px;">
            <strong>${otp}</strong>
          </div>
          <p>This OTP is valid for 5 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">© ${new Date().getFullYear()} Bookly. All rights reserved.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
