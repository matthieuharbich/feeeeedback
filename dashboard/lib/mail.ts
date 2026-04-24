import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM || "feeeeedback <noreply@feeeeedback.mtth.world>";
const resend = resendKey ? new Resend(resendKey) : null;

export async function sendMagicLink(email: string, url: string) {
  if (!resend) {
    console.log("");
    console.log("──────────────────────────────────────────────────────────");
    console.log(`  [feeeeedback] magic link for ${email}`);
    console.log(`  ${url}`);
    console.log("──────────────────────────────────────────────────────────");
    console.log("");
    return;
  }
  await resend.emails.send({
    from,
    to: email,
    subject: "Se connecter à feeeeedback",
    html: magicLinkHtml(url),
    text: `Clique ici pour te connecter à feeeeedback:\n\n${url}\n\nCe lien expire dans 5 minutes.`,
  });
}

function magicLinkHtml(url: string) {
  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#fafafa; padding:32px;">
  <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="font-size:20px; font-weight:700; letter-spacing:-0.01em;">feeeeedback</div>
    <p style="color:#333; font-size:15px; line-height:1.55; margin-top:24px;">Clique sur le bouton ci-dessous pour te connecter. Ce lien expire dans 5 minutes.</p>
    <a href="${url}" style="display:inline-block; margin-top:20px; background:#ff6b35; color:#fff; text-decoration:none; padding:12px 20px; border-radius:10px; font-weight:600; font-size:14px;">Se connecter</a>
    <p style="color:#888; font-size:12px; margin-top:28px;">Si tu n'as pas demandé ce lien, ignore cet email.</p>
  </div>
</body></html>`;
}

export async function sendInvitation(email: string, url: string, orgName: string, inviterName?: string) {
  if (!resend) {
    console.log(`[feeeeedback] invite ${email} to ${orgName}: ${url}`);
    return;
  }
  await resend.emails.send({
    from,
    to: email,
    subject: `${inviterName || "Quelqu'un"} t'invite à rejoindre ${orgName} sur feeeeedback`,
    html: inviteHtml(url, orgName, inviterName),
    text: `Tu as été invité à rejoindre ${orgName} sur feeeeedback:\n\n${url}`,
  });
}

function inviteHtml(url: string, orgName: string, inviterName?: string) {
  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#fafafa; padding:32px;">
  <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:32px;">
    <div style="font-size:20px; font-weight:700;">feeeeedback</div>
    <p style="color:#333; font-size:15px; line-height:1.55; margin-top:24px;">
      ${inviterName ? `<strong>${inviterName}</strong>` : "Quelqu'un"} t'invite à rejoindre <strong>${orgName}</strong>.
    </p>
    <a href="${url}" style="display:inline-block; margin-top:20px; background:#ff6b35; color:#fff; text-decoration:none; padding:12px 20px; border-radius:10px; font-weight:600;">Accepter l'invitation</a>
  </div>
</body></html>`;
}
