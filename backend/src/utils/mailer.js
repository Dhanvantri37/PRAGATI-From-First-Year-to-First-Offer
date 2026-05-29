const nodemailer = require('nodemailer');

// To properly send emails, set these environment variables in your .env file:
// EMAIL_HOST=smtp.gmail.com
// EMAIL_PORT=587
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=your_app_password
// OR for deployed environments that block SMTP (like Render Free), use:
// BREVO_API_KEY=your_brevo_api_key

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

/**
 * Send an email using Brevo HTTP API (bypasses SMTP port blocking)
 */
async function sendViaBrevo(to, subject, text, html) {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const payload = {
    sender: { name: "PRAGATI Support", email: process.env.EMAIL_USER },
    to: [{ email: to }],
    subject: subject,
    textContent: text
  };
  
  if (html) {
    payload.htmlContent = html;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
  }
  
  const data = await response.json();
  console.log('Message sent via Brevo: %s', data.messageId);
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
    // If we are on Render and have a Brevo API key, use the HTTP API to bypass port blocks
    if (process.env.BREVO_API_KEY) {
      if (!process.env.EMAIL_USER) {
        console.warn('⚠️ EMAIL_USER not set. Cannot use Brevo sender.');
        return;
      }
      await sendViaBrevo(to, subject, text, html);
      return;
    }

    // Otherwise, fallback to standard local SMTP testing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Email not sent to:', to);
      return;
    }

    const info = await transporter.sendMail({
      from: `"PRAGATI Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Message sent via SMTP: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

module.exports = { sendEmail };
