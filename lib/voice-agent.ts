import { demoData, findProfileByCredentials, propertyName } from "./demo-data";
import { formatMoney, getOutstandingRent, getPaymentLease, getTenantName, getUnitLabel } from "./data-utils";
import {
  countActiveMaintenanceRequests,
  createMaintenanceRequest,
  listMaintenanceRequests
} from "./server-maintenance-store";
import type { MaintenanceRequest, Profile } from "./types";

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

export function handleVoiceAgentSpeech(callSid: string, rawSpeech: string) {
  const speech = rawSpeech.trim();
  const session = getSessions()[callSid] ?? {};
  getSessions()[callSid] = session;

  if (!speech) {
    return loginPrompt();
  }

  if (!session.profileId) {
    const profile = authenticateFromSpeech(speech);

    if (!profile) {
      return `I could not verify that login. Say something like, login tenant zero zero one password pass zero zero one.`;
    }

    session.profileId = profile.id;
    return `Verified ${profile.full_name}. ${roleHelp(profile)}`;
  }

  const profile = demoData.profiles.find((item) => item.id === session.profileId);

  if (!profile) {
    session.profileId = undefined;
    return loginPrompt();
  }

  return answerByRole(profile, speech);
}

export function loginPrompt() {
  return `Welcome to ${propertyName}. Please verify yourself. Say login admin password admin, login landlord password landlord, login M N password M N, or login tenant zero zero one password pass zero zero one.`;
}

function authenticateFromSpeech(speech: string) {
  const normalized = normalizeSpeech(speech);
  const login = extractBetween(normalized, "login", "password") ?? extractFirstCredential(normalized);
  const password = extractAfter(normalized, "password") ?? extractSecondCredential(normalized);

  if (!login || !password) {
    return undefined;
  }

  return findProfileByCredentials(normalizeCredential(login), normalizeCredential(password));
}

function answerByRole(profile: Profile, speech: string) {
  const normalized = normalizeSpeech(speech);

  if (profile.role === "tenant") {
    return answerTenant(profile, normalized, speech);
  }

  if (profile.role === "landlord" || profile.role === "admin") {
    return answerLandlord(normalized);
  }

  if (profile.role === "maintenance") {
    return answerMaintenance(normalized);
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

  if (includesAny(normalized, ["maintenance", "repair", "request", "leak", "broken", "ac", "faucet", "window", "light"])) {
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
      ? `I created an urgent maintenance request for ${created.title}. It went directly to the landlord and M N. Your selected time is ${spokenDateTime(availability)}.`
      : `I created a maintenance request for ${created.title}. It is waiting for landlord approval. Your selected time is ${spokenDateTime(availability)}.`;
  }

  return `You can ask about rent, your lease, or say a maintenance issue with a time, like leaking faucet tomorrow at 5 PM.`;
}

function answerLandlord(normalized: string) {
  const activeRequests = countActiveMaintenanceRequests();
  const tenants = demoData.tenants.length;
  const outstandingRent = getOutstandingRent(demoData.rentPayments);
  const overduePayments = demoData.rentPayments.filter((payment) => payment.status === "overdue" || payment.status === "partial");

  if (includesAny(normalized, ["how many", "count", "number"]) && includesAny(normalized, ["tenant", "people", "resident"])) {
    return `There are ${tenants} tenants at ${propertyName}.`;
  }

  if (includesAny(normalized, ["request", "maintenance", "problem", "repair"])) {
    return `There are ${activeRequests} active maintenance requests. Urgent requests are also visible to M N.`;
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

  return `Landlord summary: ${tenants} tenants, ${activeRequests} active requests, and ${formatMoney(outstandingRent)} outstanding rent.`;
}

function answerMaintenance(normalized: string) {
  const queue = listMaintenanceRequests().filter(
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
    return "You can ask about rent, lease details, or create a maintenance request with a time.";
  }

  if (profile.role === "maintenance") {
    return "You can ask how many requests you have, or when your next request is scheduled.";
  }

  return "You can ask how many tenants there are, who owes rent, or how many maintenance requests are active.";
}

function normalizeSpeech(value: string) {
  return value.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCredential(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/\bm n\b/g, "mn")
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

function extractFirstCredential(value: string) {
  return value.split(/\s+/)[0];
}

function extractSecondCredential(value: string) {
  return value.split(/\s+/)[1];
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

