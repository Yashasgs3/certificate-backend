const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, courseName } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      fullName,
      email,
      password: hashedPassword,
      courseName,
      registrationDate: new Date()
    });

    await user.save();
    console.log(`✅ New user registered: ${email}`);

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);
    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        courseName: user.courseName
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, courseName, phone, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { fullName, courseName, phone, address },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (Admin)
router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ registrationDate: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token
router.post('/verify-token', verifyToken, (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
