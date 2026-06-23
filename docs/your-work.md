# Your Property Portal Work

You own the project areas that make the portal usable:

## Frontend, Login, Dashboards, and Data

- Build the Next.js app.
- Add login and role routing.
- Create separate dashboard experiences for admin, landlord, and tenant.
- Define database tables and demo data.
- Show tenants, leases, rent payments, properties, units, maintenance, and activity.
- Keep the Twilio webhook available at `/api/voice/twilio`.
- Make sure voice-created maintenance requests show in the same dashboards.

## Friend's Work

Your friend owns Twilio voice:

- Incoming phone calls
- Twilio phone number setup
- Connecting the Twilio voice webhook to `/api/voice/twilio`
- Testing voice login phrases and role-based questions
- Speaking the response back to the caller

## First Complete End-to-End Flow

Start with maintenance because it is easiest to prove:

1. Tenant calls the Twilio number.
2. Tenant says: "login tenant zero zero one password pass zero zero one."
3. Tenant says: "create maintenance request leaking faucet tomorrow at 5 PM."
4. Twilio sends the speech result to `/api/voice/twilio`.
5. The app creates the maintenance request.
6. Landlord dashboard shows the new request.
7. Tenant dashboard shows the request status.
8. If the request is urgent, the `MN` dashboard also shows it immediately.
