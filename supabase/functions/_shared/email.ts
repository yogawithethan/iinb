// Resend transactional email helper.
//
// All sends use yogawithethan.com as the From domain. Islands stays silent —
// readers never see "islands.bio" in their inbox.
//
// Required env: RESEND_API_KEY (set via `supabase secrets set RESEND_API_KEY=re_…`)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = 'Ethan Hill <noreply@yogawithethan.com>';
const REPLY_TO = 'yoga@ethanhill.org';

if (!RESEND_API_KEY) console.error('[email] RESEND_API_KEY missing');

export type EmailOutcome = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailOutcome> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  if (!to || !to.includes('@')) {
    return { ok: false, error: `invalid to address: ${to}` };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM,
      to,
      reply_to: REPLY_TO,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, id: data?.id ?? '' };
}
