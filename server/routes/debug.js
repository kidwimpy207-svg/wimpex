const express = require('express');
const router = express.Router();

// Simple debug endpoint to inspect incoming Authorization header
router.get('/auth-header', (req, res) => {
  const auth = req.headers['authorization'] || null;
  res.json({ authorization: auth });
});

module.exports = router;
