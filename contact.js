const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// POST /api/contact (Public inquiry submission)
router.post('/', (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !message || (!email && !phone)) {
    return res.status(400).json({
      success: false,
      message: 'Name, message, and at least one contact method (email or phone) are required.'
    });
  }

  const newInquiry = db.insert('contactMessages', {
    name: name.trim(),
    email: email ? email.trim() : '',
    phone: phone ? phone.trim() : '',
    subject: subject ? subject.trim() : 'General Inquiry / Hostel Help',
    message: message.trim(),
    status: 'unread',
    date: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Your inquiry has been received by KSS Hazara University Cabinet. Our volunteer will contact you shortly.',
    data: newInquiry
  });
});

// GET /api/contact (Admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const messages = db.find('contactMessages');
  messages.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, count: messages.length, data: messages });
});

// PUT /api/contact/:id/read (Admin)
router.put('/:id/read', authenticate, requireAdmin, (req, res) => {
  const updated = db.update('contactMessages', req.params.id, { status: 'read' });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }
  res.json({ success: true, message: 'Message marked as read.', data: updated });
});

module.exports = router;
