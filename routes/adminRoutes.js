const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../Admin');
const auth = require('../middleware/auth');

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// @route   POST api/admin/register
// @desc    Register admin
// @access  Public (Should be protected in production)
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  try {
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({ error: 'Admin already registered with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new Admin({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newAdmin.save();

    // Generate JWT token
    const payload = {
      user: {
        id: newAdmin._id,
        role: 'admin'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err);
          return res.status(500).json({ error: 'Server error during token generation' });
        }
        res.status(201).json({
          success: true,
          message: 'Admin registered successfully',
          token,
          user: {
            id: newAdmin._id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: 'admin'
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin Registration Error:', err.message);
    res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
});


// @route   POST api/admin/login
// @desc    Authenticate admin & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Find admin by email (case-insensitive)
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: admin._id,
        role: 'admin'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error('JWT Error:', err);
          return res.status(500).json({ error: 'Server error during token generation' });
        }
        res.status(200).json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: 'admin'
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin Login Error:', err.message);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

module.exports = router;