const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Build the from address — RESEND_FROM holds just the email (no angle brackets)
// so cPanel doesn't strip it. Display name is added here in code.
const FROM_ADDRESS = `Ironclad Digital <${process.env.RESEND_FROM}>`;

// Escape all user-supplied strings before interpolating into HTML.
function e(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Send an internal notification email to the Ironclad team
 * when a new strategy call request comes in.
 */
async function sendInternalNotification(booking) {
  const { contact, business, inquiry } = booking;
  const fullName = `${contact.firstName} ${contact.lastName}`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [process.env.RESEND_NOTIFY_TO],
    // Subject uses plain text — no HTML escaping needed, but escape special chars.
    subject: `New Strategy Call Request — ${business.name.slice(0, 100)}`,
    html: internalHtml({ fullName, contact, business, inquiry }),
    text: internalText({ fullName, contact, business, inquiry }),
  });

  if (error) throw new Error('Internal notification send failed.');
  return data;
}

/**
 * Send an automated confirmation email to the lead.
 */
async function sendLeadConfirmation(booking) {
  const { contact, business } = booking;
  const fullName = `${contact.firstName} ${contact.lastName}`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    // Use only the validated email — not a user-controlled display name.
    to: [contact.email],
    subject: `You're all set — Ironclad Digital Strategy Call`,
    html: confirmationHtml({ fullName, business }),
    text: confirmationText({ fullName, business }),
  });

  if (error) throw new Error('Lead confirmation send failed.');
  return data;
}

// ---------- Templates ----------
// All user data is run through e() before insertion into HTML.

function internalHtml({ fullName, contact, business, inquiry }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#07090d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#111821;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">

    <div style="background:linear-gradient(135deg,#0d1117,#111821);padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.10);">
      <div style="font-size:11px;letter-spacing:.2em;color:#2d8cff;font-weight:700;margin-bottom:8px;">IRONCLAD DIGITAL</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">New Strategy Call Request</div>
      <div style="font-size:13px;color:#a7b0bf;margin-top:6px;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:11px;letter-spacing:.16em;color:#7a8395;font-weight:700;margin-bottom:14px;">CONTACT</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#a7b0bf;padding:5px 0;width:40%;">Name</td><td style="color:#ffffff;font-weight:600;">${e(fullName)}</td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Email</td><td><a href="mailto:${e(contact.email)}" style="color:#2d8cff;">${e(contact.email)}</a></td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Phone</td><td><a href="tel:${e(contact.phone)}" style="color:#2d8cff;">${e(contact.phone)}</a></td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Preferred Contact</td><td style="color:#ffffff;text-transform:capitalize;">${e(inquiry?.preferredContactMethod || '—')}</td></tr>
      </table>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:11px;letter-spacing:.16em;color:#7a8395;font-weight:700;margin-bottom:14px;">BUSINESS</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#a7b0bf;padding:5px 0;width:40%;">Business Name</td><td style="color:#ffffff;font-weight:600;">${e(business.name)}</td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Service Type</td><td style="color:#ffffff;text-transform:capitalize;">${e(business.serviceType || '—')}</td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Service Area</td><td style="color:#ffffff;">${e(business.serviceArea || '—')}</td></tr>
        <tr><td style="color:#a7b0bf;padding:5px 0;">Monthly Leads</td><td style="color:#ffffff;">${e(business.monthlyLeads || '—')}</td></tr>
      </table>
    </div>

    ${inquiry?.challenge ? `
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:11px;letter-spacing:.16em;color:#7a8395;font-weight:700;margin-bottom:10px;">BIGGEST CHALLENGE</div>
      <div style="font-size:14px;color:#a7b0bf;line-height:1.6;background:#0d1117;border-left:3px solid #2d8cff;padding:14px 16px;border-radius:0 8px 8px 0;">${e(inquiry.challenge)}</div>
    </div>` : ''}

    <div style="padding:28px 32px;text-align:center;">
      <a href="mailto:${e(contact.email)}" style="display:inline-block;background:linear-gradient(180deg,#2d8cff,#1f7bff);color:#fff;font-weight:700;font-size:14px;letter-spacing:.04em;padding:14px 28px;border-radius:10px;text-decoration:none;">Reply to ${e(contact.firstName)}</a>
    </div>

    <div style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#7a8395;">Ironclad Digital · San Diego, CA</div>
  </div>
</body>
</html>`;
}

function internalText({ fullName, contact, business, inquiry }) {
  return `NEW STRATEGY CALL REQUEST — IRONCLAD DIGITAL

Contact
-------
Name: ${fullName}
Email: ${contact.email}
Phone: ${contact.phone}
Preferred Contact: ${inquiry?.preferredContactMethod || '—'}

Business
--------
Name: ${business.name}
Service Type: ${business.serviceType || '—'}
Service Area: ${business.serviceArea || '—'}
Monthly Leads: ${business.monthlyLeads || '—'}

Biggest Challenge
-----------------
${inquiry?.challenge || '(not provided)'}

--
Ironclad Digital · San Diego, CA`;
}

function confirmationHtml({ fullName, business }) {
  const steps = [
    'Diagnostic review of your site, lead flow, and follow-up systems.',
    'Pipeline walkthrough — where leads are leaking and what to fix first.',
    'Clear action plan whether we work together or not.',
  ];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#07090d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#111821;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">

    <div style="background:linear-gradient(135deg,#0d1117,#111821);padding:28px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.10);text-align:center;">
      <div style="font-size:11px;letter-spacing:.2em;color:#2d8cff;font-weight:700;margin-bottom:8px;">IRONCLAD DIGITAL™</div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.1;letter-spacing:-.02em;">We Got Your Request.</div>
    </div>

    <div style="padding:32px 32px 24px;">
      <p style="font-size:16px;color:#ffffff;font-weight:600;margin:0 0 12px;">Hi ${e(fullName)},</p>
      <p style="font-size:14px;color:#a7b0bf;line-height:1.7;margin:0 0 20px;">
        Thanks for reaching out about <strong style="color:#ffffff;">${e(business.name)}</strong>. We've received your strategy call request and will be in touch within <strong style="color:#2d8cff;">1 business hour</strong> via your preferred contact method.
      </p>
      <p style="font-size:14px;color:#a7b0bf;line-height:1.7;margin:0 0 28px;">
        On the call, we'll review your current setup, identify where leads are slipping through, and walk you through a clear action plan — no pressure, just real solutions.
      </p>

      <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:22px 24px;margin-bottom:28px;">
        <div style="font-size:11px;letter-spacing:.16em;color:#7a8395;font-weight:700;margin-bottom:14px;">WHAT TO EXPECT</div>
        ${steps.map((item, i) => `
        <div style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:#a7b0bf;margin-bottom:10px;">
          <span style="background:rgba(31,123,255,.15);color:#2d8cff;width:22px;height:22px;border-radius:50%;display:inline-block;text-align:center;font-weight:700;font-size:11px;flex-shrink:0;line-height:22px;">${i + 1}</span>
          <span style="line-height:1.5;">${item}</span>
        </div>`).join('')}
      </div>
    </div>

    <div style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
      <div style="font-size:12px;color:#7a8395;">Questions? Reply to this email or call us directly.</div>
      <div style="font-size:11px;color:#4a5568;margin-top:10px;">Ironclad Digital · San Diego, CA</div>
    </div>
  </div>
</body>
</html>`;
}

function confirmationText({ fullName, business }) {
  return `Hi ${fullName},

Thanks for reaching out about ${business.name}. We received your strategy call request and will be in touch within 1 business hour via your preferred contact method.

WHAT TO EXPECT
--------------
1. Diagnostic review of your site, lead flow, and follow-up systems.
2. Pipeline walkthrough — where leads are leaking and what to fix first.
3. Clear action plan whether we work together or not.

Questions? Reply to this email.

Ironclad Digital · San Diego, CA`;
}

module.exports = { sendInternalNotification, sendLeadConfirmation };
