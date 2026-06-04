const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');

router.post('/', protect, (req, res) => {
  return res.json({ 
    message: 'Image uploaded successfully (mock)',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80' 
  });
});

module.exports = router;
