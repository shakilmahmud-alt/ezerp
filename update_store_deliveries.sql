-- Execute this in your Supabase SQL Editor to add the missing challan_no column for Store Deliveries

ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS challan_no VARCHAR(100);

-- Make sure to also add the 'Delivered' and 'Received' status possibilities if there's any CHECK constraint.
-- If status is just a VARCHAR without CHECK constraint, it's fine.
