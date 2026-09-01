require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');
const clientsRouter = require('./src/routes/clients');
const dashboardRouter = require('./src/routes/dashboard');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found.', code: 'NOT_FOUND' } });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Client Tracker backend running on http://localhost:${PORT}`);
});
