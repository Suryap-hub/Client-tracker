-- Run this once against your Postgres database to set it up.

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  monthly_target INTEGER NOT NULL DEFAULT 10,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  client_id          TEXT PRIMARY KEY,
  client_name        TEXT NOT NULL,
  company            TEXT DEFAULT '',
  email              TEXT DEFAULT '',
  phone              TEXT DEFAULT '',
  address            TEXT DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Lead'
                       CHECK (status IN ('Lead','Contacted','Qualified','Proposal','Negotiation','Active','Closed','Lost')),
  priority           TEXT NOT NULL DEFAULT 'Medium'
                       CHECK (priority IN ('Low','Medium','High','Critical')),
  assigned_to        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  follow_up_date     DATE,   -- next time you need to contact this client
  target_close_date  DATE,   -- when you expect/aim to close this deal
  last_contacted     DATE,
  description        TEXT DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Sequence used to generate CL-001 style IDs
CREATE SEQUENCE IF NOT EXISTS client_id_seq;
