export interface LoginVerificationMailInput {
  code: string;
  expiresMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MAIL_STYLES = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  @media (prefers-color-scheme: light) {
    .email-bg { background-color: #eeeeee !important; }
    .email-card { background-color: #ffffff !important; border-color: #e0e0e0 !important; box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; }
    .email-header { background-color: #ffffff !important; border-bottom-color: #ebebeb !important; }
    .email-brand { color: #169c46 !important; }
    .email-title { color: #121212 !important; }
    .email-subtitle { color: #5c5c5c !important; }
    .email-code { background-color: #f8f8f8 !important; border-color: #e8e8e8 !important; color: #121212 !important; }
    .email-footer { background-color: #f5f5f5 !important; border-top-color: #ebebeb !important; }
    .email-footer-text { color: #7c7c7c !important; }
    .email-tagline { color: #999999 !important; }
  }
`.trim();

export function buildLoginVerificationMailHtml({
  code,
  expiresMinutes,
}: LoginVerificationMailInput): string {
  const safeCode = escapeHtml(code);
  const safeExpiry = escapeHtml(String(expiresMinutes));

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Your sign-in code</title>
  <style>${MAIL_STYLES}</style>
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
                    <p class="email-brand" style="margin:0 0 6px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1ed760;">
                      Atomic Habits
                    </p>
                    <h1 class="email-title" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
                      Your sign-in code
                    </h1>
                    <p class="email-subtitle" style="margin:14px 0 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#b3b3b3;">
                      Enter this code to finish signing in. It expires in ${safeExpiry} minutes.
                    </p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 12px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7c7c7c;text-align:center;">
                      Your sign-in code
                    </p>
                    <p class="email-code" style="margin:0;padding:20px;border-radius:12px;background-color:#181818;border:1px solid #333333;font-family:JetBrains Mono,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;text-align:center;color:#ffffff;">
                      ${safeCode}
                    </p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="email-footer" style="padding:18px 28px 24px;border-top:1px solid #2a2a2a;background-color:#121212;">
                    <p class="email-footer-text" style="margin:0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#7c7c7c;text-align:center;">
                      If you didn't request this, you can safely ignore this email.
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

export function buildLoginVerificationMailText({
  code,
  expiresMinutes,
}: LoginVerificationMailInput): string {
  return [
    'ATOMIC HABITS — YOUR SIGN-IN CODE',
    '═'.repeat(40),
    '',
    `Your sign-in code: ${code}`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');
}
