/**
 * SMS notifications via Twilio.
 * Stub — wire up when Twilio credentials are added to .env.
 */

async function sendInternalSmsNotification(booking) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('[sms] Twilio not configured — skipping SMS notification.');
    return null;
  }

  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // const { contact, business } = booking;
  // return client.messages.create({
  //   from: process.env.TWILIO_FROM_NUMBER,
  //   to: process.env.IRONCLAD_NOTIFY_SMS,
  //   body: `New booking: ${contact.firstName} ${contact.lastName} · ${business.serviceType} · ${contact.phone}`,
  // });

  return null;
}

async function sendLeadSmsConfirmation(booking) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('[sms] Twilio not configured — skipping lead SMS.');
    return null;
  }

  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // const { contact } = booking;
  // return client.messages.create({
  //   from: process.env.TWILIO_FROM_NUMBER,
  //   to: contact.phone,
  //   body: `Hi ${contact.firstName}, this is Ironclad Digital — we got your strategy call request and will be in touch within 1 hour. Reply STOP to opt out.`,
  // });

  return null;
}

module.exports = { sendInternalSmsNotification, sendLeadSmsConfirmation };
