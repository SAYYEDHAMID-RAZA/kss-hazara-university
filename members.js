const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/members (Supports search & filters)
router.get('/', (req, res) => {
  const { search, department, tehsil, session, status } = req.query;

  let members = db.find('members', m => {
    // By default, public only sees approved members unless admin asks for specific status or all
    if (status) {
      if (status !== 'all' && m.status !== status) return false;
    } else {
      // Default to approved for public directory
      if (m.status !== 'approved') return false;
    }

    if (department && department !== 'All' && m.department !== department) {
      return false;
    }

    if (tehsil && tehsil !== 'All' && m.tehsil !== tehsil) {
      return false;
    }

    if (session && session !== 'All' && m.session !== session) {
      return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const match =
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.rollNo && m.rollNo.toLowerCase().includes(q)) ||
        (m.village && m.village.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        (m.roleInSociety && m.roleInSociety.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Sort: Cabinet members first, then by name
  members.sort((a, b) => {
    const isCabinetA = a.roleInSociety && a.roleInSociety !== 'Member' ? 1 : 0;
    const isCabinetB = b.roleInSociety && b.roleInSociety !== 'Member' ? 1 : 0;
    if (isCabinetB !== isCabinetA) return isCabinetB - isCabinetA;
    return a.name.localeCompare(b.name);
  });

  res.json({
    success: true,
    count: members.length,
    data: members
  });
});

// GET /api/members/cabinet (Leadership Showcase)
router.get('/cabinet', (req, res) => {
  const cabinet = db.find('members', m => 
    m.status === 'approved' && 
    m.roleInSociety && 
    m.roleInSociety !== 'Member'
  );
  res.json({ success: true, data: cabinet });
});

// GET /api/members/:id
router.get('/:id', (req, res) => {
  const member = db.findById('members', req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.json({ success: true, data: member });
});

// POST /api/members/register (Public registration)
router.post('/register', (req, res) => {
  const {
    name,
    fatherName,
    rollNo,
    department,
    program,
    semester,
    session,
    tehsil,
    village,
    phone,
    email,
    cnic,
    bloodGroup,
    isBloodDonor,
    currentResidence,
    notes
  } = req.body;

  // Validation
  if (!name || !rollNo || !department || !tehsil || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields (Name, Roll No, Department, Tehsil, Phone).'
    });
  }

  // Check duplicate rollNo or cnic
  const existing = db.findOne('members', m => 
    (m.rollNo && m.rollNo.toLowerCase() === rollNo.toLowerCase()) ||
    (cnic && m.cnic && m.cnic === cnic)
  );

  if (existing) {
    return res.status(409).json({
      success: false,
      message: `A membership application with Roll No "${rollNo}" or CNIC already exists with status "${existing.status}".`
    });
  }

  const newMember = db.insert('members', {
    name: name.trim(),
    fatherName: fatherName ? fatherName.trim() : '',
    rollNo: rollNo.trim().toUpperCase(),
    department: department.trim(),
    program: program ? program.trim() : department,
    semester: semester || '1st',
    session: session || '2026-2030',
    tehsil: tehsil.trim(),
    village: village ? village.trim() : '',
    phone: phone.trim(),
    email: email ? email.trim().toLowerCase() : '',
    cnic: cnic ? cnic.trim() : '',
    bloodGroup: bloodGroup || 'Unknown',
    isBloodDonor: Boolean(isBloodDonor),
    currentResidence: currentResidence || 'Hostel / Dhodial',
    roleInSociety: 'Member',
    status: 'approved', // Auto-approve or pending; set to approved for demo immediacy or pending
    notes: notes || '',
    photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=047857,0f766e,065f46`
  });

  res.status(201).json({
    success: true,
    message: 'Membership registration submitted successfully! Welcome to Kurram Student Society, Hazara University.',
    data: newMember
  });
});

// PUT /api/members/:id/status (Admin approval/rejection)
router.put('/:id/status', authenticate, requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['approved', 'pending', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be approved, pending, or rejected.' });
  }

  const updated = db.update('members', req.params.id, { status });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }

  res.json({
    success: true,
    message: `Member status updated to "${status}".`,
    data: updated
  });
});

// PUT /api/members/:id (Admin update member details)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const updated = db.update('members', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.json({ success: true, message: 'Member updated successfully.', data: updated });
});

// DELETE /api/members/:id (Admin delete member)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const success = db.delete('members', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Member not found.' });
  }
  res.json({ success: true, message: 'Member record deleted.' });
});

module.exports = router;
