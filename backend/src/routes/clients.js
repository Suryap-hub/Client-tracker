const express = require('express');
const clientService = require('../services/clientService');
const { validateClientInput } = require('../utils/validation');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /api/clients - employees see only their own clients; admins see everyone's (optionally ?assignedTo=)
router.get('/', async (req, res, next) => {
  try {
    const { search, status, priority, assignedTo, followUpDate } = req.query;
    const clients = await clientService.getClients(req.user, { search, status, priority, assignedTo, followUpDate });
    res.json({ clients, total: clients.length });
  } catch (err) { next(err); }
});

// POST /api/clients - new client is auto-assigned to the logged-in employee (admins may set assignedTo)
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateClientInput(req.body, { partial: false });
    if (errors.length) return res.status(400).json({ error: { message: errors.join(' '), code: 'VALIDATION_ERROR' } });
    if (req.user.role === 'admin' && req.body.assignedTo) data.assignedTo = req.body.assignedTo;
    const client = await clientService.addClient(req.user, data);
    res.status(201).json({ client });
  } catch (err) { next(err); }
});

// PUT /api/clients/:clientId - employees can only edit their own clients (enforced in the service)
router.put('/:clientId', async (req, res, next) => {
  try {
    const { errors, data } = validateClientInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: { message: errors.join(' '), code: 'VALIDATION_ERROR' } });
    if (req.user.role === 'admin' && req.body.assignedTo !== undefined) data.assignedTo = req.body.assignedTo;
    const client = await clientService.updateClient(req.user, req.params.clientId, data);
    res.json({ client });
  } catch (err) { next(err); }
});

// DELETE /api/clients/:clientId
router.delete('/:clientId', async (req, res, next) => {
  try {
    const softDelete = req.query.soft === 'true';
    const result = await clientService.deleteClient(req.user, req.params.clientId, { softDelete });
    res.json({ deleted: true, softDelete, client: result });
  } catch (err) { next(err); }
});

module.exports = router;
