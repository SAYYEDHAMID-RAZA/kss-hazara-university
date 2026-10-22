const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/events
router.get('/', (req, res) => {
  const { status, category } = req.query;

  let events = db.find('events', e => {
    if (status && status !== 'all' && e.status !== status) return false;
    if (category && category !== 'All' && e.category !== category) return false;
    return true;
  });

  // Sort: upcoming events first (by date ascending), then completed (date descending)
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    count: events.length,
    data: events
  });
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const event = db.findById('events', req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }
  res.json({ success: true, data: event });
});

// POST /api/events (Admin)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, category, date, time, venue, description, chiefGuest, bannerImage } = req.body;

  if (!title || !date || !venue) {
    return res.status(400).json({ success: false, message: 'Title, date, and venue are required.' });
  }

  const newEvent = db.insert('events', {
    title: title.trim(),
    category: category || 'General',
    date,
    time: time || '10:00 AM',
    venue: venue.trim(),
    description: description || '',
    chiefGuest: chiefGuest || '',
    status: new Date(date) >= new Date() ? 'upcoming' : 'completed',
    bannerImage: bannerImage || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    attendeesCount: 0
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully.',
    data: newEvent
  });
});

// POST /api/events/:id/rsvp
router.post('/:id/rsvp', (req, res) => {
  const event = db.findById('events', req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  const updatedCount = (event.attendeesCount || 0) + 1;
  db.update('events', req.params.id, { attendeesCount: updatedCount });

  res.json({
    success: true,
    message: `Thank you for RSVPing for "${event.title}"! We look forward to seeing you there.`,
    attendeesCount: updatedCount
  });
});

// PUT /api/events/:id (Admin)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const updated = db.update('events', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }
  res.json({ success: true, message: 'Event updated successfully.', data: updated });
});

// DELETE /api/events/:id (Admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const success = db.delete('events', req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }
  res.json({ success: true, message: 'Event deleted successfully.' });
});

module.exports = router;
