const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check admin accounts
  if (
    (cleanEmail === 'admin@kss-hum.edu.pk' || cleanEmail === 'admin') &&
    (password === 'kss2026admin' || password === 'admin123')
  ) {
    const token = jwt.sign(
      { id: 1, email: 'admin@kss-hum.edu.pk', name: 'KSS Hazara Admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: {
        id: 1,
        name: 'Super Admin',
        email: 'admin@kss-hum.edu.pk',
        role: 'admin',
        designation: 'Cabinet Moderator'
      }
    });
  }

  // Check approved members with CNIC or Roll No as password
  const member = db.findOne('members', m => 
    (m.email && m.email.toLowerCase() === cleanEmail) || 
    (m.rollNo && m.rollNo.toLowerCase() === cleanEmail)
  );

  if (member) {
    // If password matches rollNo or cnic or 'member123'
    const valid = (
      password === 'member123' ||
      password === member.rollNo ||
      (member.cnic && password === member.cnic.replace(/-/g, ''))
    );

    if (valid) {
      const token = jwt.sign(
        { id: member.id, email: member.email, name: member.name, role: 'member' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        message: 'Member authentication successful',
        token,
        user: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: 'member',
          department: member.department,
          rollNo: member.rollNo,
          roleInSociety: member.roleInSociety
        }
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email/roll number or password. Default demo admin: admin@kss-hum.edu.pk / kss2026admin'
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
