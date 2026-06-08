export interface ContactMailInput {
  name: string;
  email: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimestamp(date = new Date()): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Dark inline defaults (mobile dark theme); light styles via prefers-color-scheme: light */
const CONTACT_MAIL_STYLES = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  @media (prefers-color-scheme: light) {
    .email-bg { background-color: #eeeeee !important; }
    .email-card { background-color: #ffffff !important; border-color: #e0e0e0 !important; box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; }
    .email-header { background-color: #ffffff !important; border-bottom-color: #ebebeb !important; }
    .email-brand { color: #169c46 !important; }
    .email-title { color: #121212 !important; }
    .email-subtitle { color: #5c5c5c !important; }
    .email-label { color: #7c7c7c !important; }
    .email-badge { background-color: #e8f9ee !important; border-color: #b8ecc8 !important; color: #169c46 !important; }
    .email-panel { background-color: #f8f8f8 !important; border-color: #e8e8e8 !important; }
    .email-panel-divider { border-bottom-color: #ebebeb !important; }
    .email-name { color: #121212 !important; }
    .email-meta { color: #7c7c7c !important; }
    .email-avatar { background-color: #e8f9ee !important; color: #169c46 !important; }
    .email-link { color: #169c46 !important; }
    .email-message { background-color: #fafafa !important; border-color: #e8e8e8 !important; border-left-color: #1ed760 !important; }
    .email-message-text { color: #2a2a2a !important; }
    .email-footer { background-color: #f5f5f5 !important; border-top-color: #ebebeb !important; }
    .email-footer-text { color: #7c7c7c !important; }
    .email-footer-brand { color: #5c5c5c !important; }
    .email-tagline { color: #999999 !important; }
  }
`.trim();

export function buildContactMailHtml({ name, email, message }: ContactMailInput): string {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const sentAt = escapeHtml(formatTimestamp());
  const avatarInitial = escapeHtml(name.charAt(0).toUpperCase());
  const replySubject = encodeURIComponent('Re: Atomic Habits contact');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>New contact message</title>
  <style>${CONTACT_MAIL_STYLES}</style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#0a0a0a;">
  <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="height:4px;background-color:#1ed760;border-radius:999px 999px 0 0;"></td>
          </tr>

          <tr>
            <td class="email-card" style="background-color:#121212;border:1px solid #333333;border-top:none;border-radius:0 0 16px 16px;overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-header" style="padding:28px 28px 20px;background-color:#121212;border-bottom:1px solid #2a2a2a;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <p class="email-brand" style="margin:0 0 6px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1ed760;">
                            Atomic Habits
                          </p>
                          <h1 class="email-title" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
                            New contact message
                          </h1>
                        </td>
                        <td align="right" valign="top" style="padding-left:12px;">
                          <span class="email-badge" style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:rgba(30,215,96,0.12);border:1px solid rgba(30,215,96,0.35);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1ed760;white-space:nowrap;">
                            Inbox
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p class="email-subtitle" style="margin:14px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#b3b3b3;">
                      Someone reached out through the website contact form.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:24px 28px 8px;">
                    <p class="email-label" style="margin:0 0 12px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7c7c7c;">
                      From
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 24px;">
                    <table role="presentation" class="email-panel" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#181818;border:1px solid #333333;border-radius:12px;">
                      <tr>
                        <td class="email-panel-divider" style="padding:16px 18px;border-bottom:1px solid #2a2a2a;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="36" valign="top">
                                <div class="email-avatar" style="width:32px;height:32px;border-radius:8px;background-color:rgba(30,215,96,0.15);text-align:center;line-height:32px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1ed760;">
                                  ${avatarInitial}
                                </div>
                              </td>
                              <td style="padding-left:12px;">
                                <p class="email-name" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.4;font-weight:700;color:#ffffff;">
                                  ${safeName}
                                </p>
                                <p class="email-meta" style="margin:4px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#b3b3b3;">
                                  ${sentAt}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 18px;">
                          <p class="email-label" style="margin:0 0 4px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c7c7c;">
                            Email
                          </p>
                          <a class="email-link" href="mailto:${safeEmail}" style="font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:600;color:#1ed760;text-decoration:none;">
                            ${safeEmail}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 28px 28px;">
                    <p class="email-label" style="margin:0 0 12px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7c7c7c;">
                      Message
                    </p>
                    <table role="presentation" class="email-message" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1f1f1f;border:1px solid #333333;border-left:3px solid #1ed760;border-radius:12px;">
                      <tr>
                        <td style="padding:20px 22px;">
                          <p class="email-message-text" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#eeeeee;">
                            ${safeMessage}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 28px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="border-radius:999px;background-color:#1ed760;">
                          <a href="mailto:${safeEmail}?subject=${replySubject}" style="display:inline-block;padding:12px 24px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#000000;text-decoration:none;">
                            Reply to ${safeName}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-footer" style="padding:18px 28px 24px;border-top:1px solid #2a2a2a;background-color:#121212;">
                    <p class="email-footer-text" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#7c7c7c;text-align:center;">
                      Sent via <span class="email-footer-brand" style="color:#b3b3b3;">Atomic Habits</span> contact form
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 8px 0;text-align:center;">
              <p class="email-tagline" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#555555;">
                Track missions. Level up with XP. Keep your streak alive.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildContactMailText({ name, email, message }: ContactMailInput): string {
  const sentAt = formatTimestamp();
  return [
    'ATOMIC HABITS — NEW CONTACT MESSAGE',
    '═'.repeat(40),
    '',
    `From: ${name}`,
    `Email: ${email}`,
    `Sent: ${sentAt}`,
    '',
    'Message:',
    '─'.repeat(40),
    message,
    '─'.repeat(40),
    '',
    `Reply: ${email}`,
  ].join('\n');
}
