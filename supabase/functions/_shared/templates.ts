// Email templates for license-key flows. Plain inline-styled HTML — emails
// don't get external stylesheets, JS, or modern CSS reliably.

const REDEEM_URL = 'https://islands.bio/redeem';
const SIGNUP_URL = 'https://islands.bio/sign-up';

const baseStyle = `
  font-family: Georgia, 'Times New Roman', serif;
  background: #fdf9f4;
  color: #1a1712;
  padding: 32px 20px;
  margin: 0;
`;
const cardStyle = `
  max-width: 520px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 18px;
  padding: 36px 32px;
  border: 1px solid #e5e0d6;
`;
const codeStyle = `
  display: inline-block;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 18px;
  letter-spacing: 1px;
  background: #f4ede0;
  color: #1a1712;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid #d8cfb8;
  margin: 18px 0;
`;
const buttonStyle = `
  display: inline-block;
  background: #1a1712;
  color: #fdf9f4;
  text-decoration: none;
  padding: 14px 22px;
  border-radius: 999px;
  font-weight: 600;
  margin-top: 8px;
`;
const subtleStyle = `font-size: 13px; color: #6b6253; line-height: 1.55;`;

// Islands wordmark hosted on islands.bio. Email clients block local images,
// so the asset MUST be on a public, stable HTTPS URL — that file is already
// served from the islands.bio Cloudflare Pages site.
const ISLANDS_LOGO_URL = 'https://islands.bio/islands-word.png';

function islandsFooter(): string {
  return `
    <div style="margin-top: 36px; text-align: center;">
      <p style="font-size: 11px; color: #9d937e; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 8px;">
        Powered by
      </p>
      <a href="https://islands.bio" style="text-decoration: none;">
        <img src="${ISLANDS_LOGO_URL}"
             alt="Islands"
             width="110"
             style="display: inline-block; height: auto; max-width: 110px;" />
      </a>
    </div>
  `;
}

function islandsFooterText(): string {
  return `\n\n— Powered by Islands · https://islands.bio`;
}

export function purchaseConfirmationEmail(opts: {
  code: string;
  productTitle: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your copy of ${opts.productTitle}`;
  const html = `
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <p style="font-size: 22px; margin: 0 0 8px;">Thank you.</p>
        <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6;">
          Your copy of <em>${esc(opts.productTitle)}</em> is yours.
          You're already signed in on this device — the book is unlocked.
        </p>
        <p style="margin: 0; font-size: 14px; color: #4a4338;">
          Save this code. If you ever need to restore on another device,
          enter it under Profile → Redeem code.
        </p>
        <div style="${codeStyle}">${esc(opts.code)}</div>
        <p style="${subtleStyle}">— Ethan</p>
      </div>
      ${islandsFooter()}
    </body>
  `;
  const text = `Thank you.

Your copy of ${opts.productTitle} is yours. You're already signed in on this device — the book is unlocked.

Save this code in case you need to restore on another device:

${opts.code}

— Ethan${islandsFooterText()}`;
  return { subject, html, text };
}

export function giftEmail(opts: {
  code: string;
  productTitle: string;
  fromName?: string;
  note?: string;
}): { subject: string; html: string; text: string } {
  const fromLine = opts.fromName
    ? `${opts.fromName} sent you a gift —`
    : 'You\'ve been gifted —';
  const subject = `${opts.fromName ?? 'A friend'} sent you ${opts.productTitle}`;
  const noteBlock = opts.note
    ? `<p style="margin: 18px 0; padding: 14px 18px; background: #f4ede0; border-radius: 12px; font-style: italic; line-height: 1.55;">${esc(opts.note)}</p>`
    : '';
  const html = `
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <p style="font-size: 22px; margin: 0 0 6px;">${esc(fromLine)}</p>
        <p style="font-size: 26px; margin: 0 0 18px; font-style: italic;">${esc(opts.productTitle)}</p>
        ${noteBlock}
        <p style="margin: 0 0 8px; font-size: 14px;">
          To claim it, sign in (or create an account) and enter this code:
        </p>
        <div style="${codeStyle}">${esc(opts.code)}</div>
        <p style="margin: 18px 0 0;">
          <a href="${REDEEM_URL}" style="${buttonStyle}">Redeem your gift</a>
        </p>
        <p style="${subtleStyle} margin-top: 28px;">
          New here? Tap the button above and follow the prompts. No subscription, no recurring charge — this is a one-time gift.
        </p>
      </div>
      ${islandsFooter()}
    </body>
  `;
  const text = `${fromLine}\n${opts.productTitle}\n\n${opts.note ? `"${opts.note}"\n\n` : ''}To claim it, sign in (or create an account) and enter this code:\n\n${opts.code}\n\nRedeem at ${REDEEM_URL}\n\n— Ethan${islandsFooterText()}`;
  return { subject, html, text };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
