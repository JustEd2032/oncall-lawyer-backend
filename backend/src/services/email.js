import sgMail from "@sendgrid/mail";

// Robust date parser
function parseDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === "function") return val.toDate();
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Format date in the client's local timezone using their UTC offset in minutes
// e.g. tzOffset = -360 for UTC-6 (Mexico City)
function formatInTimezone(date, tzOffset) {
  // Shift the UTC time by the client's offset to get their local time
  const localMs = date.getTime() + (tzOffset || 0) * 60 * 1000;
  const localDate = new Date(localMs);
  // Format using UTC methods which now reflect local time after the shift
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const day = days[localDate.getUTCDay()];
  const month = months[localDate.getUTCMonth()];
  const date2 = localDate.getUTCDate();
  const year = localDate.getUTCFullYear();
  let hours = localDate.getUTCHours();
  const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}, ${month} ${date2}, ${year} at ${hours}:${minutes} ${ampm}`;
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const APP_URL = process.env.APP_URL || "https://oncall-lawyer-api-dev.web.app";

export async function sendAppointmentReminder({ toEmail, clientName, lawyerName, scheduledAt, appointmentId, role, tzOffset }) {
  const date = parseDate(scheduledAt);
  const formattedDate = formatInTimezone(date, tzOffset);

  const isLawyer = role === "lawyer";
  const subject = isLawyer
    ? `📞 Upcoming consultation in 15 minutes — ${formattedDate}`
    : `📞 Your legal consultation starts in 15 minutes`;

  const dashboardUrl = isLawyer
    ? `${APP_URL}/lawyer-dashboard`
    : `${APP_URL}/dashboard`;

  const callUrl = `${APP_URL}/call/${appointmentId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f2f8; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15,31,61,0.10); }
        .header { background: linear-gradient(135deg, #0f1f3d 0%, #1a3360 100%); padding: 36px 40px; }
        .logo { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.01em; }
        .logo span { color: #c9a84c; }
        .body { padding: 36px 40px; }
        .alert-badge { display: inline-block; background: #fff3cd; color: #8a6400; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        h1 { font-size: 24px; color: #0f1f3d; margin: 0 0 12px; line-height: 1.3; }
        p { color: #6b7a99; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
        .info-box { background: #f7f8fc; border-radius: 12px; padding: 20px 24px; margin: 24px 0; border-left: 4px solid #c9a84c; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-label { color: #a8b2cc; font-weight: 500; }
        .info-value { color: #0f1f3d; font-weight: 600; }
        .btn { display: block; background: #0f1f3d; color: #ffffff !important; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; margin: 8px 0; }
        .btn-gold { background: #c9a84c; }
        .footer { background: #f7f8fc; padding: 20px 40px; text-align: center; }
        .footer p { color: #a8b2cc; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo">OnCall<span>Lawyer</span></div>
        </div>
        <div class="body">
          <div class="alert-badge">⏰ Starting in 15 minutes</div>
          <h1>${isLawyer ? "You have an upcoming consultation" : "Your consultation is almost here"}</h1>
          <p>
            ${isLawyer
              ? `A client has booked a consultation with you starting soon. Please make sure you're ready to join.`
              : `Your legal consultation is starting in 15 minutes. Make sure you're in a quiet place and ready to connect with your attorney.`
            }
          </p>

          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Date & Time</span>
              <span class="info-value">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isLawyer ? "Client" : "Attorney"}</span>
              <span class="info-value">${isLawyer ? (clientName || "Your client") : (lawyerName || "Your attorney")}</span>
            </div>
          </div>

          <a href="${callUrl}" class="btn btn-gold">📞 Join Call Now</a>
          <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
        </div>
        <div class="footer">
          <p>OnCallLawyer · You're receiving this because you have an upcoming appointment.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({ to: toEmail, from: FROM_EMAIL, subject, html });
    console.log(`✅ Reminder email sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ SendGrid error sending to ${toEmail}:`, JSON.stringify(err?.response?.body || err.message));
    throw err;
  }
}

export async function sendBookingConfirmation({ toEmail, clientName, lawyerName, scheduledAt, appointmentId, role, tzOffset }) {
  const date = parseDate(scheduledAt);
  const formattedDate = formatInTimezone(date, tzOffset);

  const isLawyer = role === "lawyer";
  const subject = isLawyer
    ? `New booking — ${formattedDate}`
    : `✅ Booking confirmed — ${formattedDate}`;

  const dashboardUrl = isLawyer
    ? `${APP_URL}/lawyer-dashboard`
    : `${APP_URL}/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f2f8; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(15,31,61,0.10); }
        .header { background: linear-gradient(135deg, #0f1f3d 0%, #1a3360 100%); padding: 36px 40px; }
        .logo { font-size: 22px; font-weight: 700; color: #ffffff; }
        .logo span { color: #c9a84c; }
        .body { padding: 36px 40px; }
        .success-badge { display: inline-block; background: #d4edda; color: #1a5c33; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        h1 { font-size: 24px; color: #0f1f3d; margin: 0 0 12px; }
        p { color: #6b7a99; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
        .info-box { background: #f7f8fc; border-radius: 12px; padding: 20px 24px; margin: 24px 0; border-left: 4px solid #2d7d5f; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-label { color: #a8b2cc; font-weight: 500; }
        .info-value { color: #0f1f3d; font-weight: 600; }
        .btn { display: block; background: #0f1f3d; color: #ffffff !important; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; margin: 8px 0; }
        .footer { background: #f7f8fc; padding: 20px 40px; text-align: center; }
        .footer p { color: #a8b2cc; font-size: 12px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo">OnCall<span>Lawyer</span></div>
        </div>
        <div class="body">
          <div class="success-badge">✅ Booking Confirmed</div>
          <h1>${isLawyer ? "New consultation booked" : "Your consultation is confirmed"}</h1>
          <p>
            ${isLawyer
              ? `A client has booked a consultation with you. You can confirm or manage it from your dashboard.`
              : `Your legal consultation has been booked successfully. You'll receive a reminder 15 minutes before it starts.`
            }
          </p>
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Date & Time</span>
              <span class="info-value">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${isLawyer ? "Client" : "Attorney"}</span>
              <span class="info-value">${isLawyer ? (clientName || "Your client") : (lawyerName || "Your attorney")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value">Pending confirmation</span>
            </div>
          </div>
          <a href="${dashboardUrl}" class="btn">View in Dashboard</a>
        </div>
        <div class="footer">
          <p>OnCallLawyer · You're receiving this because you have a new appointment.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({ to: toEmail, from: FROM_EMAIL, subject, html });
    console.log(`✅ Confirmation email sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ SendGrid error sending to ${toEmail}:`, JSON.stringify(err?.response?.body || err.message));
    throw err;
  }
}
