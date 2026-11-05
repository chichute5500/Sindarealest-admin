-- Private buyer verification reference for manual warranties. Never exposed publicly.
ALTER TABLE manual_warranties
 ADD COLUMN customer_contact_reference TEXT NOT NULL DEFAULT ''
 CHECK(length(customer_contact_reference) <= 300);
