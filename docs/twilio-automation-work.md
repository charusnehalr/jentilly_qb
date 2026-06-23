# Twilio and Automation Work

This is the work package for the teammate handling Twilio and voice automation.

## Goal

Connect a phone call to the existing property portal so users can speak instead of clicking:

- Tenants can verify themselves, ask about rent or lease details, and create maintenance requests with a time.
- Landlords can ask how many tenants there are, who owes rent, and how many requests are open.
- The `MN` maintenance account can ask how many assigned jobs there are and when the next repair is scheduled.

The dashboards and data already exist in the Next.js app. Twilio only needs to call the app webhook.

## Main Webhook

Use this endpoint as the Twilio phone number voice webhook:

```text
POST https://your-public-url.com/api/voice/twilio
```

For local testing, expose the Next.js app with ngrok:

```bash
ngrok http 3000
```

Then use the HTTPS URL from ngrok:

```text
https://your-ngrok-url.ngrok-free.app/api/voice/twilio
```

Twilio should use:

```text
HTTP method: POST
Webhook type: Voice
```

## Test Logins

Start every call by verifying the user.

```text
login tenant zero zero one password pass zero zero one
login landlord password landlord
login M N password M N
login admin password admin
```

## Tenant Voice Tests

After tenant login, test:

```text
what is my rent balance
what are my lease details
create maintenance request leaking faucet tomorrow at 5 PM
urgent water leak today at 3 PM
```

Expected behavior:

- Rent and lease questions are answered from the app dataset.
- Normal maintenance requests appear in the landlord dashboard for approval.
- Urgent maintenance requests appear in both landlord and `MN` dashboards immediately.
- The spoken time becomes the tenant availability time on the request.

## Landlord Voice Tests

After landlord login, test:

```text
how many tenants are there
who should pay rent
how many maintenance requests are there
```

Expected behavior:

- Tenant count comes from the dataset.
- Rent summary includes tenants with due or partial rent.
- Maintenance count comes from the active request list.

## MN Voice Tests

After `MN` login, test:

```text
how many requests do I have
when is my next request
what is my schedule
```

Expected behavior:

- `MN` only hears accepted or urgent requests assigned to maintenance.
- The next request answer includes title, tenant, unit, date, and time.

## Demo Flow

Use this for the live demo:

1. Open the landlord dashboard in one browser.
2. Call the Twilio number.
3. Say: `login tenant zero zero one password pass zero zero one`.
4. Say: `create maintenance request leaking faucet tomorrow at 5 PM`.
5. Refresh or watch the landlord request section.
6. Confirm the new request appears with the selected time.
7. Call again or continue as landlord and ask: `how many maintenance requests are there`.
8. Log into `MN / MN` and show urgent/approved jobs in the repair calendar.

## What Not To Build

Do not build a separate database or separate maintenance system for Twilio. The webhook already connects voice actions to the same dashboard data.

Do not use n8n for the current demo. The clean demo architecture is:

```text
Twilio phone call
-> Next.js Twilio webhook
-> shared app data
-> dashboards update
```

## Optional Future Work

After the demo works, Twilio automation can be extended with:

- SMS confirmations to tenants
- SMS alerts to the landlord for urgent requests
- Call transcript storage
- Supabase persistence instead of local demo memory
- Calendar invites for confirmed repair visits
