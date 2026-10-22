const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/stats
router.get('/', (req, res) => {
  const members = db.find('members');
  const approvedMembers = members.filter(m => m.status === 'approved');
  const pendingMembers = members.filter(m => m.status === 'pending');
  const donors = approvedMembers.filter(m => m.isBloodDonor);

  const events = db.find('events');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  const notices = db.find('notices');
  const resources = db.find('resources');

  const totalDownloads = resources.reduce((sum, r) => sum + (r.downloads || 0), 0);

  // Distribution by Tehsil
  const tehsilStats = {
    upperKurram: approvedMembers.filter(m => (m.tehsil || '').toLowerCase().includes('upper')).length,
    lowerKurram: approvedMembers.filter(m => (m.tehsil || '').toLowerCase().includes('lower')).length,
    centralKurram: approvedMembers.filter(m => (m.tehsil || '').toLowerCase().includes('central')).length
  };

  // Distribution by Major Departments
  const departmentStats = {};
  approvedMembers.forEach(m => {
    const dept = m.department || 'Other';
    departmentStats[dept] = (departmentStats[dept] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      totalMembers: approvedMembers.length,
      pendingApprovals: pendingMembers.length,
      activeBloodDonors: donors.length,
      upcomingEvents: upcomingEvents.length,
      totalNotices: notices.length,
      totalResources: resources.length,
      totalDownloads,
      tehsilStats,
      departmentStats
    }
  });
});

module.exports = router;
