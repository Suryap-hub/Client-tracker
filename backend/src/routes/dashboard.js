const express = require('express');
const clientService = require('../services/clientService');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard - the logged-in employee's own target vs closed clients
router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      // Admins get the aggregated team view here by default
      const team = await clientService.getTeamStats();
      const totals = team.reduce((acc, m) => ({
        target: acc.target + m.target,
        closed: acc.closed + m.closed,
        active: acc.active + m.active,
        followUpsDue: acc.followUpsDue + m.followUpsDue,
      }), { target: 0, closed: 0, active: 0, followUpsDue: 0 });
      return res.json({ scope: 'admin', totals, team });
    }
    const stats = await clientService.getPersonalStats(req.user.id);
    res.json({ scope: 'employee', stats });
  } catch (err) { next(err); }
});

// GET /api/dashboard/team - explicit admin-only team leaderboard (same data, dedicated path)
router.get('/team', requireAdmin, async (req, res, next) => {
  try {
    const team = await clientService.getTeamStats();
    res.json({ team });
  } catch (err) { next(err); }
});

module.exports = router;
