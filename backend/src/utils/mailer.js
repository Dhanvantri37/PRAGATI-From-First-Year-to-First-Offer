const nodemailer = require('nodemailer');

// To properly send emails, set these environment variables in your .env file:
// EMAIL_HOST=smtp.gmail.com
// EMAIL_PORT=587
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=your_app_password
// OR for deployed environments that block SMTP (like Render Free), use:
// BREVO_API_KEY=your_brevo_api_key

let transporter;
if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('gmail')) {
  // Use Gmail service which handles OAuth2 and TLS automatically
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  // Fallback to generic SMTP configuration
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Send an email using Brevo HTTP API (bypasses SMTP port blocking)
 */
async function sendViaBrevo(to, subject, text, html) {
  // Ensure we have a valid sender address – Brevo requires it
  if (!process.env.EMAIL_USER) {
    const err = new Error('BREVO sender email (EMAIL_USER) not configured');
    console.error(err.message);
    throw err;
  }

  const url = 'https://api.brevo.com/v3/smtp/email';
  const payload = {
    sender: { name: "PRAGATI Support", email: process.env.EMAIL_USER },
    to: [{ email: to }],
    subject: subject,
    textContent: text,
  };

  if (html) {
    payload.htmlContent = html;
  }

  console.log('🚀 Sending email via Brevo →', JSON.stringify({ to, subject }));
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('⚠️ Brevo API failed:', response.status, errorData);
    throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  console.log('✅ Message sent via Brevo, ID:', data.messageId);
}

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {string} html - Email body HTML (optional)
 */
async function sendEmail(to, subject, text, html) {
  try {
    // Try Brevo first (works on Render)
    if (process.env.BREVO_API_KEY) {
      try {
        await sendViaBrevo(to, subject, text, html);
        return;
      } catch (brevoErr) {
        console.error('❌ Brevo send failed, attempting SMTP fallback:', brevoErr);
        // continue to SMTP fallback below
      }
    }

    // SMTP fallback – useful for local dev or if Brevo fails
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const warn = `⚠️ EMAIL_USER or EMAIL_PASS not set. Email not sent to: ${to}`;
      console.warn(warn);
      throw new Error(warn);
    }

    const info = await transporter.sendMail({
      from: `"PRAGATI Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✅ Message sent via SMTP, ID:', info.messageId);
  } catch (error) {
    console.error('❌ Final email send error:', error);
    throw error; // propagate to route so client gets a 500
  }
}

module.exports = { sendEmail };
