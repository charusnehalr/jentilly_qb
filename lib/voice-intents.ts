import { demoData } from "./demo-data";
import {
  countActiveMaintenanceRequests,
  createMaintenanceRequest
} from "./server-maintenance-store";

type VoiceIntentResult = {
  response: string;
};

export function handleVoiceUtterance(rawSpeech: string): VoiceIntentResult {
  const speech = rawSpeech.trim();
  const normalized = speech.toLowerCase();

  if (!speech) {
    return {
      response: "I did not catch that. Please say your tenant number and maintenance issue."
    };
  }

  if (isLandlordRequestCount(normalized)) {
    const count = countActiveMaintenanceRequests();
    return {
      response: `There are ${count} active maintenance requests at The Place on Jentilly.`
    };
  }

  const tenant = findTenantFromSpeech(normalized);

  if (!tenant) {
    return {
      response:
        "I could not identify the tenant account. Please say something like tenant zero zero one has a leaking faucet."
    };
  }

  const lease = demoData.leases.find((item) => item.tenant_id === tenant.id);

  if (!lease) {
    return {
      response: `I found ${tenant.full_name}, but could not find an active lease.`
    };
  }

  const issue = extractIssue(normalized);
  const created = createMaintenanceRequest({
    tenant_id: tenant.id,
    unit_id: lease.unit_id,
    title: titleFromIssue(issue),
    description: speech,
    availability_window: "Call tenant to confirm availability",
    priority: priorityFromIssue(normalized)
  });

  return {
    response: `Thanks ${tenant.full_name}. I submitted your maintenance request for ${created.title}. The landlord can see it now.`
  };
}

function isLandlordRequestCount(value: string) {
  return (
    value.includes("landlord") &&
    (value.includes("how many") || value.includes("count") || value.includes("number of")) &&
    (value.includes("request") || value.includes("maintenance") || value.includes("problem"))
  );
}

function findTenantFromSpeech(value: string) {
  const compact = value.replace(/[-_\s]/g, "");
  const digitMatch = compact.match(/tenant(\d{1,3})/);

  if (digitMatch) {
    const loginId = `tenant${digitMatch[1].padStart(3, "0")}`;
    const profile = demoData.profiles.find((item) => item.login_id === loginId);
    return demoData.tenants.find((tenant) => tenant.profile_id === profile?.id);
  }

  const spokenNumber = wordsToTenantNumber(value);
  if (spokenNumber) {
    const loginId = `tenant${spokenNumber}`;
    const profile = demoData.profiles.find((item) => item.login_id === loginId);
    return demoData.tenants.find((tenant) => tenant.profile_id === profile?.id);
  }

  return undefined;
}

function wordsToTenantNumber(value: string) {
  const numberWords: Record<string, string> = {
    zero: "0",
    oh: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9"
  };
  const tokens = value.split(/\s+/);
  const tenantIndex = tokens.findIndex((token) => token === "tenant");

  if (tenantIndex === -1) {
    return undefined;
  }

  const digits = tokens
    .slice(tenantIndex + 1, tenantIndex + 4)
    .map((token) => numberWords[token])
    .join("");

  return digits.length ? digits.padStart(3, "0").slice(0, 3) : undefined;
}

function extractIssue(value: string) {
  return value
    .replace(/tenant\s+(\d{1,3}|zero|oh|one|two|three|four|five|six|seven|eight|nine)(\s+(zero|oh|one|two|three|four|five|six|seven|eight|nine)){0,2}/g, "")
    .replace(/\b(has|have|reported|reporting|a|an|the|maintenance|request|problem|issue)\b/g, "")
    .trim();
}

function titleFromIssue(issue: string) {
  if (!issue) {
    return "Maintenance request";
  }

  const firstWords = issue.split(/\s+/).slice(0, 5).join(" ");
  return firstWords.charAt(0).toUpperCase() + firstWords.slice(1);
}

function priorityFromIssue(value: string) {
  if (["flood", "no ac", "air conditioning", "urgent", "emergency", "sparking"].some((term) => value.includes(term))) {
    return "urgent";
  }

  if (["light", "outlet", "internet", "paint"].some((term) => value.includes(term))) {
    return "low";
  }

  return "normal";
}
