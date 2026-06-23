import { demoData, findProfileByCredentials, findProfileByLoginOnly, findProfileByName, findProfileByPhone, propertyName } from "./demo-data";
import { formatMoney, getOutstandingRent, getPaymentLease, getTenantName, getUnitLabel } from "./data-utils";
import { getLandlordEmailTo, getTenantEmailTo, sendEmail } from "./send-email";
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  listMaintenanceRequestsFromDB
} from "./server-maintenance-store";
import type { Lease, MaintenanceRequest, Profile } from "./types";

type VoiceSession = {
  profileId?: string;
};

declare global {
  var propertyVoiceSessions: Record<string, VoiceSession> | undefined;
}

function getSessions() {
  if (!globalThis.propertyVoiceSessions) {
    globalThis.propertyVoiceSessions = {};
  }

  return globalThis.propertyVoiceSessions;
}

export function startVoiceSession(callSid: string) {
  getSessions()[callSid] = {};
}

export function restoreSession(callSid: string, profileId: string) {
  const sessions = getSessions();
  if (!sessions[callSid]?.profileId) {
    sessions[callSid] = { profileId };
  }
}

export function getSessionProfileId(callSid: string): string | undefined {
  return getSessions()[callSid]?.profileId;
}

export function tryAutoLoginByPhone(callSid: string, callerPhone: string) {
  const session = getSessions()[callSid];
  if (session?.profileId) return null;

  const profile = findProfileByPhone(callerPhone);
  if (!profile) return null;

  getSessions()[callSid] = { profileId: profile.id };
  return `Welcome back, ${profile.full_name}. You are verified automatically. ${roleHelp(profile)}`;
}

export async function handleVoiceAgentSpeech(callSid: string, rawSpeech: string): Promise<string> {
  const speech = rawSpeech.trim();
  const session = getSessions()[callSid] ?? {};
  getSessions()[callSid] = session;

  if (!speech) {
    return loginPrompt();
  }

  // Allow switching roles at any time by saying "login landlord", "switch to MN", etc.
  const normalized = normalizeSpeech(speech);
  if (session.profileId && includesAny(normalized, ["login", "switch", "log in"])) {
    const profile = authenticateFromSpeech(speech);
    if (profile && profile.id !== session.profileId) {
      session.profileId = profile.id;
      return `Switched to ${profile.full_name}. ${roleHelp(profile)}`;
    }
  }

  if (!session.profileId) {
    const profile = authenticateFromSpeech(speech);

    if (!profile) {
      return `I could not verify that login. Try saying just your login, like tenant zero zero one, or landlord, or M N.`;
    }

    session.profileId = profile.id;
    return `Verified ${profile.full_name}. ${roleHelp(profile)}`;
  }

  const profile = demoData.profiles.find((item) => item.id === session.profileId);

  if (!profile) {
    session.profileId = undefined;
    return loginPrompt();
  }

  return await answerByRole(profile, speech);
}

export function loginPrompt() {
  return `Welcome to ${propertyName}. Please say your name. Say Adams for tenant, or Patel for landlord.`;
}

function authenticateFromSpeech(speech: string) {
  const normalized = normalizeSpeech(speech);
  const withoutLoginWord = normalized.replace(/^(log\s*in\s+|login\s+|switch\s+to\s+)/i, "").trim();

  // Phonetic aliases for demo personas (Twilio often mishears non-English names)
  const aaravVariants = ["aarav", "arav", "arrow", "aaron", "arau", "aura", "era", "irav", "ahrav"];
  const mayaVariants = ["maya", "mia", "maia", "myah", "mya"];

  if (aaravVariants.some((v) => normalized.includes(v)) && normalized.includes("adam")) {
    return findProfileByLoginOnly("tenant001");
  }
  if (mayaVariants.some((v) => normalized.includes(v)) && normalized.includes("patel")) {
    return findProfileByLoginOnly("landlord");
  }

  // Also match on first name alone in case last name is dropped
  if (aaravVariants.some((v) => normalized === v || normalized.startsWith(v + " ") || normalized.endsWith(" " + v))) {
    return findProfileByLoginOnly("tenant001");
  }
  if (mayaVariants.some((v) => normalized === v || normalized.startsWith(v + " ") || normalized.endsWith(" " + v))) {
    return findProfileByLoginOnly("landlord");
  }

  // Try by name first — "Aarav Adams" or "Maya Patel"
  const byName = findProfileByName(withoutLoginWord) ?? findProfileByName(normalized);
  if (byName) return byName;

  // Try login ID with password
  const rawLogin =
    extractBetween(normalized, "login", "password") ??
    extractBetween(normalized, "log in", "password");
  const password =
    extractAfter(normalized, "password") ??
    extractAfter(normalized, "pass word");

  if (rawLogin && password) {
    const cleanLogin = rawLogin.replace(/^(log\s*in\s+|login\s+)/i, "").trim();
    const profile = findProfileByCredentials(normalizeCredential(cleanLogin), normalizeCredential(password));
    if (profile) return profile;
  }

  // Login ID only (no password)
  const loginOnly =
    extractAfter(normalized, "login") ??
    extractAfter(normalized, "log in") ??
    withoutLoginWord;

  if (loginOnly) {
    const profile = findProfileByLoginOnly(normalizeCredential(loginOnly));
    if (profile) return profile;
  }

  return findProfileByLoginOnly(normalizeCredential(withoutLoginWord));
}

async function answerByRole(profile: Profile, speech: string): Promise<string> {
  const normalized = normalizeSpeech(speech);

  if (profile.role === "tenant") {
    return answerTenant(profile, normalized, speech);
  }

  if (profile.role === "landlord" || profile.role === "admin") {
    return await answerLandlord(normalized);
  }

  if (profile.role === "maintenance") {
    return await answerMaintenance(normalized);
  }

  return "I am not sure how to help with that yet.";
}

function answerTenant(profile: Profile, normalized: string, originalSpeech: string) {
  const tenant = demoData.tenants.find((item) => item.profile_id === profile.id);

  if (!tenant) {
    return "I found your account, but I could not find your tenant record.";
  }

  const leases = demoData.leases.filter((lease) => lease.tenant_id === tenant.id);
  const lease = leases[0];
  const payments = demoData.rentPayments.filter((payment) => leases.some((item) => item.id === payment.lease_id));
  const balance = getOutstandingRent(payments);

  if (includesAny(normalized, ["rent", "balance", "owe", "payment", "due"])) {
    return balance > 0
      ? `Your current rent balance is ${formatMoney(balance)}.`
      : "Your rent is fully paid for the current period.";
  }

  if (includesAny(normalized, ["lease", "unit", "room"])) {
    if (!lease) {
      return "I could not find an active lease.";
    }

    return `Your unit is ${getUnitLabel(demoData, lease.unit_id)}. Your lease ends on ${spokenDate(lease.ends_on)} and monthly rent is ${formatMoney(lease.monthly_rent)}.`;
  }

  // Show tenant's existing requests (status/count questions — must come before creation)
  if (
    includesAny(normalized, ["how many", "show", "view", "list", "status", "my request", "my maintenance"]) &&
    includesAny(normalized, ["request", "maintenance", "repair", "issue"])
  ) {
    const myRequests = listMaintenanceRequests().filter((r) => r.tenant_id === tenant.id);
    const open = myRequests.filter((r) => r.status !== "completed");
    if (myRequests.length === 0) return "You have no maintenance requests on record.";
    const latest = myRequests[0];
    return `You have ${myRequests.length} maintenance request${myRequests.length > 1 ? "s" : ""}, ${open.length} still open. Your most recent is ${latest.title}, status is ${latest.review_status}.`;
  }

  if (
    includesAny(normalized, ["maintenance", "repair", "request", "leak", "broken", "ac", "faucet", "window", "light", "heater", "plumbing", "door", "pipe"]) &&
    !includesAny(normalized, ["email", "send", "mail", "summary", "show", "view", "list", "status", "how many", "count"])
  ) {
    if (!lease) {
      return "I could not create a request because I could not find your active lease.";
    }

    const issue = extractIssue(normalized);
    const availability = extractAvailability(normalized) ?? nextDefaultAvailability();
    const created = createMaintenanceRequest({
      tenant_id: tenant.id,
      unit_id: lease.unit_id,
      title: titleFromIssue(issue),
      description: originalSpeech,
      availability_window: availability,
      priority: priorityFromIssue(normalized)
    });

    return created.priority === "urgent"
      ? `I created an urgent maintenance request for ${created.title}. It went directly to the landlord and maintenance team. Your selected time is ${spokenDateTime(availability)}.`
      : `I created a maintenance request for ${created.title}. It is waiting for landlord approval. Your selected time is ${spokenDateTime(availability)}.`;
  }

  // Email summary for tenant
  if (includesAny(normalized, ["email", "send", "mail", "summary"])) {
    const to = getTenantEmailTo();
    if (!to) return "No email address is configured. Please set EMAIL_TENANT_TO in your environment.";
    sendEmail(to, `Your Tenant Summary — ${propertyName}`, buildTenantEmailHtml(tenant.full_name, lease, balance, tenant.id)).catch(console.error);
    return `I am sending your account summary to ${to} now.`;
  }

  return `You can say: what is my rent balance, what is my lease, show my maintenance requests, I have a leaking faucet, or email me a summary.`;
}

async function answerLandlord(normalized: string): Promise<string> {
  const allRequests = await listMaintenanceRequestsFromDB();
  const activeRequests = allRequests.filter(
    (r) => r.status !== "completed" && r.review_status !== "rejected"
  );
  const tenants = demoData.tenants.length;
  const outstandingRent = getOutstandingRent(demoData.rentPayments);
  const overduePayments = demoData.rentPayments.filter((p) => p.status === "overdue" || p.status === "partial");

  const isEmailIntent = includesAny(normalized, ["email", "mail"]) ||
    (normalized.includes("send") && includesAny(normalized, ["summary", "report", "list"]));

  // ── Email checks FIRST so "send email for pending requests" doesn't hit the pending check ──

  // Tenant summary email
  if (isEmailIntent && includesAny(normalized, ["tenant", "resident", "people", "rent", "overdue", "payment"])) {
    const to = getLandlordEmailTo();
    if (!to) return "No landlord email is configured. Please set EMAIL_LANDLORD_TO in your environment.";
    sendEmail(to, `Tenant Summary — ${propertyName}`, buildTenantsEmailHtml(overduePayments, outstandingRent)).catch(console.error);
    return `I am sending the tenant summary to ${to} now.`;
  }

  // Maintenance issues email (default email when no tenant qualifier)
  if (isEmailIntent) {
    const to = getLandlordEmailTo();
    if (!to) return "No landlord email is configured. Please set EMAIL_LANDLORD_TO in your environment.";
    sendEmail(to, `Maintenance Summary — ${propertyName}`, buildIssuesEmailHtml(activeRequests)).catch(console.error);
    return `I am sending the maintenance summary to ${to} now.`;
  }

  // ── Question answers ──

  if (includesAny(normalized, ["how many", "count", "number"]) && includesAny(normalized, ["tenant", "people", "resident"])) {
    return `There are ${tenants} tenants at ${propertyName}.`;
  }

  // Oldest maintenance request
  if (includesAny(normalized, ["oldest", "old", "first", "longest"])) {
    const oldest = [...activeRequests].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    if (!oldest) return "There are no open maintenance requests right now.";
    const tenantName = getTenantName(demoData, oldest.tenant_id);
    return `The oldest open request is ${oldest.title} from ${tenantName}, submitted on ${spokenDate(oldest.created_at)}. Status is ${oldest.review_status}.`;
  }

  // Most recent maintenance request
  if (includesAny(normalized, ["recent", "latest", "newest", "last", "new"])) {
    const newest = allRequests[0];
    if (!newest) return "There are no maintenance requests yet.";
    const tenantName = getTenantName(demoData, newest.tenant_id);
    return `The most recent request is ${newest.title} from ${tenantName}, submitted on ${spokenDate(newest.created_at)}. Priority is ${newest.priority}.`;
  }

  // Urgent requests
  if (includesAny(normalized, ["urgent", "emergency", "critical"])) {
    const urgent = activeRequests.filter((r) => r.priority === "urgent");
    if (urgent.length === 0) return "There are no urgent maintenance requests right now.";
    const names = urgent.slice(0, 3).map((r) => `${r.title} from ${getTenantName(demoData, r.tenant_id)}`).join(", ");
    return `There are ${urgent.length} urgent requests. They are ${names}.`;
  }

  // Pending approval
  if (includesAny(normalized, ["pending", "approval", "approve", "waiting", "review"])) {
    const pending = activeRequests.filter((r) => r.review_status === "pending");
    if (pending.length === 0) return "No requests are waiting for your approval.";
    const names = pending.slice(0, 3).map((r) => `${r.title} from ${getTenantName(demoData, r.tenant_id)}`).join(", ");
    return `${pending.length} requests need your approval. First few are ${names}.`;
  }

  if (includesAny(normalized, ["request", "maintenance", "problem", "repair"])) {
    return `There are ${activeRequests.length} active maintenance requests. Urgent requests are also visible to M N.`;
  }

  if (includesAny(normalized, ["rent", "pay", "owe", "overdue", "balance"])) {
    const names = overduePayments
      .slice(0, 5)
      .map((payment) => {
        const lease = getPaymentLease(demoData, payment);
        return lease ? getTenantName(demoData, lease.tenant_id) : "Unknown tenant";
      })
      .join(", ");
    return `${overduePayments.length} tenants have rent due or partially paid. Total outstanding rent is ${formatMoney(outstandingRent)}. First few are ${names}.`;
  }

  return `Landlord summary: ${tenants} tenants, ${activeRequests.length} active requests, and ${formatMoney(outstandingRent)} outstanding rent. You can ask about the oldest request, most recent request, urgent issues, pending approvals, or say email me a summary.`;
}

function buildIssuesEmailHtml(requests: ReturnType<typeof listMaintenanceRequests>) {
  const rows = requests.map((r) => {
    const tenant = getTenantName(demoData, r.tenant_id);
    const unit = getUnitLabel(demoData, r.unit_id);
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd">${r.title}</td>
      <td style="padding:8px;border:1px solid #ddd">${tenant}</td>
      <td style="padding:8px;border:1px solid #ddd">${unit}</td>
      <td style="padding:8px;border:1px solid #ddd">${r.priority}</td>
      <td style="padding:8px;border:1px solid #ddd">${r.review_status}</td>
      <td style="padding:8px;border:1px solid #ddd">${new Date(r.created_at).toLocaleDateString()}</td>
    </tr>`;
  }).join("");

  return `<h2>Maintenance Issues — ${propertyName}</h2>
<p>${requests.length} active requests as of ${new Date().toLocaleDateString()}</p>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Issue</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Tenant</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Unit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Priority</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Submitted</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildTenantEmailHtml(
  fullName: string,
  lease: Lease | undefined,
  balance: number,
  tenantId: string
) {
  const requests = listMaintenanceRequests().filter((r) => r.tenant_id === tenantId);
  const unit = lease ? getUnitLabel(demoData, lease.unit_id) : "No active lease";
  const leaseEnd = lease ? new Date(lease.ends_on).toLocaleDateString() : "—";
  const rent = lease ? formatMoney(lease.monthly_rent) : "—";

  const requestRows = requests.length === 0
    ? `<tr><td colspan="4" style="padding:8px;border:1px solid #ddd;color:#666">No maintenance requests</td></tr>`
    : requests.map((r) => `<tr>
        <td style="padding:8px;border:1px solid #ddd">${r.title}</td>
        <td style="padding:8px;border:1px solid #ddd">${r.priority}</td>
        <td style="padding:8px;border:1px solid #ddd">${r.status}</td>
        <td style="padding:8px;border:1px solid #ddd">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>`).join("");

  return `<h2>Account Summary — ${fullName}</h2>
<h3 style="color:#374151">Lease Details</h3>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-bottom:24px">
  <tr><td style="padding:6px 16px 6px 0;font-weight:bold">Unit</td><td>${unit}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-weight:bold">Monthly Rent</td><td>${rent}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-weight:bold">Lease Ends</td><td>${leaseEnd}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;font-weight:bold">Balance Due</td><td style="color:${balance > 0 ? "#dc2626" : "#16a34a"}">${balance > 0 ? formatMoney(balance) : "Fully paid"}</td></tr>
</table>
<h3 style="color:#374151">Maintenance Requests</h3>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Issue</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Priority</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Submitted</th>
    </tr>
  </thead>
  <tbody>${requestRows}</tbody>
</table>`;
}

function buildTenantsEmailHtml(
  overduePayments: { length: number },
  outstandingRent: number
) {
  const rows = demoData.tenants.map((tenant) => {
    const lease = demoData.leases.find((l) => l.tenant_id === tenant.id);
    const payments = demoData.rentPayments.filter((p) => p.lease_id === lease?.id);
    const balance = payments.reduce((sum, p) => sum + Math.max(p.amount_due - p.amount_paid, 0), 0);
    const status = balance > 0 ? `Owes ${formatMoney(balance)}` : "Paid";
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd">${tenant.full_name}</td>
      <td style="padding:8px;border:1px solid #ddd">${tenant.email}</td>
      <td style="padding:8px;border:1px solid #ddd">${lease ? new Date(lease.ends_on).toLocaleDateString() : "No lease"}</td>
      <td style="padding:8px;border:1px solid #ddd;color:${balance > 0 ? "#dc2626" : "#16a34a"}">${status}</td>
    </tr>`;
  }).join("");

  return `<h2>Tenant Summary — ${propertyName}</h2>
<p>Total outstanding rent: <strong>${formatMoney(outstandingRent)}</strong> — ${overduePayments.length} tenants with balance due</p>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Lease Ends</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left">Rent Status</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

async function answerMaintenance(normalized: string): Promise<string> {
  const queue = (await listMaintenanceRequestsFromDB()).filter(
    (request) =>
      request.assigned_to === "maintenance-1" &&
      request.review_status === "accepted" &&
      request.status !== "completed"
  );
  const urgent = queue.filter((request) => request.priority === "urgent");
  const next = [...queue].sort(
    (a, b) => new Date(a.availability_window ?? a.created_at).getTime() - new Date(b.availability_window ?? b.created_at).getTime()
  )[0];

  if (includesAny(normalized, ["how many", "count", "number"])) {
    return `You have ${queue.length} assigned repair requests. ${urgent.length} are urgent.`;
  }

  if (includesAny(normalized, ["next", "time", "schedule", "calendar", "when"])) {
    if (!next) {
      return "You do not have any assigned repair requests right now.";
    }

    return `Your next repair is ${next.title} for ${getTenantName(demoData, next.tenant_id)} at ${getUnitLabel(demoData, next.unit_id)} on ${spokenDateTime(next.availability_window ?? next.created_at)}.`;
  }

  return `M N summary: ${queue.length} assigned repairs, ${urgent.length} urgent. Ask, when is my next request, for the next scheduled job.`;
}

function roleHelp(profile: Profile) {
  if (profile.role === "tenant") {
    return "You can ask about your rent balance, lease details, or report a maintenance issue. Say email me a summary to get an email.";
  }

  if (profile.role === "maintenance") {
    return "You can ask how many requests you have, or when your next request is scheduled.";
  }

  return "You can ask: how many tenants, oldest maintenance request, most recent request, urgent requests, pending approvals, or who owes rent. Say email me a summary to get a maintenance report.";
}

function normalizeSpeech(value: string) {
  return value.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCredential(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/\bm\.?n\.?\b/g, "mn")
    .replace(/\bzero\b/g, "0")
    .replace(/\boh\b/g, "0")
    .replace(/\bone\b/g, "1")
    .replace(/\btwo\b/g, "2")
    .replace(/\bthree\b/g, "3")
    .replace(/\bfour\b/g, "4")
    .replace(/\bfive\b/g, "5")
    .replace(/\bsix\b/g, "6")
    .replace(/\bseven\b/g, "7")
    .replace(/\beight\b/g, "8")
    .replace(/\bnine\b/g, "9")
    .replace(/\s+/g, "");

  if (cleaned === "mn") {
    return "MN";
  }

  return cleaned;
}

function extractBetween(value: string, start: string, end: string) {
  const pattern = new RegExp(`${start}\\s+(.+?)\\s+${end}`);
  return value.match(pattern)?.[1];
}

function extractAfter(value: string, marker: string) {
  return value.match(new RegExp(`${marker}\\s+(.+)$`))?.[1];
}


function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function extractIssue(value: string) {
  return value
    .replace(/\b(at|on|today|tomorrow|morning|afternoon|evening|night|\d{1,2}(:\d{2})?\s*(am|pm)?)\b.*$/i, "")
    .replace(/\b(i have|my|there is|there are|please|create|submit|maintenance|request|repair|issue|problem|a|an|the)\b/g, "")
    .trim();
}

function titleFromIssue(issue: string) {
  const fallback = "Maintenance request";
  const title = issue.split(/\s+/).filter(Boolean).slice(0, 5).join(" ");

  if (!title) {
    return fallback;
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function priorityFromIssue(value: string): MaintenanceRequest["priority"] {
  if (["flood", "no ac", "air conditioning", "urgent", "emergency", "sparking", "water leak"].some((term) => value.includes(term))) {
    return "urgent";
  }

  if (["light", "outlet", "internet", "paint"].some((term) => value.includes(term))) {
    return "low";
  }

  return "normal";
}

function extractAvailability(value: string) {
  const hourMatch = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const date = new Date();

  if (value.includes("tomorrow")) {
    date.setDate(date.getDate() + 1);
  }

  if (hourMatch) {
    let hour = Number(hourMatch[1]);
    const minute = Number(hourMatch[2] ?? 0);
    const meridiem = hourMatch[3];

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }

    date.setHours(hour, minute, 0, 0);
    return toLocalInputValue(date);
  }

  if (value.includes("morning")) {
    date.setHours(10, 0, 0, 0);
    return toLocalInputValue(date);
  }

  if (value.includes("afternoon")) {
    date.setHours(14, 0, 0, 0);
    return toLocalInputValue(date);
  }

  if (value.includes("evening") || value.includes("night")) {
    date.setHours(17, 0, 0, 0);
    return toLocalInputValue(date);
  }

  return undefined;
}

function nextDefaultAvailability() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  return toLocalInputValue(date);
}

function toLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function spokenDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function spokenDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

