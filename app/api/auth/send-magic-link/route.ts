import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email } = await req.json();
  
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  const magicLink = `https://onboarding-launch-v2.vercel.app/onboardingv4.html?verified=true`;

  const { error } = await resend.emails.send({
    from: 'Rizz <onboarding@resend.dev>',
    to: email,
    subject: 'Your magic link to Resourceful',
    html: `<p>Hey — here's your magic link to get into Resourceful:</p><p><a href="${magicLink}">Click here to verify and continue</a></p>`
  });

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}