const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g., 'your-email@gmail.com'
    pass: process.env.EMAIL_PASSWORD, // Use App Password
  },
});
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error configuring transporter:', error);
  } else {
    console.log('Transporter is configured correctly:', success);
  }
});


// Login User using Email, Password and GET Token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: 'User not Found, First Register your Account !!' }); // User not found
    }

     // Log debug info
    const isMatch = await bcrypt.compare(password, user.password);
     
    //  console.log('Entered Password:', password);
    //  console.log('Stored Hashed Password:', user.password);
    //  console.log('Password Match:', isMatch);
 
     if (!isMatch) {
       return res.status(400).json({ msg: 'Invalid Password' });
     }

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 2 minutes

    // Save OTP and its expiration time to the user
    user.otp = otp;
    user.otpCreatedAt = new Date();
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP to user's email via Nodemailer
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Complete Your Login - OTP Code for Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="text-align: center; color: #4CAF50;">Login Verification</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Hello,
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            To proceed with your login, please use the following One-Time Password (OTP):
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 24px; font-weight: bold; color: #4CAF50; margin: 0;">${otp}</p>
            <p style="font-size: 14px; color: #888; margin: 5px 0;">(Valid for 2 minutes only)</p>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you did not request this OTP, please ignore this email or contact support immediately.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">Regards,<br>Team Support</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; line-height: 1.5; color: #aaa; text-align: center;">
          This is an System Generated Email Message, please do not reply to this Email id.
          </p>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Failed to send OTP', error: error.message });
      }
      console.log(`Email sent: ${info.response}`);
      return res.status(200).json({ msg: 'OTP sent to your email for login' });
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ msg: 'Server Error', error: error.message });
  }
});

// Register a New User and Send OTP
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists, Please Try to Login !!' });
    }

    // store hased password 

    const newUser = new User({ username, email, password: password, });
    await newUser.save();

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 2 minutes
    newUser.otp = otp;
    newUser.otpCreatedAt = new Date();
    newUser.otpExpiresAt = otpExpiresAt;
    await newUser.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Complete Your Registration - OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="text-align: center; color: #007BFF;">Registration Verification</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Welcome,
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            To complete your registration, please use the following One-Time Password (OTP):
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 24px; font-weight: bold; color: #007BFF; margin: 0;">${otp}</p>
            <p style="font-size: 14px; color: #888; margin: 5px 0;">(Valid for 2 minutes only)</p>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you did not request this OTP, please ignore this email or contact our support team.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">Best regards,<br>The Registration Team</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; line-height: 1.5; color: #aaa; text-align: center;">
          This is an System Generated Email Message, please do not reply to this Email id.
          </p>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Failed to send OTP', error: error.message });
      }
      console.log(`Email sent: ${info.response}`);
      res.status(201).json({ msg: 'Registration successful. OTP sent to your email.' });
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error', error: error.message });
  }
});

// Verify OTP using Email Id and OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Convert email to lowercase for consistency
    const user = await User.findOne({ email });
    
    // Check if the user was found
    if (!user) {
    // console.log('User not found for email:', email);
    return res.status(404).json({ msg: 'User not Found, First Register your Account !!' });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
    // console.log(`Invalid OTP for user: ${email}`);
    return res.status(400).json({ msg: 'Invalid OTP, Please Try Again !!' });
    }

    if (!otp) {
      return res.status(400).json({ msg: 'Please Enter your OTP !!' });
    }

    // Check if OTP has expired
    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    // Clear OTP data after verification
    user.otp = null;
    user.otpCreatedAt = null;
    user.otpExpiresAt = null;
    await user.save();

    // Generate JWT Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Send success email after OTP is verified
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'OTP Verification Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="text-align: center; color: #4CAF50;">Verification Successful</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Hello,
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Congratulations! Your One-Time Password (OTP) has been successfully verified, and you are now securely logged in.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="https://via.placeholder.com/150x150/28a745/ffffff?text=Verification" alt="Verified" style="border-radius: 50%; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you need assistance or have any questions, please feel free to contact our support team.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">Regards,<br>Team Support</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; line-height: 1.5; color: #aaa; text-align: center;">
            This is an System Generated Email Message, please do not reply to this Email id.
          </p>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ msg: 'Failed to send confirmation email', error: error.message });
      }
      console.log(`Email sent: ${info.response}`);
      return res.status(200).json({ msg: 'OTP verified successfully', token });
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ msg: 'Server Error', error: error.message });
  }
});

// Resend OTP using Email Id and OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 2 minutes

    // Save OTP and its expiration time to the user
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Resend One-Time Password (OTP) for Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="text-align: center; color: #4CAF50;">Your Verification Code</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Hello,
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Thank you for using our service. Use the following One-Time Password (OTP) to complete your verification process. This OTP is valid for the next <strong>2 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #333; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; padding: 15px 30px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you did not request this OTP, please ignore this email or contact our support team.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">Regards,<br>Team Support</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; line-height: 1.5; color: #aaa; text-align: center;">
          This is an System Generated Email Message, please do not reply to this Email id.
          </p>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        return res.status(500).json({ msg: 'Failed to resend OTP email', error: error.message });
      }
      return res.status(200).json({ msg: 'OTP resent successfully' });
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return res.status(500).json({ msg: 'Server Error', error: error.message });
  }
});


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required to Reset your Password !!' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not Found, First Register your Account !!' });
    }

    // Generate a secure OTP and its expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Save OTP to the database
    user.resetOtp = otp;
    user.otpCreatedAt = new Date();
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4; color: #333;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <div style="padding: 20px; border-bottom: 2px solid #007BFF;">
              <h1 style="color: #007BFF; margin: 0;">Password Reset Request</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px; color: #555;">Hello,</p>
              <p style="font-size: 16px; color: #555;">You requested to reset your password. Use the OTP below to proceed:</p>
              <div style="font-size: 22px; font-weight: bold; color: #007BFF; margin: 20px 0;">${otp}</div>
              <p style="font-size: 14px; color: #555;">This OTP will expire in <strong>5 minutes</strong>.</p>
              <p style="font-size: 14px; color: #555;">If you did not request this, please ignore this email or contact our support team.</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-top: 2px solid #007BFF; border-radius: 0 0 8px 8px;">
              <p style="font-size: 12px; color: #aaa;">This is an System Generated Email Message, please do not reply to this Email id.</p>
              <p style="font-size: 12px; color: #aaa;">© 2024 Rohit Gupta. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Error sending email:', error.message);
        return res.status(500).json({ msg: 'Failed to send OTP' });
      }
      res.status(200).json({ msg: 'OTP Sent to your Email ID !!' });
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ msg: 'All fields are required' });
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not Found, First Register your Account !!' });
    }

    // Validate OTP and expiry
    if (user.resetOtp !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP, Please Try Again !!' });
    }
    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ msg: 'OTP has expired, Please Try Again !!' });
    }

     // Check if the new password is the same as the old password
     const isSamePassword = await user.isSamePassword(newPassword);
     if (isSamePassword) {
       return res.status(400).json({ msg: 'New password cannot be the same as the old password. Please choose a different password.' });
     }
 

    // Update the user's password and clear OTP fields
    user.password = newPassword;
    user.resetOtp = null;
    user.otpCreatedAt = null;
    user.otpExpiresAt = null;
    await user.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f4f4f4; color: #333;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <div style="padding: 20px; border-bottom: 2px solid #28a745;">
              <h1 style="color: #28a745; margin: 0;">Password Changed Successfully</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px; color: #555;">Hello,</p>
              <p style="font-size: 16px; color: #555;">We wanted to let you know that your password has been successfully changed.</p>
              <p style="font-size: 16px; color: #555;">Your new password is:</p>
              <p style="font-size: 20px; font-weight: bold; color: #333; background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                ${newPassword}
              </p>
              <p style="font-size: 16px; color: #555;">If you made this change, you can safely disregard this email.</p>
              <p style="font-size: 16px; color: #555;">However, if this was not you, please contact our support team immediately to secure your account.</p>
              <a href="mailto:pubggame1520@gmail.com" style="display: inline-block; margin: 20px 0; padding: 10px 20px; color: #ffffff; background-color: #dc3545; text-decoration: none; border-radius: 5px; font-size: 14px;">
                Contact Support
              </a>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-top: 2px solid #28a745; border-radius: 0 0 8px 8px;">
              <p style="font-size: 12px; color: #aaa;">This is an System Generated Email Message, please do not reply to this Email id.</p>
              <p style="font-size: 12px; color: #aaa;">© 2024 Rohit Gupta. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };
    
    

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending confirmation email:', err.message);
        return res.status(500).json({ msg: 'Password changed but failed to send confirmation email' });
      }

      res.status(200).json({ msg: 'Password has been Reset Successfully and a confirmation email has been sent.' });
    });
  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({ msg: 'Internal server error' });
  }
});





module.exports = router;