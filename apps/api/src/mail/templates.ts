import type { MailMessage } from './mailer.ts';

// TODO(i18n): send emails in the user's language once it is stored on the profile.

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout(title: string, body: string, action: { label: string; url: string }): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: system-ui, sans-serif; color: #18181b; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px;">${escapeHtml(title)}</h1>
    ${body}
    <p><a href="${escapeHtml(action.url)}" style="display: inline-block; background: #10b981; color: #09090b; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escapeHtml(action.label)}</a></p>
    <p style="font-size: 12px; color: #71717a;">Se você não fez essa solicitação, ignore este e-mail.</p>
  </body>
</html>`;
}

export function verificationEmail(to: { name: string; email: string }, url: string): MailMessage {
  const title = 'Confirme seu e-mail na Social Dev';
  return {
    to: to.email,
    subject: title,
    text: `Olá, ${to.name}!\n\nConfirme seu e-mail para ativar sua conta:\n${url}\n\nSe você não criou uma conta, ignore este e-mail.`,
    html: layout(
      title,
      `<p>Olá, ${escapeHtml(to.name)}! Confirme seu e-mail para ativar sua conta.</p>`,
      { label: 'Confirmar e-mail', url },
    ),
  };
}

export function resetPasswordEmail(to: { name: string; email: string }, url: string): MailMessage {
  const title = 'Redefinição de senha da Social Dev';
  return {
    to: to.email,
    subject: title,
    text: `Olá, ${to.name}!\n\nUse o link abaixo para criar uma nova senha. Ele expira em 1 hora:\n${url}\n\nSe você não pediu a redefinição, ignore este e-mail.`,
    html: layout(
      title,
      `<p>Olá, ${escapeHtml(to.name)}! Use o botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>`,
      { label: 'Criar nova senha', url },
    ),
  };
}
