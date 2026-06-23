import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER ?? "";
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD ?? "";
const TENANT_EMAIL = process.env.EMAIL_TENANT_TO ?? "";
const LANDLORD_EMAIL = process.env.EMAIL_LANDLORD_TO ?? "";

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD
    }
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    console.error("[email] EMAIL_USER or EMAIL_APP_PASSWORD not set in .env.local");
    return;
  }

  if (!to) {
    console.error("[email] No recipient address configured");
    return;
  }

  console.log(`[email] Sending "${subject}" to ${to}`);

  try {
    const transporter = createTransport();
    const info = await transporter.sendMail({
      from: `"The Place on Jentilly" <${EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log("[email] Sent successfully. ID:", info.messageId);
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export function getTenantEmailTo() {
  return TENANT_EMAIL;
}

export function getLandlordEmailTo() {
  return LANDLORD_EMAIL;
}
