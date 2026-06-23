/**
 * Demo call script — simulates Twilio webhook calls for both tenant and landlord.
 * Run with: node scripts/demo-call.mjs
 * Make sure `npm run dev` is running first.
 */

const BASE_URL = "http://localhost:3000/api/voice/twilio";

function extractSayText(xml) {
  const matches = [...xml.matchAll(/<Say>([\s\S]*?)<\/Say>/g)];
  return matches.map((m) => m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim()).join(" | ");
}

async function speak(callSid, speechResult) {
  const body = new URLSearchParams({
    CallSid: callSid,
    SpeechResult: speechResult,
    Confidence: "0.95",
    From: "+16232715755",
    Caller: "+16232715755",
    To: "+16204136652",
    CallStatus: "in-progress",
    Direction: "inbound",
    ApiVersion: "2010-04-01",
  });

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const xml = await res.text();
  return extractSayText(xml);
}

async function startCall(callSid) {
  const body = new URLSearchParams({
    CallSid: callSid,
    From: "+16232715755",
    Caller: "+16232715755",
    To: "+16204136652",
    CallStatus: "ringing",
    Direction: "inbound",
    ApiVersion: "2010-04-01",
  });

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const xml = await res.text();
  return extractSayText(xml);
}

function log(speaker, text) {
  const label = speaker === "AGENT" ? "\x1b[36mAGENT\x1b[0m" : "\x1b[33m  YOU\x1b[0m";
  console.log(`${label}: ${text}`);
}

function section(title) {
  console.log(`\n\x1b[32m${"─".repeat(60)}\x1b[0m`);
  console.log(`\x1b[32m  ${title}\x1b[0m`);
  console.log(`\x1b[32m${"─".repeat(60)}\x1b[0m`);
}

async function pause(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDemo() {
  console.log("\x1b[1m\nThe Place on Jentilly — Demo Call Script\x1b[0m");
  console.log("Make sure npm run dev is running on port 3000\n");

  // ─────────────────────────────────────────────
  section("CALL 1 — Aarav Adams (Tenant)");
  // ─────────────────────────────────────────────

  const tenantSid = "demo-tenant-001";
  let reply;

  reply = await startCall(tenantSid);
  log("AGENT", reply);
  await pause();

  log("  YOU", "Aarav Adams");
  reply = await speak(tenantSid, "Aarav Adams");
  log("AGENT", reply);
  await pause();

  log("  YOU", "What is my rent balance?");
  reply = await speak(tenantSid, "What is my rent balance?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Tell me about my lease");
  reply = await speak(tenantSid, "Tell me about my lease");
  log("AGENT", reply);
  await pause();

  log("  YOU", "I have a leaking faucet tomorrow at 5 PM");
  reply = await speak(tenantSid, "I have a leaking faucet tomorrow at 5 PM");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Send me an email summary");
  reply = await speak(tenantSid, "Send me an email summary");
  log("AGENT", reply);
  await pause();

  // ─────────────────────────────────────────────
  section("CALL 2 — Maya Patel (Landlord)");
  // ─────────────────────────────────────────────

  const landlordSid = "demo-landlord-001";

  reply = await startCall(landlordSid);
  log("AGENT", reply);
  await pause();

  log("  YOU", "Maya Patel");
  reply = await speak(landlordSid, "Maya Patel");
  log("AGENT", reply);
  await pause();

  log("  YOU", "How many tenants are there?");
  reply = await speak(landlordSid, "How many tenants are there?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "What is the most recent maintenance request?");
  reply = await speak(landlordSid, "What is the most recent maintenance request?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "What is the oldest maintenance request?");
  reply = await speak(landlordSid, "What is the oldest maintenance request?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Are there any urgent issues?");
  reply = await speak(landlordSid, "Are there any urgent issues?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "What is pending approval?");
  reply = await speak(landlordSid, "What is pending approval?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Who owes rent?");
  reply = await speak(landlordSid, "Who owes rent?");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Send email summary of issues");
  reply = await speak(landlordSid, "Send email summary of issues");
  log("AGENT", reply);
  await pause();

  log("  YOU", "Send email summary of tenants");
  reply = await speak(landlordSid, "Send email summary of tenants");
  log("AGENT", reply);

  console.log(`\n\x1b[32m${"─".repeat(60)}\x1b[0m`);
  console.log("\x1b[1mDemo complete.\x1b[0m\n");
}

runDemo().catch((err) => {
  console.error("\x1b[31mError:\x1b[0m", err.message);
  console.error("Is the dev server running? Try: npm run dev");
});
