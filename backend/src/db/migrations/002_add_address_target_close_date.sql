-- Run this if you already had the tracker set up before address/target close date existed.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_close_date DATE;
ALTER TABLE clients RENAME COLUMN notes TO description;
