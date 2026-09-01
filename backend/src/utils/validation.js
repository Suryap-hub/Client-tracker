const STATUSES = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Active', 'Closed', 'Lost'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +country code and digits, 7-15 digits total
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateClientInput(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const required = (field, label) => {
    if (!partial && (body[field] === undefined || String(body[field]).trim() === '')) {
      errors.push(`${label} is required.`);
    }
  };

  required('clientName', 'Client name');
  if (body.clientName !== undefined) data.clientName = String(body.clientName).trim();

  if (body.company !== undefined) data.company = String(body.company).trim();

  if (body.email !== undefined && body.email !== '') {
    if (!EMAIL_RE.test(body.email)) errors.push('Email is not a valid email address.');
    data.email = String(body.email).trim();
  }

  if (body.phone !== undefined && body.phone !== '') {
    if (!PHONE_RE.test(body.phone)) errors.push('Phone number format is invalid.');
    data.phone = String(body.phone).trim();
  }

  if (body.address !== undefined) data.address = String(body.address).trim();

  if (body.status !== undefined && body.status !== '') {
    if (!STATUSES.includes(body.status)) errors.push(`Status must be one of: ${STATUSES.join(', ')}.`);
    data.status = body.status;
  } else if (!partial) {
    data.status = 'Lead';
  }

  if (body.priority !== undefined && body.priority !== '') {
    if (!PRIORITIES.includes(body.priority)) errors.push(`Priority must be one of: ${PRIORITIES.join(', ')}.`);
    data.priority = body.priority;
  } else if (!partial) {
    data.priority = 'Medium';
  }

  if (body.assignedTo !== undefined) data.assignedTo = String(body.assignedTo).trim();

  if (body.followUpDate !== undefined && body.followUpDate !== '') {
    if (!DATE_RE.test(body.followUpDate)) errors.push('Follow-up date must be in YYYY-MM-DD format.');
    data.followUpDate = body.followUpDate;
  }

  if (body.targetCloseDate !== undefined && body.targetCloseDate !== '') {
    if (!DATE_RE.test(body.targetCloseDate)) errors.push('Target close date must be in YYYY-MM-DD format.');
    data.targetCloseDate = body.targetCloseDate;
  }

  if (body.lastContacted !== undefined && body.lastContacted !== '') {
    if (!DATE_RE.test(body.lastContacted)) errors.push('Last contacted date must be in YYYY-MM-DD format.');
    data.lastContacted = body.lastContacted;
  }

  if (body.description !== undefined) data.description = String(body.description).trim();

  return { errors, data };
}

module.exports = { validateClientInput, STATUSES, PRIORITIES };
