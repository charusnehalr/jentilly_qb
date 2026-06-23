# The Place on Jentilly

The Place on Jentilly is a property management portal with role-based dashboards for admins, landlords, and tenants. This setup covers your part of the project:

- Login and role routing
- Admin dashboard
- Landlord dashboard
- Tenant dashboard
- Dataset-backed login details
- Supabase schema and seed data for a free database manager option
- Twilio voice-agent webhook and teammate handoff documentation

The app runs from the local dataset first. Supabase can be used later as the free database manager for real hosted data.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Login Details

| Role | Login | Password |
| --- | --- | --- |
| Admin | `admin` | `admin` |
| Landlord | `landlord` | `landlord` |
| Maintenance | `MN` | `MN` |
| Tenant example | `tenant001` | `pass001` |
| Tenant example | `tenant100` | `pass100` |

There are 100 tenant accounts in `lib/demo-data.ts`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. Add keys to `.env.local`.

## Twilio Voice Setup

The app includes a Twilio-compatible voice webhook:

```text
POST /api/voice/twilio
```

Expose the local app with a tunnel, then put the public URL in the Twilio phone number voice webhook.

First verify with one of:

```text
login tenant zero zero one password pass zero zero one
login landlord password landlord
login M N password M N
```

Then tenants can ask about rent, lease details, or create maintenance requests with a time. Landlords can ask about rent, tenant counts, and request counts. MN can ask how many jobs are assigned or when the next request is scheduled.

Maintenance flow:

- Tenants choose their best time from a calendar-style date/time picker.
- Urgent requests appear in both the landlord portal and the `MN` repair queue immediately.
- Normal requests wait for landlord approval.
- Normal requests appear in the `MN` repair queue only after landlord approval.
- Tenants and `MN` both have calendar views connected to the request time.
- Accepted requests notify the tenant until the request is completed.
- `MN` can confirm the visit and complete the repair from the maintenance dashboard.

## Twilio Teammate Handoff

Give the Twilio/automation teammate `docs/twilio-automation-work.md`. It explains exactly what they need to connect, test, and demo.
