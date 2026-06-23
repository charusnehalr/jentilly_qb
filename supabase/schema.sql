create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'landlord', 'maintenance', 'tenant');
create type lease_status as enum ('active', 'ending_soon', 'expired');
create type rent_status as enum ('paid', 'partial', 'overdue', 'upcoming');
create type maintenance_priority as enum ('low', 'normal', 'urgent');
create type maintenance_status as enum ('open', 'in_progress', 'completed');
create type maintenance_review_status as enum ('pending', 'accepted', 'rejected');
create type housing_type as enum ('private', 'shared');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text not null unique,
  password text not null,
  email text not null unique,
  full_name text not null,
  role user_role not null,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  unit_label text not null,
  housing_type housing_type not null default 'private',
  bedrooms integer not null default 1,
  bathrooms numeric(3, 1) not null default 1,
  created_at timestamptz not null default now(),
  unique (property_id, unit_label)
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table leases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  monthly_rent numeric(10, 2) not null,
  status lease_status not null default 'active',
  created_at timestamptz not null default now()
);

create table rent_payments (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  due_on date not null,
  amount_due numeric(10, 2) not null,
  amount_paid numeric(10, 2) not null default 0,
  status rent_status not null default 'upcoming',
  created_at timestamptz not null default now()
);

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  unit_id uuid references units(id) on delete set null,
  title text not null,
  description text not null,
  availability_window text,
  priority maintenance_priority not null default 'normal',
  status maintenance_status not null default 'open',
  review_status maintenance_review_status not null default 'pending',
  assigned_to uuid references profiles(id) on delete set null,
  mn_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table leases enable row level security;
alter table rent_payments enable row level security;
alter table maintenance_requests enable row level security;
alter table activity_logs enable row level security;

create policy "Users can read own profile" on profiles
for select using (auth.uid() = id);

create policy "Admins can read profiles" on profiles
for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "Authenticated users can read dashboard data" on properties
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read units" on units
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read tenants" on tenants
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read leases" on leases
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read rent payments" on rent_payments
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read maintenance requests" on maintenance_requests
for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create maintenance requests" on maintenance_requests
for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can read activity logs" on activity_logs
for select using (auth.role() = 'authenticated');
