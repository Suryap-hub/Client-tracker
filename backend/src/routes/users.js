const express = require('express');
const userService = require('../services/userService');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/users - admin only, list all employee accounts
router.get('/', async (req, res, next) => {
  try {
    res.json({ users: await userService.listUsers() });
  } catch (err) { next(err); }
});

// POST /api/users - admin only, create an employee login with their own target
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, monthlyTarget } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: { message: 'Name, email, and password are required.', code: 'VALIDATION_ERROR' } });
    }
    const user = await userService.createUser({ name, email, password, monthlyTarget: monthlyTarget || 10 });
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

// PUT /api/users/:id/target - admin only, change one employee's monthly target
router.put('/:id/target', async (req, res, next) => {
  try {
    const { monthlyTarget } = req.body;
    if (!Number.isInteger(monthlyTarget) || monthlyTarget < 0) {
      return res.status(400).json({ error: { message: 'monthlyTarget must be a non-negative whole number.', code: 'VALIDATION_ERROR' } });
    }
    const user = await userService.updateTarget(Number(req.params.id), monthlyTarget);
    res.json({ user });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id - admin only, removes the login only; their clients become unassigned, never deleted
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await userService.deleteUser(Number(req.params.id), req.user.id);
    res.json({ deleted: true, user: deleted });
  } catch (err) { next(err); }
});

module.exports = router;
