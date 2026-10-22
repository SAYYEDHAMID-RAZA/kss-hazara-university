const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/notices
router.get('/', (req, res) => {
  const { priority, category } = req.query;

  let notices = db.find('notices', n => {
    if (priority && priority !== 'All' && n.priority !== priority) return false;
    if (category && category !== 'All' && n.category !== category) return false;
    return true;
  });

  // Sort by date descending
  notices.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    count: notices.length,
    data: notices
  });
});

// GET /api/notices/:id
router.get('/:id', (req, res) => {
  const notice = db.findById('notices', req.params.id);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Notice not found.' });
  }
  res.json({ success: true, data: notice });
});

// POST /api/notices (Admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, category, priority, author, summary, content } = req.body;

  if (!title || !summary) {
    return res.status(400).json({ success: false, message: 'Title and summary are required.' });
  }

  const newNotice = db.insert('notices', {
    title: title.trim(),
    category: category || 'General Announcement',
    priority: priority || 'medium',
    date: new Date().toISOString().split('T')[0],
    author: author || 'KSS Secretariat',
    summary: summary.trim(),
    content: content ? content.trim() : summary.trim()
  });

  res.status(201).json({
    success: true,
    message: 'Notice posted successfully.',
    data: newNotice
  });
});

// DELETE /api/notices/:id (Admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const success = db.delete('notices', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Notice not found.' });
  }
  res.json({ success: true, message: 'Notice deleted successfully.' });
});

module.exports = router;
