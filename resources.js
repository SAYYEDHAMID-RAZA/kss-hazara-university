const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/resources
router.get('/', (req, res) => {
  const { department, category, search } = req.query;

  let resources = db.find('resources', r => {
    if (department && department !== 'All' && r.department !== department && r.department !== 'All Departments') {
      return false;
    }
    if (category && category !== 'All' && r.category !== category) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const match =
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  res.json({
    success: true,
    count: resources.length,
    data: resources
  });
});

// POST /api/resources/:id/download (Increment counter)
router.post('/:id/download', (req, res) => {
  const resource = db.findById('resources', req.params.id);
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found.' });
  }

  const downloads = (resource.downloads || 0) + 1;
  db.update('resources', req.params.id, { downloads });

  res.json({
    success: true,
    downloads,
    message: 'Download initiated'
  });
});

// POST /api/resources (Admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, department, semester, category, fileType, fileSize, downloadUrl, uploadedBy } = req.body;

  if (!title || !department) {
    return res.status(400).json({ success: false, message: 'Title and department are required.' });
  }

  const newResource = db.insert('resources', {
    title: title.trim(),
    department: department.trim(),
    semester: semester || 'All Semesters',
    category: category || 'Study Material',
    fileType: fileType || 'PDF',
    fileSize: fileSize || '5.0 MB',
    downloadUrl: downloadUrl || '#',
    downloads: 0,
    uploadedBy: uploadedBy || 'KSS Academic Wing',
    createdAt: new Date().toISOString().split('T')[0]
  });

  res.status(201).json({
    success: true,
    message: 'Resource published successfully.',
    data: newResource
  });
});

// DELETE /api/resources/:id (Admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const success = db.delete('resources', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Resource not found.' });
  }
  res.json({ success: true, message: 'Resource deleted successfully.' });
});

module.exports = router;
