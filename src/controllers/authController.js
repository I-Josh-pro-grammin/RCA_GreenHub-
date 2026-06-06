const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateAvatar = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretgreenhubkey123', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide name, email, password, and role' });
  }

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const avatar = generateAvatar(name);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      avatar,
      gipPoints: role === 'Student' ? 0 : 0, // default GIP
      profileCompleteness: 85
    });

    const token = generateToken(user._id || user.id);

    // Don't return password
    const userResponse = {
      _id: user._id || user.id,
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      gipPoints: user.gipPoints,
      profileCompleteness: user.profileCompleteness
    };

    return res.status(201).json({ token, user: userResponse });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id || user.id);

    const userResponse = {
      _id: user._id || user.id,
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      gipPoints: user.gipPoints,
      profileCompleteness: user.profileCompleteness
    };

    return res.json({ token, user: userResponse });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      _id: user._id || user.id,
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      gipPoints: user.gipPoints,
      profileCompleteness: user.profileCompleteness
    };

    return res.json(userResponse);
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ message: 'Server error fetching user details' });
  }
};

const updateProfile = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    if (name) {
      updates.name = name;
      updates.avatar = generateAvatar(name);
    }
    if (email) {
      updates.email = email;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }
    updates.profileCompleteness = 100;

    const updatedUser = await User.findByIdAndUpdate(userId, updates);

    const userResponse = {
      _id: updatedUser._id || updatedUser.id,
      id: updatedUser._id || updatedUser.id,
      name: name || user.name,
      email: email || user.email,
      role: user.role,
      avatar: name ? generateAvatar(name) : user.avatar,
      gipPoints: user.gipPoints,
      profileCompleteness: 100
    };

    return res.json(userResponse);
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
