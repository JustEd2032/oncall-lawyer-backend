import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const REPLY_TO  = "prudentetorres@hotmail.com";
const APP_URL   = process.env.APP_URL || "https://oncall-lawyer-api-dev.web.app";

// ── Date parser ──
function parseDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === "function") return val.toDate();
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ── Bilingual date formatter ──
// Returns e.g. "Martes, 8 de abril de 2026 · 3:30 PM / Tuesday, April 8, 2026 · 3:30 PM"
function formatBilingual(date, tzOffset) {
  const localMs   = date.getTime() + (tzOffset || 0) * 60 * 1000;
  const local     = new Date(localMs);

  const diasES    = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const mesesES   = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const daysEN    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const monthsEN  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const dow  = local.getUTCDay();
  const dom  = local.getUTCDate();
  const mon  = local.getUTCMonth();
  const yr   = local.getUTCFullYear();
  let   hrs  = local.getUTCHours();
  const mins = String(local.getUTCMinutes()).padStart(2, "0");
  const ampm = hrs >= 12 ? "PM" : "AM";
  hrs = hrs % 12 || 12;
  const time = `${hrs}:${mins} ${ampm}`;

  const es = `${diasES[dow]}, ${dom} de ${mesesES[mon]} de ${yr} · ${time}`;
  const en = `${daysEN[dow]}, ${monthsEN[mon]} ${dom}, ${yr} · ${time}`;
  return { es, en, time };
}

// ── Shared email shell ──
function emailShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#ede5d4;margin:0;padding:0}
    .wrap{max-width:580px;margin:32px auto;background:#faf7f2;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(44,26,14,0.15)}
    .hdr{background:#2c1a0e;padding:28px 40px;border-bottom:3px solid #b8962e;text-align:center}
    .hdr-firm{font-size:16px;font-weight:700;color:#b8962e;letter-spacing:0.08em;line-height:1.3}
    .hdr-sub{font-size:10px;color:#9b6b47;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px}
    .bdy{padding:36px 40px}
    .badge{display:inline-block;border-radius:999px;padding:5px 16px;font-size:12px;font-weight:600;margin-bottom:20px}
    .badge-warn{background:#f5e6c8;color:#7a5200}
    .badge-ok{background:#d4e8d8;color:#1a4a28}
    h1{font-size:22px;color:#2c1a0e;margin-bottom:8px;line-height:1.3;font-family:Georgia,serif}
    h1 em{font-style:italic;color:#6b3f22;font-size:18px;display:block;margin-top:2px}
    .lead{color:#6b3f22;font-size:14px;line-height:1.75;margin-bottom:24px}
    .divider{border:none;border-top:1px solid #d4c9b8;margin:8px 0 20px}
    .info-box{background:#fff;border-radius:8px;padding:18px 22px;border-left:4px solid #b8962e;margin-bottom:24px}
    .info-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;font-size:13px;gap:12px}
    .info-row:last-child{margin-bottom:0}
    .lbl{color:#9b6b47;font-weight:500;flex-shrink:0}
    .val{color:#2c1a0e;font-weight:600;text-align:right}
    .val-date{color:#2c1a0e;font-weight:600;font-size:12px;text-align:right;line-height:1.6}
    .btn{display:block;text-align:center;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin:8px 0;letter-spacing:0.04em}
    .btn-gold{background:#b8962e;color:#ffffff!important}
    .btn-dark{background:#2c1a0e;color:#b8962e!important}
    .lang-divider{border:none;border-top:1px dashed #d4c9b8;margin:28px 0 20px}
    .en-section{opacity:0.8}
    .ftr{background:#2c1a0e;padding:18px 40px;text-align:center}
    .ftr p{color:#6b3f22;font-size:11px;line-height:1.7}
    .ftr a{color:#b8962e;text-decoration:none}
    @media(max-width:600px){
      .bdy{padding:24px 20px}
      .hdr{padding:22px 20px}
      .ftr{padding:16px 20px}
      .info-row{flex-direction:column;gap:2px}
      .val,.val-date{text-align:left}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="hdr-firm">PRUDENTE TORRES &amp; ASOCIADOS A.C.</div>
      <div class="hdr-sub">Abogados &nbsp;·&nbsp; English Spoken &nbsp;·&nbsp; prudentetorres.lat</div>
    </div>
    <div class="bdy">${bodyHtml}</div>
    <div class="ftr">
      <p>
        Prudente Torres &amp; Asociados A.C. &nbsp;·&nbsp; Calle Hidalgo No 10, Edificio Muller, Despacho 206, Acapulco, Guerrero<br/>
        TEL. (01744) 135-5072 &nbsp;·&nbsp; <a href="mailto:prudentetorres@hotmail.com">prudentetorres@hotmail.com</a>
      </p>
      <p style="margin-top:8px;color:#4a2c17">
        Recibió este correo porque tiene una cita programada.<br/>
        <em>You received this email because you have a scheduled appointment.</em>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── REMINDER EMAIL (15 min before) ──
export async function sendAppointmentReminder({ toEmail, clientName, lawyerName, scheduledAt, appointmentId, role, tzOffset }) {
  const date   = parseDate(scheduledAt);
  const { es, en } = formatBilingual(date, tzOffset);
  const isLawyer   = role === "lawyer";

  const subject = isLawyer
    ? `⏰ Consulta en 15 minutos — ${es} / Consultation in 15 min`
    : `⏰ Su consulta comienza en 15 minutos / Your consultation starts in 15 min`;

  const dashboardUrl = isLawyer ? `${APP_URL}/lawyer-dashboard` : `${APP_URL}/dashboard`;
  const callUrl      = `${APP_URL}/call/${appointmentId}`;
  const otherPartyES = isLawyer ? "Cliente" : "Abogado/a";
  const otherPartyEN = isLawyer ? "Client"  : "Attorney";
  const otherName    = isLawyer ? (clientName || "Su cliente") : (lawyerName || "Su abogado/a");

  const body = `
    <div class="badge badge-warn">⏰ En 15 minutos · In 15 minutes</div>
    <h1>
      ${isLawyer ? "Tiene una consulta próxima" : "Su consulta está por comenzar"}
      <em>${isLawyer ? "You have an upcoming consultation" : "Your consultation is about to begin"}</em>
    </h1>
    <p class="lead">
      ${isLawyer
        ? "Un cliente le espera en su consulta. Por favor asegúrese de estar listo para unirse.<br/><em>A client is waiting for your consultation. Please make sure you are ready to join.</em>"
        : "Su consulta legal comienza en 15 minutos. Asegúrese de estar en un lugar tranquilo.<br/><em>Your legal consultation starts in 15 minutes. Please be in a quiet place and ready to connect.</em>"
      }
    </p>
    <div class="info-box">
      <div class="info-row">
        <span class="lbl">Fecha y hora / Date &amp; Time</span>
        <span class="val-date">${es}<br/><span style="color:#9b6b47">${en}</span></span>
      </div>
      <div class="info-row">
        <span class="lbl">${otherPartyES} / ${otherPartyEN}</span>
        <span class="val">${otherName}</span>
      </div>
    </div>
    <a href="${callUrl}" class="btn btn-gold">📞 Unirse a la llamada · Join Call Now</a>
    <a href="${dashboardUrl}" class="btn btn-dark">Ver panel · View Dashboard</a>`;

  await sgMail.send({
    to: toEmail, from: { name: "Prudente Torres & Asociados", email: FROM_EMAIL },
    replyTo: REPLY_TO, subject, html: emailShell(body)
  }).then(() => console.log(`✅ Reminder sent to ${toEmail}`))
    .catch(err => { console.error(`❌ Reminder failed ${toEmail}:`, JSON.stringify(err?.response?.body || err.message)); throw err; });
}

// ── BOOKING CONFIRMATION EMAIL ──
export async function sendBookingConfirmation({ toEmail, clientName, lawyerName, scheduledAt, appointmentId, role, tzOffset }) {
  const date   = parseDate(scheduledAt);
  const { es, en } = formatBilingual(date, tzOffset);
  const isLawyer   = role === "lawyer";

  const subject = isLawyer
    ? `📋 Nueva cita agendada / New appointment booked — ${es}`
    : `✅ Cita confirmada / Appointment confirmed — ${es}`;

  const dashboardUrl = isLawyer ? `${APP_URL}/lawyer-dashboard` : `${APP_URL}/dashboard`;
  const otherPartyES = isLawyer ? "Cliente" : "Abogado/a";
  const otherPartyEN = isLawyer ? "Client"  : "Attorney";
  const otherName    = isLawyer ? (clientName || "Su cliente") : (lawyerName || "Su abogado/a");

  const body = `
    <div class="badge badge-ok">✅ ${isLawyer ? "Nueva cita · New Appointment" : "Cita confirmada · Confirmed"}</div>
    <h1>
      ${isLawyer ? "Nueva consulta agendada" : "Su consulta ha sido confirmada"}
      <em>${isLawyer ? "New consultation booked" : "Your consultation is confirmed"}</em>
    </h1>
    <p class="lead">
      ${isLawyer
        ? "Un cliente ha agendado una consulta con usted. Puede confirmar o gestionar la cita desde su panel.<br/><em>A client has booked a consultation with you. You can confirm or manage it from your dashboard.</em>"
        : "Su consulta legal ha sido agendada exitosamente. Recibirá un recordatorio 15 minutos antes de comenzar.<br/><em>Your legal consultation has been successfully booked. You will receive a reminder 15 minutes before it starts.</em>"
      }
    </p>
    <div class="info-box">
      <div class="info-row">
        <span class="lbl">Fecha y hora / Date &amp; Time</span>
        <span class="val-date">${es}<br/><span style="color:#9b6b47">${en}</span></span>
      </div>
      <div class="info-row">
        <span class="lbl">${otherPartyES} / ${otherPartyEN}</span>
        <span class="val">${otherName}</span>
      </div>
      <div class="info-row">
        <span class="lbl">Estado / Status</span>
        <span class="val">Pendiente de confirmación / Pending confirmation</span>
      </div>
    </div>
    <a href="${dashboardUrl}" class="btn btn-gold">Ver mi panel · View Dashboard</a>
    <div class="lang-divider"></div>
    <p style="font-size:12px;color:#9b6b47;text-align:center">
      Para cualquier consulta, contáctenos en <a href="mailto:prudentetorres@hotmail.com" style="color:#b8962e">prudentetorres@hotmail.com</a> o al TEL. (01744) 135-5072<br/>
      <em>For any inquiries, contact us at prudentetorres@hotmail.com or TEL. (01744) 135-5072</em>
    </p>`;

  await sgMail.send({
    to: toEmail, from: { name: "Prudente Torres & Asociados", email: FROM_EMAIL },
    replyTo: REPLY_TO, subject, html: emailShell(body)
  }).then(() => console.log(`✅ Confirmation sent to ${toEmail}`))
    .catch(err => { console.error(`❌ Confirmation failed ${toEmail}:`, JSON.stringify(err?.response?.body || err.message)); throw err; });
}
