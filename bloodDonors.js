const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/donors (Search active blood donors)
router.get('/', (req, res) => {
  const { bloodGroup, tehsil, search } = req.query;

  let donors = db.find('members', m => {
    // Must be marked as blood donor
    if (!m.isBloodDonor) return false;
    // Must be approved member
    if (m.status !== 'approved') return false;

    if (bloodGroup && bloodGroup !== 'All') {
      const cleanGroup = bloodGroup.replace(/\s+/g, '').toUpperCase();
      const memberGroup = (m.bloodGroup || '').replace(/\s+/g, '').toUpperCase();
      if (cleanGroup !== memberGroup) return false;
    }

    if (tehsil && tehsil !== 'All' && m.tehsil !== tehsil) {
      return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const match =
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q)) ||
        (m.currentResidence && m.currentResidence.toLowerCase().includes(q)) ||
        (m.village && m.village.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Safe projection: return donor details with phone for emergency contact
  const donorList = donors.map(d => ({
    id: d.id,
    name: d.name,
    department: d.department,
    semester: d.semester,
    bloodGroup: d.bloodGroup,
    phone: d.phone,
    tehsil: d.tehsil,
    village: d.village,
    currentResidence: d.currentResidence,
    lastDonated: d.lastDonated || 'Available',
    photoUrl: d.photoUrl
  }));

  res.json({
    success: true,
    count: donorList.length,
    data: donorList
  });
});

// GET /api/donors/summary (Stats breakdown by blood group)
router.get('/summary', (req, res) => {
  const donors = db.find('members', m => m.isBloodDonor && m.status === 'approved');
  const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const summary = {};

  groups.forEach(g => {
    summary[g] = 0;
  });

  donors.forEach(d => {
    const bg = (d.bloodGroup || '').toUpperCase().trim();
    if (summary[bg] !== undefined) {
      summary[bg]++;
    } else {
      summary['Other'] = (summary['Other'] || 0) + 1;
    }
  });

  res.json({
    success: true,
    totalDonors: donors.length,
    groups: summary
  });
});

module.exports = router;
