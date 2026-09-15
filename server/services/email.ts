import nodemailer from 'nodemailer';

export interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
  isMockOrFallback?: boolean;
  reason?: string;
}

/**
 * Creates a Nodemailer transport using configured environment variables:
 * - Direct SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 * - Or Gmail Service shortcut: if SMTP_USER is @gmail.com and no custom host provided
 */
function createEmailTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    return null;
  }

  // If host is explicitly specified, use custom SMTP configuration
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  // If user is Gmail or default host is not specified, use Gmail service
  if (user.toLowerCase().endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  // Standard fallback to default SMTP port 587
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Dispatches a password reset verification email containing a 6-digit code.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  username: string,
  resetCode: string
): Promise<EmailResult> {
  const cleanToEmail = toEmail.trim().toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'Ledger Security <noreply@ledger.app>';

  const subject = `Your Ledger Password Reset Code: ${resetCode}`;
  
  const textContent = `Hello ${username},\n\n` +
    `We received a request to reset the password for your Ledger account (${cleanToEmail}).\n\n` +
    `Your 6-digit verification code is: ${resetCode}\n\n` +
    `This code will expire in 15 minutes.\n\n` +
    `If you did not make this request, you can safely ignore this email. Your password will not change and your account remains protected.\n\n` +
    `— The Ledger Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px 12px; color: #1f2937; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 36px 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #111827; }
    .subhead { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .greeting { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
    .code-box { background: #f9fafb; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #059669; margin-bottom: 8px; }
    .code-number { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #065f46; }
    .code-expires { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .warning { font-size: 12px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 18px; margin-top: 24px; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">Ledger</div>
      <div class="subhead">Security Verification</div>
    </div>

    <div class="greeting">Hello ${username || 'there'},</div>
    <div class="message">
      We received a request to reset your password for your Ledger account associated with <strong>${cleanToEmail}</strong>.
      Use the 6-digit verification code below to authorize the password change:
    </div>

    <div class="code-box">
      <div class="code-label">Your Verification Code</div>
      <div class="code-number">${resetCode}</div>
      <div class="code-expires">Expires in 15 minutes • Do not share this code with anyone</div>
    </div>

    <div class="warning">
      <strong>Didn't request this?</strong> If you did not initiate a password reset, you can safely disregard this email. Your current password remains unchanged and your account is secure.
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Ledger • Personal & Business Financial Management
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Try sending via Resend API if RESEND_API_KEY is configured
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom.includes('<') ? smtpFrom : `Ledger <${smtpFrom}>`,
          to: [cleanToEmail],
          subject,
          text: textContent,
          html: htmlContent,
        }),
      });

      const resData: any = await res.json();
      if (res.ok && resData.id) {
        console.log(`[EMAIL SERVICE] Successfully sent reset code to ${cleanToEmail} via Resend. Message ID: ${resData.id}`);
        return { sent: true, messageId: resData.id };
      } else {
        console.error(`[EMAIL SERVICE] Resend API error:`, resData);
      }
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Failed sending via Resend API:`, err);
    }
  }

  // 2. Try sending via Nodemailer SMTP if SMTP_USER and SMTP_PASS are configured
  const transporter = createEmailTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: cleanToEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL SERVICE] Successfully sent password reset code to ${cleanToEmail} via SMTP. Message ID: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Nodemailer SMTP send error to ${cleanToEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  // 3. Fallback when neither SMTP nor Resend API key is provided yet
  console.warn(
    `\n=========================================================================\n` +
    `[EMAIL SERVICE NOTICE] No SMTP credentials or RESEND_API_KEY detected in environment variables.\n` +
    `To dispatch real emails directly to ${cleanToEmail}'s inbox:\n` +
    `  1. Set SMTP_USER (e.g. your Gmail address: jnkpappoe@gmail.com)\n` +
    `  2. Set SMTP_PASS (a 16-character Google App Password from myaccount.google.com/apppasswords)\n` +
    `  (Or configure RESEND_API_KEY in the Settings menu)\n` +
    `[SERVER LOG FOR TESTING ONLY - NEVER EXPOSED IN BROWSER]:\n` +
    `  Recipient: ${cleanToEmail}\n` +
    `  Verification Code: ${resetCode}\n` +
    `=========================================================================\n`
  );

  return {
    sent: false,
    isMockOrFallback: true,
    reason: 'no_smtp_configured',
  };
}

/**
 * Sends a confirmation email to the user with their 4-digit Offline PIN for safe keeping.
 */
export async function sendOfflinePinConfirmationEmail(
  toEmail: string,
  username: string,
  pin: string
): Promise<EmailResult> {
  const cleanToEmail = toEmail.trim().toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'Fimara Security <noreply@fimara.xyz>';

  const subject = `Your Fimara 4-Digit Offline Passcode`;

  const textContent = `Hello ${username},\n\n` +
    `You have successfully configured a 4-digit Offline Passcode for your Fimara financial ledger.\n\n` +
    `Your Offline PIN: ${pin}\n\n` +
    `When your device is offline or without internet access, you can open Fimara and enter this 4-digit PIN along with your username (${username}) to unlock your offline records and log new transactions.\n\n` +
    `For your security:\n` +
    `• Keep this PIN secret and never share it with anyone.\n` +
    `• When online, continue using your standard account password or Google sign-in.\n\n` +
    `— The Fimara Security Team`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f2; margin: 0; padding: 24px 12px; color: #1f2937; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 36px 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #111827; }
    .subhead { font-size: 11px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .greeting { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
    .pin-box { background: #f9fafb; border: 2px dashed #0B0E14; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .pin-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .pin-number { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #111827; }
    .pin-hint { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .note { font-size: 13px; line-height: 1.5; color: #4b5563; background: #f3f4f6; border-radius: 8px; padding: 12px 14px; margin-top: 20px; }
    .warning { font-size: 12px; line-height: 1.5; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 18px; margin-top: 24px; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">Fimara</div>
      <div class="subhead">Offline Security Confirmation</div>
    </div>

    <div class="greeting">Hello ${username || 'there'},</div>
    <div class="message">
      You have successfully set up a 4-digit Offline Passcode for your Fimara account (<strong>${cleanToEmail}</strong>).
      Keep this email safe in case you ever need a reference.
    </div>

    <div class="pin-box">
      <div class="pin-label">Your 4-Digit Offline Passcode</div>
      <div class="pin-number">${pin}</div>
      <div class="pin-hint">Use this PIN to unlock your local ledger when offline</div>
    </div>

    <div class="note">
      <strong>How it works:</strong> Whenever you open Fimara without internet connection or mobile data, enter this 4-digit PIN to securely unlock and update your financial ledger. When online, your normal password or Google account remains active.
    </div>

    <div class="warning">
      <strong>Security Notice:</strong> Never share this PIN with anyone. If you suspect someone has seen your PIN, you can change it anytime in Fimara <strong>Settings &rarr; Security</strong>.
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Fimara • Personal & Business Financial Operating System
    </div>
  </div>
</body>
</html>
  `.trim();

  // Try sending via Resend API if configured
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom.includes('<') ? smtpFrom : `Fimara <${smtpFrom}>`,
          to: [cleanToEmail],
          subject,
          text: textContent,
          html: htmlContent,
        }),
      });

      const resData: any = await res.json();
      if (res.ok && resData.id) {
        console.log(`[EMAIL SERVICE] Successfully sent offline PIN confirmation to ${cleanToEmail} via Resend.`);
        return { sent: true, messageId: resData.id };
      }
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Failed sending offline PIN via Resend API:`, err);
    }
  }

  // Try sending via Nodemailer SMTP if configured
  const transporter = createEmailTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: cleanToEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL SERVICE] Successfully sent offline PIN confirmation to ${cleanToEmail} via SMTP.`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Nodemailer send error for offline PIN to ${cleanToEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  console.log(`[OFFLINE PIN CONFIGURED] Email confirmation queued for ${cleanToEmail} (PIN: ${pin})`);
  return {
    sent: false,
    isMockOrFallback: true,
    reason: 'no_smtp_configured',
  };
}
