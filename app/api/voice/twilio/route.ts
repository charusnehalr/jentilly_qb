import { handleVoiceAgentSpeech, loginPrompt, startVoiceSession } from "@/lib/voice-agent";

export async function POST(request: Request) {
  const formData = await request.formData();
  const speech = String(formData.get("SpeechResult") ?? "");
  const callSid = String(formData.get("CallSid") ?? "local-call");
  const response = speech ? await answerSpeech(callSid, speech) : askForSpeech(callSid);

  return new Response(response, {
    headers: {
      "content-type": "text/xml"
    }
  });
}

export async function GET() {
  return new Response(askForSpeech("local-call"), {
    headers: {
      "content-type": "text/xml"
    }
  });
}

function askForSpeech(callSid: string) {
  startVoiceSession(callSid);

  return twiml(`
    <Gather input="speech" action="/api/voice/twilio" method="POST" speechTimeout="3" timeout="15" language="en-US" profanityFilter="false">
      <Say>${escapeXml(loginPrompt())}</Say>
    </Gather>
    <Say>I did not hear anything. Please call again.</Say>
  `);
}

async function answerSpeech(callSid: string, speech: string) {
  const response = await handleVoiceAgentSpeech(callSid, speech);

  return twiml(`
    <Say>${escapeXml(response)}</Say>
    <Gather input="speech" action="/api/voice/twilio" method="POST" speechTimeout="3" timeout="15" language="en-US" profanityFilter="false">
      <Say>You can ask another question, create a request, or hang up.</Say>
    </Gather>
  `);
}

function twiml(children: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${children}</Response>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
