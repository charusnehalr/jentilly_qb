-- Free database manager option: run this in Supabase after creating auth users
-- or adapt it for any Postgres-compatible free database.
-- The app also ships with the same generated dataset in lib/demo-data.ts.

insert into profiles (id, login_id, password, email, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin', 'admin@theplaceonjentilly.com', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'landlord', 'landlord', 'landlord@theplaceonjentilly.com', 'Maya Patel', 'landlord'),
  ('00000000-0000-0000-0000-000000000004', 'MN', 'MN', 'maintenance@theplaceonjentilly.com', 'Maintenance Team', 'maintenance');

insert into profiles (id, login_id, password, email, full_name, role)
select
  ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'tenant' || lpad(n::text, 3, '0'),
  'pass' || lpad(n::text, 3, '0'),
  'tenant' || lpad(n::text, 3, '0') || '@theplaceonjentilly.com',
  'Tenant ' || lpad(n::text, 3, '0'),
  'tenant'::user_role
from generate_series(1, 100) as n;

insert into properties (id, landlord_id, name, address) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'The Place on Jentilly', 'Jentilly Lane, Tempe, AZ');

insert into units (id, property_id, unit_label, housing_type, bedrooms, bathrooms)
select
  ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '20000000-0000-0000-0000-000000000001',
  'Private Suite ' || lpad(n::text, 3, '0'),
  'private',
  case when n % 5 = 0 then 2 else 1 end,
  case when n % 6 = 0 then 2 else 1 end
from generate_series(1, 70) as n;

insert into units (id, property_id, unit_label, housing_type, bedrooms, bathrooms)
select
  ('40000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '20000000-0000-0000-0000-000000000001',
  'Shared House ' || chr(65 + ((n - 1) / 3)::int) || ' - Room ' || (((n - 1) % 3) + 1),
  'shared',
  1,
  1
from generate_series(1, 30) as n;

insert into tenants (id, profile_id, full_name, email, phone)
select
  ('50000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'Tenant ' || lpad(n::text, 3, '0'),
  'tenant' || lpad(n::text, 3, '0') || '@theplaceonjentilly.com',
  '480-555-' || lpad((1000 + n)::text, 4, '0')
from generate_series(1, 100) as n;

insert into leases (id, tenant_id, unit_id, starts_on, ends_on, monthly_rent, status)
select
  ('60000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  ('50000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  case
    when n <= 70 then ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
    else ('40000000-0000-0000-0000-' || lpad((n - 70)::text, 12, '0'))::uuid
  end,
  ('2025-' || lpad((((n - 1) % 12) + 1)::text, 2, '0') || '-01')::date,
  case
    when n % 19 = 0 then '2026-07-31'::date
    else ('2026-' || lpad((((n - 1) % 12) + 1)::text, 2, '0') || '-28')::date
  end,
  case when n <= 70 then 1150 + (n % 8) * 90 else 725 + (n % 4) * 75 end,
  (case when n % 19 = 0 then 'ending_soon' else 'active' end)::lease_status
from generate_series(1, 100) as n;

insert into rent_payments (lease_id, due_on, amount_due, amount_paid, status)
select
  ('60000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '2026-06-01',
  case when n <= 70 then 1150 + (n % 8) * 90 else 725 + (n % 4) * 75 end,
  case
    when n % 10 = 0 then 0
    when n % 10 in (1, 2) then round((case when n <= 70 then 1150 + (n % 8) * 90 else 725 + (n % 4) * 75 end) / 2)
    else case when n <= 70 then 1150 + (n % 8) * 90 else 725 + (n % 4) * 75 end
  end,
  (case
    when n % 10 = 0 then 'overdue'
    when n % 10 in (1, 2) then 'partial'
    else 'paid'
  end)::rent_status
from generate_series(1, 100) as n;

insert into maintenance_requests (tenant_id, unit_id, title, description, availability_window, priority, status, review_status, assigned_to, mn_confirmed_at)
select
  ('50000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  case
    when n <= 70 then ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
    else ('40000000-0000-0000-0000-' || lpad((n - 70)::text, 12, '0'))::uuid
  end,
  case when n % 4 = 0 then 'AC not cooling' when n % 4 = 1 then 'Leaking faucet' when n % 4 = 2 then 'Washer issue' else 'Light fixture' end,
  case when n % 4 = 0 then 'Room is not cooling properly.' when n % 4 = 1 then 'Bathroom faucet is leaking.' when n % 4 = 2 then 'Shared laundry washer stops mid-cycle.' else 'Bedroom light flickers.' end,
  case when n % 2 = 0 then 'Weekdays after 5 PM' else 'Saturday 10 AM - 2 PM' end,
  (case when n % 4 = 0 then 'urgent' when n % 4 = 3 then 'low' else 'normal' end)::maintenance_priority,
  (case when n % 5 = 0 then 'completed' when n % 3 = 0 then 'in_progress' else 'open' end)::maintenance_status,
  (case when n % 4 = 0 then 'accepted' else 'pending' end)::maintenance_review_status,
  case when n % 4 = 0 then '00000000-0000-0000-0000-000000000004'::uuid else null end,
  case when n % 3 = 0 then now() else null end
from generate_series(1, 28) as n;

insert into activity_logs (actor, summary) values
  ('System', 'Loaded 100 tenant accounts for The Place on Jentilly.'),
  ('Maintenance', 'Queued open maintenance requests for landlord review.'),
  ('Rent Ledger', 'Calculated paid, partial, and overdue June rent balances.');
