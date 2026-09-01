const express = require('express');
const userService = require('../services/userService');
const { signToken } = require('../services/authTokens');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required.', code: 'VALIDATION_ERROR' } });
    }
    const user = await userService.findByEmail(email);
    if (!user || !(await userService.verifyPassword(user, password))) {
      return res.status(401).json({ error: { message: 'Incorrect email or password.', code: 'INVALID_CREDENTIALS' } });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, monthlyTarget: user.monthly_target } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
